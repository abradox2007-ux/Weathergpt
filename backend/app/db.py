import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger("weathergpt.db")

class InMemoryAsyncCollection:
    """Lightweight in-memory MongoDB-compatible async collection fallback."""
    def __init__(self, name: str):
        self.name = name
        self._data: Dict[str, Dict[str, Any]] = {}

    async def find_one(self, filter_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for item in self._data.values():
            match = True
            for k, v in filter_dict.items():
                if k == "_id" and item.get("_id") != v and item.get("id") != v:
                    match = False
                    break
                elif item.get(k) != v:
                    match = False
                    break
            if match:
                # Check TTL expiration if applicable
                if "expires_at" in item and item["expires_at"]:
                    exp = item["expires_at"]
                    now = datetime.now(timezone.utc)
                    if isinstance(exp, str):
                        try:
                            exp = datetime.fromisoformat(exp.replace("Z", "+00:00"))
                        except Exception:
                            pass
                    if isinstance(exp, datetime) and exp < now:
                        continue
                return dict(item)
        return None

    async def insert_one(self, doc: Dict[str, Any]):
        doc_id = doc.get("_id") or doc.get("id") or str(len(self._data) + 1)
        doc["_id"] = doc_id
        self._data[str(doc_id)] = dict(doc)
        return type("InsertResult", (), {"inserted_id": doc_id})()

    async def update_one(self, filter_dict: Dict[str, Any], update_dict: Dict[str, Any], upsert: bool = False):
        existing = await self.find_one(filter_dict)
        if existing:
            doc_id = str(existing.get("_id") or existing.get("id"))
            target = self._data[doc_id]
            if "$set" in update_dict:
                target.update(update_dict["$set"])
            if "$push" in update_dict:
                for k, v in update_dict["$push"].items():
                    if k not in target or not isinstance(target[k], list):
                        target[k] = []
                    target[k].append(v)
            if "$pull" in update_dict:
                for k, v in update_dict["$pull"].items():
                    if k in target and isinstance(target[k], list):
                        target[k] = [x for x in target[k] if not all(x.get(fk) == fv for fk, fv in v.items())]
            return type("UpdateResult", (), {"matched_count": 1, "modified_count": 1})()
        elif upsert:
            new_doc = dict(filter_dict)
            if "$set" in update_dict:
                new_doc.update(update_dict["$set"])
            await self.insert_one(new_doc)
            return type("UpdateResult", (), {"matched_count": 0, "modified_count": 1, "upserted_id": new_doc.get("_id")})()
        return type("UpdateResult", (), {"matched_count": 0, "modified_count": 0})()

    async def delete_one(self, filter_dict: Dict[str, Any]):
        existing = await self.find_one(filter_dict)
        if existing:
            doc_id = str(existing.get("_id") or existing.get("id"))
            if doc_id in self._data:
                del self._data[doc_id]
                return type("DeleteResult", (), {"deleted_count": 1})()
        return type("DeleteResult", (), {"deleted_count": 0})()

    def find(self, filter_dict: Optional[Dict[str, Any]] = None):
        filter_dict = filter_dict or {}
        class AsyncCursor:
            def __init__(self, collection, f_dict):
                self.collection = collection
                self.f_dict = f_dict
                self._limit = 0
                self._sort_key = None
                self._sort_dir = 1

            def limit(self, n: int):
                self._limit = n
                return self

            def sort(self, key: str, direction: int = 1):
                self._sort_key = key
                self._sort_dir = direction
                return self

            async def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
                results = []
                now = datetime.now(timezone.utc)
                for item in self.collection._data.values():
                    match = True
                    for k, v in self.f_dict.items():
                        if item.get(k) != v:
                            match = False
                            break
                    if match:
                        if "expires_at" in item and item["expires_at"]:
                            exp = item["expires_at"]
                            if isinstance(exp, datetime) and exp < now:
                                continue
                        results.append(dict(item))
                
                if self._sort_key:
                    results.sort(key=lambda x: x.get(self._sort_key, 0), reverse=(self._sort_dir == -1))
                
                max_len = length if length is not None else self._limit
                if max_len and max_len > 0:
                    return results[:max_len]
                return results

        return AsyncCursor(self, filter_dict)

    async def create_index(self, keys, **kwargs):
        pass


class DatabaseManager:
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.db = None
        self.is_in_memory: bool = False
        self._memory_collections: Dict[str, InMemoryAsyncCollection] = {}

    def get_collection(self, name: str):
        if self.is_in_memory or self.db is None:
            if name not in self._memory_collections:
                self._memory_collections[name] = InMemoryAsyncCollection(name)
            return self._memory_collections[name]
        return self.db[name]

    async def connect(self):
        try:
            logger.info("Attempting MongoDB connection: %s", settings.MONGODB_URI)
            # Short timeout to avoid blocking server start if local mongo is absent
            client = AsyncIOMotorClient(settings.MONGODB_URI, serverSelectionTimeoutMS=2000)
            await client.server_info()
            self.client = client
            self.db = client[settings.DATABASE_NAME]
            self.is_in_memory = False
            logger.info("Connected successfully to MongoDB: %s", settings.DATABASE_NAME)
            await self._init_indexes()
        except Exception as e:
            logger.warning("MongoDB not reachable (%s). Falling back to resilient In-Memory Async DB.", e)
            self.is_in_memory = True
            self._seed_default_data()

    async def _init_indexes(self):
        try:
            if not self.is_in_memory and self.db is not None:
                await self.db.users.create_index("device_id", unique=True)
                await self.db.chat_history.create_index("user_id")
                await self.db.weather_cache.create_index([("lat", 1), ("lon", 1)])
                await self.db.weather_cache.create_index("expires_at", expireAfterSeconds=0)
                await self.db.alerts.create_index([("lat", 1), ("lon", 1)])
                await self.db.advisories.create_index("user_id")
                await self.db.research_metrics_cache.create_index([("lat", 1), ("lon", 1)])
                await self.db.research_metrics_cache.create_index("expires_at", expireAfterSeconds=0)
                logger.info("MongoDB indexes verified successfully.")
        except Exception as e:
            logger.warning("Could not create all MongoDB indexes: %s", e)

    def _seed_default_data(self):
        """Seed default profession templates and test locations."""
        professions_col = self.get_collection("professions")
        professions = [
            {"_id": "farmer", "name": "farmer", "advisory_prompt_template": "Focus on crop irrigation, soil moisture, sowing/harvesting windows, and pest risks."},
            {"_id": "fisherman", "name": "fisherman", "advisory_prompt_template": "Focus on sea state, wave height, coastal wind speed, squall warnings, and safe harbour timings."},
            {"_id": "aviation", "name": "aviation", "advisory_prompt_template": "Focus on cloud ceiling, visibility, turbulence, thunderstorm convective activity, and crosswinds."},
            {"_id": "marine", "name": "marine", "advisory_prompt_template": "Focus on tidal patterns, maritime vessel navigation, swell period, and monsoon depressions."},
            {"_id": "urban_planning", "name": "urban_planning", "advisory_prompt_template": "Focus on urban heat island index, drainage/flood water accumulation risks, and road visibility."},
            {"_id": "general", "name": "general", "advisory_prompt_template": "Focus on daily commute, umbrella requirement, UV protection, outdoor activity comfort, and air quality."}
        ]
        for p in professions:
            asyncio.create_task(professions_col.insert_one(p))

    async def close(self):
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed.")

db_manager = DatabaseManager()
