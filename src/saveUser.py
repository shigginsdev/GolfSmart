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
    "https://main.d2dnzia3915c3v.amplifyapp.com",
    "http://localhost:3000"
]


# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
users_table = dynamodb.Table('sg_users')
users_table.scan(Limit=1)  # Test the connection
logger.info("Connected to sg_users table")

# clean up and flatten json data
def simplify_dynamodb_item(item):
    """Convert DynamoDB item to a flat JSON-serializable dict."""
    def convert_value(value):
        if isinstance(value, dict) and 'S' in value:
            return value['S']
        elif isinstance(value, dict) and 'N' in value:
            return int(value['N']) if value['N'].isdigit() else float(value['N'])
        elif isinstance(value, Decimal):
            return int(value) if value % 1 == 0 else float(value)
        else:
            return value

    return {k: convert_value(v) for k, v in item.items()}

def get_user_profile(event, origin):
    """Fetches the user profile securely using Cognito authentication."""
    try:
        # 🔹 Extract user ID from Cognito claims
        user_id = event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("sub")

        if not user_id:
            return {
                "statusCode": 401,
                "headers": {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Methods": "OPTIONS, GET, POST",
                },
                "body": json.dumps({"status": "error", "message": "User not authenticated"})
            }

        logger.info(f"Fetching user profile for userID: {user_id}")

        # 🔹 Fetch user profile from DynamoDB
        response = users_table.get_item(Key={"userID": user_id})
        user_data = response.get("Item")

        if not user_data:
            return {
                "statusCode": 404,
                "headers": {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Methods": "OPTIONS, GET, POST",
                },
                "body": json.dumps({"status": "error", "message": "User not found"})
            }

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Methods": "OPTIONS, GET, POST",
            },
            "body": json.dumps({"status": "success", "data": simplify_dynamodb_item(user_data)}),
        }

    except ClientError as e:
        logger.error(f"DynamoDB error: {str(e)}")
        return {"statusCode": 500, 
                "headers": {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Methods": "OPTIONS, GET, POST",
            },
            "body": json.dumps({"status": "error", "message": "Database error"})}
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {"statusCode": 500,
                "headers": {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Methods": "OPTIONS, GET, POST",
            },
            "body": json.dumps({"status": "error", "message": "An unexpected error occurred"})}


def save_user_profile(event, origin):
    """Handles POST request to save user profile settings"""
    try:
        
        user_profile = json.loads(event.get('body', '{}'))
        logger.debug(f"Processed user profile: {user_profile}")

        users_table.put_item(Item={
            'userID': str(user_profile['userID']),  # Primary Key
            'firstName': str(user_profile['firstName']),
            'lastName': str(user_profile['lastName']),
            'email': str(user_profile['email']),
            'homeCourseName': str(user_profile.get('homeCourseName', '')),
            'homeCourseID': str(user_profile.get('homeCourseID', '')),
            'scoringType': str(user_profile.get('scoringType', 'Normal Scoring')),
            'teeBox': str(user_profile.get('teeBox', 'Championship Back'))            
        })

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "OPTIONS,POST",
            },
            "body": json.dumps({"status": "success"})
        }

    except ClientError as e:
        logger.error(f"DynamoDB error: {str(e)}")
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Methods": "OPTIONS, GET, POST",
            },
            "body": json.dumps({"status": "error", "message": "Database error occurred"})
        }
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Methods": "OPTIONS, GET, POST",
            },
            "body": json.dumps({"status": "error", "message": "An unexpected error occurred"})
        }


def lambda_handler(event, context):
    """Main AWS Lambda handler"""

    # Ensure 'headers' exists in the event before accessing it
    headers = event.get('headers') or {}  # Ensure it's always a dictionary

    origin = headers.get('origin', '')  # Use default empty string if missing

    # if origin == "" or "amazonaws.com" in headers.get("User-Agent", ""):
    #     origin = origin  # Default to Amplify origin for testing

    if origin not in ALLOWED_ORIGINS:
        return {
            "statusCode": 400,
            "headers": {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Methods": "OPTIONS, GET, POST",
            },
            "body": json.dumps({"status": "error", "message": "Invalid origin"},)                           
        }

    logger.info(f"Received event: {json.dumps(event)}")

    # Detect the HTTP method
    http_method = event.get('httpMethod', '')
    path = event.get('path', '')

    if http_method == 'GET':
        return get_user_profile(event, origin)
    elif http_method == 'POST':
        return save_user_profile(event, origin)        
    else:
        return {
            "statusCode": 405,
            "headers": {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Allow-Methods": "OPTIONS, GET, POST",
            },
            "body": json.dumps({"message": "Method Not Allowed"})
        }