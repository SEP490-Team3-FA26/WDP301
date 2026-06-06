from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from services.stt_service import transcribe_audio
from services.llm_service import generate_prescription
from services.rag_service import retrieve_medical_context, get_embedding, qdrant
from services.db_service import validate_drugs_in_inventory
import time
import os
import re
import traceback
import psycopg2
from psycopg2.extras import RealDictCursor

router = APIRouter()

def get_db_connection():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise Exception("DATABASE_URL is not set")
    # Clean pgbouncer if present
    conn_str = db_url.replace('?pgbouncer=true', '')
    # Add sslmode if not local
    if "localhost" not in conn_str and "127.0.0.1" not in conn_str:
        if "sslmode" not in conn_str:
            if "?" in conn_str:
                conn_str += "&sslmode=require"
            else:
                conn_str += "?sslmode=require"
    return psycopg2.connect(conn_str, cursor_factory=RealDictCursor)

@router.post("/api/prescription")
async def recommend_prescription(
    audio: UploadFile = File(...),
    patient_id: str = Form(None)
):
    start_time = time.time()
    try:
        # Step 1: STT - Nhận diện giọng nói
        transcribed_text = await transcribe_audio(audio)
        
        # Step 2: RAG - Lấy context y tế từ Qdrant Vector DB
        context = await retrieve_medical_context(transcribed_text)
        
        # Step 3: LLM - Kê đơn
        prescription = await generate_prescription(transcribed_text, context)
        
        # Step 4: DB Validation - Kiểm tra tồn kho
        drug_names = [drug.get("name") for drug in prescription.get("recommended_drugs", []) if drug.get("name")]
        inventory_status = await validate_drugs_in_inventory(drug_names)
        
        # Output kết quả
        return {
            "success": True,
            "transcribed_text": transcribed_text,
            "prescription": prescription,
            "inventory_status": inventory_status,
            "rag_context_used": bool(context),
            "processing_time_sec": round(time.time() - start_time, 2)
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

from qdrant_client.models import Filter, FieldCondition, MatchValue

@router.get("/api/ai/medicines")
async def get_medicines_ai(
    search: str = Query("", description="Search term for semantic search"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1),
    category: str = Query("", description="Filter by category"),
    classification: str = Query("", description="Filter by drug classification")
):
    try:
        skip = (page - 1) * limit

        if search:
            # 1. Semantic Vector Search via Qdrant
            if not qdrant:
                raise HTTPException(status_code=503, detail="Qdrant client not initialized")
            
            query_vector = await get_embedding(search)
            
            # Xây dựng Qdrant Filter
            must_conditions = []
            if category:
                must_conditions.append(
                    FieldCondition(key="category", match=MatchValue(value=category))
                )
            if classification:
                must_conditions.append(
                    FieldCondition(key="drug_classification", match=MatchValue(value=classification))
                )
            
            query_filter = Filter(must=must_conditions) if must_conditions else None

            results = qdrant.search(
                collection_name="medical_knowledge",
                query_vector=query_vector,
                query_filter=query_filter,
                limit=limit,
                offset=skip,
                score_threshold=0.2
            )
            
            mapped_data = []
            for hit in results:
                payload = hit.payload
                # Parse price
                price_raw = payload.get("price") or 50000
                try:
                    price = int(float(re.sub(r'[^0-9.]', '', str(price_raw)))) if price_raw else 50000
                except:
                    price = 50000
                
                mapped_data.append({
                    "id": payload.get("mongo_id") or f"MED-V{str(hit.id)[:8].upper()}",
                    "name": payload.get("name"),
                    "category": payload.get("category") or "Chưa phân loại",
                    "drug_classification": payload.get("drug_classification") or "COMMON_SUPPLEMENT",
                    "price": price,
                    "stock": payload.get("stock_quantity") or 10,
                    "minStock": 50,
                    "status": payload.get("status") or "In Stock",
                    "expiry": payload.get("expiry_date") or "2026-12-31",
                    "unit": payload.get("unit") or "Hộp",
                    "image": payload.get("image_url") or "",
                    "active_ingredient": payload.get("active_ingredient") or ""
                })
            
            # Since Qdrant search doesn't give cheap total counts for threshold matches, approximate total
            return {
                "data": mapped_data,
                "total": len(mapped_data) + (limit if len(mapped_data) == limit else 0),
                "page": page,
                "limit": limit
            }
            
        else:
            # 2. SQL Pagination (fetch full list)
            conn = get_db_connection()
            cur = conn.cursor()
            
            # Get total count
            cur.execute("SELECT COUNT(*) as count FROM public.medicines")
            total = cur.fetchone()["count"]
            
            # Get paginated records
            cur.execute(
                "SELECT * FROM public.medicines ORDER BY id ASC LIMIT %s OFFSET %s",
                (limit, skip)
            )
            rows = cur.fetchall()
            cur.close()
            conn.close()
            
            mapped_data = []
            for row in rows:
                stock = row.get("stock_quantity") or 0
                row_id = row.get('id')
                mapped_data.append({
                    "id": f"MED-SQL{str(row_id).zfill(5)}" if isinstance(row_id, int) else str(row_id),
                    "name": row.get("name"),
                    "category": row.get("category") or "Chưa phân loại",
                    "price": row.get("price") or 0,
                    "stock": stock,
                    "minStock": 50,
                    "status": "In Stock" if stock > 50 else ("Low Stock" if stock > 0 else "Out of Stock"),
                    "expiry": "2026-12-31",
                    "image": row.get("image_url") or "",
                    "active_ingredient": row.get("active_ingredient") or ""
                })
                
            return {
                "data": mapped_data,
                "total": total,
                "page": page,
                "limit": limit
            }
            
    except Exception as e:
        print("ERROR IN medicines API:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
