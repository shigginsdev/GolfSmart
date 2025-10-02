import logging
import json
import openai
import sys
import boto3
from botocore.exceptions import ClientError
from PIL import Image, ImageEnhance
import requests
from io import BytesIO
import base64
from datetime import datetime
import time
from urllib.parse import urlparse, unquote

# Keep Lambda layer path if you rely on it
sys.path.append('/opt/python/lib/python3.13/site-packages')

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

# ---------------------------
# Config
# ---------------------------
ALLOWED_ORIGINS = [
    "https://master.d2dnzia3915c3v.amplifyapp.com",
    "https://main.d2dnzia3915c3v.amplifyapp.com",
    "http://localhost:3000"
]

BUCKET = "golf-scorecards-bucket"
REGION = "us-east-2"

# For 24-hour deletes, STANDARD is cheapest (IA/Glacier IR have minimum storage durations + early deletion fees)
STORAGE_CLASS = "STANDARD"
PRESIGN_TTL_SECONDS = 300  # 5 minutes while testing; you can lower to 120 later

# ---------------------------
# Helpers
# ---------------------------

def load_original_bytes(image_url: str) -> bytes:
    """
    If image_url points to S3, read via boto3 (no HTTP needed).
    Otherwise, fetch via HTTPS (for truly external sources).
    """
    u = urlparse(image_url)
    host = (u.netloc or "").lower()
    path = unquote(u.path or "")

    bucket = None
    key = None

    # Detect common S3 URL forms:
    # 1) Virtual-hosted-style: <bucket>.s3.<region>.amazonaws.com/<key>
    # 2) Legacy path-style:    s3.<region>.amazonaws.com/<bucket>/<key>
    if host.endswith(".amazonaws.com") and ".s3." in host:
        parts = host.split(".")
        if parts[0] != "s3":
            # virtual-hosted-style
            bucket = parts[0]
            key = path.lstrip("/")
        else:
            # legacy path-style
            p = path.lstrip("/").split("/", 1)
            if len(p) == 2:
                bucket, key = p[0], p[1]

    if bucket and key:
        logger.info(f"Reading original from S3: s3://{bucket}/{key}")
        s3 = boto3.client("s3", region_name=REGION)
        obj = s3.get_object(Bucket=bucket, Key=key)
        return obj["Body"].read()

    # Fallback to HTTP(S) for non-S3 URLs
    logger.info(f"Fetching original via HTTPS: {image_url[:120]}...")
    try:
        resp = requests.get(image_url, timeout=30)
        logger.info(f"GET status={resp.status_code} len={len(resp.content) if resp.ok else 0}")
        if resp.status_code != 200:
            # Log a peek into body to aid debugging
            logger.error(f"Non-200 from HTTPS fetch. Body preview: {resp.text[:200]}")
            raise Exception(f"HTTP {resp.status_code} when fetching original")
        return resp.content
    except requests.RequestException as e:
        raise Exception(f"Network error fetching original: {e}")

# ---------------------------
# Preprocessing
# ---------------------------

def preprocess_image(image_url: str, first_name: str):
    """
    - Loads the original (S3 SDK if S3 URL; HTTP otherwise)
    - Grayscale + rotate portrait to landscape + enhance contrast/sharpness
    - PUTs a single preprocessed PNG to S3 (private)
    - Returns a pre-signed GET URL for OpenAI and the object key
    """
    # Load original bytes (prefers S3 SDK)
    raw = load_original_bytes(image_url)
    image = Image.open(BytesIO(raw))

    # 1) Grayscale
    image = image.convert("L")

    # 2) Rotate portrait to landscape
    if image.height > image.width:
        image = image.rotate(90, expand=True)

    # 3) Enhance contrast & sharpness
    image = ImageEnhance.Contrast(image).enhance(2.0)
    image = ImageEnhance.Sharpness(image).enhance(2.0)

    # Save to in-memory buffer (PNG)
    buf = BytesIO()
    image.save(buf, format="PNG")
    buf.seek(0)

    # Single PUT of the preprocessed image (PRIVATE)
    s3 = boto3.client("s3", region_name=REGION)
    timestamp = int(time.time())
    object_key = f"preprocessed/preprocessed-{first_name}-{timestamp}.png"

    try:
        s3.upload_fileobj(
            buf,
            BUCKET,
            object_key,
            ExtraArgs={
                "ContentType": "image/png",
                "StorageClass": STORAGE_CLASS  # Keep STANDARD for 24h lifecycle
            }
        )
        logger.info(f"Uploaded preprocessed image to s3://{BUCKET}/{object_key} StorageClass={STORAGE_CLASS}")
    except Exception as e:
        logger.error(f"Failed to upload preprocessed image to S3: {e}")
        raise

    # Pre-signed URL so OpenAI can fetch without public access
    try:
        presigned_url = s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET, "Key": object_key},
            ExpiresIn=PRESIGN_TTL_SECONDS
        )
        logger.info(f"Generated presigned URL for preprocessed image (ttl={PRESIGN_TTL_SECONDS}s)")
    except Exception as e:
        logger.error(f"Failed to generate presigned URL: {e}")
        raise

    return presigned_url, object_key

# ---------------------------
# Main handler helpers
# ---------------------------

def cors_headers(origin: str):
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
    }

def get_secret(event, origin):
    # Parse request body
    body = json.loads(event.get("body", "{}"))
    logger.info(f"Received body keys: {list(body.keys())}")

    imageURL = body.get("fileUrl")  # Keeping your original field name
    first_name = body.get("firstName", "Unknown")

    logger.info(f"Received imageURL: {('present' if imageURL else 'MISSING')}, firstName={first_name}")

    secret_name = "openAI_API2"
    region_name = REGION

    # Preprocess the image → upload once → get presigned URL
    try:
        preprocessed_image_url, object_key = preprocess_image(imageURL, first_name)
    except Exception as e:
        logger.error(f"Image preprocessing failed: {e}")
        return {
            "statusCode": 400,
            "headers": cors_headers(origin),
            "body": json.dumps({"status": "error", "message": "Failed to preprocess image"})
        }

    # Create a Secrets Manager client
    session = boto3.session.Session()
    client = session.client(service_name='secretsmanager', region_name=region_name)

    try:
        get_secret_value_response = client.get_secret_value(SecretId=secret_name)
    except ClientError:
        return {
            "statusCode": 405,
            "headers": cors_headers(origin),
            "body": json.dumps({"message": "Error returning secrets"})
        }

    secret_dict = json.loads(get_secret_value_response['SecretString'])
    api_key = secret_dict.get("openAI_API2")  # Make sure this key matches what’s stored in AWS Secrets Manager

    if not api_key:
        logger.error("No API key found in Secrets Manager")
        return {
            "statusCode": 500,
            "headers": cors_headers(origin),
            "body": json.dumps({"message": "Invalid API key retrieved"})
        }

    logger.info(f"Using OpenAI API Key: {api_key[:5]}********")  # Log only the prefix for safety

    prompt_text = (
        "This is a photo of a golf scorecard.\n\n"
        "• The first column contains player names.\n"
        "• The next 9 columns (cells 1–9) contain scores for holes 1 through 9, in order.\n"
        "• The next cell may be the total for holes 1–9 (you can ignore it).\n"
        "• There may also be 1 or 2 blank cells following the total — ignore those as well.\n"
        "• The next numeric cell after any blanks should be treated as hole 10.\n"
        "• The final 9 numeric cells (cells 10–18) contain scores for holes 10 through 18.\n\n"
        f"Please extract only the scores from the row where the first column contains the name {first_name}.\n"
        "Ignore all other names and rows. Do not infer values from similar names. Do not return partial rows or best guesses.\n\n"
        "Some important rules:\n\n"
        "- Each score must be treated independently, even if there are multiple identical scores in a row (e.g. \"4, 4, 4\"). Do not skip, merge, or assume duplicates are an error.\n"
        "- If the same digit appears multiple times, return each one separately in the correct order.\n"
        "- If a score is unreadable, unclear, or missing, set it to -1 in the output.\n"
        "- Do not include the total column or any summary values in the output.\n\n"
        "Return the scores for the player as a JSON object with string keys for each hole (from \"1\" to \"18\") and integer values.\n\n"
        "**Example output format:**\n"
        "```json\n"
        "{\n"
        "  \"1\": 4,\n"
        "  \"2\": 4,\n"
        "  \"3\": 4,\n"
        "  \"4\": 2,\n"
        "  \"5\": 3,\n"
        "  ...\n"
        "  \"18\": 5\n"
        "}```"
    )

    logger.info("Calling OpenAI with presigned image URL")

    try:
        openai.api_key = api_key

        response = openai.chat.completions.create(
            model="chatgpt-4o-latest",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt_text},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": preprocessed_image_url
                        },
                    },
                ],
            }],
        )

        return {
            "statusCode": 200,
            "headers": cors_headers(origin),
            "body": json.dumps({"status": "success", "message": response.choices[0].message.content})
        }

    except Exception as e:
        logger.error(f"OpenAI call failed: {str(e)}")
        return {
            "statusCode": 500,
            "headers": cors_headers(origin),
            "body": json.dumps({"status": "error", "message": "Error occurred"})
        }

# ---------------------------
# Lambda entrypoint
# ---------------------------

def lambda_handler(event, context):
    # Ensure 'headers' exists
    headers = event.get('headers') or {}
    origin = headers.get('origin', '')

    # Default to Amplify origin for testing (if missing or invoked by test tools)
    if origin == "" or "amazonaws.com" in headers.get("User-Agent", ""):
        origin = ALLOWED_ORIGINS[0]

    if origin not in ALLOWED_ORIGINS:
        return {
            "statusCode": 400,
            "body": json.dumps({"status": "error", "message": "Invalid origin"})
        }

    logger.info(f"Received event with path={event.get('path', '')}, method={event.get('httpMethod', '')}")

    http_method = event.get('httpMethod', '')
    if http_method == 'GET':
        return {
            'statusCode': 200,
            "headers": cors_headers(origin),
            'body': json.dumps('Smart Golf GET method')
        }
    elif http_method == 'POST':
        return get_secret(event, origin)
    else:
        return {
            "statusCode": 405,
            "headers": cors_headers(origin),
            "body": json.dumps({"message": "Method Not Allowed"})
        }
