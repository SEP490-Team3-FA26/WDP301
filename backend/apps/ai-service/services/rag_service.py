import os
from qdrant_client import QdrantClient
import httpx
import re
from services.db_service import get_mongo_collection

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
    Lấy ngữ cảnh y khoa từ Qdrant, fallback sang MongoDB nếu không có Cohere API Key
    """
    context_parts = []
    
    # 1. Thử dùng Qdrant Vector Search nếu Qdrant và API Key Cohere khả dụng
    if qdrant:
        try:
            query_vector = await get_embedding(query)
            # Kiểm tra xem vector có chứa giá trị không (nếu không có key Cohere, sẽ trả về toàn 0)
            if any(query_vector):
                results = qdrant.search(
                    collection_name="medical_knowledge",
                    query_vector=query_vector,
                    limit=top_k,
                    score_threshold=0.4
                )
                for hit in results:
                    drug = hit.payload
                    context_parts.append(
                        f"**{drug.get('name', 'N/A')}** ({drug.get('active_ingredient', 'N/A')})\n"
                        f"- Chỉ định: {drug.get('indications', 'N/A')}\n"
                        f"- Liều dùng: {drug.get('default_dosage', 'N/A')}\n"
                        f"- Chống chỉ định: {drug.get('contraindications', 'N/A')}\n"
                        f"- Tương tác thuốc: {drug.get('drug_interactions', 'N/A')}"
                    )
        except Exception as e:
            print(f"Qdrant RAG Error: {e}")

    # 2. Fallback sang MongoDB nếu không lấy được dữ liệu bằng Vector Search
    if not context_parts:
        try:
            collection = get_mongo_collection()
            if collection is not None:
                # Tách từ khóa đơn giản để tìm kiếm (ví dụ: đau bụng, sốt)
                words = [w for w in re.split(r'\s+', query) if len(w) > 2]
                or_conditions = []
                for word in words:
                    or_conditions.append({"name": {"$regex": word, "$options": "i"}})
                    or_conditions.append({"cong_dung": {"$regex": word, "$options": "i"}})
                    or_conditions.append({"thong_tin_chi_tiet.Thành phần": {"$regex": word, "$options": "i"}})
                    or_conditions.append({"active_ingredient": {"$regex": word, "$options": "i"}})
                
                # Nếu không có từ khóa hợp lệ, tìm kiếm cụm từ đầy đủ
                if not or_conditions:
                    or_conditions = [
                        {"name": {"$regex": query, "$options": "i"}},
                        {"cong_dung": {"$regex": query, "$options": "i"}}
                    ]
                
                cursor = collection.find({"$or": or_conditions}).limit(top_k)
                for drug in cursor:
                    details = drug.get("thong_tin_chi_tiet") or {}
                    active_ingredient = details.get("Thành phần") or details.get("active_ingredient") or drug.get("active_ingredient") or "N/A"
                    indications = details.get("Chỉ định") or drug.get("cong_dung") or drug.get("indications") or "N/A"
                    dosage = details.get("Liều dùng") or details.get("Cách dùng") or drug.get("cach_dung") or drug.get("default_dosage") or "N/A"
                    contraindications = details.get("Chống chỉ định") or details.get("Tác dụng phụ") or details.get("Lưu ý") or drug.get("tac_dung_phu") or drug.get("luu_y") or drug.get("contraindications") or "N/A"
                    interactions = drug.get("drug_interactions") or "N/A"
                    
                    context_parts.append(
                        f"**{drug.get('name', 'N/A')}** ({active_ingredient})\n"
                        f"- Chỉ định: {indications}\n"
                        f"- Liều dùng: {dosage}\n"
                        f"- Chống chỉ định: {contraindications}\n"
                        f"- Tương tác thuốc: {interactions}"
                    )
        except Exception as e:
            print(f"MongoDB Fallback RAG Error: {e}")

    return "\n\n".join(context_parts)
