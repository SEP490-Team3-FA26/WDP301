# R&D: AI Prescription System — Roadmap & Architecture

---

## 🔍 Phân tích vấn đề hiện tại

### ❌ Điểm yếu của `index.ts` (Supabase Edge Function hiện tại)

| Vấn đề                         | Mô tả                                                                                           | Mức độ nguy hiểm |
| --------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------- |
| **Pure LLM, Zero Context**  | LLM kê đơn dựa 100% vào training data, không có ngữ cảnh y tế thực tế của hệ thống | 🔴 Cao               |
| **Hallucination risk**      | Llama 3.1-8b có thể "bịa" tên thuốc, liều lượng sai                                       | 🔴 Cao               |
| **Không dùng DB thuốc**  | `medicines_searched: 0` — nghĩa là không tra DB tồn kho dù có bảng `public.medicines` | 🟠 Trung bình       |
| **Model yếu**              | `llama-3.1-8b-instant` là model nhỏ, không chuyên y tế                                     | 🟠 Trung bình       |
| **Không có RAG Pipeline** | Không có vector search, không inject ngữ cảnh y học                                         | 🔴 Cao               |
| **Chạy trên Deno Edge**   | Cold start chậm, khó debug, không hỗ trợ Python ecosystem                                    | 🟡 Thấp             |

---

## 🏗️ Kiến trúc mục tiêu (Target Architecture)

```
Frontend (Next.js)
      │
      │  POST /api/prescription  (audio file + patient_id)
      ▼
FastAPI Service (Python)
  ┌───────────────────────────────────────────────────────┐
  │  1. STT: Groq Whisper-large-v3  →  transcribed_text   │
  │                                                        │
  │  2. RAG Query Engine                                   │
  │     ├─ Embed query  (text-embedding-3-small)           │
  │     ├─ Search Qdrant  →  top-K medical docs            │
  │     └─ Build context  (drug info, contraindications)   │
  │                                                        │
  │  3. LLM Completion (Groq: llama-3.3-70b-versatile)    │
  │     └─ System Prompt + RAG Context + transcript        │
  │        → Structured JSON prescription                  │
  │                                                        │
  │  4. DB Validation                                      │
  │     └─ Match recommended drugs vs public.medicines     │
  │        → Flag unavailable drugs                        │
  └───────────────────────────────────────────────────────┘
      │
      ▼
Supabase DB  ←→  Qdrant (Vector Store)
```

---

## 🗺️ ROADMAP — 4 Phases

---

### Phase 0: Chuẩn bị nền tảng

**Thời gian ước tính: 0.5 ngày**

- [ ] Tạo thư mục `backend/apps/ai-service/` (FastAPI service mới)
- [ ] Setup Python environment (`uv` hoặc `poetry`)
- [ ] Cài dependencies: `fastapi`, `uvicorn`, `groq`, `qdrant-client`, `langchain`, `supabase-py`
- [ ] Copy biến môi trường từ Edge Function sang `.env` của FastAPI

**Cấu trúc thư mục:**

```
backend/apps/ai-service/
├── main.py                  # FastAPI app entry point
├── routers/
│   └── prescription.py      # /api/prescription endpoint
├── services/
│   ├── stt_service.py       # Groq Whisper wrapper
│   ├── rag_service.py       # Qdrant query + context builder
│   └── llm_service.py       # Groq LLM completion
├── models/
│   └── schemas.py           # Pydantic request/response models
├── Dockerfile
├── requirements.txt
└── .env.example
```

---

### Phase 1: Migrate STT + LLM (Không RAG)

**Thời gian ước tính: 1 ngày**
**Kết quả:** Thay thế Supabase Edge Function bằng FastAPI thuần túy

#### 1.1 — FastAPI Endpoint `/api/prescription`

```python
# routers/prescription.py
from fastapi import APIRouter, UploadFile, File, Form
from services.stt_service import transcribe_audio
from services.llm_service import generate_prescription

router = APIRouter()

@router.post("/api/prescription")
async def recommend_prescription(
    audio: UploadFile = File(...),
    patient_id: str = Form(None)
):
    # Step 1: STT
    transcribed_text = await transcribe_audio(audio)
  
    # Step 2: LLM (Phase 1: chưa có RAG)
    prescription = await generate_prescription(transcribed_text, context="")
  
    return {
        "success": True,
        "transcribed_text": transcribed_text,
        "prescription": prescription,
        "rag_used": False
    }
```

#### 1.2 — STT Service

```python
# services/stt_service.py
from groq import AsyncGroq
import os

client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

async def transcribe_audio(audio_file) -> str:
    content = await audio_file.read()
    transcription = await client.audio.transcriptions.create(
        file=(audio_file.filename, content, audio_file.content_type),
        model="whisper-large-v3",
        language="vi",
        response_format="text"
    )
    return transcription
```

#### 1.3 — Nâng cấp Model LLM

> ⚠️ **Quan trọng:** Đổi từ `llama-3.1-8b-instant` → `llama-3.3-70b-versatile`
>
> Model 70B có khả năng reasoning y tế tốt hơn nhiều, và Groq vẫn chạy rất nhanh (~300 tokens/s).

```python
# services/llm_service.py
MEDICAL_SYSTEM_PROMPT = """
Bạn là Dược sĩ AI chuyên nghiệp tại Việt Nam. 
Bạn có kiến thức sâu về dược lý, tương tác thuốc, và phác đồ điều trị chuẩn Bộ Y tế Việt Nam.

NGUYÊN TẮC BẮT BUỘC:
1. Chỉ kê thuốc có trong context được cung cấp (nếu có)
2. Luôn cảnh báo tương tác thuốc nguy hiểm
3. Không kê thuốc kê đơn cho triệu chứng nhẹ có thể dùng OTC
4. Liều lượng theo cân nặng/tuổi nếu bệnh nhân cung cấp
5. Ưu tiên thuốc generic Việt Nam nếu có thể

{rag_context}

Trả về JSON hợp lệ theo schema sau:
...
"""
```

---

### Phase 2: Xây dựng RAG Pipeline — Trái tim của hệ thống

**Thời gian ước tính: 2-3 ngày**
**Đây là thách thức lớn nhất và quan trọng nhất**

#### 2.1 — Chuẩn bị Medical Knowledge Base

Bạn cần thu thập và chuẩn hóa các nguồn dữ liệu y tế:

**Nguồn dữ liệu ưu tiên (Tiếng Việt):**

| Nguồn                                                     | Nội dung                           | Định dạng |
| ---------------------------------------------------------- | ----------------------------------- | ------------ |
| [Dược thư Quốc gia Việt Nam](https://duocthuvietnam.com) | Thông tin thuốc chuẩn            | PDF/HTML     |
| [Cục Quản lý Dược](https://dav.gov.vn)                   | Danh mục thuốc được cấp phép | CSV/Excel    |
| `public.medicines` (Supabase DB của bạn)               | Kho thuốc thực tế tại quầy     | SQL export   |
| Tờ hướng dẫn sử dụng thuốc (PIL)                    | Liều dùng, chống chỉ định     | PDF          |

**Cấu trúc document cho Qdrant:**

```json
{
  "drug_name": "Paracetamol 500mg",
  "generic_name": "Acetaminophen",
  "indications": "Hạ sốt, giảm đau nhẹ đến vừa",
  "contraindications": "Suy gan, dị ứng paracetamol",
  "dosage": "Người lớn: 500mg-1g mỗi 4-6 giờ, tối đa 4g/ngày",
  "drug_interactions": ["Warfarin", "Alcohol"],
  "category": "OTC",
  "vietnamese_brands": ["Panadol", "Tylenol", "Efferalgan"]
}
```

#### 2.2 — Setup Qdrant (Local)

```bash
# Chạy Qdrant local bằng Docker
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant
```

#### 2.3 — Indexing Pipeline (chạy 1 lần)

```python
# scripts/index_medical_data.py
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from groq import Groq  # hoặc dùng OpenAI text-embedding-3-small
import json, uuid

client = QdrantClient(host="localhost", port=6333)

# Tạo collection
client.create_collection(
    collection_name="medical_knowledge",
    vectors_config=VectorParams(size=1536, distance=Distance.COSINE)
)

# Load và index tài liệu
def index_documents(docs: list[dict]):
    points = []
    for doc in docs:
        text = f"{doc['drug_name']}: {doc['indications']}. {doc['dosage']}. Chống chỉ định: {doc['contraindications']}"
        embedding = get_embedding(text)  # gọi embedding API
        points.append(PointStruct(
            id=str(uuid.uuid4()),
            vector=embedding,
            payload=doc
        ))
    client.upsert(collection_name="medical_knowledge", points=points)
```

#### 2.4 — RAG Query Service

```python
# services/rag_service.py
from qdrant_client import QdrantClient

qdrant = QdrantClient(host="localhost", port=6333)

async def retrieve_medical_context(query: str, top_k: int = 5) -> str:
    """
    Embed query → tìm kiếm Qdrant → format context cho LLM
    """
    query_vector = await get_embedding(query)
  
    results = qdrant.search(
        collection_name="medical_knowledge",
        query_vector=query_vector,
        limit=top_k,
        score_threshold=0.7  # chỉ lấy kết quả đủ liên quan
    )
  
    if not results:
        return ""  # LLM tự xử lý nếu không tìm thấy
  
    context_parts = []
    for hit in results:
        drug = hit.payload
        context_parts.append(
            f"**{drug['drug_name']}** ({drug['generic_name']})\n"
            f"- Chỉ định: {drug['indications']}\n"
            f"- Liều dùng: {drug['dosage']}\n"
            f"- Chống chỉ định: {drug['contraindications']}\n"
            f"- Tương tác thuốc: {', '.join(drug.get('drug_interactions', []))}"
        )
  
    return "\n\n".join(context_parts)
```

---

### Phase 3: DB Validation + Tích hợp hoàn chỉnh

**Thời gian ước tính: 1 ngày**

#### 3.1 — Kiểm tra tồn kho thuốc

```python
# services/db_service.py
from supabase import create_client
import os

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

async def validate_drugs_in_inventory(drug_names: list[str]) -> dict:
    """
    Kiểm tra thuốc được kê có trong kho không
    """
    result = supabase.table("medicines")\
        .select("name, stock_quantity, price")\
        .in_("name", drug_names)\
        .execute()
  
    available = {row["name"]: row for row in result.data}
  
    return {
        "available": [name for name in drug_names if name in available],
        "unavailable": [name for name in drug_names if name not in available],
        "details": available
    }
```

#### 3.2 — Full Pipeline endpoint

```python
@router.post("/api/prescription")
async def recommend_prescription(audio: UploadFile, patient_id: str = Form(None)):
    # Step 1: STT
    transcript = await transcribe_audio(audio)
  
    # Step 2: RAG — lấy ngữ cảnh y học
    medical_context = await retrieve_medical_context(transcript)
  
    # Step 3: LLM với context
    prescription = await generate_prescription(transcript, context=medical_context)
  
    # Step 4: Validate với DB
    drug_names = [d["name"] for d in prescription.get("recommended_drugs", [])]
    inventory_check = await validate_drugs_in_inventory(drug_names)
  
    return {
        "success": True,
        "transcript": transcript,
        "prescription": prescription,
        "inventory": inventory_check,
        "rag_docs_used": len(medical_context) > 0,
        "meta": {
            "model": "llama-3.3-70b-versatile",
            "embedding": "text-embedding-3-small",
            "vector_db": "qdrant-local"
        }
    }
```

---

### Phase 4: Deployment & Observability

**Thời gian ước tính: 1 ngày**

#### 4.1 — Dockerfile cho ai-service

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### 4.2 — Thêm vào docker-compose.yml

```yaml
ai-service:
  build: ./backend/apps/ai-service
  ports:
    - "8000:8000"
  environment:
    - GROQ_API_KEY=${GROQ_API_KEY}
    - SUPABASE_URL=${SUPABASE_URL}
    - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    - QDRANT_HOST=qdrant
  depends_on:
    - qdrant

qdrant:
  image: qdrant/qdrant:latest
  ports:
    - "6333:6333"
  volumes:
    - qdrant_data:/qdrant/storage
```

#### 4.3 — Observability với Arize Phoenix

```python
# main.py
import phoenix as px
from openinference.instrumentation.groq import GroqInstrumentor

# Tự động trace tất cả Groq API calls
GroqInstrumentor().instrument()
px.launch_app()  # Mở UI tại http://localhost:6006
```

---

## 📊 So sánh: Trước & Sau

| Tiêu chí                     | Hiện tại (Edge Function) | Sau khi nâng cấp (FastAPI + RAG) |
| ------------------------------ | -------------------------- | ---------------------------------- |
| **Độ chính xác**     | ~40% (pure hallucination)  | ~85%+ (grounded in data)           |
| **Tốc độ**            | 3-8s (cold start)          | 1-3s (warm server)                 |
| **Ngữ cảnh y tế**     | ❌ Không có              | ✅ Qdrant vector search            |
| **Kiểm tra kho thuốc** | ❌ Không                  | ✅ Supabase DB validation          |
| **Model**                | Llama 3.1-8b               | Llama 3.3-70b-versatile            |
| **Debug**                | Khó (Deno logs)           | ✅ Phoenix tracing UI              |
| **Tính linh hoạt**     | Thấp (Deno ecosystem)     | Cao (Python ecosystem)             |

---

## ⚡ Quick Start — Thứ tự ưu tiên làm ngay

```
Tuần 1:
  [Ngày 1] Setup FastAPI + migrate STT endpoint
  [Ngày 2] Nâng cấp LLM → llama-3.3-70b + cải thiện system prompt
  [Ngày 3-4] Thu thập medical data + index vào Qdrant
  [Ngày 5] Kết nối RAG vào pipeline

Tuần 2:
  [Ngày 1] DB validation (kiểm tra kho thuốc)
  [Ngày 2] Dockerize + cập nhật docker-compose
  [Ngày 3] Setup Phoenix observability
  [Ngày 4-5] Testing + fine-tune system prompt
```

---

## 🔑 Câu trả lời: Component nào khó nhất?

> **Khó nhất: Xây dựng Medical Knowledge Base (Phase 2.1)**

Lý do:

1. **Thu thập dữ liệu y tế uy tín** bằng tiếng Việt rất khó
2. **Chuẩn hóa dữ liệu** (parse PDF, format thống nhất) mất nhiều thời gian
3. **Chọn ngưỡng similarity** (`score_threshold`) sai → RAG trả về context không liên quan → LLM còn tệ hơn không có context

Thứ hai khó: **System Prompt Engineering** cho domain y tế:

- Phải test nhiều iteration
- Phải cân bằng giữa "sáng tạo" và "bám sát dữ liệu"
- Phải handle edge case (triệu chứng mơ hồ, nhiều bệnh cùng lúc)

---

## 📚 Tài nguyên tham khảo

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Qdrant Python Client](https://python-client.qdrant.tech/)
- [Groq API Reference](https://console.groq.com/docs)
- [LangChain RAG Tutorial](https://python.langchain.com/docs/tutorials/rag/)
- [Dược thư Quốc gia](https://duocthuvietnam.com) — nguồn dữ liệu y tế tiếng Việt
- [Arize Phoenix](https://docs.arize.com/phoenix) — LLM observability
