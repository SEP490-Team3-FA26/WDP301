import os
import sys
import uuid
import re
from pymongo import MongoClient
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from dotenv import load_dotenv

load_dotenv()

try:
    from fastembed import TextEmbedding
    embedding_model = TextEmbedding(model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
except:
    embedding_model = None

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
        medicines = list(collection.find({}))
    except Exception as e:
        print(f"MongoDB connection or query error: {e}")
        sys.exit(1)
        
    print(f"Found {len(medicines)} medicines in MongoDB collection.")
    if not medicines:
        print("No valid medicines in MongoDB to index.")
        sys.exit(0)
        
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
    for i in range(0, len(medicines), batch_size):
        batch = medicines[i:i + batch_size]
        
        # Prepare texts and metadata
        texts = []
        batch_items = []
        for item in batch:
            name = item.get("name") or ""
            details = item.get("thong_tin_chi_tiet") or {}
            active_ingredient = details.get("Thành phần") or details.get("active_ingredient") or ""
            indications = item.get("cong_dung") or item.get("indications") or ""
            default_dosage = item.get("cach_dung") or item.get("default_dosage") or ""
            contraindications = item.get("tac_dung_phu") or item.get("luu_y") or item.get("contraindications") or ""
            
            # Truncate descriptions for embedding text (saves full text in payload)
            ind_short = (indications or "")[:400]
            contra_short = (contraindications or "")[:400]
            text = f"{name} ({active_ingredient}). Chỉ định: {ind_short}. Chống chỉ định: {contra_short}."
            texts.append(f"query: {text}")
            
            price_raw = details.get("Giá bán") or details.get("price")
            price = clean_price(price_raw)
            category = item.get("category") or details.get("Danh mục") or "Chưa phân loại"
            image_url = item.get("image") or item.get("image_url") or ""
            
            batch_items.append({
                "mongo_id": str(item.get("_id")),
                "name": name,
                "active_ingredient": active_ingredient,
                "indications": indications,
                "default_dosage": default_dosage,
                "contraindications": contraindications,
                "category": category,
                "drug_classification": item.get("drug_classification") or "COMMON_SUPPLEMENT",
                "price": price,
                "image_url": image_url,
                "stock_quantity": item.get("stock") or 100,
                "status": item.get("status") or "In Stock",
                "expiry_date": item.get("expiry_date") or "2026-12-31",
                "unit": item.get("unit") or "Hộp"
            })
            
        # Batch embed
        if embedding_model:
            embeddings_gen = embedding_model.embed(texts)
            vectors = [[float(x) for x in emb] for emb in embeddings_gen]
        else:
            vectors = [[0.0] * 384] * len(batch)
            
        points = []
        for idx, payload in enumerate(batch_items):
            points.append(PointStruct(
                id=str(uuid.uuid4()),
                vector=vectors[idx],
                payload=payload
            ))
            
        qdrant.upsert(collection_name=collection_name, points=points)
        print(f"Indexed {min(i + batch_size, len(medicines))}/{len(medicines)} medicines...")
        
    print(f"Successfully indexed {len(medicines)} MongoDB records into Qdrant!")

if __name__ == "__main__":
    main()
