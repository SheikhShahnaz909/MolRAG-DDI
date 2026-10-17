"""
Loads pair_interaction_evidence.csv and master_ddi_dataset_v4.csv into MongoDB Atlas.
Standalone version: doesn't import config.py, so it doesn't need torch installed.
Run: python scripts/populate_extra_datasets.py
"""
import os
import sys
import pandas as pd
from pymongo import MongoClient

# Same connection string as populate_mongodb.py
MONGO_URI = "mongodb+srv://23csrehmat4967_db_user:MolRAG2026@cluster0.0xwqaiu.mongodb.net/?appName=Cluster0"

DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
)

EVIDENCE_CSV = os.path.join(DATA_DIR, "pair_interaction_evidence.csv")
MASTER_CSV = os.path.join(DATA_DIR, "master_ddi_dataset_v4.csv")

BATCH_SIZE = 5000  # insert in batches since these files are large


def load_collection(db, csv_path, collection_name):
    if not os.path.exists(csv_path):
        print(f"SKIPPED: {csv_path} not found.")
        return

    df = pd.read_csv(csv_path)
    print(f"Read {len(df)} rows from {csv_path}")

    collection = db[collection_name]
    collection.delete_many({})

    records = df.to_dict("records")
    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        collection.insert_many(batch)
        print(f"  Inserted {min(i + BATCH_SIZE, len(records))}/{len(records)} into {collection_name}")

    count = collection.count_documents({})
    print(f"Loaded {count} documents into MongoDB collection '{collection_name}'\n")


def main():
    if "PASTE_YOUR" in MONGO_URI:
        print("ERROR: Set MONGO_URI at the top of this script before running it.")
        sys.exit(1)

    client = MongoClient(MONGO_URI)
    db = client["molrag_ddi"]

    load_collection(db, EVIDENCE_CSV, "pair_interaction_evidence")
    load_collection(db, MASTER_CSV, "master_ddi_dataset")


if __name__ == "__main__":
    main()