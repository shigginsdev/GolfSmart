import logging
import json
import openai
import sys
import boto3
from botocore.exceptions import ClientError

sys.path.append('/opt/python/lib/python3.13/site-packages')  

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

# CORS Allowed Origins
ALLOWED_ORIGINS = [
    "https://master.d2dnzia3915c3v.amplifyapp.com",
    "http://localhost:3000"
]

def get_secret(event):

    first_name = event.get("firstName", "")
    imageURL = event.get("imageURL", "")
    logger.info(f"Received event: {json.dumps(event)}")

    secret_name = "openAI_API2"
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
        return {
            "statusCode": 405,
            "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
            "body": json.dumps({"message": "Error returning secrets"})
        }
    
    secret_dict = json.loads(get_secret_value_response['SecretString'])
    api_key = secret_dict.get("openAI_API2")  # Make sure this key matches what’s stored in AWS Secrets Manager

    if api_key == "":
        logger.error("No API key found in Secrets Manager")
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
            "body": json.dumps({"message": "Invalid API key retrieved"})
        }

    logger.info(f"Using OpenAI API Key: {api_key[:5]}********")  # ✅ Logs only part of the key for security
    

    try:
        openai.api_key = api_key

        #oai_client = OpenAI(api_key)
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": "Provide a list of all scores, holes 1 - 18, for Connor from the attached scorecard. Provide the output as json key value pairs with the hole number and their score for that hole. If you are unsure on a particular hole, respond with Unk."},
                    {
                        "type": "image_url",
                        "image_url": {
                            #"url": "https://live.staticflickr.com/65535/54384461051_d070850925.jpg",
                            "url": "https://mybucket-654572315465.s3.us-east-2.amazonaws.com/Image_20250312_0002.jpg?response-content-disposition=inline&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEKz%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FwEaCXVzLWVhc3QtMiJHMEUCIBejE3hsmpkJW8dW7raNSDHVNDXxtRB%2BZRiJ8E2ZdoB%2FAiEA%2B%2FKqft6XL1pFYfC2MInuObQYsT1Lzq2WbI4dCm1Y0fAq5wMI9v%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgwwNDc3MTk2MzExOTgiDAJme5uyiS3%2FRwxOhyq7A5ZUuyBK4j62VxEjepXLj30dITKMdhsHsmptVQqfcceLxP%2B1D4AHFYakAnqSpDhUn5r5fs5QvHCHvtpHhxlcWakaAC6dVdqPzglHUfksEyF32i6ji4XiynPzmjuMpCyiuEmZkmBO1EDN6jgLT3Y82SYZ8EOfXX5ZV6KJ6OrQsLD9f%2FE7tFIXbxKWAb6khXTipyI0%2Ftx3iszJyAACmJi7ELjY1CktOoCHYDkigxXPp3ykgHMsXsfuDA3JuDLPobuQ9ixwcWauGWUChwRGKucBeOF8A1DdKNHludhK2oUiv6ACunsPAjbbNvfqmW%2Bpc0NPkN41Db6yoR5T%2FBEImQ166ErpbHOFiowEOITpxow7FGVWowM6s%2FMaqtnMvkkJ8hEY6X9zWnDiJ%2F54ssZx8DNNpVElufe2blRExkzwCrNdzw7QR4G6zKHPzRNIdPSGDyahj%2B8ymps7KgIsE4RsjPg7rTJbpPsmDA7tNFGOm4Z%2B3GOCILwb4CuWepiMFz5An3ONypbgR4tjYHwLjIPEG8wK9o7cYkEPJyeIXG6VmMgOv%2BzkwfHBK1sfGWJrPPtcBoF46jmVMQBdTR5RxLQaMI%2Bj0b4GOuQCZQwjwLLhr9G5ItTm%2FJ4Mz3sl5yWYdpFqVvz0%2F4EvSpH%2B8p1KnWdGEAKQS9s0BwHqmXjpzhuuTQGWIyV0wbukwwPghVXIhsjy66ezoAAC%2B3fZrFBG4o0MM85nl7RkJ5HvtI3WNnSdk7DrGvkzopTp9MaLMJwV9krZ2a8LeyOhANY1%2BecDEpT2rlXi0vii7553pbBeBVL4%2FrJ1bc1crp2bFrgLNdF5d%2BQAWae4lBQiAQTkVy%2BbMuyugLwPTqeQvN0yp2i%2BtSH0SSPwGwCVkEAIGdzoUpEBB7CjIDda%2FAg8cd3ZaRTn3E%2BQRBmRV2%2B5BoDOWLumuMC8j0W2xG%2FA4ytg%2BGWoKjn%2FvCpuBhsVP6j3Wq2hD1ylOYulTvTskzS7M1B4q5KM%2F%2BfROGaVIRTpkL%2Ftui89lvBzfOso7w8DCsc5LY7svl7pf%2FuhSL1HBEAbPtJw7fBBJg69h8ISqW7T%2F6gEMeJ5qjA%3D&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIAQWHCPZFPJZN5HVTP%2F20250314%2Fus-east-2%2Fs3%2Faws4_request&X-Amz-Date=20250314T202515Z&X-Amz-Expires=10800&X-Amz-SignedHeaders=host&X-Amz-Signature=b62b443de85ac318838960b8150a0ca37f41ad978eb31a46fcec642c128c64d4",
                        },
                    },
                ],
            }],       
        )
        return {
                "statusCode": 200,
                "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
                "body": json.dumps({"status": "success", "message": response.choices[0].message.content})
            }   
    except ClientError as e:
        logger.error(f"Error: {str(e)}")
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
            "body": json.dumps({"status": "error", "message": "Error occurred"})
        }   
    
def lambda_handler(event, context):    
   
    # Ensure 'headers' exists in the event before accessing it
    headers = event.get('headers') or {}  # Ensure it's always a dictionary

    origin = headers.get('origin', '')  # Use default empty string if missing

    if origin == "" or "amazonaws.com" in headers.get("User-Agent", ""):
        origin = ALLOWED_ORIGINS[0]  # Default to Amplify origin for testing

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
            "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
            'body': json.dumps('Smart Golf GET method')
        }
    elif http_method == 'POST':
        return get_secret(event)
    else:
        return {
            "statusCode": 405,
            "headers": {"Access-Control-Allow-Origin": ALLOWED_ORIGINS[0]},
            "body": json.dumps({"message": "Method Not Allowed"})
        }