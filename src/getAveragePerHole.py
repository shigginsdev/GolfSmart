import json
import boto3
import logging
from decimal import Decimal
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key

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
users_table = dynamodb.Table('sg_user_scores')
COURSES_TABLE = dynamodb.Table("sg_courses")

def decimal_to_native(obj):
    """ Recursively convert Decimal to int or float """
    if isinstance(obj, list):
        return [decimal_to_native(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: decimal_to_native(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    else:
        return obj

def get_avg_per_hole(event, origin):
    """Fetches the user scores securely using Cognito authentication."""
    try:
        # 🔹 Extract user ID from Cognito claims
        user_id = event.get("requestContext", {}).get("authorizer", {}).get("claims", {}).get("sub")

        if not user_id:
            return {
                "statusCode": 401,
                "headers": {
                    "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0], 
                    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,authorization,X-Api-Key,X-Amz-Security-Token",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                "body": json.dumps({"status": "error", "message": "User not authenticated"})
            }        

        # Query the last 10 rounds sorted by date descending
        response = users_table.query(
            KeyConditionExpression=Key("userID").eq(user_id),
            ScanIndexForward=False,  # Descending order
            Limit=10
        )

        items = response.get("Items", [])

        # get unique course ids
        course_ids = list({ item["courseID"] for item in items })

        # 🚧 TEMPORARY WORKAROUND: Scan full table and filter in-memory
        if course_ids:
            course_scan = COURSES_TABLE.scan()
            all_courses = course_scan.get("Items", [])

            name_map = {
                course["courseID"]: course["courseName"]
                for course in all_courses
                if course["courseID"] in course_ids
            }
        else:
            name_map = {}

         # BatchGetItem to fetch courseName for each courseID
        # if course_ids:
        #     keys = [{"courseID": cid} for cid in course_ids]
        #     batch_resp = dynamodb.batch_get_item(
        #         RequestItems={
        #             "sg_courses": {
        #                 "Keys": keys,
        #                 "ProjectionExpression": "courseID, courseName"
        #             }
        #         }
        #     )
        #     name_map = {
        #         rec["courseID"]: rec["courseName"]
        #         for rec in batch_resp["Responses"].get("sg_courses", [])
        #     }
        # else:
        #     name_map = {}
        
        logger.info(f"📝 Name map: {name_map}")
        
        # Merge courseName into each score item
        for rec in items:
            rec["courseName"] = name_map.get(rec["courseID"], "")
        
        # Serialize Decimals
        safe_items = decimal_to_native(items)


        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
            "body": json.dumps(safe_items)

        }

    except Exception as e:
        logger.error(f"Error: {e}")
        return {
            "statusCode": 500,
            "headers": {
                    "Access-Control-Allow-Origin": origin, 
                    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,authorization,X-Api-Key,X-Amz-Security-Token",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },            
            "body": json.dumps({"message": "Server error"})
        }


def lambda_handler(event, context):
    """Main AWS Lambda handler"""

    logger.info(f"Received event: {json.dumps(event)}")

    # Ensure 'headers' exists in the event before accessing it
    headers = event.get('headers') or {}  # Ensure it's always a dictionary

    origin = headers.get('origin', '')  # Use default empty string if missing

    if origin == "" or "amazonaws.com" in headers.get("User-Agent", ""):
        origin = ALLOWED_ORIGINS[0]  # Default to Amplify origin for testing

    if origin not in ALLOWED_ORIGINS:
        return {
            "statusCode": 400,
            "headers": {
                    "Access-Control-Allow-Origin": origin, 
                    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,authorization,X-Api-Key,X-Amz-Security-Token",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
            "body": json.dumps({"status": "error", "message": "Invalid origin"},)                           
        }

    logger.info(f"Received event: {json.dumps(event)}")

    # Detect the HTTP method
    http_method = event.get('httpMethod', '')
    path = event.get('path', '')

    if http_method == 'GET':
        return get_avg_per_hole(event, origin)
    elif http_method == 'POST':
        return {
            "statusCode": 200,
            "headers": {
                    "Access-Control-Allow-Origin": origin, 
                    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,authorization,X-Api-Key,X-Amz-Security-Token",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
            "body": json.dumps({"message": "Method Not Allowed"})
        }
    elif http_method == 'OPTIONS':
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,authorization,X-Api-Key,X-Amz-Security-Token",                
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
            "body": json.dumps({"status": "ok"})
        }