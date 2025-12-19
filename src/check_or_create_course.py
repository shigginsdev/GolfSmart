import json
import urllib.error
import uuid
import boto3
import logging
from decimal import Decimal
import urllib.request
from boto3.dynamodb.conditions import Attr
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ALLOWED_ORIGINS = [
    "https://master.d2dnzia3915c3v.amplifyapp.com",
    "https://main.d2dnzia3915c3v.amplifyapp.com",
    "http://localhost:3000"
]

dynamodb = boto3.resource("dynamodb")
COURSES_TABLE = dynamodb.Table("sg_courses")
EXTERNAL_COURSE_LOOKUP_API = "https://c8h20trzmh.execute-api.us-east-2.amazonaws.com/DEV?course_id="

def fetch_course_data_from_external_api(external_course_id):
    """Fetch full course JSON from external API."""  

    secret_name = "golfCourseAPI"
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
        raise e

    # secret = get_secret_value_response['SecretString']
    secret = json.loads(get_secret_value_response['SecretString'])
    api_key = secret.get("Authorization")   
      
            
    url = f"https://api.golfcourseapi.com/v1/courses/{external_course_id}"    

    req = urllib.request.Request(
        url,
        headers={"Authorization": api_key}
    )       

    try:
        with urllib.request.urlopen(req) as response:
            raw_data = response.read()
            return json.loads(raw_data, parse_float=Decimal)
    except urllib.error.HTTPError as he:
        body = he.read().decode(errors='replace')
        logger.error(f"External API HTTPError {he.code}: {he.reason} — body: {body!r}")
        raise    

def check_create_course(event):
    """
    Handles the creation or retrieval of a golf course record based on incoming event data.
    This function checks if a course with the provided externalCourseID already exists in the DynamoDB table.
    If it exists, returns the course's UUID. If not, fetches full course data from an external API, saves it to the database,
    and returns the new course's UUID.
    Args:
        event (dict): The event payload containing course data, typically from an API Gateway request.
            Expected keys in event["body"]:
                - externalCourseID (str): The external identifier for the course.
                - courseName (str): The name of the course.
    Returns:
        dict: A response object with statusCode, headers, and body (JSON string) containing either the course UUID,
              an error message, or a status indicator.
    Raises:
        Returns a 400 status code if required fields are missing.
        Returns a 502 status code if external course data cannot be fetched.
        Returns a 500 status code for unexpected errors.
    """
    try:
        body = json.loads(event.get("body", "{}"))
        logger.info(f"📥 Incoming course data: {body}")

        external_course_id = str(body.get("externalCourseID"))
        course_name = body.get("courseName")

        # external_course_id = str(body.get("id"))
        # course_name = body.get("club_name") 

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

        logger.info(f"🔍 DynamoDB response: {response}")

        if response["Items"]:
            logger.info("✅ Course already exists.")
            return {
                "statusCode": 200,
                "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},                
                "body": json.dumps({"uuid": response["Items"][0]["courseID"]})
            }

        # Fetch full course data
        full_course_data = fetch_course_data_from_external_api(external_course_id)
        logger.info(f"📦 Fetched full course data: {full_course_data}")

        if not full_course_data:
            return {
                "statusCode": 502,
                "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
                "body": json.dumps({"status": "error", "message": "Failed to fetch external course data"})
            }

        # Save to DynamoDB
        logger.info("saving new course to DB")
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
            "body": json.dumps({"uuid": new_course_item["courseID"]})
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
        # New logic to search for courses in DynamoDB
        query_params = event.get("queryStringParameters", {})
        search_query = query_params.get("search_query", "").lower()

        logger.info(f"🔍 Query params: {json.dumps(query_params)}")
        logger.info(f"🔍 Search query: {search_query}")

        if not search_query or len(search_query) < 2:
            return {
                "statusCode": 400,
                "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
                "body": json.dumps({"status": "error", "message": "Missing or too short search_query"})
            }        

        response = COURSES_TABLE.scan(
    ProjectionExpression="courseID, externalCourseID, courseName"
        )

        all_courses = response.get("Items", [])

        matches = [
            course for course in all_courses
            if "courseName" in course and search_query in course["courseName"].lower()
        ]

        logger.info(f"🎯 Matched courses: {json.dumps(matches)}")

        return {
            "statusCode": 200,
            "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
            "body": json.dumps({"courses": matches})
        }        
    elif method == "POST":
        return check_create_course(event)
    else:
        return {
            "statusCode": 405,
            "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
            "body": json.dumps({"message": "Method Not Allowed"})
        }
