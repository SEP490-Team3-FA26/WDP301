from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from services.stt_service import transcribe_audio
from services.llm_service import generate_prescription, check_drug_interactions
from services.rag_service import retrieve_medical_context, get_embedding, qdrant
from services.db_service import validate_drugs_in_inventory
import time
import os
import re
import traceback
import pymongo

router = APIRouter()

def get_mongo_collection():
    uri = os.getenv("MONGODB_URI") or os.getenv("MONGODB_CONNECTION_STRING")
    if not uri:
        raise Exception("MongoDB URI not set")
    client = pymongo.MongoClient(uri)
    db_name = "WDP201"
    if "net/" in uri:
        parts = uri.split("net/")
        if len(parts) > 1:
            db_name = parts[1].split("?")[0]
    return client[db_name]["medicines"]

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
            
            # Fallback to SQL if Cohere API returns zero vector (missing API key)
            if not any(query_vector):
                collection = get_mongo_collection()
                query = {}
                query["$or"] = [
                    {"name": {"$regex": search, "$options": "i"}},
                    {"thong_tin_chi_tiet.Thành phần": {"$regex": search, "$options": "i"}},
                    {"active_ingredient": {"$regex": search, "$options": "i"}}
                ]
                if category:
                    query["category"] = category
                if classification:
                    query["drug_classification"] = classification
                    
                total = collection.count_documents(query)
                cursor = collection.find(query).skip(skip).limit(limit)
                
                mapped_data = []
                for row in cursor:
                    stock = row.get("stock") or row.get("stock_quantity") or 0
                    row_id = str(row.get('_id'))
                    details = row.get("thong_tin_chi_tiet") or {}
                    
                    price_raw = details.get("Giá bán") or details.get("price") or row.get("price")
                    try:
                        price = int(float(re.sub(r'[^0-9.]', '', str(price_raw)))) if price_raw else 50000
                    except:
                        price = 50000
                        
                    mapped_data.append({
                        "id": str(row_id),
                        "name": row.get("name"),
                        "category": row.get("category") or details.get("Danh mục") or "Chưa phân loại",
                        "price": price,
                        "stock": stock,
                        "minStock": 50,
                        "status": row.get("status") or ("In Stock" if stock > 50 else ("Low Stock" if stock > 0 else "Out of Stock")),
                        "expiry": row.get("expiry_date") or "2026-12-31",
                        "image": row.get("image") or row.get("image_url") or "",
                        "active_ingredient": details.get("Thành phần") or details.get("active_ingredient") or row.get("active_ingredient") or ""
                    })
                    
                return {
                    "data": mapped_data,
                    "total": total,
                    "page": page,
                    "limit": limit
                }
            
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
            # 2. MongoDB Pagination (fetch full list)
            collection = get_mongo_collection()
            
            # Get total count
            total = collection.count_documents({})
            
            # Get paginated records
            cursor = collection.find({}).skip(skip).limit(limit)
            
            mapped_data = []
            for row in cursor:
                stock = row.get("stock") or row.get("stock_quantity") or 0
                row_id = str(row.get('_id'))
                details = row.get("thong_tin_chi_tiet") or {}
                
                price_raw = details.get("Giá bán") or details.get("price") or row.get("price")
                try:
                    price = int(float(re.sub(r'[^0-9.]', '', str(price_raw)))) if price_raw else 50000
                except:
                    price = 50000
                    
                mapped_data.append({
                    "id": str(row_id),
                    "name": row.get("name"),
                    "category": row.get("category") or details.get("Danh mục") or "Chưa phân loại",
                    "price": price,
                    "stock": stock,
                    "minStock": 50,
                    "status": row.get("status") or ("In Stock" if stock > 50 else ("Low Stock" if stock > 0 else "Out of Stock")),
                    "expiry": row.get("expiry_date") or "2026-12-31",
                    "image": row.get("image") or row.get("image_url") or "",
                    "active_ingredient": details.get("Thành phần") or details.get("active_ingredient") or row.get("active_ingredient") or ""
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

from pydantic import BaseModel

class InteractionRequest(BaseModel):
    medicines: list[str]

@router.post("/api/ai/interactions")
async def check_interactions(req: InteractionRequest):
    try:
        # Get context from Qdrant by querying each medicine
        context_parts = []
        for medicine in req.medicines:
            context = await retrieve_medical_context(medicine, top_k=1)
            if context:
                context_parts.append(context)
        
        full_context = "\n\n".join(context_parts)
        result = await check_drug_interactions(req.medicines, full_context)
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
