import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))

print("✅ MongoDB connection successful!")

print("\nDatabases:")
print(client.list_database_names())

# Change this to the database name you see above
db = client["molrag_ddi"]

print("\nCollections:")
print(db.list_collection_names())

for collection in db.list_collection_names():
    print(f"{collection}: {db[collection].count_documents({})} documents")