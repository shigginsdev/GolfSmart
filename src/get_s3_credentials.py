import logging
import json
import sys
import boto3
from botocore.exceptions import ClientError

sys.path.append('/opt/python/lib/python3.13/site-packages')  

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

# CORS Allowed Origins
ALLOWED_ORIGINS = [
    "https://master.d2dnzia3915c3v.amplifyapp.com",
    "https://main.d2dnzia3915c3v.amplifyapp.com/",
    "http://localhost:3000"
]


def get_s3_creds(event):

    logger.info(f"Received event: {json.dumps(event)}")

    secret_name = "s3UploadCredentials"
    region_name = "us-east-2"

    # Create a Secrets Manager client
    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name=region_name
    )

    try:
        secret_response = client.get_secret_value(SecretId=secret_name)  
        logger.info(f"Retrieved secret: {secret_response}")      
                
        # ✅ Parse the JSON string inside "SecretString"        
        
        secret_dict = json.loads(secret_response['SecretString'])
        logger.info(f"Retrieved secret_dict: {secret_dict}")
        
        return {
            "statusCode": 200,
            "headers": {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"},                        
            "body": json.dumps(secret_dict),
        }
    
    except ClientError as e:
        logger.error(f"Error retrieving secret: {e}")
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"message": "Error retrieving credentials"}),
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
        return get_s3_creds(event)        
    elif http_method == 'POST':
        return {
            "statusCode": 405,
            "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
            "body": json.dumps({"message": "Method Not Allowed"})
        }
    else:
        return {
            "statusCode": 405,
            "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
            "body": json.dumps({"message": "Method Not Allowed"})
        }