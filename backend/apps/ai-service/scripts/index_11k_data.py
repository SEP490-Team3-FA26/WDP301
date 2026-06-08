import os
import sys
import psycopg2
from psycopg2.extras import DictCursor
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import uuid
from dotenv import load_dotenv

# Try importing fastembed, otherwise dummy
try:
    from fastembed import TextEmbedding
    embedding_model = TextEmbedding(model_name="intfloat/multilingual-e5-small")
except Exception as e:
    print(f"Warning: Could not load embedding model: {e}")
    embedding_model = None

load_dotenv()

def get_embedding(text: str) -> list[float]:
    if not embedding_model:
        return [0.0] * 384
    embeddings = list(embedding_model.embed([f"query: {text}"]))
    return [float(x) for x in embeddings[0]]

def main():
    DATABASE_URL = os.getenv("DATABASE_URL")
    QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
    
    if not DATABASE_URL:
        print("Missing DATABASE_URL!")
        sys.exit(1)
        
    try:
        qdrant = QdrantClient(host=QDRANT_HOST, port=6333)
    except Exception as e:
        print(f"Failed to connect to Qdrant: {e}")
        sys.exit(1)
        
    print("Fetching 11k dataset from Supabase via PostgreSQL...")
    try:
        conn_str = DATABASE_URL.replace('?pgbouncer=true', '')
        conn = psycopg2.connect(conn_str)
        # Using a named cursor creates a server-side cursor
        cur = conn.cursor('medicines_11k_cursor', cursor_factory=DictCursor)
        cur.execute("SELECT name, active_ingredient, indications, contraindications, side_effects, default_dosage, drug_interactions, price, stock_quantity, image_url FROM public.medicines")
    except Exception as e:
        print(f"Database error: {e}")
        sys.exit(1)
        
    collection_name = "medical_knowledge"
    
    # Check collection
    if qdrant.collection_exists(collection_name):
        qdrant.delete_collection(collection_name)
        
    qdrant.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(size=384, distance=Distance.COSINE)
    )
    
    print("Indexing into Qdrant using FastEmbed (Multilingual) in batches...")
    points = []
    total_indexed = 0
    
    while True:
        rows = cur.fetchmany(100)
        if not rows:
            break
            
        for item in rows:
            name = item.get("name") or ""
            active_ingredient = item.get("active_ingredient") or ""
            indications = item.get("indications") or ""
            contraindications = item.get("contraindications") or ""
            side_effects = item.get("side_effects") or ""
            
            # English text for embedding
            text = f"Medicine: {name}. Composition: {active_ingredient}. Uses: {indications}. Side effects: {side_effects}."
            vector = get_embedding(text)
            
            points.append(PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={
                    "name": name,
                    "active_ingredient": active_ingredient,
                    "indications": indications,
                    "default_dosage": item.get("default_dosage") or "As prescribed by physician.",
                    "contraindications": contraindications,
                    "drug_interactions": item.get("drug_interactions") or "",
                    "side_effects": side_effects,
                    "price": item.get("price", 50000),
                    "stock_quantity": item.get("stock_quantity", 100),
                    "image_url": item.get("image_url", "")
                }
            ))
            
            # Upsert in batches of 100
            if len(points) >= 100:
                qdrant.upsert(collection_name=collection_name, points=points)
                total_indexed += len(points)
                if total_indexed % 1000 == 0:
                    print(f"Indexed {total_indexed} medicines...")
                points = []
                
    if points:
        qdrant.upsert(collection_name=collection_name, points=points)
        total_indexed += len(points)
        
    cur.close()
    conn.close()
    
    print(f"Successfully indexed {total_indexed} medical records into Qdrant using Multilingual embeddings!")

if __name__ == "__main__":
    main()
