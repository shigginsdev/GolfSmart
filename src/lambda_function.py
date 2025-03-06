import json
import boto3 
import logging
from decimal import Decimal
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

#for CORS
ALLOWED_ORIGINS = [
    "https://master.d2dnzia3915c3v.amplifyapp.com",
    "http://localhost:3000"
]

# Initialize DynamoDB resource (AWS Lambda automatically uses IAM role permissions)
dynamodb = boto3.resource('dynamodb')


#DynamoDB uses decimal.Decimal to handle floating-point numbers. This function converts Decimal to float for JSON serialization.
def convert_decimal(obj):
    """Recursively convert decimal.Decimal to float in a dictionary or list."""
    if isinstance(obj, Decimal):
        return float(obj)  # ✅ Convert Decimal → float
    elif isinstance(obj, dict):
        return {k: convert_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimal(i) for i in obj]
    else:
        return obj


def add_score(event):
    """Handles POST request and adds a new score"""
    try:
        score_table = dynamodb.Table('sg_user_scores')

        # Test the connection
        score_table.scan(Limit=1)
        logger.info("Successfully connected to DynamoDB sg_user_scores table")

    except Exception as e:
        logger.error(f"Failed to connect to DynamoDB: {str(e)}")

    try:
        # Parse and validate request body
        user_score = json.loads(event.get('body', '{}'))
        # is_valid, error_message = validate_input(user_score)
        is_valid = True

        if not is_valid:
            return {
                "statusCode": 400,
                "body": json.dumps({"status": "error", "message": error_message})
            }

        logger.debug(f"Processed input: {user_score}")

        score_table.put_item(Item={
            'userID': str(user_score['userId']),    # ✅ Partition Key
            'scoreID': str(user_score['scoreId']),  # ✅ Sort Key
            'Date': str(user_score['Date']),
            'Hole1Score': int(user_score['Hole1Score']),
            'Hole2Score': int(user_score['Hole2Score']),
            'Hole3Score': int(user_score['Hole3Score']),
            'Hole4Score': int(user_score['Hole4Score']),
            'Hole5Score': int(user_score['Hole5Score']),
            'Hole6Score': int(user_score['Hole6Score']),
            'Hole7Score': int(user_score['Hole7Score']),
            'Hole8Score': int(user_score['Hole8Score']),
            'Hole9Score': int(user_score['Hole9Score']),
            'Hole10Score': int(user_score['Hole10Score']),
            'Hole11Score': int(user_score['Hole11Score']),
            'Hole12Score': int(user_score['Hole12Score']),
            'Hole13Score': int(user_score['Hole13Score']),
            'Hole14Score': int(user_score['Hole14Score']),
            'Hole15Score': int(user_score['Hole15Score']),
            'Hole16Score': int(user_score['Hole16Score']),
            'Hole17Score': int(user_score['Hole17Score']),
            'Hole18Score': int(user_score['Hole18Score']),
        })

        # Return formatted response
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "https://master.d2dnzia3915c3v.amplifyapp.com",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "OPTIONS,POST",
            },
            "body": json.dumps({
                "status": "success",
            })
        }

    except ClientError as e:
        logger.error(f"DynamoDB error: {str(e)}")
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "https://master.d2dnzia3915c3v.amplifyapp.com",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "OPTIONS,POST",
            },
            "body": json.dumps({"status": "error", "message": "Database error occurred"})
        }
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "https://master.d2dnzia3915c3v.amplifyapp.com",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "OPTIONS,POST",
            },
            "body": json.dumps({"status": "error", "message": "An unexpected error occurred"})
        }

def lambda_handler(event, context):
    """Main AWS Lambda handler"""

    origin = event['headers'].get('origin')
    allowed_origin = origin if origin in ALLOWED_ORIGINS else ""
    
    if allowed_origin == "":
        return {
            "statusCode": 400,
            "body": json.dumps({"status": "error", "message": "Invalid origin"})
        }
    
    logger.info(f"Received event: {json.dumps(event)}")

    # Detect the HTTP method
    http_method = event.get('httpMethod', '')

    if http_method == 'GET':
        return {
            'statusCode': 200,
            "headers": {
                "Access-Control-Allow-Origin": "https://master.d2dnzia3915c3v.amplifyapp.com",
                "Access-Control-Allow-headers": "Content-Type",
                "Access-Control-Allow-Methods": "OPTIONS,POST",
            },
            'body': json.dumps('Smart Golf GET method')
        }
    elif http_method == 'POST':
        return add_score(event)  
    else:
        return {
            "statusCode": 405,
            "headers": {
                "Access-Control-Allow-Origin": "https://master.d2dnzia3915c3v.amplifyapp.com",
                "Access-Control-Allow-headers": "Content-Type",
                "Access-Control-Allow-Methods": "OPTIONS,POST",
            },
            "body": json.dumps({"message": "Method Not Allowed"})
        }
