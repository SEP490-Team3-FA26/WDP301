import os
from qdrant_client import QdrantClient
import httpx

QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")

try:
    # Use synchronous client for simple retrieve
    qdrant = QdrantClient(host=QDRANT_HOST, port=6333)
except:
    qdrant = None

async def get_embedding(text: str) -> list[float]:
    """
    Tạo embedding bằng Cohere API (model: embed-multilingual-light-v3.0, size: 384)
    """
    if not COHERE_API_KEY:
        print("Warning: COHERE_API_KEY is not configured in env.")
        return [0.0] * 384
        
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.cohere.com/v2/embed",
                headers={
                    "Authorization": f"Bearer {COHERE_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "texts": [text],
                    "model": "embed-multilingual-light-v3.0",
                    "input_type": "search_query",
                    "embedding_types": ["float"]
                },
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            return [float(x) for x in data["embeddings"]["float"][0]]
    except Exception as e:
        print(f"Error calling Cohere API: {e}")
        return [0.0] * 384

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
