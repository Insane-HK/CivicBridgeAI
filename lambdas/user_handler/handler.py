"""
CivicBridge AI — UserHandler Lambda
Handles user registration (Aadhaar-first OR full-profile), profile retrieval,
profile updates, and SMS notification opt-in.
Issues and validates JWT tokens.
"""
import json
import os
import re
import uuid
import time
import hmac
import hashlib
import base64
import boto3
from botocore.exceptions import ClientError
from decimal import Decimal

# ─── Clients ──────────────────────────────────────────────────────────────────
dynamodb     = boto3.resource("dynamodb")
lambda_client = boto3.client("lambda", region_name=os.environ.get("AWS_REGION", "ap-south-1"))
USERS_TABLE          = os.environ.get("USERS_TABLE", "CivicBridge-Users-dev")
JWT_SECRET           = os.environ.get("JWT_SECRET", "dev-secret-change-in-prod")
AADHAAR_FUNCTION_ARN = os.environ.get("AADHAAR_FUNCTION_ARN", "")

CORS_HEADERS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Content-Type": "application/json",
}

VALID_EDUCATION = ["illiterate", "primary", "secondary", "higher_secondary", "graduate", "postgraduate"]

# ─── JWT Helpers (pure Python HS256, no external deps) ────────────────────────

def b64url_encode(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()

def b64url_decode(s):
    s += "=" * (4 - len(s) % 4)
    return base64.urlsafe_b64decode(s)

def create_jwt(user_id, phone_number):
    header  = b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = b64url_encode(json.dumps({
        "user_id":      user_id,
        "phone_number": phone_number,
        "exp":          int(time.time()) + 86400,   # 24 hours
        "iat":          int(time.time()),
    }).encode())
    signing_input = f"{header}.{payload}".encode()
    signature = b64url_encode(
        hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
    )
    return f"{header}.{payload}.{signature}"


def verify_jwt(token):
    if token.startswith("Bearer "):
        token = token[7:]
    try:
        header_b64, payload_b64, sig_b64 = token.split(".")
        signing_input = f"{header_b64}.{payload_b64}".encode()
        expected_sig  = hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest()
        actual_sig    = b64url_decode(sig_b64)
        if not hmac.compare_digest(expected_sig, actual_sig):
            raise Exception("Invalid signature")
        payload = json.loads(b64url_decode(payload_b64))
        if payload.get("exp", 0) < time.time():
            raise Exception("Token expired")
        return payload
    except Exception as e:
        raise Exception(f"Unauthorized: {e}")


# ─── Response Helpers ──────────────────────────────────────────────────────────

def ok(body):
    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps(body, ensure_ascii=False)}

def err(status, message):
    return {"statusCode": status, "headers": CORS_HEADERS, "body": json.dumps({"error": message})}


# ─── Validation ────────────────────────────────────────────────────────────────

def sanitize(text, max_len=200):
    if not isinstance(text, str):
        return str(text)
    text = re.sub(r"[;'\"\\<>]", "", text)
    text = re.sub(r"<script.*?</script>", "", text, flags=re.IGNORECASE)
    return text[:max_len].strip()

def validate_user_input(data):
    errors = []
    phone = str(data.get("phone_number", ""))
    if not re.match(r"^[6-9]\d{9}$", phone):
        errors.append("phone_number must be a valid 10-digit Indian mobile number (starting with 6-9)")
    age = data.get("age")
    try:
        age = int(age)
        if not (1 <= age <= 120):
            errors.append("age must be between 1 and 120")
    except (TypeError, ValueError):
        errors.append("age must be a number")
    income = data.get("income")
    try:
        income = float(income)
        if income < 0:
            errors.append("income must be non-negative")
    except (TypeError, ValueError):
        errors.append("income must be a number")
    edu = data.get("education_level", "")
    if edu not in VALID_EDUCATION:
        errors.append(f"education_level must be one of: {', '.join(VALID_EDUCATION)}")
    return errors


# ─── DynamoDB helpers ──────────────────────────────────────────────────────────

def get_user_from_db(user_id):
    table = dynamodb.Table(USERS_TABLE)
    resp  = table.get_item(Key={"user_id": user_id})
    return resp.get("Item")


def save_user(item):
    table = dynamodb.Table(USERS_TABLE)
    table.put_item(Item=item)


def update_user(user_id, updates):
    table = dynamodb.Table(USERS_TABLE)
    expr_parts, expr_values, expr_names = [], {}, {}
    for k, v in updates.items():
        safe_k = f"#f_{k}"
        expr_parts.append(f"{safe_k} = :{k}")
        expr_values[f":{k}"] = v
        expr_names[safe_k]   = k
    expr_values[":updated"] = int(time.time())
    expr_parts.append("#f_updated_at = :updated")
    expr_names["#f_updated_at"] = "updated_at"
    table.update_item(
        Key={"user_id": user_id},
        UpdateExpression="SET " + ", ".join(expr_parts),
        ExpressionAttributeValues=expr_values,
        ExpressionAttributeNames=expr_names,
    )


# ─── Handlers ─────────────────────────────────────────────────────────────────

def fetch_aadhaar_demographics(aadhaar_id: str) -> dict:
    """
    Call the AadhaarHandler Lambda (or inline the logic if ARN not set).
    Returns demographic dict: age, income, state, district, education_level, gender, name
    """
    if not AADHAAR_FUNCTION_ARN:
        # Inline fallback when running locally / ARN not set
        import hashlib as _hlib
        _states = [
            ("Maharashtra", "Pune"), ("Uttar Pradesh", "Lucknow"), ("Bihar", "Patna"),
            ("Rajasthan", "Jaipur"), ("Karnataka", "Bangalore"), ("Delhi", "New Delhi"),
            ("Gujarat", "Ahmedabad"), ("West Bengal", "Kolkata"), ("Tamil Nadu", "Chennai"),
            ("Madhya Pradesh", "Bhopal"),
        ]
        _edus = ["illiterate", "primary", "secondary", "higher_secondary", "graduate", "postgraduate"]
        _namesM = ["Suresh", "Ramesh", "Anil", "Vijay", "Sanjay", "Amit", "Deepak", "Rakesh"]
        _namesF = ["Priya", "Sunita", "Geeta", "Anita", "Rekha", "Pooja", "Kavita", "Neha"]
        _snames = ["Sharma", "Kumar", "Singh", "Verma", "Gupta", "Patel", "Das", "Joshi"]
        h = int(_hlib.sha256(aadhaar_id.encode()).hexdigest(), 16)
        gender = "male" if h % 2 == 0 else "female"
        names  = _namesM if gender == "male" else _namesF
        state, district = _states[(h >> 20) % len(_states)]
        return {
            "name":            f"{names[(h >> 4) % len(names)]} {_snames[(h >> 8) % len(_snames)]}",
            "age":             18 + (h >> 12) % 55,
            "income":          ((h >> 16) % 20) * 15000,
            "state":           state,
            "district":        district,
            "education_level": _edus[(h >> 24) % len(_edus)],
            "gender":          gender,
        }

    payload = json.dumps({"aadhaar_id": aadhaar_id, "httpMethod": "POST",
                          "path": "/aadhaar/lookup", "body": json.dumps({"aadhaar_id": aadhaar_id})})
    try:
        resp   = lambda_client.invoke(FunctionName=AADHAAR_FUNCTION_ARN,
                                      InvocationType="RequestResponse",
                                      Payload=payload.encode())
        result = json.loads(resp["Payload"].read())
        body   = json.loads(result.get("body", "{}"))
        if result.get("statusCode", 200) != 200:
            raise ValueError(body.get("error", "Aadhaar lookup failed"))
        return body
    except Exception as e:
        raise ValueError(f"Aadhaar service error: {e}")


def handle_create_user(body):
    """POST /users — Register new user.
    Accepts either:
      A) Aadhaar-first: { phone_number, aadhaar_id }  → fetch demographics automatically
      B) Full profile:  { phone_number, age, income, education_level, state, district }
    Returns JWT token.
    """
    data = json.loads(body or "{}")

    phone = str(data.get("phone_number", ""))
    if not re.match(r"^[6-9]\d{9}$", phone):
        return err(400, "phone_number must be a valid 10-digit Indian mobile number (starting with 6-9)")

    aadhaar_id = str(data.get("aadhaar_id", "")).strip().replace(" ", "")
    timestamp  = int(time.time())
    user_id    = str(uuid.uuid4())

    if aadhaar_id:
        # ── Aadhaar-first path ──────────────────────────────────────────────
        if not re.match(r"^\d{12}$", aadhaar_id):
            return err(400, "aadhaar_id 12-digit number hona chahiye")
        try:
            demo = fetch_aadhaar_demographics(aadhaar_id)
        except ValueError as e:
            return err(502, str(e))

        item = {
            "user_id":               user_id,
            "phone_number":          sanitize(phone),
            "aadhaar_id":            aadhaar_id,
            "age":                   int(demo.get("age", 25)),
            "income":                Decimal(str(demo.get("income", 0))),
            "education_level":       sanitize(str(demo.get("education_level", "primary"))),
            "state":                 sanitize(str(demo.get("state", ""))),
            "district":              sanitize(str(demo.get("district", ""))),
            "gender":                sanitize(str(demo.get("gender", ""))),
            "name":                  sanitize(str(demo.get("name", ""))),
            "sms_opted_in":          True,   # registered via Aadhaar => auto opt-in for SMS
            "registration_timestamp": timestamp,
            "updated_at":            timestamp,
        }
    else:
        # ── Full-profile path (backward compatible) ─────────────────────────
        errors = validate_user_input(data)
        if errors:
            return err(400, " | ".join(errors))
        item = {
            "user_id":               user_id,
            "phone_number":          sanitize(phone),
            "age":                   int(data["age"]),
            "income":                Decimal(str(data["income"])),
            "education_level":       sanitize(data.get("education_level", "")),
            "state":                 sanitize(data.get("state", "")),
            "district":              sanitize(data.get("district", "")),
            "sms_opted_in":          False,
            "registration_timestamp": timestamp,
            "updated_at":            timestamp,
        }

    try:
        save_user(item)
    except ClientError as e:
        return err(500, f"DynamoDB error: {e.response['Error']['Message']}")

    token = create_jwt(user_id, item["phone_number"])
    return ok({
        "user_id":    user_id,
        "token":      token,
        "name":       item.get("name", ""),
        "aadhaar_id": item.get("aadhaar_id", ""),
        "sms_opted_in": item.get("sms_opted_in", False),
        "message":    "Registration ho gaya! SMS notifications ON hain."
                      if item.get("sms_opted_in") else
                      "Registration successful! Token 24 ghante tak valid hai.",
    })


def handle_get_user(user_id, auth_header):
    """GET /users/{user_id} — Retrieve user profile (JWT required)."""
    payload = verify_jwt(auth_header)
    if payload.get("user_id") != user_id:
        return err(401, "Aap sirf apna profile dekh sakte hain.")
    user = get_user_from_db(user_id)
    if not user:
        return err(404, "User not found.")
    return ok(user)


def handle_update_user(user_id, auth_header, body):
    """PUT /users/{user_id} — Update user profile (JWT required)."""
    payload = verify_jwt(auth_header)
    if payload.get("user_id") != user_id:
        return err(401, "Aap sirf apna profile update kar sakte hain.")
    data = json.loads(body or "{}")
    allowed = {"age", "income", "education_level", "state", "district"}
    updates = {}
    for k in allowed:
        if k in data:
            if k == "income":
                updates[k] = Decimal(str(data[k]))
            else:
                updates[k] = sanitize(str(data[k])) if isinstance(data[k], str) else data[k]
    if not updates:
        return err(400, "No valid fields to update.")
    try:
        update_user(user_id, updates)
    except ClientError as e:
        return err(500, f"Update failed: {e.response['Error']['Message']}")
    user = get_user_from_db(user_id)
    return ok({"message": "Profile update ho gaya!", "user": user})


def handle_subscribe(user_id, auth_header, body):
    """POST /users/{user_id}/subscribe — Opt-in/out of SMS notifications."""
    payload = verify_jwt(auth_header)
    if payload.get("user_id") != user_id:
        return err(401, "Sirf apna subscription change kar sakte hain.")
    data = json.loads(body or "{}")
    opted_in = bool(data.get("sms_opted_in", True))
    try:
        update_user(user_id, {"sms_opted_in": opted_in})
    except ClientError as e:
        return err(500, f"Subscribe update failed: {e.response['Error']['Message']}")
    msg = "SMS notifications ON kar diye! Naye schemes ki khabar milegi. 🎉" if opted_in else "SMS notifications band kar diye."
    return ok({"user_id": user_id, "sms_opted_in": opted_in, "message": msg})


# ─── Main Handler ──────────────────────────────────────────────────────────────

def lambda_handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    method      = event.get("httpMethod", "")
    path        = event.get("path", "")
    path_params = event.get("pathParameters") or {}
    auth_header = event.get("headers", {}).get("Authorization", "")

    print(json.dumps({"method": method, "path": path}))

    try:
        # POST /users — register (Aadhaar-first or full profile)
        if method == "POST" and path == "/users":
            return handle_create_user(event.get("body"))

        user_id = path_params.get("user_id")
        if not user_id:
            return err(400, "user_id required")

        # POST /users/{user_id}/subscribe — SMS opt-in/out
        if method == "POST" and path.endswith("/subscribe"):
            return handle_subscribe(user_id, auth_header, event.get("body"))

        if method == "GET":
            return handle_get_user(user_id, auth_header)
        elif method == "PUT":
            return handle_update_user(user_id, auth_header, event.get("body"))
        else:
            return err(405, "Method not allowed")

    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")
        if "Unauthorized" in str(e):
            return err(401, str(e))
        return err(500, f"Internal error: {str(e)}")
