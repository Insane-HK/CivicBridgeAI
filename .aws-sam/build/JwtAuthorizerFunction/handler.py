"""
CivicBridge AI — JWT Lambda Authorizer
Validates Bearer tokens on protected endpoints.
"""
import json
import os
import re
import hmac
import hashlib
import base64
import time


JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-in-prod")


# ─── Minimal JWT (HS256) without external dependencies ────────────────────────

def b64url_decode(s):
    s += "=" * (4 - len(s) % 4)
    return base64.urlsafe_b64decode(s)

def b64url_encode(b):
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()

def verify_jwt(token):
    """Returns payload dict if valid, raises Exception otherwise."""
    try:
        header_b64, payload_b64, sig_b64 = token.split(".")
    except ValueError:
        raise Exception("Malformed token")

    # Verify signature
    signing_input = f"{header_b64}.{payload_b64}".encode()
    expected_sig = hmac.new(
        JWT_SECRET.encode(), signing_input, hashlib.sha256
    ).digest()
    actual_sig = b64url_decode(sig_b64)
    if not hmac.compare_digest(expected_sig, actual_sig):
        raise Exception("Invalid signature")

    # Decode payload
    payload = json.loads(b64url_decode(payload_b64))

    # Check expiry
    if payload.get("exp", 0) < time.time():
        raise Exception("Token expired")

    return payload


def generate_policy(principal_id, effect, resource, context=None):
    policy = {
        "principalId": principal_id,
        "policyDocument": {
            "Version": "2012-10-17",
            "Statement": [{
                "Action": "execute-api:Invoke",
                "Effect": effect,
                "Resource": resource,
            }],
        },
    }
    if context:
        policy["context"] = context
    return policy


def lambda_handler(event, context):
    token = event.get("authorizationToken", "")
    method_arn = event.get("methodArn", "")

    # Strip "Bearer " prefix
    if token.startswith("Bearer "):
        token = token[7:]

    try:
        payload = verify_jwt(token)
        user_id = payload.get("user_id", "unknown")
        return generate_policy(
            user_id, "Allow", method_arn,
            context={"user_id": user_id, "phone_number": payload.get("phone_number", "")}
        )
    except Exception as e:
        print(f"JWT Auth failed: {e}")
        return generate_policy("unauthorized", "Deny", method_arn)
