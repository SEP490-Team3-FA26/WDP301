import os

import httpx
from qdrant_client import QdrantClient


QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "medical_knowledge")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
EMBEDDING_MODEL = "embed-multilingual-light-v3.0"
EMBEDDING_SIZE = 384


class RAGServiceUnavailable(RuntimeError):
    """Raised when vector retrieval is not configured or unavailable."""


try:
    qdrant = QdrantClient(host=QDRANT_HOST, port=6333)
except Exception:
    qdrant = None


async def get_embedding(text: str) -> list[float]:
    """Create a Cohere query vector compatible with the indexed documents."""
    if not COHERE_API_KEY:
        raise RAGServiceUnavailable("COHERE_API_KEY is not configured")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.cohere.com/v2/embed",
                headers={
                    "Authorization": f"Bearer {COHERE_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "texts": [text],
                    "model": EMBEDDING_MODEL,
                    "input_type": "search_query",
                    "embedding_types": ["float"],
                    "truncate": "END",
                },
                timeout=20.0,
            )
            response.raise_for_status()
            vector = [
                float(value)
                for value in response.json()["embeddings"]["float"][0]
            ]
    except RAGServiceUnavailable:
        raise
    except Exception as exc:
        raise RAGServiceUnavailable(f"Cohere embedding request failed: {exc}") from exc

    if len(vector) != EMBEDDING_SIZE or not any(vector):
        raise RAGServiceUnavailable(
            f"Cohere returned an invalid embedding; expected {EMBEDDING_SIZE} dimensions"
        )
    return vector


async def retrieve_medical_context(query: str, top_k: int = 3) -> str:
    """Retrieve medical context exclusively from the vectorized Qdrant DB."""
    if qdrant is None:
        raise RAGServiceUnavailable("Qdrant client could not be initialized")

    try:
        if not qdrant.collection_exists(QDRANT_COLLECTION):
            raise RAGServiceUnavailable(
                f'Qdrant collection "{QDRANT_COLLECTION}" does not exist; index medicines first'
            )

        point_count = qdrant.count(QDRANT_COLLECTION, exact=True).count
        if point_count == 0:
            raise RAGServiceUnavailable(
                f'Qdrant collection "{QDRANT_COLLECTION}" is empty; index medicines first'
            )

        query_vector = await get_embedding(query)
        results = qdrant.search(
            collection_name=QDRANT_COLLECTION,
            query_vector=query_vector,
            limit=top_k,
            score_threshold=0.35,
            with_payload=True,
        )
    except RAGServiceUnavailable:
        raise
    except Exception as exc:
        raise RAGServiceUnavailable(f"Qdrant vector search failed: {exc}") from exc

    context_parts = []
    for hit in results:
        drug = hit.payload or {}
        context_parts.append(
            f"**{drug.get('name', 'N/A')}** ({drug.get('active_ingredient', 'N/A')})\n"
            f"- Độ tương đồng: {hit.score:.4f}\n"
            f"- Tồn kho: {drug.get('stock_quantity', 'N/A')}\n"
            f"- Chỉ định: {drug.get('indications', 'N/A')}\n"
            f"- Liều dùng: {drug.get('default_dosage', 'N/A')}\n"
            f"- Chống chỉ định: {drug.get('contraindications', 'N/A')}\n"
            f"- Tương tác thuốc: {drug.get('drug_interactions', 'N/A')}"
        )

    return "\n\n".join(context_parts)
