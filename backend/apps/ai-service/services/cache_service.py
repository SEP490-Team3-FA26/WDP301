import hashlib
import time
from typing import Optional, Dict, Any

class SHA256ImageCache:
    def __init__(self, ttl_seconds: int = 1800, max_size: int = 200):
        self.ttl = ttl_seconds
        self.max_size = max_size
        self.cache: Dict[str, Dict[str, Any]] = {}

    def _hash_key(self, images_bytes: list[bytes], branch_id: str) -> str:
        hasher = hashlib.sha256()
        hasher.update(branch_id.encode('utf-8'))
        for img in images_bytes:
            hasher.update(img)
        return hasher.hexdigest()

    def get(self, images_bytes: list[bytes], branch_id: str) -> Optional[Dict[str, Any]]:
        key = self._hash_key(images_bytes, branch_id)
        entry = self.cache.get(key)
        if not entry:
            return None
        if time.time() - entry["timestamp"] > self.ttl:
            del self.cache[key]
            return None
        return entry["data"]

    def set(self, images_bytes: list[bytes], branch_id: str, data: Dict[str, Any]):
        if len(self.cache) >= self.max_size:
            # Clean expired items
            now = time.time()
            expired_keys = [k for k, v in self.cache.items() if now - v["timestamp"] > self.ttl]
            for k in expired_keys:
                del self.cache[k]
            if len(self.cache) >= self.max_size:
                # Remove oldest
                oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k]["timestamp"])
                del self.cache[oldest_key]

        key = self._hash_key(images_bytes, branch_id)
        self.cache[key] = {
            "timestamp": time.time(),
            "data": data
        }

prescription_cache = SHA256ImageCache()
