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

def add_score(event, origin):
    """Handles POST request to add a golf score"""
    try:
        score_table = dynamodb.Table('sg_user_scores')
        user_table = dynamodb.Table('sg_users')

        score_table.scan(Limit=1)  # Test the connection
        logger.info("Connected to sg_user_scores table")

        user_score = json.loads(event.get('body', '{}'))
        logger.debug(f"Processed input: {user_score}")

        user_id = str(user_score['userId'])

        # Save the user's score
        score_table.put_item(Item={
            'userID': str(user_score['userId']),
            'scoreID': str(user_score['scoreId']),
            'courseID': str(user_score.get('courseID', '')),
            'Date': str(user_score['Date']),
            **{f'Hole{i+1}Score': int(user_score[f'Hole{i+1}Score']) for i in range(18)}
        })

         # Increment uploadCount in sg_users
        user_table.update_item(
            Key={'userID': user_id},
            UpdateExpression="SET uploadCount = if_not_exists(uploadCount, :start) + :inc",
            ExpressionAttributeValues={
                ':inc': Decimal(1),
                ':start': Decimal(0)
            }
        )

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
            "headers": {"Access-Control-Allow-Origin": origin},
            "body": json.dumps({"status": "error", "message": "Database error occurred"})
        }
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": origin},
            "body": json.dumps({"status": "error", "message": "An unexpected error occurred"})
        }



def lambda_handler(event, context):
    """Main AWS Lambda handler"""

    # Ensure 'headers' exists in the event before accessing it
    headers = event.get('headers') or {}  # Ensure it's always a dictionary

    origin = headers.get('origin', '')  # Use default empty string if missing

    if origin == "" or "amazonaws.com" in headers.get("User-Agent", ""):
        origin = origin  # Default to Amplify origin for testing

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
            "headers": {"Access-Control-Allow-Origin": origin},
            'body': json.dumps('Smart Golf GET method')
        }
    elif http_method == 'POST':
        return add_score(event, origin)
    else:
        return {
            "statusCode": 405,
            "headers": {"Access-Control-Allow-Origin": origin},
            "body": json.dumps({"message": "Method Not Allowed"})
        }