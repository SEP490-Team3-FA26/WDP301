import os
from qdrant_client import QdrantClient
from fastembed import TextEmbedding

QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
try:
    # Use synchronous client for simple retrieve
    qdrant = QdrantClient(host=QDRANT_HOST, port=6333)
except:
    qdrant = None

# Tải mô hình đa ngôn ngữ siêu nhẹ chạy Local (không tốn API)
try:
    embedding_model = TextEmbedding(model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
except Exception as e:
    print(f"Warning: Could not load embedding model: {e}")
    embedding_model = None

import asyncio
from functools import lru_cache

@lru_cache(maxsize=1000)
def get_embedding_sync(text: str) -> list[float]:
    if not embedding_model:
        return [0.0] * 384
    # e5 models require 'query: ' prefix for search queries, but for simplicity we just embed
    embeddings = list(embedding_model.embed([f"query: {text}"]))
    return [float(x) for x in embeddings[0]]

async def get_embedding(text: str) -> list[float]:
    return await asyncio.to_thread(get_embedding_sync, text)

async def retrieve_medical_context(query: str, top_k: int = 3) -> str:
    """
    Lấy ngữ cảnh y khoa từ Qdrant
    """
    if not qdrant:
        return ""
        
    try:
        query_vector = await get_embedding(query)
        results = qdrant.search(
            collection_name="medical_knowledge",
            query_vector=query_vector,
            limit=top_k,
            score_threshold=0.5
        )
        
        if not results:
            return ""
            
        context_parts = []
        for hit in results:
            drug = hit.payload
            context_parts.append(
                f"**{drug.get('name', 'N/A')}** ({drug.get('active_ingredient', 'N/A')})\n"
                f"- Chỉ định: {drug.get('indications', 'N/A')}\n"
                f"- Liều dùng: {drug.get('default_dosage', 'N/A')}\n"
                f"- Chống chỉ định: {drug.get('contraindications', 'N/A')}\n"
                f"- Tương tác thuốc: {drug.get('drug_interactions', 'N/A')}"
            )
        return "\n\n".join(context_parts)
    except Exception as e:
        print(f"RAG Error: {e}")
        return ""
