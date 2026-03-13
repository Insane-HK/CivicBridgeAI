"""
CivicBridge AI — AadhaarHandler Lambda
POST /aadhaar/lookup  → returns demographic profile for a 12-digit Aadhaar number.
No auth required (public). Returns consistent pseudo-random data for unknown numbers.
"""
import json
import re
import hashlib
import os
import time

CORS_HEADERS = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Content-Type": "application/json",
}

# ─── Known Aadhaar Dataset ────────────────────────────────────────────────────
# 20 realistic profiles spanning demographics across Indian states
KNOWN_AADHAAR = {
    "111122223333": {"name": "Rahul Sharma",      "age": 25,  "income": 50000,  "state": "Maharashtra",     "district": "Pune",        "education_level": "graduate",       "gender": "male"},
    "444455556666": {"name": "Sunita Devi",       "age": 45,  "income": 120000, "state": "Uttar Pradesh",   "district": "Lucknow",     "education_level": "primary",        "gender": "female"},
    "777788889999": {"name": "Arjun Singh",       "age": 19,  "income": 25000,  "state": "Bihar",           "district": "Patna",       "education_level": "higher_secondary","gender": "male"},
    "000011112222": {"name": "Kamala Bai",        "age": 62,  "income": 30000,  "state": "Rajasthan",       "district": "Jaipur",      "education_level": "illiterate",     "gender": "female"},
    "333344445555": {"name": "Priya Nair",        "age": 30,  "income": 450000, "state": "Karnataka",       "district": "Bangalore",   "education_level": "postgraduate",   "gender": "female"},
    "666677778888": {"name": "Vikram Mehta",      "age": 22,  "income": 0,      "state": "Delhi",           "district": "New Delhi",   "education_level": "graduate",       "gender": "male"},
    "999900001111": {"name": "Ramesh Patel",      "age": 50,  "income": 80000,  "state": "Gujarat",         "district": "Ahmedabad",   "education_level": "secondary",      "gender": "male"},
    "222233334444": {"name": "Anjali Mishra",     "age": 35,  "income": 150000, "state": "Madhya Pradesh",  "district": "Bhopal",      "education_level": "graduate",       "gender": "female"},
    "555566667777": {"name": "Suresh Mondal",     "age": 28,  "income": 60000,  "state": "West Bengal",     "district": "Kolkata",     "education_level": "higher_secondary","gender": "male"},
    "888899990000": {"name": "Lalita Behera",     "age": 55,  "income": 40000,  "state": "Odisha",          "district": "Bhubaneswar", "education_level": "primary",        "gender": "female"},
    "123412341234": {"name": "Mohammed Iqbal",    "age": 38,  "income": 95000,  "state": "Telangana",       "district": "Hyderabad",   "education_level": "graduate",       "gender": "male"},
    "567856785678": {"name": "Meena Kumari",      "age": 33,  "income": 55000,  "state": "Tamil Nadu",      "district": "Chennai",     "education_level": "higher_secondary","gender": "female"},
    "901290129012": {"name": "Harpreet Kaur",     "age": 27,  "income": 210000, "state": "Punjab",          "district": "Amritsar",    "education_level": "graduate",       "gender": "female"},
    "246824682468": {"name": "Dinesh Yadav",      "age": 41,  "income": 70000,  "state": "Jharkhand",       "district": "Ranchi",      "education_level": "secondary",      "gender": "male"},
    "135713571357": {"name": "Fatima Khatoon",    "age": 48,  "income": 35000,  "state": "Assam",           "district": "Guwahati",    "education_level": "primary",        "gender": "female"},
    "864286428642": {"name": "Gopal Krishna",     "age": 60,  "income": 25000,  "state": "Kerala",          "district": "Thiruvananthapuram", "education_level": "secondary", "gender": "male"},
    "975397539753": {"name": "Reena Gupta",       "age": 23,  "income": 180000, "state": "Haryana",         "district": "Gurugram",    "education_level": "graduate",       "gender": "female"},
    "321032103210": {"name": "Santosh Kumar",     "age": 52,  "income": 45000,  "state": "Chhattisgarh",    "district": "Raipur",      "education_level": "primary",        "gender": "male"},
    "654965496549": {"name": "Lakshmi Reddy",     "age": 31,  "income": 300000, "state": "Andhra Pradesh",  "district": "Visakhapatnam","education_level": "postgraduate",  "gender": "female"},
    "789078907890": {"name": "Bibek Das",         "age": 44,  "income": 65000,  "state": "Tripura",         "district": "Agartala",    "education_level": "secondary",      "gender": "male"},
}

STATES = [
    ("Andhra Pradesh", "Visakhapatnam"), ("Assam", "Guwahati"), ("Bihar", "Patna"),
    ("Chhattisgarh", "Raipur"), ("Delhi", "New Delhi"), ("Gujarat", "Ahmedabad"),
    ("Haryana", "Gurugram"), ("Jharkhand", "Ranchi"), ("Karnataka", "Bangalore"),
    ("Kerala", "Kochi"), ("Madhya Pradesh", "Indore"), ("Maharashtra", "Mumbai"),
    ("Odisha", "Bhubaneswar"), ("Punjab", "Chandigarh"), ("Rajasthan", "Jodhpur"),
    ("Tamil Nadu", "Chennai"), ("Telangana", "Hyderabad"), ("Uttar Pradesh", "Varanasi"),
    ("West Bengal", "Howrah"), ("Gujarat", "Surat"),
]
EDUCATION_LEVELS = ["illiterate", "primary", "secondary", "higher_secondary", "graduate", "postgraduate"]
NAMES_M = ["Ramesh", "Suresh", "Mahesh", "Anil", "Vijay", "Sanjay", "Amit", "Deepak", "Rakesh", "Manoj"]
NAMES_F = ["Priya", "Sunita", "Geeta", "Anita", "Rekha", "Pooja", "Kavita", "Neha", "Sonia", "Ritu"]
SURNAMES = ["Sharma", "Kumar", "Singh", "Verma", "Gupta", "Patel", "Reddy", "Nair", "Das", "Joshi"]


def generate_demographics(aadhaar_id: str) -> dict:
    """
    Generate consistent pseudo-random demographics for any 12-digit Aadhaar number.
    Using SHA-256 of the number so the same Aadhaar always gives same data.
    """
    h = int(hashlib.sha256(aadhaar_id.encode()).hexdigest(), 16)
    gender = "male" if h % 2 == 0 else "female"
    names = NAMES_M if gender == "male" else NAMES_F
    first = names[(h >> 4) % len(names)]
    last  = SURNAMES[(h >> 8) % len(SURNAMES)]
    age   = 18 + (h >> 12) % 55          # 18–72
    income_base = (h >> 16) % 20          # 0–19 → * 15000 → 0–285000
    income = income_base * 15000
    state_idx = (h >> 20) % len(STATES)
    state, district = STATES[state_idx]
    edu_idx = (h >> 24) % len(EDUCATION_LEVELS)
    edu = EDUCATION_LEVELS[edu_idx]
    return {
        "name":            f"{first} {last}",
        "age":             age,
        "income":          income,
        "state":           state,
        "district":        district,
        "education_level": edu,
        "gender":          gender,
    }


def ok(body):
    return {"statusCode": 200, "headers": CORS_HEADERS, "body": json.dumps(body, ensure_ascii=False)}

def err(status, message):
    return {"statusCode": status, "headers": CORS_HEADERS, "body": json.dumps({"error": message})}


# ─── main handler ─────────────────────────────────────────────────────────────

def lambda_handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    print(json.dumps({"method": event.get("httpMethod"), "path": event.get("path"),
                      "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}))

    try:
        body = json.loads(event.get("body") or "{}")
        aadhaar_id = str(body.get("aadhaar_id", "")).strip().replace(" ", "")

        # Validate: must be exactly 12 digits
        if not re.match(r"^\d{12}$", aadhaar_id):
            return err(400, "Aadhaar number 12-digit hona chahiye (sirf numbers)")

        # Look up known profiles first; otherwise generate deterministically
        profile = KNOWN_AADHAAR.get(aadhaar_id) or generate_demographics(aadhaar_id)

        return ok({
            "aadhaar_id":      aadhaar_id,
            "name":            profile["name"],
            "age":             profile["age"],
            "income":          profile["income"],
            "state":           profile["state"],
            "district":        profile["district"],
            "education_level": profile["education_level"],
            "gender":          profile["gender"],
            "source":          "known" if aadhaar_id in KNOWN_AADHAAR else "generated",
            "message":         "Aadhaar details successfully fetch ho gaye!",
        })

    except Exception as e:
        print(f"Error: {e}")
        return err(500, f"Internal error: {str(e)}")
