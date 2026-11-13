"""
Who is logged in? One place for the JWT checks every router uses.
The token is issued by otp-backend; JWT_SECRET must be the same value in both .env files.
"""
import os
from typing import Optional

import jwt
from fastapi import Header, HTTPException

import config  # noqa: F401  (loads backend/.env so JWT_SECRET is available)
from utils.logger import setup_logger

logger = setup_logger("auth")

JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    logger.warning(
        "JWT_SECRET not set -- nothing will be saved to user history and "
        "GET /api/activity will always return 401. Add JWT_SECRET to backend/.env "
        "(same value as otp-backend/.env)."
    )


def decode_token(authorization: Optional[str]) -> Optional[str]:
    """Returns the user's email if a valid Bearer JWT is present, else None.
    Never raises -- an invalid/missing token just means 'not logged in'."""
    if not authorization or not authorization.startswith("Bearer ") or not JWT_SECRET:
        return None
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get("email")
    except jwt.PyJWTError:
        return None


def get_optional_user_email(authorization: Optional[str] = Header(default=None)) -> Optional[str]:
    return decode_token(authorization)


def get_required_user_email(authorization: Optional[str] = Header(default=None)) -> str:
    email = decode_token(authorization)
    if not email:
        raise HTTPException(status_code=401, detail="Please log in to view your history.")
    return email