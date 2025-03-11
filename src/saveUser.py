import json
import boto3
import logging
from decimal import Decimal
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

# CORS Allowed Origins
ALLOWED_ORIGINS = [
    "https://master.d2dnzia3915c3v.amplifyapp.com",
    "http://localhost:3000"
]

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')

def get_user_profile(event):
    """Handles GET request to fetch user profile"""
    try:
        # Extract userID from the authenticated user context
        user_id = event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("sub")

        if not user_id:
            return {"statusCode": 400, "body": json.dumps({"status": "error", "message": "User not authenticated"})}

        response = users_table.get_item(Key={'userID': user_id})
        user_data = response.get('Item')

        if not user_data:
            return {"statusCode": 404, "body": json.dumps({"status": "error", "message": "User not found"})}

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
            },
            "body": json.dumps({"status": "success", "data": user_data})
        }

    except ClientError as e:
        logger.error(f"DynamoDB error: {str(e)}")
        return {"statusCode": 500, "body": json.dumps({"status": "error", "message": "Database error"})}
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {"statusCode": 500, "body": json.dumps({"status": "error", "message": "An unexpected error occurred"})}


def save_user_profile(event):
    """Handles POST request to save user profile settings"""
    try:
        users_table = dynamodb.Table('sg_users')
        users_table.scan(Limit=1)  # Test the connection
        logger.info("Connected to sg_users table")

        user_profile = json.loads(event.get('body', '{}'))
        logger.debug(f"Processed user profile: {user_profile}")

        users_table.put_item(Item={
            'userID': str(user_profile['userID']),  # Primary Key
            'firstName': str(user_profile['firstName']),
            'lastName': str(user_profile['lastName']),
            'email': str(user_profile['email']),
            'homeCourse': str(user_profile.get('homeCourse', '')),
            'scoringType': str(user_profile.get('scoringType', 'Normal Scoring')),
            'teeBox': str(user_profile.get('teeBox', 'Championship Back'))            
        })

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "OPTIONS,POST",
            },
            "body": json.dumps({"status": "success"})
        }

    except ClientError as e:
        logger.error(f"DynamoDB error: {str(e)}")
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
            "body": json.dumps({"status": "error", "message": "Database error occurred"})
        }
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
            "body": json.dumps({"status": "error", "message": "An unexpected error occurred"})
        }


def lambda_handler(event, context):
    """Main AWS Lambda handler"""

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
        return get_user_profile(event)
    elif http_method == 'POST':
        return save_user_profile(event)        
    else:
        return {
            "statusCode": 405,
            "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
            "body": json.dumps({"message": "Method Not Allowed"})
        }