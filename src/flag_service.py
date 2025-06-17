import json
import os
import logging
import time
import boto3
from boto3.dynamodb.conditions import Key

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ALLOWED_ORIGINS = [
    "https://master.d2dnzia3915c3v.amplifyapp.com",
    "https://main.d2dnzia3915c3v.amplifyapp.com",
    "http://localhost:3000"
]


# Dynamo client & table init (module-level for reuse / caching)
dynamodb = boto3.resource('dynamodb')
TABLE_NAME = os.environ.get('FLAGS_TABLE', 'sg_feature_flags')
table = dynamodb.Table(TABLE_NAME)

# In-memory cache
_CACHE = {}
_LAST_FETCH = 0
_TTL_SECONDS = 300  # refresh every 5m

def _load_flags(env: str, origin):
    global _CACHE, _LAST_FETCH
    now = time.time()
    # Return cached if fresh
    if env in _CACHE and (now - _LAST_FETCH < _TTL_SECONDS):
        # return _CACHE[env]
        logger.info(f"🌐 Returning cached flags for env: {_CACHE[env]}")
        return {
                "statusCode": 200,
                 "headers": {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                },
                "body": json.dumps(_CACHE[env])
            }

    # Fetch all flags for this environment
    resp = table.scan(
        FilterExpression=Key('environment').eq(env)
    )
    flags = {}
    for item in resp.get('Items', []):
        flags[item['flagname']] = {
            'isEnabled': item['isEnabled'],
            'config': item.get('config', {})
        }
    _CACHE[env] = flags
    _LAST_FETCH = now
    logger.info(f"🌐 Loaded flags for env: {flags}")
    return {
                    "statusCode": 200,
                    "headers": {
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,authorization,X-Api-Key,X-Amz-Security-Token",
                    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
                    },
                    "body": json.dumps(flags)
                }

def lambda_handler(event, context):
    
    env = 'dev'

    # CORS Stuff here
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
        return _load_flags(env, origin)
    
        # return {
        #     "statusCode": 200,
        #     "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
        #     "body": "GET method from flag_service"
        # }        
    elif method == "POST":
        return {
            "statusCode": 200,
             "headers": {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
            "body": "POST method from flag_service"
        }
    else:
        return {
            "statusCode": 405,
             "headers": {
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,authorization,X-Api-Key,X-Amz-Security-Token",
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
            },
            "body": json.dumps({"message": "Method Not Allowed"})
        }   
