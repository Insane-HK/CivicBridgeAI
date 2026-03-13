"""
CivicBridge AI — Health Check Lambda
Returns system status and component health.
"""
import json
import os
import time
import boto3

dynamodb = boto3.resource("dynamodb")
s3       = boto3.client("s3")
bedrock  = boto3.client("bedrock-runtime", region_name=os.environ.get("BEDROCK_REGION", "us-east-1"))

SCHEMES_TABLE  = os.environ.get("SCHEMES_TABLE",  "CivicBridge-Schemes-dev")
SCHEMES_BUCKET = os.environ.get("SCHEMES_BUCKET", "")

CORS_HEADERS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Content-Type": "application/json",
}


def check_dynamodb():
    try:
        dynamodb.Table(SCHEMES_TABLE).load()
        return {"status": "healthy", "table": SCHEMES_TABLE}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


def check_s3():
    try:
        if SCHEMES_BUCKET:
            s3.head_bucket(Bucket=SCHEMES_BUCKET)
        return {"status": "healthy", "bucket": SCHEMES_BUCKET or "not configured"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


def check_bedrock():
    try:
        # Minimal ping to verify Bedrock connectivity
        bedrock.invoke_model(
            modelId="amazon.nova-lite-v1:0",
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "messages": [{"role": "user", "content": [{"text": "Hi"}]}],
                "inferenceConfig": {
                    "max_new_tokens": 5,
                }
            }),
        )
        return {"status": "healthy", "model": "amazon.nova-lite-v1:0"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


def lambda_handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    start = time.time()
    components = {
        "dynamodb": check_dynamodb(),
        "s3":       check_s3(),
        "bedrock":  check_bedrock(),
    }
    all_healthy = all(c["status"] == "healthy" for c in components.values())
    return {
        "statusCode": 200 if all_healthy else 503,
        "headers":    CORS_HEADERS,
        "body": json.dumps({
            "status":     "healthy" if all_healthy else "degraded",
            "timestamp":  time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "duration_ms": round((time.time() - start) * 1000),
            "components": components,
            "version":    "1.0.0-mvp",
        }),
    }
