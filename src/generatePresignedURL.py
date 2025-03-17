import json
import boto3
import os
import logging
from botocore.exceptions import ClientError

# CORS Allowed Origins
ALLOWED_ORIGINS = [
    "https://master.d2dnzia3915c3v.amplifyapp.com",
    "http://localhost:3000"
]

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# S3 Bucket Name (Replace with your actual bucket)
S3_BUCKET = "golf-scorecards-bucket"

# Initialize S3 client
s3_client = boto3.client("s3")

def get_url(event):
    try:
        # Parse request body
        body = json.loads(event.get("body", "{}"))
        file_name = body.get("fileName")
        content_type = body.get("contentType")

        if file_name == "" or content_type == "":
            return {
                "statusCode": 400,
                "body": json.dumps({"message": "Missing fileName or contentType"})
            }

        # Generate pre-signed URL
        presigned_url = s3_client.generate_presigned_url(
            "put_object",
            Params={"Bucket": S3_BUCKET, "Key": file_name, "ContentType": content_type},
            ExpiresIn=3600  # URL expires in 1 hour
        )

        file_url = f"https://{S3_BUCKET}.s3.amazonaws.com/{file_name}"

        return {
            "statusCode": 200,
            "body": json.dumps({"uploadUrl": presigned_url, "fileUrl": file_url})
        }

    except ClientError as e:
        logger.error(f"Error generating pre-signed URL: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"message": "Error generating pre-signed URL"})
        }

def lambda_handler(event, context):
    """ Generates a pre-signed URL for uploading a file to S3 """

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
            "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
            'body': json.dumps('Smart Golf GET method')
        }
    elif http_method == 'POST':
        return get_url(event)
    else:
        return {
            "statusCode": 405,
            "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
            "body": json.dumps({"message": "Method Not Allowed"})
        }


    