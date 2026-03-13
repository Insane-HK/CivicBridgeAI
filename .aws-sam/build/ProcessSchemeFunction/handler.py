"""
CivicBridge AI — ProcessScheme Lambda (Matchmaker Engine)
Triggered by: S3 ObjectCreated (PDF upload) OR POST /schemes (admin REST API)
Flow: Download PDF → Bedrock Nova Pro extraction → DynamoDB save → User matching → SNS SMS alerts
"""
import json
import os
import re
import uuid
import time
import io
import boto3
from botocore.exceptions import ClientError

# ─── Clients ──────────────────────────────────────────────────────────────────
s3        = boto3.client("s3")
dynamodb  = boto3.resource("dynamodb")
sns       = boto3.client("sns")
bedrock   = boto3.client("bedrock-runtime", region_name=os.environ.get("BEDROCK_REGION", "us-east-1"))

SCHEMES_TABLE = os.environ.get("SCHEMES_TABLE", "CivicBridge-Schemes-dev")
USERS_TABLE   = os.environ.get("USERS_TABLE",   "CivicBridge-Users-dev")
SNS_TOPIC_ARN = os.environ.get("SNS_TOPIC_ARN", "")
SCHEMES_BUCKET = os.environ.get("SCHEMES_BUCKET", "")
CHAT_URL      = os.environ.get("CHAT_URL", "https://civicbridge.example.com")
ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY", "civicbridge-admin-secret-change-me")

CORS_HEADERS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Api-Key",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Content-Type": "application/json",
}

NOVA_PRO_MODEL = "us.amazon.nova-pro-v1:0"
MAX_PDF_SIZE   = 10 * 1024 * 1024   # 10 MB
SMS_BATCH_SIZE = 100

EDUCATION_HIERARCHY = ["illiterate", "primary", "secondary", "higher_secondary", "graduate", "postgraduate"]


# ─── Structured Logger ─────────────────────────────────────────────────────────

def log(level, message, **kwargs):
    entry = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "level":     level,
        "function":  "ProcessScheme",
        "message":   message,
        **kwargs,
    }
    print(json.dumps(entry))


# ─── Retry Helper ──────────────────────────────────────────────────────────────

def with_retry(fn, max_retries=3):
    for attempt in range(max_retries):
        try:
            return fn()
        except ClientError as e:
            code = e.response["Error"]["Code"]
            if code in ("ThrottlingException", "ProvisionedThroughputExceededException"):
                wait = 2 ** attempt
                log("WARN", f"Throttled, retrying in {wait}s", attempt=attempt)
                time.sleep(wait)
            else:
                raise
    raise Exception(f"Failed after {max_retries} retries")


# ─── Step 1: Download & validate PDF ─────────────────────────────────────────

def download_pdf_from_s3(bucket, key):
    """Download and validate PDF from S3. Returns raw bytes."""
    obj = s3.get_object(Bucket=bucket, Key=key)
    size = obj["ContentLength"]
    if size > MAX_PDF_SIZE:
        raise ValueError(f"PDF too large: {size} bytes (max {MAX_PDF_SIZE})")
    data = obj["Body"].read()
    if not data.startswith(b"%PDF"):
        raise ValueError("File is not a valid PDF (missing PDF header)")
    log("INFO", "PDF downloaded", bucket=bucket, key=key, size_bytes=size)
    return data

def extract_text_from_pdf(pdf_bytes):
    """
    Basic PDF text extraction (no external deps).
    Extracts readable ASCII/UTF-8 text from PDF stream.
    For production use PyMuPDF or pdfplumber via Lambda Layer.
    """
    try:
        text = pdf_bytes.decode("latin-1", errors="replace")
        # Extract text streams between BT (begin text) and ET (end text)
        streams = re.findall(r"BT(.*?)ET", text, re.DOTALL)
        readable = []
        for s in streams:
            # Extract Tj / TJ strings
            chunks = re.findall(r"\(([^)]+)\)", s)
            readable.extend(chunks)
        extracted = " ".join(readable)
        # If stream extraction fails, fall back to raw ASCII
        if len(extracted) < 100:
            extracted = re.sub(r"[^\x20-\x7e\n]", " ", text)
            extracted = re.sub(r" {3,}", " ", extracted)
        return extracted[:5000]
    except Exception as e:
        log("WARN", f"PDF text extraction partial: {e}")
        return str(pdf_bytes[:3000], "latin-1", errors="replace")


# ─── Step 2: Bedrock extraction ───────────────────────────────────────────────

EXTRACTION_PROMPT = """You are an expert at parsing Indian government scheme eligibility documents.
Extract ONLY the hard eligibility criteria from the text below.
Return ONLY valid JSON with exactly this structure (no explanation, no markdown):

{{
    "scheme_name": "Full official scheme name",
    "age_min": 0,
    "age_max": 120,
    "income_max": 999999999,
    "education_level": "illiterate|primary|secondary|higher_secondary|graduate|postgraduate",
    "state": null,
    "district": null,
    "additional_criteria": {{}}
}}

Document text:
{text}"""

def extract_eligibility_with_bedrock(pdf_text):
    """Call Nova Pro to extract eligibility rules from PDF text."""
    prompt = EXTRACTION_PROMPT.format(text=pdf_text[:4000])

    def call_bedrock():
        return bedrock.invoke_model(
            modelId=NOVA_PRO_MODEL,
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "messages": [{"role": "user", "content": [{"text": prompt}]}],
                "inferenceConfig": {
                    "max_new_tokens": 800,
                    "temperature": 0.0,
                }
            }),
        )

    response = with_retry(call_bedrock)
    body = json.loads(response["body"].read())

    # Parse response (Nova Pro format)
    content = body.get("output", {}).get("message", {}).get("content", [])
    text = content[0].get("text", "{}").strip() if content else "{}"

    # Strip markdown fences
    for fence in ("```json", "```"):
        if text.startswith(fence):
            text = text[len(fence):]
    if text.endswith("```"):
        text = text[:-3]

    rules = json.loads(text.strip())

    # Validate required fields
    required = ["scheme_name", "age_min", "age_max", "income_max", "education_level"]
    missing  = [f for f in required if f not in rules]
    if missing:
        raise ValueError(f"Bedrock response missing fields: {missing}")

    # Clamp defaults
    rules.setdefault("state", None)
    rules.setdefault("district", None)
    rules.setdefault("additional_criteria", {})

    log("INFO", "Eligibility extracted", scheme_name=rules.get("scheme_name"))
    return rules


# ─── Step 3: Save to DynamoDB ─────────────────────────────────────────────────

def save_scheme(scheme_id, rules, pdf_s3_key):
    table = dynamodb.Table(SCHEMES_TABLE)
    item  = {
        "scheme_id":         scheme_id,
        "scheme_name":       rules["scheme_name"],
        "eligibility_rules": rules,
        "pdf_s3_key":        pdf_s3_key,
        "upload_timestamp":  int(time.time()),
        "status":            "active",
    }
    with_retry(lambda: table.put_item(Item=item))
    log("INFO", "Scheme saved to DynamoDB", scheme_id=scheme_id)
    return item


# ─── Step 4: User matching ────────────────────────────────────────────────────

def meets_education(user_level, required_level):
    try:
        return EDUCATION_HIERARCHY.index(user_level) >= EDUCATION_HIERARCHY.index(required_level)
    except ValueError:
        return True  # If unknown level, don't exclude

def match_user(user, rules):
    """Returns True if user meets all eligibility criteria."""
    try:
        age, income, edu = int(user.get("age", 0)), float(user.get("income", 0)), user.get("education_level", "")
        state, district  = user.get("state", ""), user.get("district", "")

        if rules.get("age_min") and age < rules["age_min"]:    return False
        if rules.get("age_max") and age > rules["age_max"]:    return False
        if rules.get("income_max") and income > rules["income_max"]: return False
        if rules.get("education_level") and not meets_education(edu, rules["education_level"]): return False
        if rules.get("state") and state.lower() != rules["state"].lower(): return False
        if rules.get("district") and district.lower() != rules["district"].lower(): return False
        return True
    except Exception as e:
        log("WARN", "User match error (skipping)", user_id=user.get("user_id"), error=str(e))
        return False

def get_all_users():
    """Scan Users table. For 10k+ records this uses pagination."""
    table    = dynamodb.Table(USERS_TABLE)
    users    = []
    last_key = None
    while True:
        kwargs = {}
        if last_key:
            kwargs["ExclusiveStartKey"] = last_key
        resp     = table.scan(**kwargs)
        users   += resp.get("Items", [])
        last_key = resp.get("LastEvaluatedKey")
        if not last_key:
            break
    log("INFO", f"Scanned {len(users)} users")
    return users

def match_users(rules):
    """Returns list of matched users."""
    all_users   = get_all_users()
    matched     = [u for u in all_users if match_user(u, rules)]
    log("INFO", f"Matched {len(matched)}/{len(all_users)} users", scheme=rules.get("scheme_name"))
    return matched


# ─── Step 5: SNS notifications ────────────────────────────────────────────────

def format_targeted_sms(scheme_name):
    name_short = scheme_name[:60]
    return (
        f"🎯 CivicBridge Alert!\n"
        f"{name_short} scheme ke liye aap eligible hain!\n"
        f"Poori jankari: {CHAT_URL}\n"
        f"Reply STOP to unsubscribe"
    )

def format_broadcast_sms(scheme_name):
    name_short = scheme_name[:55]
    return (
        f"📢 Naya Scheme: {name_short}!\n"
        f"Dekhen kya aap eligible hain: {CHAT_URL}\n"
        f"Reply STOP to unsubscribe"
    )

def _send_batch(users, message, label):
    """Core batch SMS sender. Returns (sent, failed) counts."""
    if not SNS_TOPIC_ARN:
        log("WARN", f"SNS_TOPIC_ARN not set, skipping {label} notifications")
        return 0, 0

    sent, failed = 0, 0
    for i in range(0, len(users), SMS_BATCH_SIZE):
        batch = users[i:i + SMS_BATCH_SIZE]
        for user in batch:
            phone = user.get("phone_number", "")
            if not phone:
                continue
            if not phone.startswith("+91"):
                phone = f"+91{phone}"
            try:
                sns.publish(
                    PhoneNumber=phone,
                    Message=message,
                    MessageAttributes={
                        "AWS.SNS.SMS.SMSType": {"DataType": "String", "StringValue": "Transactional"}
                    },
                )
                sent += 1
            except ClientError as e:
                failed += 1
                log("ERROR", f"SMS send failed ({label})", user_id=user.get("user_id"), error=str(e))
        time.sleep(0.1)  # Respect SNS rate limits

    log("INFO", f"{label} SMS done", sent=sent, failed=failed)
    return sent, failed


def send_targeted_sms(matched_users, scheme_name):
    """Send targeted SMS to users who are eligible for the scheme."""
    if not matched_users:
        return 0
    message = format_targeted_sms(scheme_name)
    sent, _ = _send_batch(matched_users, message, "targeted")
    return sent


def send_broadcast_sms(all_users, matched_user_ids, scheme_name):
    """Send broadcast SMS to ALL opted-in users EXCEPT those who already got a targeted SMS."""
    # Users who haven’t been targeted get the broadcast
    # Include users with sms_opted_in True, or users with no sms_opted_in field (legacy registrations)
    non_targeted = [
        u for u in all_users
        if u.get("user_id") not in matched_user_ids
        and u.get("sms_opted_in", True)  # default True for legacy users
    ]
    if not non_targeted:
        return 0
    message = format_broadcast_sms(scheme_name)
    sent, _ = _send_batch(non_targeted, message, "broadcast")
    return sent


# ─── Response helpers ─────────────────────────────────────────────────────────

def ok(body):
    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps(body, ensure_ascii=False)}

def err(status, message):
    return {"statusCode": status, "headers": CORS_HEADERS, "body": json.dumps({"error": message})}


# ─── Main Lambda Handler ───────────────────────────────────────────────────────

def run_pipeline(bucket, key, scheme_id):
    """Full Matchmaker Engine pipeline with dual SMS (targeted + broadcast)."""
    # 1. Download PDF
    pdf_bytes = download_pdf_from_s3(bucket, key)
    pdf_text  = extract_text_from_pdf(pdf_bytes)

    # 2. Extract eligibility rules
    rules = extract_eligibility_with_bedrock(pdf_text)

    # 3. Save scheme
    save_scheme(scheme_id, rules, key)

    # 4. Fetch all users once
    all_users = get_all_users()

    # 5. Match eligible users
    matched     = [u for u in all_users if match_user(u, rules)]
    matched_ids = {u["user_id"] for u in matched}
    log("INFO", f"Matched {len(matched)}/{len(all_users)} users", scheme=rules.get("scheme_name"))

    # 6a. Targeted SMS to eligible users
    targeted_sent = send_targeted_sms(matched, rules["scheme_name"])

    # 6b. Broadcast SMS to all opted-in users NOT already targeted
    broadcast_sent = send_broadcast_sms(all_users, matched_ids, rules["scheme_name"])

    return {
        "scheme_id":        scheme_id,
        "scheme_name":      rules["scheme_name"],
        "total_users":      len(all_users),
        "matched_users":    len(matched),
        "targeted_sms":     targeted_sent,
        "broadcast_sms":    broadcast_sent,
        "total_sms_sent":   targeted_sent + broadcast_sent,
        "status":           "complete",
    }


def lambda_handler(event, context):
    # ── S3 Event Trigger ──────────────────────────────────────────
    if "Records" in event and event["Records"][0].get("eventSource") == "aws:s3":
        results = []
        for record in event["Records"]:
            bucket = record["s3"]["bucket"]["name"]
            key    = record["s3"]["object"]["key"]
            scheme_id = str(uuid.uuid4())
            try:
                result = run_pipeline(bucket, key, scheme_id)
                results.append(result)
                log("INFO", "Pipeline complete", **result)
            except Exception as e:
                log("ERROR", "Pipeline failed", key=key, error=str(e))
                results.append({"key": key, "error": str(e), "status": "failed"})
        return {"statusCode": 200, "body": json.dumps(results)}

    # ── REST API Trigger (POST /schemes) ──────────────────────────
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    # Admin API key check
    api_key = (event.get("headers") or {}).get("X-Api-Key", "")
    if api_key != ADMIN_API_KEY:
        return err(401, "Invalid or missing X-Api-Key header")

    try:
        body      = json.loads(event.get("body") or "{}")
        s3_key    = body.get("s3_key")      # Pre-uploaded PDF S3 key
        scheme_id = body.get("scheme_id", str(uuid.uuid4()))

        if not s3_key:
            # If no s3_key, try to use raw text (for testing)
            pdf_text = body.get("scheme_text", "")
            if not pdf_text:
                return err(400, "Provide either 's3_key' (S3 object key) or 'scheme_text'")
            rules     = extract_eligibility_with_bedrock(pdf_text)
            scheme    = save_scheme(scheme_id, rules, "manual-upload")
            all_users = get_all_users()
            matched     = [u for u in all_users if match_user(u, rules)]
            matched_ids = {u["user_id"] for u in matched}
            targeted  = send_targeted_sms(matched, rules["scheme_name"])
            broadcast = send_broadcast_sms(all_users, matched_ids, rules["scheme_name"])
            return ok({
                "scheme_id":       scheme_id,
                "scheme_name":     rules["scheme_name"],
                "total_users":     len(all_users),
                "matched_users":   len(matched),
                "targeted_sms":    targeted,
                "broadcast_sms":   broadcast,
                "total_sms_sent":  targeted + broadcast,
            })

        result = run_pipeline(SCHEMES_BUCKET, s3_key, scheme_id)
        return ok(result)

    except Exception as e:
        log("ERROR", "REST upload failed", error=str(e))
        return err(500, f"Processing failed: {str(e)}")

