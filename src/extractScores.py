import logging
import json
import openai
import sys
import boto3
from botocore.exceptions import ClientError
from PIL import Image, ImageEnhance, ExifTags
import requests
from io import BytesIO
import base64
from datetime import datetime
import time

sys.path.append('/opt/python/lib/python3.13/site-packages')  

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

# CORS Allowed Origins
ALLOWED_ORIGINS = [
    "https://master.d2dnzia3915c3v.amplifyapp.com",
    "http://localhost:3000"
]

# preprocessing of scorecard image
def preprocess_image(image_url, first_name):
    # Download the image
    response = requests.get(image_url)
    if response.status_code != 200:
        raise Exception("Failed to download image.")

    image = Image.open(BytesIO(response.content))

     # Step 1: Convert to grayscale
    image = image.convert("L")

    # Step 2: Ensure landscape orientation (rotate if portrait)
    if image.height > image.width:
        image = image.rotate(90, expand=True)

    # Step 3: Check if image is upside down (name column on right)
    # try:
    #     left_half = image.crop((0, 0, image.width // 2, image.height))
    #     right_half = image.crop((image.width // 2, 0, image.width, image.height))

    #     left_density = sum(left_half.getdata())
    #     right_density = sum(right_half.getdata())

    #     if right_density < left_density:
    #         image = image.rotate(180, expand=True)
    #         logger.info("Rotated image 180° to correct upside-down orientation.")
    # except Exception as e:
    #     logger.warning(f"Could not determine orientation by density: {e}")

    # Enhance contrast and sharpness
    enhancer_contrast = ImageEnhance.Contrast(image)
    image = enhancer_contrast.enhance(2.0)

    enhancer_sharpness = ImageEnhance.Sharpness(image)
    image = enhancer_sharpness.enhance(2.0)

    # Save to BytesIO buffer for both upload and base64
    image_bytes = BytesIO()
    image.save(image_bytes, format="PNG")

    # Upload a copy to S3
    try:
        s3 = boto3.client("s3")        

        timestamp = int(time.time())
        object_key = f"preprocessed/preprocessed-{first_name}-{timestamp}.png"

        s3_upload_buffer = BytesIO(image_bytes.getvalue())
        s3.upload_fileobj(s3_upload_buffer, "golf-scorecards-bucket", object_key, ExtraArgs={"ContentType": "image/png"})
        logger.info(f"Preprocessed image uploaded to S3: {object_key}")
    except Exception as e:
        logger.error(f"Failed to upload preprocessed image to S3: {e}")

    # Now read the base64 from the original buffer
    image_bytes.seek(0)
    base64_image = base64.b64encode(image_bytes.read()).decode("utf-8")

    public_url = f"https://golf-scorecards-bucket.s3.us-east-2.amazonaws.com/{object_key}"
    return public_url


def get_secret(event, origin):
    
    # Parse request body
    body = json.loads(event.get("body", "{}"))
    logger.info(f"Received body: {body}")
    imageURL = body.get("fileUrl")
    first_name = body.get("firstName", "Unknown")
    logger.info(f"Received event: {json.dumps(event)}")
    logger.info(f"Received imageURL: {imageURL}")
    
    secret_name = "openAI_API2"
    region_name = "us-east-2"

    # Preprocess the image
    try:
        # base64_image = preprocess_image(imageURL, first_name)
        preprocessed_image_url = preprocess_image(imageURL, first_name)
    except Exception as e:
        logger.error(f"Image preprocessing failed: {e}")
        return {
            "statusCode": 400,
            "headers": {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
            "body": json.dumps({"status": "error", "message": "Failed to preprocess image"})
        }

    # Create a Secrets Manager client
    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name=region_name
    )

    try:
        get_secret_value_response = client.get_secret_value(
            SecretId=secret_name
        )
    except ClientError as e:
        # For a list of exceptions thrown, see
        # https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
        return {
            "statusCode": 405,
            "headers": {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
            "body": json.dumps({"message": "Error returning secrets"})
        }
    
    secret_dict = json.loads(get_secret_value_response['SecretString'])
    api_key = secret_dict.get("openAI_API2")  # Make sure this key matches what’s stored in AWS Secrets Manager

    if api_key == "":
        logger.error("No API key found in Secrets Manager")
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
            "body": json.dumps({"message": "Invalid API key retrieved"})
        }

    logger.info(f"Using OpenAI API Key: {api_key[:5]}********")  # ✅ Logs only part of the key for security

    prompt_text = (
    "This is a photo of a golf scorecard.\n\n"
    "• The first column contains player names.\n"
    "• The next 9 columns (cells 1–9) contain scores for holes 1 through 9, in order.\n"
    "• The next cell may be the total for holes 1–9 (you can ignore it).\n"
    "• There may also be 1 or 2 blank cells following the total — ignore those as well.\n"
    "• The next numeric cell after any blanks should be treated as hole 10.\n"
    "• The final 9 numeric cells (cells 10–18) contain scores for holes 10 through 18.\n\n"
    "Please extract only the scores from the row where the first column contains the name " + first_name + ".\n"
    "Ignore all other names and rows. Do not infer values from similar names. Do not return partial rows or best guesses.\n\n"
    "Some important rules:\n\n"
    "- Each score must be treated independently, even if there are multiple identical scores in a row (e.g. \"4, 4, 4\"). Do not skip, merge, or assume duplicates are an error.\n"
    "- If the same digit appears multiple times, return each one separately in the correct order.\n"
    "- If a score is unreadable, unclear, or missing, set it to -1 in the output.\n"
    "- Do not include the total column or any summary values in the output.\n\n"
    "Return the scores for "+ first_name + " as a JSON object with string keys for each hole (from \"1\" to \"18\") and integer values.\n\n"
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

    logger.info(f"Prompt text: {prompt_text}")

    try:
        openai.api_key = api_key


        #oai_client = OpenAI(api_key)
        response = openai.chat.completions.create(
            model="chatgpt-4o-latest",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt_text},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": preprocessed_image_url,
                        },
                    },
                ],
            }],       
        )
        return {
                "statusCode": 200,
                "headers": {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
                "body": json.dumps({"status": "success", "message": response.choices[0].message.content})
            }   
    except ClientError as e:
        logger.error(f"Error: {str(e)}")
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
            "body": json.dumps({"status": "error", "message": "Error occurred"})
        }   
    
def lambda_handler(event, context):    
   
    # Ensure 'headers' exists in the event before accessing it
    headers = event.get('headers') or {}  # Ensure it's always a dictionary

    origin = headers.get('origin', '')  # Use default empty string if missing

    if origin == "" or "amazonaws.com" in headers.get("User-Agent", ""):
        origin = ALLOWED_ORIGINS[0]  # Default to Amplify origin for testing

    if origin not in ALLOWED_ORIGINS:
        return {
            "statusCode": 400,
            "body": json.dumps({"status": "error", "message": "Invalid origin"},)                           
        }

    logger.info(f"Received event: {json.dumps(event)}")

    # Detect the HTTP method
    http_method = event.get('httpMethod', '')
    path = event.get('path', '')

    if http_method == 'GET':
        return {
            'statusCode': 200,
            "headers": {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
            'body': json.dumps('Smart Golf GET method')
        }
    elif http_method == 'POST':
        return get_secret(event, origin)
    else:
        return {
            "statusCode": 405,
            "headers": {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
            "body": json.dumps({"message": "Method Not Allowed"})
        }