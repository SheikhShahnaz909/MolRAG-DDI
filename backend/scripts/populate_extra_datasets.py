"""
Loads pair_interaction_evidence.csv and master_ddi_dataset_v4.csv into MongoDB Atlas.

Uses the MONGO_URI stored in backend/.env
and does not import config.py, so torch is not required.

Run:
    python scripts/populate_extra_datasets.py
"""

import os
import sys
import certifi
import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv


# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

# Load .env from the backend folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_FILE = os.path.join(BASE_DIR, ".env")

load_dotenv(ENV_FILE)

MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    print("ERROR: MONGO_URI was not found in backend/.env")
    print(f"Expected .env file at: {ENV_FILE}")
    sys.exit(1)


# ============================================================
# DATASET PATHS
# ============================================================

DATA_DIR = os.path.join(BASE_DIR, "data")

EVIDENCE_CSV = os.path.join(
    DATA_DIR,
    "pair_interaction_evidence.csv"
)

MASTER_CSV = os.path.join(
    DATA_DIR,
    "master_ddi_dataset_v4.csv"
)


# ============================================================
# SETTINGS
# ============================================================

BATCH_SIZE = 5000


# ============================================================
# LOAD CSV INTO MONGODB
# ============================================================

def load_collection(db, csv_path, collection_name):

    if not os.path.exists(csv_path):
        print(f"SKIPPED: File not found:")
        print(f"  {csv_path}")
        return

    print()
    print("=" * 60)
    print(f"Loading: {os.path.basename(csv_path)}")
    print(f"Collection: {collection_name}")
    print("=" * 60)

    # Read CSV
    df = pd.read_csv(csv_path)

    print(f"Read {len(df)} rows")

    # Get MongoDB collection
    collection = db[collection_name]

    # Remove existing documents
    print("Clearing existing collection...")
    collection.delete_many({})

    # Convert dataframe to dictionaries
    records = df.to_dict("records")

    # Insert in batches
    total = len(records)

    for i in range(0, total, BATCH_SIZE):

        batch = records[i:i + BATCH_SIZE]

        collection.insert_many(batch)

        inserted = min(i + BATCH_SIZE, total)

        print(
            f"Inserted {inserted}/{total} "
            f"documents into {collection_name}"
        )

    # Verify count
    count = collection.count_documents({})

    print()
    print(f"SUCCESS: {count} documents loaded")
    print(f"Collection: {collection_name}")


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 60)
    print("MolRAG-DDI MongoDB Dataset Loader")
    print("=" * 60)

    print()
    print("Connecting to MongoDB Atlas...")

    try:

        client = MongoClient(
            MONGO_URI,
            tls=True,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=20000
        )
        

        # Test connection
        client.admin.command("ping")

        print("MongoDB connection successful!")

    except Exception as e:

        print()
        print("ERROR: Could not connect to MongoDB Atlas.")
        print()
        print(e)
        sys.exit(1)

    # Select database
    db = client["molrag_ddi"]

    print()
    print("Database: molrag_ddi")

    # --------------------------------------------------------
    # Load Evidence Dataset
    # --------------------------------------------------------

    load_collection(
        db,
        EVIDENCE_CSV,
        "pair_interaction_evidence"
    )

    # --------------------------------------------------------
    # Load Master DDI Dataset
    # --------------------------------------------------------

    load_collection(
        db,
        MASTER_CSV,
        "master_ddi_dataset"
    )

    # --------------------------------------------------------
    # Final verification
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print("FINAL DATABASE STATUS")
    print("=" * 60)

    collections = db.list_collection_names()

    for collection_name in collections:

        count = db[collection_name].count_documents({})

        print(
            f"{collection_name}: "
            f"{count} documents"
        )

    print()
    print("All datasets loaded successfully!")
    print("=" * 60)

    client.close()


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    main()