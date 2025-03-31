import logging
import json
import openai
import sys
import boto3
from botocore.exceptions import ClientError

sys.path.append('/opt/python/lib/python3.13/site-packages')  

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

# CORS Allowed Origins
ALLOWED_ORIGINS = [
    "https://master.d2dnzia3915c3v.amplifyapp.com",
    "http://localhost:3000"
]

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
    logger.info("Provide a list of all scores, holes 1 - 18, for the row where the first column contains the name" + first_name + " from the attached scorecard. Provide the output as json key value pairs with the hole number and their score for that hole.")

    try:
        openai.api_key = api_key


        #oai_client = OpenAI(api_key)
        response = openai.chat.completions.create(
            model="chatgpt-4o-latest",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": "Provide a list of all scores, holes 1 - 18, for the row where the first column contains the name Phil from the attached scorecard. Provide the output as json key value pairs with the hole number and their score for that hole."},
                    {
                        "type": "image_url",
                        "image_url": {
                            #"url": "https://live.staticflickr.com/65535/54384461051_d070850925.jpg",
                            "url": imageURL,
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