"""
CivicBridge AI — ChatHandler Lambda (Chat Engine)
Handles: POST /chat (send message), POST /chat/upload (PDF upload), GET /chat/history/{session_id}
"""
import json
import os
import re
import uuid
import time
import base64
import boto3
from botocore.exceptions import ClientError

# ─── Clients ──────────────────────────────────────────────────────────────────
s3         = boto3.client("s3")
dynamodb   = boto3.resource("dynamodb")
bedrock    = boto3.client("bedrock-runtime", region_name=os.environ.get("BEDROCK_REGION", "us-east-1"))

CONVERSATIONS_TABLE = os.environ.get("CONVERSATIONS_TABLE", "CivicBridge-Conversations-dev")
SCHEMES_TABLE       = os.environ.get("SCHEMES_TABLE",       "CivicBridge-Schemes-dev")
CHAT_BUCKET         = os.environ.get("CHAT_BUCKET",         "")
JWT_SECRET          = os.environ.get("JWT_SECRET",          "dev-secret-change-in-prod")

NOVA_LITE_MODEL = "us.amazon.nova-lite-v1:0"
MAX_CHAT_PDF    = 5 * 1024 * 1024    # 5 MB
MAX_HISTORY     = 10                  # context turns
MAX_INPUT_LEN   = 1000
USERS_TABLE     = os.environ.get("USERS_TABLE", "CivicBridge-Users-dev")

CORS_HEADERS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json",
}

EDUCATION_HIERARCHY = ["illiterate", "primary", "secondary", "higher_secondary", "graduate", "postgraduate"]


# ─── Helpers ───────────────────────────────────────────────────────────────────

def log(level, msg, **kw):
    print(json.dumps({"ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "level": level, "fn": "ChatHandler", "msg": msg, **kw}))

def ok(body):
    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps(body, ensure_ascii=False)}

def err(status, message):
    return {"statusCode": status, "headers": CORS_HEADERS, "body": json.dumps({"error": message})}

def sanitize(text, max_len=MAX_INPUT_LEN):
    if not isinstance(text, str):
        return str(text)
    text = re.sub(r"[;'\"\\]", "", text)
    text = re.sub(r"<script.*?</script>", "", text, flags=re.IGNORECASE)
    return text[:max_len].strip()


# ─── JWT verify (pure Python HS256) ───────────────────────────────────────────

def b64url_decode(s):
    s += "=" * (4 - len(s) % 4)
    return base64.urlsafe_b64decode(s)

def verify_jwt(auth_header):
    import hmac, hashlib
    if not auth_header:
        raise Exception("Unauthorized: Missing Authorization header")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else auth_header
    if not token:
        raise Exception("Unauthorized: Empty token")
        
    try:
        try:
            header_b64, payload_b64, sig_b64 = token.split(".")
        except ValueError:
            raise Exception("Unauthorized: Token must have 3 parts")
            
        msg  = f"{header_b64}.{payload_b64}".encode()
        exp_sig = hmac.new(JWT_SECRET.encode(), msg, hashlib.sha256).digest()
        act_sig = b64url_decode(sig_b64)
        if not hmac.compare_digest(exp_sig, act_sig):
            raise Exception("Unauthorized: Invalid signature")
        payload = json.loads(b64url_decode(payload_b64))
        if payload.get("exp", 0) < time.time():
            raise Exception("Unauthorized: Token expired")
        return payload
    except Exception as e:
        if "Unauthorized" in str(e): raise
        raise Exception(f"Unauthorized: {e}")


# ─── DynamoDB: Conversation table ─────────────────────────────────────────────

def get_conversation(session_id):
    table = dynamodb.Table(CONVERSATIONS_TABLE)
    resp  = table.get_item(Key={"session_id": session_id})
    return resp.get("Item")

def save_conversation(item):
    table = dynamodb.Table(CONVERSATIONS_TABLE)
    table.put_item(Item=item)

def append_messages(session_id, new_messages):
    table = dynamodb.Table(CONVERSATIONS_TABLE)
    table.update_item(
        Key={"session_id": session_id},
        UpdateExpression="SET messages = list_append(if_not_exists(messages, :empty), :new), updated_at = :ts",
        ExpressionAttributeValues={":new": new_messages, ":empty": [], ":ts": int(time.time())},
    )


# ─── Eligibility Checklist ─────────────────────────────────────────────────────

def meets_education(user_level, required_level):
    try:
        return EDUCATION_HIERARCHY.index(user_level) >= EDUCATION_HIERARCHY.index(required_level)
    except ValueError:
        return True

def generate_eligibility_checklist(user_profile, scheme_rules):
    """Generate structured checklist. Returns dict with overall_status and checklist list."""
    checklist = []
    overall   = True

    age = int(user_profile.get("age", 0))
    age_min = scheme_rules.get("age_min", 0)
    age_max = scheme_rules.get("age_max", 120)
    age_ok  = age_min <= age <= age_max
    checklist.append({"criterion": f"Age: {age_min}–{age_max} years", "met": "Yes" if age_ok else "No"})
    if not age_ok:
        overall = False

    income     = float(user_profile.get("income", 0))
    income_max = scheme_rules.get("income_max")
    if income_max:
        income_ok = income <= income_max
        checklist.append({"criterion": f"Income: ≤ ₹{income_max:,.0f}/year", "met": "Yes" if income_ok else "No"})
        if not income_ok:
            overall = False

    edu_user     = user_profile.get("education_level", "")
    edu_required = scheme_rules.get("education_level")
    if edu_required:
        edu_ok = meets_education(edu_user, edu_required)
        checklist.append({"criterion": f"Education: {edu_required} or above", "met": "Yes" if edu_ok else "No"})
        if not edu_ok:
            overall = False

    s = scheme_rules.get("state")
    if s:
        state_ok = user_profile.get("state", "").lower() == s.lower()
        checklist.append({"criterion": f"State: {s}", "met": "Yes" if state_ok else "No"})
        if not state_ok:
            overall = False

    d = scheme_rules.get("district")
    if d:
        dist_ok = user_profile.get("district", "").lower() == d.lower()
        checklist.append({"criterion": f"District: {d}", "met": "Yes" if dist_ok else "No"})
        if not dist_ok:
            overall = False

    return {
        "overall_status": "Eligible" if overall else "Not Eligible",
        "checklist":      checklist,
    }


# ─── PDF text extraction (basic) ──────────────────────────────────────────────

def extract_pdf_text(pdf_bytes):
    try:
        text    = pdf_bytes.decode("latin-1", errors="replace")
        streams = re.findall(r"BT(.*?)ET", text, re.DOTALL)
        parts   = []
        for s in streams:
            parts.extend(re.findall(r"\(([^)]+)\)", s))
        extracted = " ".join(parts)
        if len(extracted) < 100:
            extracted = re.sub(r"[^\x20-\x7e\n]", " ", text)
        return extracted[:4000]
    except Exception as e:
        log("WARN", f"PDF extraction partial: {e}")
        return str(pdf_bytes[:3000], "latin-1", errors="replace")


# ─── Bedrock Chat ──────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are CivicBridge AI, a friendly assistant for Indian government schemes.
Respond in Hinglish (mix of Hindi and English). Keep answers short, warm, and actionable.
When asked about eligibility, provide clear Yes/No answers for each criterion.
ALWAYS respond in the exact JSON format requested — never add markdown or extra text."""

def call_bedrock_chat(messages_for_api):
    response = bedrock.invoke_model(
        modelId=NOVA_LITE_MODEL,
        contentType="application/json",
        accept="application/json",
        body=json.dumps({
            "system": [{"text": SYSTEM_PROMPT}],
            "messages": messages_for_api,
            "inferenceConfig": {
                "max_new_tokens": 1200,
                "temperature": 0.15,
            }
        }),
    )
    body    = json.loads(response["body"].read())
    content = body.get("output", {}).get("message", {}).get("content", [])
    text    = content[0].get("text", "{}").strip() if content else "{}"

    for fence in ("```json", "```"):
        if text.startswith(fence):
            text = text[len(fence):]
    if text.endswith("```"):
        text = text[:-3]

    return json.loads(text.strip())


# ─── Handle POST /chat ────────────────────────────────────────────────────────

def handle_chat(event):
    auth = event.get("headers", {}).get("Authorization", "")
    payload = verify_jwt(auth)
    user_id = payload.get("user_id")

    body       = json.loads(event.get("body") or "{}")
    session_id = body.get("session_id") or str(uuid.uuid4())
    message    = sanitize(body.get("message", ""))
    if not message:
        return err(400, "Message empty hai. Kuch toh likhein!")

    # Load or create conversation
    conv = get_conversation(session_id) or {
        "session_id": session_id,
        "user_id":    user_id,
        "messages":   [],
        "created_at": int(time.time()),
        "updated_at": int(time.time()),
    }

    # Build Bedrock message list from history (last MAX_HISTORY turns)
    history_messages = []
    for m in conv["messages"][-MAX_HISTORY:]:
        history_messages.append({
            "role":    m["role"],
            "content": [{"text": m["content"]}],
        })

    # Add PDF context if available
    pdf_context = ""
    if conv.get("pdf_s3_key"):
        try:
            obj      = s3.get_object(Bucket=CHAT_BUCKET, Key=conv["pdf_s3_key"])
            pdf_bytes = obj["Body"].read()
            pdf_context = f"\n\n[Uploaded PDF context]:\n{extract_pdf_text(pdf_bytes)}"
        except Exception as e:
            log("WARN", "Could not read chat PDF", error=str(e))

    prompt = f"""{message}{pdf_context}

Respond ONLY in this JSON format:
{{
    "answer": "Hinglish response here",
    "checklist": [
        {{"criterion": "Criterion (e.g. Age: 18-60 years)", "met": "Yes"}},
        {{"criterion": "Another criterion", "met": "No"}},
        {{"criterion": "Unknown criterion", "met": "Unknown"}}
    ]
}}
If no eligibility criteria are relevant, return an empty checklist array []."""

    history_messages.append({"role": "user", "content": [{"text": prompt}]})

    try:
        result = call_bedrock_chat(history_messages)
    except Exception as e:
        log("ERROR", "Bedrock chat failed", error=str(e))
        return err(503, f"AI service unavailable: {str(e)}")

    answer    = result.get("answer", "")
    checklist = result.get("checklist", [])

    # ── Chat Confirmation: detect eligibility discussion ─────────────────────
    # If the AI gave eligibility criteria and the user hasn't opted in yet, 
    # attach a confirm_action so the frontend can show an SMS opt-in prompt.
    confirm_action = None
    eligibility_keywords = ["eligible", "eligibility", "criteria", "checklist", "qualify", "eligible hain"]
    is_eligibility_response = (
        bool(checklist) or
        any(kw in answer.lower() for kw in eligibility_keywords)
    )
    if is_eligibility_response:
        # Check if user is already opted in
        try:
            table = dynamodb.Table(USERS_TABLE)
            user_rec = table.get_item(Key={"user_id": user_id}).get("Item", {})
            already_opted = user_rec.get("sms_opted_in", False)
        except Exception:
            already_opted = False

        if not already_opted:
            confirm_action = {
                "type":    "sms_subscribe",
                "user_id": user_id,
                "message": "Kya aap chahte hain ki naye eligible schemes ke liye SMS notification milein?",
                "yes_label": "✅ Haan, SMS Enable Karo",
                "no_label":  "❌ Nahi, Thanks",
            }

    # Persist messages to DynamoDB
    ts = int(time.time())
    new_msgs = [
        {"role": "user",      "content": message, "timestamp": ts},
        {"role": "assistant", "content": answer,  "timestamp": ts},
    ]
    if not conv.get("messages"):
        conv["messages"] = new_msgs
        save_conversation(conv)
    else:
        append_messages(session_id, new_msgs)

    return ok({
        "session_id":            session_id,
        "response":              answer,
        "eligibility_checklist": checklist,
        "confirm_action":        confirm_action,
        "timestamp":             ts,
    })


# ─── Handle POST /chat/upload ─────────────────────────────────────────────────

def handle_upload(event):
    auth    = event.get("headers", {}).get("Authorization", "")
    payload = verify_jwt(auth)
    user_id = payload.get("user_id")

    # Decode body (API Gateway may base64-encode binary)
    body_raw   = event.get("body", "")
    is_encoded = event.get("isBase64Encoded", False)

    if is_encoded:
        pdf_bytes = base64.b64decode(body_raw)
    else:
        # Try JSON body with base64 field
        try:
            body_json = json.loads(body_raw)
            pdf_b64   = body_json.get("pdf_base64", "")
            session_id = body_json.get("session_id", str(uuid.uuid4()))
            if pdf_b64:
                pdf_bytes = base64.b64decode(pdf_b64)
            else:
                return err(400, "PDF data not found. 'pdf_base64' field provide karein.")
        except json.JSONDecodeError:
            pdf_bytes  = body_raw.encode() if isinstance(body_raw, str) else body_raw
            session_id = str(uuid.uuid4())

    if len(pdf_bytes) > MAX_CHAT_PDF:
        return err(400, f"PDF too large. Max size 5MB hai.")
    if not pdf_bytes[:4] == b"%PDF":
        return err(400, "Invalid file. PDF chahiye.")

    session_id = locals().get("session_id", str(uuid.uuid4()))
    ts         = int(time.time())
    s3_key     = f"chat/{session_id}/{ts}.pdf"

    try:
        s3.put_object(
            Bucket=CHAT_BUCKET,
            Key=s3_key,
            Body=pdf_bytes,
            ContentType="application/pdf",
        )
    except ClientError as e:
        return err(500, f"S3 upload failed: {e.response['Error']['Message']}")

    # Store pdf_s3_key in conversation
    conv = get_conversation(session_id) or {
        "session_id": session_id,
        "user_id":    user_id,
        "messages":   [],
        "created_at": ts,
        "updated_at": ts,
    }
    conv["pdf_s3_key"] = s3_key
    conv["updated_at"] = ts
    save_conversation(conv)

    log("INFO", "PDF uploaded", session_id=session_id, key=s3_key, size=len(pdf_bytes))
    return ok({
        "session_id": session_id,
        "message":    "PDF upload ho gaya! Ab aap scheme ke baare mein sawal pooch sakte hain.",
        "s3_key":     s3_key,
    })


# ─── Handle GET /chat/history/{session_id} ────────────────────────────────────

def handle_history(event):
    auth    = event.get("headers", {}).get("Authorization", "")
    verify_jwt(auth)  # Just validate, no user check needed for history
    session_id = (event.get("pathParameters") or {}).get("session_id")
    if not session_id:
        return err(400, "session_id required")
    conv = get_conversation(session_id)
    if not conv:
        return err(404, "Conversation not found")
    return ok({
        "session_id": session_id,
        "messages":   conv.get("messages", []),
        "created_at": conv.get("created_at"),
        "updated_at": conv.get("updated_at"),
    })


# ─── Handle POST /chat/profile-schemes ───────────────────────────────────────

PROFILE_SCHEMES_SYSTEM_PROMPT = """You are CivicBridge AI, an expert on Indian government welfare schemes.
You will receive a citizen's detailed profile and MUST return ONLY a valid JSON object — no markdown, no prose.
The JSON must have exactly this structure:
{
  "schemes": [
    {
      "name": "Scheme Name",
      "category": "Category (e.g. Startup & Innovation, MSME & Business, Agriculture, Education & Scholarship, Healthcare, Women Empowerment, Housing, Employment)",
      "description": "2-3 sentence description in Hinglish of what the scheme provides",
      "eligibility_reason": "1 sentence explaining exactly why THIS person qualifies",
      "documents": ["Document 1", "Document 2", "Document 3"],
      "apply_url": "https://official-website.gov.in",
      "benefit": "Key benefit e.g. Loan up to ₹10 lakh, ₹6000/year, Free insurance"
    }
  ]
}
Return exactly 5 scheme objects. Order by most relevant to the user's profile first.
Focus on schemes that match their education, occupation, state, and interests.
If they are a graduate/BTech and interested in Startup, prioritize Startup India, DPIIT, AIM, MUDRA Tarun.
If they are MSME/Business owner, prioritize MUDRA, CGTMSE, MSME Samadhan, Udyam benefits.
If student, prioritize NSP, PM Vidyalaxmi, Central Sector Scholarship.
If farmer, prioritize PM Kisan, KCC, Fasal Bima.
ONLY return the JSON. No other text."""


def handle_profile_schemes(event):
    """POST /chat/profile-schemes — save profile + return Nova scheme recommendations."""
    body = json.loads(event.get("body") or "{}")

    name          = sanitize(body.get("name", ""), 100)
    age           = int(body.get("age", 0))
    gender        = sanitize(body.get("gender", ""), 20)
    income        = float(body.get("income", 0))
    state         = sanitize(body.get("state", ""), 50)
    district      = sanitize(body.get("district", ""), 50)
    education     = sanitize(body.get("education", ""), 30)
    degree        = sanitize(body.get("degree", ""), 30)
    field_study   = sanitize(body.get("fieldOfStudy", ""), 60)
    occupation    = sanitize(body.get("occupation", ""), 30)
    business_type = sanitize(body.get("businessType", ""), 40)
    msme_reg      = sanitize(body.get("msmeRegistered", ""), 15)
    turnover      = sanitize(body.get("annualTurnover", ""), 20)
    phone         = sanitize(body.get("phone", ""), 15)
    email         = sanitize(body.get("email", ""), 80)
    interests     = [sanitize(i, 40) for i in body.get("interests", []) if isinstance(i, str)][:12]

    # Save profile to DynamoDB Users table
    try:
        user_id  = str(uuid.uuid4())
        ts       = int(time.time())
        profile  = {
            "user_id":        user_id,
            "name":           name,
            "age":            age,
            "gender":         gender,
            "income":         int(income),
            "state":          state,
            "district":       district,
            "education_level": education,
            "degree":         degree,
            "field_of_study": field_study,
            "occupation":     occupation,
            "business_type":  business_type,
            "msme_registered": msme_reg,
            "annual_turnover": turnover,
            "phone_number":   phone,
            "email":          email,
            "interests":      interests,
            "sms_opted_in":   bool(phone),
            "source":         "profile_form",
            "created_at":     ts,
            "updated_at":     ts,
        }
        users_table = dynamodb.Table(USERS_TABLE)
        users_table.put_item(Item=profile)
        log("INFO", "Profile saved", user_id=user_id, occupation=occupation, state=state)
    except Exception as e:
        log("WARN", "Profile save failed (non-fatal)", error=str(e))
        user_id = "guest-" + str(uuid.uuid4())[:8]

    # Build rich prompt for Bedrock Nova
    degree_line   = f" I completed {degree} in {field_study}." if degree else ""
    biz_line      = ""
    if occupation in ("business_owner", "startup_founder"):
        biz_line = (
            f" I run a {business_type or 'business'}."
            f" MSME/Udyam registered: {msme_reg or 'unknown'}."
            f" Annual turnover: ₹{turnover or 'not specified'}."
        )
    interest_line = f" My scheme interests are: {', '.join(interests)}." if interests else ""

    user_prompt = (
        f"Citizen profile:\n"
        f"- Name: {name or 'Not provided'}\n"
        f"- Age: {age} years\n"
        f"- Gender: {gender or 'not specified'}\n"
        f"- Location: {district + ', ' if district else ''}{state or 'India'}\n"
        f"- Annual Income: ₹{int(income):,}\n"
        f"- Education: {education}{degree_line}\n"
        f"- Occupation: {occupation}{biz_line}\n"
        f"{interest_line}\n\n"
        f"Return the top 5 government schemes for this citizen as specified JSON."
    )

    messages_for_nova = [{"role": "user", "content": [{"text": user_prompt}]}]

    # Call Bedrock Nova with the profile-specific system prompt
    try:
        response = bedrock.invoke_model(
            modelId=NOVA_LITE_MODEL,
            contentType="application/json",
            accept="application/json",
            body=json.dumps({
                "system": [{"text": PROFILE_SCHEMES_SYSTEM_PROMPT}],
                "messages": messages_for_nova,
                "inferenceConfig": {
                    "max_new_tokens": 2000,
                    "temperature": 0.1,
                }
            }),
        )
        raw_body = json.loads(response["body"].read())
        content  = raw_body.get("output", {}).get("message", {}).get("content", [])
        text     = content[0].get("text", "{}").strip() if content else "{}"

        # Strip markdown fences if present
        for fence in ("```json", "```"):
            if text.startswith(fence):
                text = text[len(fence):]
        if text.endswith("```"):
            text = text[:-3]

        result  = json.loads(text.strip())
        schemes = result.get("schemes", [])

    except Exception as e:
        log("ERROR", "Profile schemes Bedrock call failed", error=str(e))
        return err(503, f"AI service unavailable: {str(e)}")

    # Create a session pre-seeded with the profile context for follow-up chat
    session_id = str(uuid.uuid4())
    try:
        ctx_msg = (
            f"[System context — citizen profile loaded]\n"
            f"Name: {name}, Age: {age}, Gender: {gender}, State: {state}, "
            f"Education: {education} {degree}, Occupation: {occupation}. "
            f"Interests: {', '.join(interests) if interests else 'general'}."
        )
        save_conversation({
            "session_id": session_id,
            "user_id":    user_id,
            "messages":   [{"role": "assistant", "content": ctx_msg, "timestamp": int(time.time())}],
            "created_at": int(time.time()),
            "updated_at": int(time.time()),
        })
    except Exception as e:
        log("WARN", "Session pre-seed failed (non-fatal)", error=str(e))

    log("INFO", "Profile schemes returned", user_id=user_id, count=len(schemes))
    return ok({
        "user_id":    user_id,
        "session_id": session_id,
        "schemes":    schemes,
        "saved":      True,
    })


# ─── Main Lambda Handler ───────────────────────────────────────────────────────

def lambda_handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    method = event.get("httpMethod", "")
    path   = event.get("path", "")

    log("INFO", "Request", method=method, path=path)

    try:
        if method == "POST" and path == "/chat":
            return handle_chat(event)
        elif method == "POST" and path == "/chat/upload":
            return handle_upload(event)
        elif method == "POST" and path == "/chat/profile-schemes":
            return handle_profile_schemes(event)
        elif method == "GET" and "/chat/history/" in path:
            return handle_history(event)
        else:
            return err(404, "Endpoint not found")
    except Exception as e:
        log("ERROR", str(e))
        if "Unauthorized" in str(e):
            return err(401, str(e))
        return err(500, f"Internal error: {str(e)}")
