from collections import defaultdict
from datetime import datetime, timedelta
from fastapi import HTTPException, Request
import threading

_lock = threading.Lock()
_login_attempts: dict = defaultdict(list)

LOGIN_MAX_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 300  # 5 minutes


def check_login_rate_limit(ip: str):
    now = datetime.utcnow()
    window_start = now - timedelta(seconds=LOGIN_WINDOW_SECONDS)

    with _lock:
        # Clean old attempts
        _login_attempts[ip] = [t for t in _login_attempts[ip] if t > window_start]

        if len(_login_attempts[ip]) >= LOGIN_MAX_ATTEMPTS:
            raise HTTPException(
                status_code=429,
                detail=f"Too many login attempts. Try again in {LOGIN_WINDOW_SECONDS // 60} minutes."
            )

        _login_attempts[ip].append(now)


def clear_login_attempts(ip: str):
    with _lock:
        _login_attempts.pop(ip, None)
