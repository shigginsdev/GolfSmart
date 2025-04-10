import json
import uuid
import boto3
from botocore.exceptions import ClientError
from decimal import Decimal

# ---------- Config ----------
DYNAMO_TABLE_NAME = "sg_courses"
COURSE_FILE = "test.json"  # your local file with nested course JSON

# ---------- Load JSON ----------
try:
    with open(COURSE_FILE, "r") as f:        
        course_json = json.load(f, parse_float=Decimal)
        course = course_json.get("course")
        if not course:
            raise ValueError("Missing 'course' key in JSON.")
except Exception as e:
    print(f"❌ Failed to load JSON: {e}")
    exit(1)

# ---------- Extract metadata ----------
course_name = course.get("course_name") or "Unnamed Course"
course_id = str(uuid.uuid4())

# ---------- Insert to DynamoDB ----------
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(DYNAMO_TABLE_NAME)

item = {
    "courseID": course_id,
    "courseName": course_name,
    "course_data": course
}

try:
    response = table.put_item(Item=item)
    print(f"✅ Inserted course '{course_name}' with ID: {course_id}")
except ClientError as e:
    print(f"❌ Failed to insert into DynamoDB: {e.response['Error']['Message']}")
