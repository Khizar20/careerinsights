"""
MongoDB Client Helper
Provides a reusable connection to MongoDB Atlas.
"""

import os
from typing import Optional

from pymongo import MongoClient

_client: Optional[MongoClient] = None


def get_mongo_client() -> MongoClient:
  """
  Get a singleton MongoDB client using MONGODB_URI from environment.
  """
  global _client
  if _client is None:
    uri = os.getenv("MONGODB_URI")
    if not uri:
      raise RuntimeError("MONGODB_URI is not set in environment/.env")
    _client = MongoClient(uri)
  return _client


def get_database(db_name: Optional[str] = None):
  """
  Get a MongoDB database. Uses MONGODB_DB_NAME if db_name is not provided.
  """
  client = get_mongo_client()
  name = db_name or os.getenv("MONGODB_DB_NAME") or "CareerInsights"
  return client[name]


def get_collection(collection_name: str, db_name: Optional[str] = None):
  """
  Get a MongoDB collection from the configured database.
  """
  db = get_database(db_name)
  return db[collection_name]


