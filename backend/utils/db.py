import os
from pymongo import MongoClient
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

MONGO_URI = os.getenv("MONGO_URI")
# tz_aware=True: datetimes read back from Mongo carry UTC, so the API sends "...+00:00"
# and browsers show the right local time (naive values are read as local time).
client = MongoClient(MONGO_URI, tz_aware=True)
db = client["molrag_ddi"]