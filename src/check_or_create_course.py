import json
import uuid
import boto3
import logging
import urllib.request
from boto3.dynamodb.conditions import Attr

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ALLOWED_ORIGINS = [
    "https://master.d2dnzia3915c3v.amplifyapp.com",
    "http://localhost:3000"
]

dynamodb = boto3.resource("dynamodb")
COURSES_TABLE = dynamodb.Table("sg_courses")
EXTERNAL_COURSE_LOOKUP_API = "https://c8h20trzmh.execute-api.us-east-2.amazonaws.com/DEV?course_id="


def fetch_course_data_from_external_api(external_course_id):
    """Fetch full course JSON from external API."""
    try:
        url = EXTERNAL_COURSE_LOOKUP_API + str(external_course_id)
        with urllib.request.urlopen(url) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        logger.error(f"❌ Failed to fetch external course data: {e}")
        return None


def check_create_course(event):
    try:
        body = json.loads(event.get("body", "{}"))
        logger.info(f"📥 Incoming course data: {body}")

        external_course_id = str(body.get("externalCourseID"))
        course_name = body.get("courseName")

        if not external_course_id or not course_name:
            return {
                "statusCode": 400,
                "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
                "body": json.dumps({"status": "error", "message": "Missing required fields"})
            }

        # Check if course exists already
        response = COURSES_TABLE.scan(
            FilterExpression=Attr("externalCourseID").eq(external_course_id)
        )

        if response["Items"]:
            logger.info("✅ Course already exists.")
            return {
                "statusCode": 200,
                "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
                "body": json.dumps({"status": "exists", "message": "Course already in sg_courses"})
            }

        # Fetch full course data
        full_course_data = fetch_course_data_from_external_api(external_course_id)
        if not full_course_data:
            return {
                "statusCode": 502,
                "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
                "body": json.dumps({"status": "error", "message": "Failed to fetch external course data"})
            }

        # Save to DynamoDB
        new_course_item = {
            "courseID": str(uuid.uuid4()),
            "externalCourseID": external_course_id,
            "courseName": course_name,
            "course_data": full_course_data
        }

        COURSES_TABLE.put_item(Item=new_course_item)
        logger.info("✅ Course inserted into sg_courses")

        return {
            "statusCode": 201,
            "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
            "body": json.dumps({"status": "inserted", "message": "Course added to sg_courses"})
        }

    except Exception as e:
        logger.error(f"❌ Error in check_create_course: {str(e)}")
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
            "body": json.dumps({"status": "error", "message": str(e)})
        }


def lambda_handler(event, context):
    headers = event.get('headers') or {}
    origin = headers.get('origin', '')
    if origin == "" or "amazonaws.com" in headers.get("User-Agent", ""):
        origin = ALLOWED_ORIGINS[0]

    if origin not in ALLOWED_ORIGINS:
        return {
            "statusCode": 400,
            "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
            "body": json.dumps({"status": "error", "message": "Invalid origin"})
        }

    logger.info(f"🌐 Received event: {json.dumps(event)}")

    method = event.get("httpMethod", "")
    if method == "GET":
        return {
            "statusCode": 200,
            "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
            "body": json.dumps("Smart Golf GET method")
        }
    elif method == "POST":
        return check_create_course(event)
    else:
        return {
            "statusCode": 405,
            "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
            "body": json.dumps({"message": "Method Not Allowed"})
        }
