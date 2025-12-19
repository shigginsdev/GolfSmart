# import json
# import uuid
# import boto3
# from botocore.exceptions import ClientError
# from decimal import Decimal

# # ---------- Config ----------
# DYNAMO_TABLE_NAME = "sg_courses"
# COURSE_FILE = "test.json"  # your local file with nested course JSON

# # ---------- Load JSON ----------
# try:
#     with open(COURSE_FILE, "r") as f:        
#         course_json = json.load(f, parse_float=Decimal)
#         course = course_json.get("course")
#         if not course:
#             raise ValueError("Missing 'course' key in JSON.")
# except Exception as e:
#     print(f"❌ Failed to load JSON: {e}")
#     exit(1)

# # ---------- Extract metadata ----------
# course_name = course.get("course_name") or "Unnamed Course"
# course_id = str(uuid.uuid4())

# # ---------- Insert to DynamoDB ----------
# dynamodb = boto3.resource("dynamodb")
# table = dynamodb.Table(DYNAMO_TABLE_NAME)

# item = {
#     "courseID": course_id,
#     "courseName": course_name,
#     "course_data": course,
#     "externalCourseID": course.get("id") or "N/A"
# }

# try:
#     response = table.put_item(Item=item)
#     print(f"✅ Inserted course '{course_name}' with ID: {course_id}")
# except ClientError as e:
#     print(f"❌ Failed to insert into DynamoDB: {e.response['Error']['Message']}")

import json
import uuid
import boto3
from botocore.exceptions import ClientError
from decimal import Decimal
from datetime import date

# ---------- Config ----------
DYNAMO_TABLE_NAME = "sg_user_scores"

# ---------- Sample Data ----------
user_id = "910b0580-1011-70c0-81eb-043f806a2f91"
course_id = "123456"
score_id = str(uuid.uuid4())

# Example 18-hole data
hole_scores = [3, 5, 3, 1, 3, 2, 1, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]
hole_putts =  [2, 2, 2, 1, 2, 1, 1, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 2]

# ---------- Build item ----------
item = {
    "scoreID": score_id,
    "userID": user_id,
    "courseID": course_id,
    "Date": str(date.today())
}

# Add scores + putts to the item
for i in range(18):
    hole_num = i + 1
    item[f"Hole{hole_num}Score"] = Decimal(hole_scores[i])
    item[f"Hole{hole_num}Putts"] = Decimal(hole_putts[i])

# ---------- Insert to DynamoDB ----------
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(DYNAMO_TABLE_NAME)

try:
    response = table.put_item(Item=item)
    print(f"✅ Inserted user score for {user_id} | ScoreID: {score_id}")
except ClientError as e:
    print(f"❌ Failed to insert into DynamoDB: {e.response['Error']['Message']}")    
