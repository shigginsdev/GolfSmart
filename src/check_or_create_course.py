import json
import uuid
import boto3
import logging
from boto3.dynamodb.conditions import Key

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Define allowed origins for CORS
ALLOWED_ORIGINS = [
    "https://master.d2dnzia3915c3v.amplifyapp.com",
    "http://localhost:3000"
]

dynamodb = boto3.resource("dynamodb")
COURSES_TABLE = dynamodb.Table("sg_courses")


def check_create_course(event):
    """Handles checking for an existing course or creating a new one."""
    try:
        body = json.loads(event.get("body", "{}"))
        logger.info(f"📥 Incoming course data: {body}")

        external_course_id = str(body.get("externalCourseID"))
        course_name = body.get("courseName")
        course_data = body.get("courseData")

        if not external_course_id or not course_name or not course_data:
            return {
                "statusCode": 400,
                "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
                "body": json.dumps({"status": "error", "message": "Missing required fields"})
            }

        # Query sg_courses table to check if course already exists
        response = COURSES_TABLE.scan(
            FilterExpression="externalCourseID = :id",
            ExpressionAttributeValues={":id": external_course_id}
        )

        if response["Items"]:
            logger.info("✅ Course already exists, skipping insert.")
            return {
                "statusCode": 200,
                "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
                "body": json.dumps({"status": "exists", "message": "Course already in sg_courses"})
            }

        # Insert the new course
        new_course_item = {
            "courseID": str(uuid.uuid4()),
            "externalCourseID": external_course_id,
            "courseName": course_name,
            "course_data": course_data
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
    """Main AWS Lambda handler"""

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

    http_method = event.get('httpMethod', '')
    path = event.get('path', '')

    if http_method == 'GET':
        return {
            'statusCode': 200,
            "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
            'body': json.dumps('Smart Golf GET method')
        }
    elif http_method == 'POST':
        return check_create_course(event)
    else:
        return {
            "statusCode": 405,
            "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
            "body": json.dumps({"message": "Method Not Allowed"})
        }
