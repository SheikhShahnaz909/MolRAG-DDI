"""
Loads combined_drug_catalog.csv into MongoDB Atlas.

Uses MONGO_URI from backend/.env.

Run:
    python scripts/populate_drug_catalog.py
"""

import os
import sys
import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE = os.path.join(BASE_DIR, ".env")
DATA_DIR = os.path.join(BASE_DIR, "data")

CSV_FILE = os.path.join(
    DATA_DIR,
    "combined_drug_catalog.csv"
)


# ============================================================
# LOAD ENVIRONMENT
# ============================================================

load_dotenv(ENV_FILE)

MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    print("ERROR: MONGO_URI was not found in backend/.env")
    sys.exit(1)


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 60)
    print("MolRAG-DDI Drug Catalog Loader")
    print("=" * 60)

    # Check CSV
    if not os.path.exists(CSV_FILE):
        print()
        print("ERROR: Drug catalog CSV not found:")
        print(CSV_FILE)
        sys.exit(1)

    # Connect to MongoDB
    print()
    print("Connecting to MongoDB Atlas...")

    try:
        client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=20000
        )

        client.admin.command("ping")

        print("MongoDB connection successful!")

    except Exception as e:
        print()
        print("ERROR: Could not connect to MongoDB Atlas.")
        print()
        print(e)
        sys.exit(1)

    # Database
    db = client["molrag_ddi"]

    # Collection
    collection = db["drug_catalog"]

    print()
    print("Database: molrag_ddi")
    print("Collection: drug_catalog")

    # Read CSV
    print()
    print("Reading drug catalog...")

    df = pd.read_csv(CSV_FILE)

    print(f"Read {len(df)} drug records")

    print()
    print("Columns:")
    print(df.columns.tolist())

    # Clear existing collection
    print()
    print("Clearing existing drug_catalog collection...")

    collection.delete_many({})

    # Convert to records
    records = df.to_dict("records")

    # Insert in batches
    BATCH_SIZE = 5000
    total = len(records)

    print()
    print("Inserting records...")

    for i in range(0, total, BATCH_SIZE):

        batch = records[i:i + BATCH_SIZE]

        collection.insert_many(batch)

        inserted = min(i + BATCH_SIZE, total)

        print(
            f"Inserted {inserted}/{total} "
            f"documents"
        )

    # Create index for fast drug-name searches
    print()
    print("Creating drug name index...")

    collection.create_index(
        "drug_name",
        unique=True
    )

    # Verify
    count = collection.count_documents({})

    print()
    print("=" * 60)
    print("SUCCESS")
    print("=" * 60)

    print(f"Drug records loaded: {count}")
    print("Collection: drug_catalog")
    print("Index: drug_name")

    print()
    print("MongoDB collections now:")

    for name in db.list_collection_names():
        print(
            f"  - {name}: "
            f"{db[name].count_documents({})} documents"
        )

    print()
    print("Drug catalog loaded successfully!")

    client.close()


if __name__ == "__main__":
    main()