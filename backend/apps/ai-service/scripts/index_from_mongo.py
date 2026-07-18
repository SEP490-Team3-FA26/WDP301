import os
import sys
import uuid
import re
from pymongo import MongoClient
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from dotenv import load_dotenv

load_dotenv()

import httpx

load_dotenv()

COHERE_API_KEY = os.getenv("COHERE_API_KEY")

def get_embeddings_cohere(texts: list[str]) -> list[list[float]]:
    if not COHERE_API_KEY:
        print("Warning: COHERE_API_KEY is not configured in env.")
        return [[0.0] * 384] * len(texts)
    try:
        response = httpx.post(
            "https://api.cohere.com/v2/embed",
            headers={
                "Authorization": f"Bearer {COHERE_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "texts": texts,
                "model": "embed-multilingual-light-v3.0",
                "input_type": "search_document",
                "embedding_types": ["float"]
            },
            timeout=30.0
        )
        response.raise_for_status()
        data = response.json()
        return [[float(x) for x in emb] for emb in data["embeddings"]["float"]]
    except Exception as e:
        print(f"Error calling Cohere API: {e}")
        return [[0.0] * 384] * len(texts)

def clean_price(price_raw):
    if not price_raw:
        return 50000
    try:
        cleaned = re.sub(r'[^0-9.]', '', str(price_raw))
        return int(float(cleaned)) if cleaned else 50000
    except:
        return 50000

def main():
    MONGODB_URI = os.getenv("MONGODB_URI") or os.getenv("MONGODB_CONNECTION_STRING")
    QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
    
    if not MONGODB_URI:
        print("Missing MONGODB_URI / MONGODB_CONNECTION_STRING in env!")
        sys.exit(1)
        
    try:
        qdrant = QdrantClient(host=QDRANT_HOST, port=6333)
    except Exception as e:
        print(f"Failed to connect to Qdrant: {e}")
        sys.exit(1)
        
    print("Connecting to MongoDB...")
    try:
        mongo_client = MongoClient(MONGODB_URI)
        # Extract database name from URI or default to WDP201
        db_name = "WDP201"
        if "net/" in MONGODB_URI:
            parts = MONGODB_URI.split("net/")
            if len(parts) > 1:
                db_name = parts[1].split("?")[0]
        
        db = mongo_client[db_name]
        collection = db["medicines"]
        cursor = collection.find({})
    except Exception as e:
        print(f"MongoDB connection or query error: {e}")
        sys.exit(1)
        
    collection_name = "medical_knowledge"
    
    # Check collection
    if qdrant.collection_exists(collection_name):
        qdrant.delete_collection(collection_name)
        
    qdrant.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=384, distance=Distance.COSINE)
    )
    
    print("Indexing MongoDB medicines into Qdrant in batches...")
    batch_size = 100
    batch = []
    total_indexed = 0
    
    for item in cursor:
        batch.append(item)
        if len(batch) >= batch_size:
            # Prepare texts and metadata
            texts = []
            batch_items = []
            for batch_item in batch:
                name = batch_item.get("name") or ""
                details = batch_item.get("thong_tin_chi_tiet") or {}
                active_ingredient = details.get("Thành phần") or details.get("active_ingredient") or ""
                indications = details.get("Chỉ định") or batch_item.get("cong_dung") or batch_item.get("indications") or ""
                default_dosage = details.get("Liều dùng") or details.get("Cách dùng") or batch_item.get("cach_dung") or batch_item.get("default_dosage") or ""
                contraindications = details.get("Chống chỉ định") or details.get("Tác dụng phụ") or details.get("Lưu ý") or batch_item.get("tac_dung_phu") or batch_item.get("luu_y") or batch_item.get("contraindications") or ""
                
                # Truncate descriptions for embedding text (saves full text in payload)
                ind_short = (indications or "")[:400]
                contra_short = (contraindications or "")[:400]
                text = f"{name} ({active_ingredient}). Chỉ định: {ind_short}. Chống chỉ định: {contra_short}."
                texts.append(f"query: {text}")
                
                price_raw = details.get("Giá bán") or details.get("price")
                price = clean_price(price_raw)
                category = batch_item.get("category") or details.get("Danh mục") or "Chưa phân loại"
                image_url = batch_item.get("image") or batch_item.get("image_url") or ""
                
                batch_items.append({
                    "mongo_id": str(batch_item.get("_id")),
                    "name": name,
                    "active_ingredient": active_ingredient,
                    "indications": indications,
                    "default_dosage": default_dosage,
                    "contraindications": contraindications,
                    "category": category,
                    "drug_classification": batch_item.get("drug_classification") or "COMMON_SUPPLEMENT",
                    "price": price,
                    "image_url": image_url,
                    "stock_quantity": batch_item.get("stock") or 100,
                    "status": batch_item.get("status") or "In Stock",
                    "expiry_date": batch_item.get("expiry_date") or "2026-12-31",
                    "unit": batch_item.get("unit") or "Hộp"
                })
                
            # Batch embed
            vectors = get_embeddings_cohere(texts)
                
            points = []
            for idx, payload in enumerate(batch_items):
                points.append(PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vectors[idx],
                    payload=payload
                ))
                
            qdrant.upsert(collection_name=collection_name, points=points)
            total_indexed += len(batch)
            if total_indexed % 1000 == 0:
                print(f"Indexed {total_indexed} medicines...")
            batch = []
            
    if batch:
        # Prepare texts and metadata for remaining
        texts = []
        batch_items = []
        for batch_item in batch:
            name = batch_item.get("name") or ""
            details = batch_item.get("thong_tin_chi_tiet") or {}
            active_ingredient = details.get("Thành phần") or details.get("active_ingredient") or ""
            indications = details.get("Chỉ định") or batch_item.get("cong_dung") or batch_item.get("indications") or ""
            default_dosage = details.get("Liều dùng") or details.get("Cách dùng") or batch_item.get("cach_dung") or batch_item.get("default_dosage") or ""
            contraindications = details.get("Chống chỉ định") or details.get("Tác dụng phụ") or details.get("Lưu ý") or batch_item.get("tac_dung_phu") or batch_item.get("luu_y") or batch_item.get("contraindications") or ""
            
            ind_short = (indications or "")[:400]
            contra_short = (contraindications or "")[:400]
            text = f"{name} ({active_ingredient}). Chỉ định: {ind_short}. Chống chỉ định: {contra_short}."
            texts.append(f"query: {text}")
            
            price_raw = details.get("Giá bán") or details.get("price")
            price = clean_price(price_raw)
            category = batch_item.get("category") or details.get("Danh mục") or "Chưa phân loại"
            image_url = batch_item.get("image") or batch_item.get("image_url") or ""
            
            batch_items.append({
                "mongo_id": str(batch_item.get("_id")),
                "name": name,
                "active_ingredient": active_ingredient,
                "indications": indications,
                "default_dosage": default_dosage,
                "contraindications": contraindications,
                "category": category,
                "drug_classification": batch_item.get("drug_classification") or "COMMON_SUPPLEMENT",
                "price": price,
                "image_url": image_url,
                "stock_quantity": batch_item.get("stock") or 100,
                "status": batch_item.get("status") or "In Stock",
                "expiry_date": batch_item.get("expiry_date") or "2026-12-31",
                "unit": batch_item.get("unit") or "Hộp"
            })
            
        vectors = get_embeddings_cohere(texts)
            
        points = []
        for idx, payload in enumerate(batch_items):
            points.append(PointStruct(
                id=str(uuid.uuid4()),
                vector=vectors[idx],
                payload=payload
            ))
            
        qdrant.upsert(collection_name=collection_name, points=points)
        total_indexed += len(batch)
        
    print(f"Successfully indexed {total_indexed} MongoDB records into Qdrant!")

if __name__ == "__main__":
    main()
