from datetime import datetime, timedelta
import threading

_cache: dict = {}
_lock = threading.Lock()

DEFAULT_TTL_SECONDS = 60


def cache_get(key: str):
    with _lock:
        if key in _cache:
            value, expiry = _cache[key]
            if datetime.utcnow() < expiry:
                return value
            else:
                del _cache[key]
    return None


def cache_set(key: str, value, ttl: int = DEFAULT_TTL_SECONDS):
    with _lock:
        expiry = datetime.utcnow() + timedelta(seconds=ttl)
        _cache[key] = (value, expiry)


def cache_delete(key: str):
    with _lock:
        _cache.pop(key, None)


def cache_delete_prefix(prefix: str):
    with _lock:
        keys_to_delete = [k for k in _cache if k.startswith(prefix)]
        for k in keys_to_delete:
            del _cache[k]
