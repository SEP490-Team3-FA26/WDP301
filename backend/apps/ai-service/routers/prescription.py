from typing import List, Tuple, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, Header, Depends, status

from services.stt_service import transcribe_audio
from services.llm_service import (
    check_drug_interactions,
    generate_prescription,
    normalize_transcript_for_retrieval,
)
from services.rag_service import (
    RAGServiceUnavailable,
    retrieve_medical_context,
    get_embedding,
    qdrant,
)
from services.db_service import validate_drugs_in_inventory
import time
import os
import re
import traceback
import pymongo
import json

async def verify_internal_token(x_internal_token: str = Header(None), authorization: str = Header(None)):
    # Soft check for internal requests or bearer token from mobile frontend / API Gateway
    return True

router = APIRouter(dependencies=[Depends(verify_internal_token)])



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


def _normalize_medicine_text(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", (value or "").lower())).strip()


def _extract_price(row: dict) -> int:
    details = row.get("thong_tin_chi_tiet") or {}
    price_raw = details.get("Giá bán") or details.get("price") or row.get("price")
    try:
        return int(float(re.sub(r"[^0-9.]", "", str(price_raw)))) if price_raw else 0
    except Exception:
        return 0


def find_inventory_medicine_for_prescription_item(item: dict) -> dict | None:
    name = (item.get("name") or "").strip()
    strength = (item.get("strength") or "").strip()
    active = (item.get("active_ingredient") or "").strip()
    if not name:
        return None

    collection = get_mongo_collection()
    search_terms = [f"{name} {strength}".strip(), name, active]
    candidates: list[dict] = []

    for term in search_terms:
        if not term or term == "Không rõ":
            continue
        cursor = collection.find(
            {
                "$or": [
                    {"name": {"$regex": re.escape(term), "$options": "i"}},
                    {"active_ingredient": {"$regex": re.escape(term), "$options": "i"}},
                    {"thong_tin_chi_tiet.Thành phần": {"$regex": re.escape(term), "$options": "i"}},
                ]
            }
        ).limit(12)
        candidates.extend(list(cursor))

    if not candidates:
        return None

    wanted_tokens = set(_normalize_medicine_text(f"{name} {strength}").split())

    def score(row: dict) -> tuple[int, int, int]:
        haystack = _normalize_medicine_text(
            " ".join(
                [
                    row.get("name") or "",
                    row.get("active_ingredient") or "",
                    ((row.get("thong_tin_chi_tiet") or {}).get("Thành phần") or ""),
                ]
            )
        )
        haystack_tokens = set(haystack.split())
        token_hits = len(wanted_tokens & haystack_tokens)
        stock = int(row.get("stock") or row.get("stock_quantity") or 0)
        exact_strength = 1 if strength and _normalize_medicine_text(strength) in haystack else 0
        return (token_hits, exact_strength, stock)

    return max(candidates, key=score)


def build_direct_inventory_match(ocr_result: dict) -> tuple[dict, dict]:
    matched_drugs = []
    unmatched_drugs = []
    available = []
    unavailable = []

    for item in ocr_result.get("medications", []):
        if not isinstance(item, dict):
            continue
        medicine = find_inventory_medicine_for_prescription_item(item)
        prescription_name = " ".join(
            part
            for part in [item.get("name", ""), item.get("strength", "")]
            if part and part != "Không rõ"
        ).strip()
        quantity = item.get("quantity") or 1
        unit = item.get("unit") or "Hộp"

        if not medicine:
            unmatched_drugs.append({"prescription_name": prescription_name, "reason": "Không tìm thấy trong database"})
            unavailable.append({"name": prescription_name, "reason": "Không tìm thấy trong database"})
            continue

        stock = int(medicine.get("stock") or medicine.get("stock_quantity") or 0)
        price = _extract_price(medicine)
        matched_item = {
            "prescription_name": prescription_name,
            "matched_name": medicine.get("name"),
            "medicine_id": str(medicine.get("_id")),
            "quantity": quantity,
            "unit": medicine.get("unit") or unit,
            "price": price,
            "confidence": 0.92,
            "notes": "Khớp trực tiếp từ database theo tên/hoạt chất/hàm lượng.",
        }
        matched_drugs.append(matched_item)

        inventory_item = {
            "medicine_id": str(medicine.get("_id")),
            "name": medicine.get("name"),
            "quantity": quantity,
            "unit": medicine.get("unit") or unit,
            "price": price,
            "stock": stock,
            "status": "available" if stock > 0 else "out_of_stock",
        }
        if stock > 0:
            available.append(inventory_item)
        else:
            unavailable.append(inventory_item)

    return (
        {
            "matched_drugs": matched_drugs,
            "unmatched_drugs": unmatched_drugs,
            "interaction_warnings": [],
            "general_notes": "Đã khớp thuốc trực tiếp từ database cho đơn thuốc mẫu QR.",
        },
        {"available": available, "unavailable": unavailable},
    )


async def build_prescription_scan_response(ocr_result: dict, start_time: float):
    medications = ocr_result.get("medications", [])
    all_context_parts = []

    for med in medications:
        med_name = med.get("name", "")
        if not med_name or med_name == "Không rõ":
            continue
        query_parts = [med_name]
        if med.get("active_ingredient") and med.get("active_ingredient") != "Không rõ":
            query_parts.append(med["active_ingredient"])
        if med.get("strength") and med.get("strength") != "Không rõ":
            query_parts.append(med["strength"])
        query = " ".join(query_parts)

        try:
            context = await retrieve_medical_context(query, top_k=2)
            if context:
                all_context_parts.append(context)
        except RAGServiceUnavailable:
            pass

    full_rag_context = "\n\n".join(all_context_parts) if all_context_parts else ""

    from services.llm_service import (
        match_prescription_with_inventory,
        generate_prescription_markdown,
    )

    match_result = await match_prescription_with_inventory(ocr_result, full_rag_context)
    matched_names = [
        drug.get("matched_name")
        for drug in match_result.get("matched_drugs", [])
        if drug.get("matched_name")
    ]
    inventory_status = await validate_drugs_in_inventory(matched_names)

    if not match_result.get("matched_drugs") or not inventory_status.get("available"):
        direct_match_result, direct_inventory_status = build_direct_inventory_match(ocr_result)
        if direct_match_result.get("matched_drugs"):
            match_result = direct_match_result
            inventory_status = direct_inventory_status

    available_by_name = {
        (item.get("name") or "").lower(): item
        for item in inventory_status.get("available", [])
        if isinstance(item, dict)
    }
    for drug in match_result.get("matched_drugs", []):
        if not isinstance(drug, dict):
            continue
        matched_name = (drug.get("matched_name") or "").lower()
        inventory_item = available_by_name.get(matched_name)
        if not inventory_item:
            continue
        drug.setdefault("medicine_id", inventory_item.get("medicine_id") or inventory_item.get("id"))
        drug.setdefault("price", inventory_item.get("price"))
        drug.setdefault("unit", inventory_item.get("unit"))

    markdown_content = generate_prescription_markdown(
        ocr_result, match_result, inventory_status
    )

    return {
        "success": True,
        "ocr_result": ocr_result,
        "matched_drugs": match_result.get("matched_drugs", []),
        "unmatched_drugs": match_result.get("unmatched_drugs", []),
        "interaction_warnings": match_result.get("interaction_warnings", []),
        "general_notes": match_result.get("general_notes", ""),
        "inventory_status": inventory_status,
        "markdown_content": markdown_content,
        "rag_context_used": bool(full_rag_context),
        "processing_time_sec": round(time.time() - start_time, 2),
    }

@router.post("/api/prescription")
async def recommend_prescription(
    audio: UploadFile = File(...),
    patient_id: str = Form(None)
):
    start_time = time.time()
    try:
        # Step 1: STT - Nhận diện giọng nói
        transcribed_text = await transcribe_audio(audio)
        
        # Step 2: Chuẩn hóa lỗi STT trước khi truy vấn vector DB.
        rag_query = await normalize_transcript_for_retrieval(transcribed_text)

        # Step 3: RAG - Lấy context y tế từ Qdrant Vector DB
        context = await retrieve_medical_context(rag_query)
        
        # Step 4: LLM - Kê đơn
        prescription = await generate_prescription(rag_query, context)
        
        # Step 5: DB Validation - Kiểm tra tồn kho
        drug_names = [drug.get("name") for drug in prescription.get("recommended_drugs", []) if drug.get("name")]
        inventory_status = await validate_drugs_in_inventory(drug_names)
        
        # Output kết quả
        return {
            "success": True,
            "transcribed_text": transcribed_text,
            "rag_query": rag_query,
            "prescription": prescription,
            "inventory_status": inventory_status,
            "rag_context_used": bool(context),
            "processing_time_sec": round(time.time() - start_time, 2)
        }
    except RAGServiceUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

from pydantic import BaseModel

class SymptomRequest(BaseModel):
    symptoms: str

@router.post("/api/ai/symptom-consult")
async def symptom_consult(req: SymptomRequest):
    start_time = time.time()
    try:
        # Step 1: RAG - Lấy context y tế từ Qdrant Vector DB
        context = await retrieve_medical_context(req.symptoms)
        
        # Step 2: LLM - Kê đơn
        prescription = await generate_prescription(req.symptoms, context)
        
        # Step 3: DB Validation - Kiểm tra tồn kho
        drug_names = [drug.get("name") for drug in prescription.get("recommended_drugs", []) if drug.get("name")]
        inventory_status = await validate_drugs_in_inventory(drug_names)
        
        return {
            "success": True,
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

# ==========================================
# UC-19: GOODS RECEIPT INSPECTION & VERIFICATION API
# ==========================================

import base64
import httpx
from datetime import datetime
from bson import ObjectId
from fastapi import status

# Ensure uploads directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class VerifyCountRequest(BaseModel):
    actualQty: int
    verifiedBy: str

@router.get("/static/uploads/{filename}")
async def get_uploaded_file(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

def parse_roboflow_workflow_count(result: dict) -> int:
    try:
        outputs = result.get("outputs", [])
        for out in outputs:
            for key, val in out.items():
                if isinstance(val, dict) and "predictions" in val:
                    return len(val["predictions"])
                if isinstance(val, list):
                    return len(val)
        return 0
    except Exception:
        return 0

@router.post("/api/ai/receipts/{receiptId}/items/{receiptItemId}/inspection")
async def inspect_receipt_item(
    receiptId: str,
    receiptItemId: str,
    file: UploadFile = File(...)
):
    # 1. Validate Uploaded File (format and size)
    allowed_types = ["image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only JPEG, JPG, and PNG are allowed."
        )
    
    # Check file size (10MB limit)
    MAX_SIZE = 10 * 1024 * 1024 # 10MB
    image_bytes = await file.read()
    if len(image_bytes) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the 10MB limit."
        )

    # 2. Get API Key & Configs from Env
    api_key = os.getenv("ROBOFLOW_API_KEY")
    
    try:
        tolerance_pct = float(os.getenv("GRN_TOLERANCE_PERCENT", "0.02"))
    except ValueError:
        tolerance_pct = 0.02

    # 3. Connect to MongoDB and fetch expectedQty & medicineId
    uri = os.getenv("MONGODB_URI") or os.getenv("MONGODB_CONNECTION_STRING")
    if not uri:
        raise HTTPException(status_code=500, detail="Database connection string not configured.")
    
    client = pymongo.MongoClient(uri)
    db_name = "WDP201"
    if "net/" in uri:
        parts = uri.split("net/")
        if len(parts) > 1:
            db_name = parts[1].split("?")[0]
    
    db = client[db_name]
    
    receipt_query = {"_id": ObjectId(receiptId)} if ObjectId.is_valid(receiptId) else {"_id": receiptId}
    receipt = db["goodsreceiptnotes"].find_one(receipt_query)
    
    if not receipt:
        raise HTTPException(status_code=404, detail="Goods Receipt Note not found.")
        
    # Transition DRAFT to INSPECTING and PO to RECEIVING on first inspect
    if receipt.get("status") == "DRAFT":
        db["goodsreceiptnotes"].update_one(
            receipt_query,
            {"$set": {"status": "INSPECTING"}}
        )
        po_id = receipt.get("poId")
        if po_id:
            po_query = {"_id": ObjectId(po_id)} if ObjectId.is_valid(po_id) else {"_id": po_id}
            po = db["purchaseorders"].find_one(po_query)
            if po and po.get("status") in ["SHIPPING", "PARTIAL_RECEIVED"]:
                db["purchaseorders"].update_one(
                    po_query,
                    {"$set": {"status": "RECEIVING"}}
                )
    
    # Locate target receipt item using unique receiptItemId
    target_item = None
    if "items" in receipt:
        for item in receipt["items"]:
            item_id = str(item.get("_id") or "")
            if item_id == receiptItemId:
                target_item = item
                break
                
    if not target_item:
        raise HTTPException(status_code=404, detail="Receipt Item not found in the specified Goods Receipt.")
        
    expected_qty = int(target_item.get("quantity"))
    medicine_id = target_item.get("medicineId")

    # 4. Save timestamped copy as audit evidence
    file_extension = os.path.splitext(file.filename)[1] or ".jpg"
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    evidence_filename = f"{receiptId}_{receiptItemId}_{timestamp}{file_extension}"
    evidence_path = os.path.join(UPLOAD_DIR, evidence_filename)
    
    with open(evidence_path, "wb") as f:
        f.write(image_bytes)

    # 5. Call Roboflow Workflow
    if not api_key:
        print("ROBOFLOW_API_KEY environment variable is not set. Using Mock AI Count.")
        ai_count = expected_qty # Mock perfect match
    else:
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        url = "https://serverless.roboflow.com/infer/workflows/thanh-le-truong/general-segmentation-api-13"
        
        payload = {
            "api_key": api_key,
            "inputs": {
                "image": {
                    "type": "base64",
                    "value": base64_image
                },
                "classes": "Medicine"
            }
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client_http:
            response = await client_http.post(url, json=payload)
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=f"Roboflow API error: {response.text}")
            
            result = response.json()
            ai_count = parse_roboflow_workflow_count(result)
        
    # 6. Compute discrepancy details using configurable tolerance threshold
    difference = ai_count - expected_qty
    abs_diff = abs(difference)
    pct_diff = (abs_diff / expected_qty) if expected_qty > 0 else 0
        
    if difference == 0:
        inspection_status = "MATCH"
    elif pct_diff <= tolerance_pct:
        inspection_status = "WARNING"
    else:
        inspection_status = "MISMATCH"
        
    evidence_url = f"/static/uploads/{evidence_filename}"

    # 7. Write Inspection Record with Raw AI Response for debug audits
    record_id = ObjectId()
    db["inspection_records"].insert_one({
        "_id": record_id,
        "receiptId": receiptId,
        "receiptItemId": receiptItemId,
        "medicineId": medicine_id,
        "expectedQty": expected_qty,
        "aiCount": ai_count,
        "actualQty": None, 
        "difference": difference,
        "status": "PENDING_VERIFICATION",
        "evidenceImage": evidence_url,
        "rawAiResponse": result if 'result' in locals() else {"mock": True},
        "verifiedBy": None,
        "createdAt": datetime.utcnow()
    })
        
    return {
        "success": True,
        "inspectionRecordId": str(record_id),
        "receiptId": receiptId,
        "receiptItemId": receiptItemId,
        "expectedQty": expected_qty,
        "aiCount": ai_count,
        "difference": difference,
        "status": inspection_status,
        "evidenceImage": evidence_url
    }

@router.post("/api/ai/inspections/{inspectionRecordId}/verify")
async def verify_receipt_item_count(
    inspectionRecordId: str,
    req: VerifyCountRequest
):
    uri = os.getenv("MONGODB_URI") or os.getenv("MONGODB_CONNECTION_STRING")
    if not uri:
         raise HTTPException(status_code=500, detail="Database connection string not configured.")
    client = pymongo.MongoClient(uri)
    db_name = "WDP201"
    if "net/" in uri:
        parts = uri.split("net/")
        if len(parts) > 1:
            db_name = parts[1].split("?")[0]
    db = client[db_name]
    
    # 1. Fetch current record status to check conflict state
    record = db["inspection_records"].find_one({"_id": ObjectId(inspectionRecordId)})
    if not record:
        raise HTTPException(status_code=404, detail="Inspection record not found.")
    
    if record.get("status") == "VERIFIED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This inspection record has already been verified."
        )
    
    # 2. Perform verification update on inspection_records
    db["inspection_records"].update_one(
        {"_id": ObjectId(inspectionRecordId)},
        {
            "$set": {
                "actualQty": req.actualQty,
                "verifiedBy": req.verifiedBy,
                "verifiedAt": datetime.utcnow(),
                "status": "VERIFIED"
            }
        }
    )

    # 3. Update actualQty & status = 'VERIFIED' directly on the matching item in goodsreceiptnotes.items
    receipt_id = record.get("receiptId")
    receipt_item_id = record.get("receiptItemId")
    if receipt_id and receipt_item_id:
        grn_query = {"_id": ObjectId(receipt_id)} if ObjectId.is_valid(receipt_id) else {"_id": receipt_id}
        grn = db["goodsreceiptnotes"].find_one(grn_query)
        if grn:
            updated_items = []
            for item in grn.get("items", []):
                item_id = str(item.get("_id") or "")
                if item_id == receipt_item_id:
                    item["actualQty"] = req.actualQty
                    item["status"] = "VERIFIED"
                updated_items.append(item)
            db["goodsreceiptnotes"].update_one(
                grn_query,
                {"$set": {"items": updated_items}}
            )
    
    return {"success": True, "message": "Item count verified successfully."}


@router.get("/api/ai/receipts/{receiptId}/items/{receiptItemId}/inspection")
async def get_inspection_record(receiptId: str, receiptItemId: str):
    uri = os.getenv("MONGODB_URI") or os.getenv("MONGODB_CONNECTION_STRING")
    if not uri:
         raise HTTPException(status_code=500, detail="Database connection string not configured.")
    client = pymongo.MongoClient(uri)
    db_name = "WDP201"
    if "net/" in uri:
        parts = uri.split("net/")
        if len(parts) > 1:
            db_name = parts[1].split("?")[0]
    db = client[db_name]
    
    record = db["inspection_records"].find_one({
        "receiptId": receiptId,
        "receiptItemId": receiptItemId
    })
    if not record:
        raise HTTPException(status_code=404, detail="Inspection record not found.")
        
    # convert ObjectId to string for JSON serialization
    record["_id"] = str(record["_id"])
    return {
        "success": True,
        "data": record
    }



class ForecastRequest(BaseModel):
    dataset: list
    periodDays: int = 30

@router.post("/api/ai/forecast")
async def generate_forecast_endpoint(req: ForecastRequest):
    try:
        from services.llm_service import generate_demand_forecast
        result = await generate_demand_forecast(req.dataset, req.periodDays)
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

class SeasonalAnalysisRequest(BaseModel):
    dataset: list
    weatherRegion: str
    currentSeason: str
    currentMonth: str

@router.post("/api/ai/seasonal-analysis")
async def generate_seasonal_analysis_endpoint(req: SeasonalAnalysisRequest):
    try:
        from services.llm_service import analyze_seasonal_trends
        result = await analyze_seasonal_trends(req.dataset, req.weatherRegion, req.currentSeason, req.currentMonth)
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# AI PRESCRIPTION SCAN – OCR + RAG + LLM
# ==========================================

@router.post("/api/ai/scan-prescription")
async def scan_prescription_image(
    file: UploadFile = File(...),
):
    """
    Quét ảnh đơn thuốc bằng AI:
    1. Vision LLM (OCR) → Trích xuất nội dung đơn thuốc
    2. RAG (Qdrant) → Tìm thuốc tương ứng trong kho
    3. LLM → Đối chiếu & kiểm tra tương tác thuốc
    4. DB Validation → Kiểm tra tồn kho thực tế
    5. Markdown → Xuất báo cáo chuyên nghiệp
    """
    start_time = time.time()

    # 1. Validate file
    allowed_types = ["image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ hỗ trợ file ảnh JPEG hoặc PNG.",
        )

    MAX_SIZE = 10 * 1024 * 1024  # 10MB
    image_bytes = await file.read()
    if len(image_bytes) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File vượt quá giới hạn 10MB.",
        )

    try:
        # 2. OCR – Vision LLM trích xuất nội dung đơn thuốc
        from services.ocr_service import extract_prescription_from_image

        ocr_result = await extract_prescription_from_image(
            image_bytes, file.filename or "prescription.jpg"
        )

        if ocr_result.get("error"):
            return {
                "success": False,
                "error": ocr_result["error"],
                "processing_time_sec": round(time.time() - start_time, 2),
            }

        return await build_prescription_scan_response(ocr_result, start_time)

    except RAGServiceUnavailable as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


class ExportMarkdownRequest(BaseModel):
    ocr_result: dict
    match_result: dict
    inventory_status: dict | None = None


@router.post("/api/ai/export-prescription-md")
async def export_prescription_markdown(req: ExportMarkdownRequest):
    """
    Xuất file Markdown từ kết quả scan đơn thuốc đã xử lý.
    """
    try:
        from services.llm_service import generate_prescription_markdown

        markdown = generate_prescription_markdown(
            req.ocr_result, req.match_result, req.inventory_status
        )
        return {"success": True, "markdown_content": markdown}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


class ScanSampleRequest(BaseModel):
    filename: str = "image.png"


@router.get("/api/ai/sample-prescriptions")
async def get_sample_prescriptions():
    """
    Lấy danh sách các ảnh đơn thuốc mẫu trong kho dữ liệu mẫu static/dataSamplePresition
    """
    sample_dir = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "static", "dataSamplePresition"
    )
    if not os.path.exists(sample_dir):
        return {"success": True, "samples": []}

    files = [
        f
        for f in os.listdir(sample_dir)
        if f.lower().endswith((".png", ".jpg", ".jpeg"))
    ]
    files = sorted(
        files,
        key=lambda f: (
            not f.startswith("qr_rx_"),
            not f.startswith("mock_rx_"),
            f.lower(),
        ),
    )
    return {
        "success": True,
        "samples": [
            {
                "filename": f,
                "title": (
                    f"QR đơn thuốc #{i+1} ({f})"
                    if f.startswith("qr_rx_")
                    else f"Đơn thuốc mẫu #{i+1} ({f})"
                ),
            }
            for i, f in enumerate(files)
        ],
    }


@router.post("/api/ai/scan-sample-prescription")
async def scan_sample_prescription(req: ScanSampleRequest):
    """
    Quét trực tiếp một ảnh đơn thuốc mẫu sẵn có trong hệ thống
    """
    sample_dir = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "static", "dataSamplePresition"
    )
    file_path = os.path.join(sample_dir, req.filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Sample prescription file not found")

    if req.filename.startswith("qr_rx_"):
        payload_path = os.path.join(sample_dir, "sample_prescription_payloads.json")
        with open(payload_path, "r", encoding="utf-8") as f:
            payloads = json.load(f)
        ocr_result = payloads.get(req.filename)
        if not ocr_result:
            raise HTTPException(status_code=404, detail="QR payload not found")
        return await build_prescription_scan_response(ocr_result, time.time())

    with open(file_path, "rb") as f:
        image_bytes = f.read()

    # Reuse existing scanning pipeline
    class MockUploadFile:
        content_type = "image/png" if req.filename.endswith(".png") else "image/jpeg"
        filename = req.filename

        async def read(self):
            return image_bytes

    return await scan_prescription_image(MockUploadFile())


from services.cache_service import prescription_cache
from services.gemini_vision_service import analyze_prescription_images
from services.drug_normalizer import normalize_extracted_items
from services.business_validator import validate_and_consolidate
from services.medicine_matcher import match_medicines_with_db
import uuid

@router.post("/api/ai/scan-prescription-v2")
async def scan_prescription_v2(
    files: List[UploadFile] = File(...),
    branch_id: str = Form("CENTRAL_WH")
):
    """
    Enterprise AI Prescription Scanning Endpoint (v2.0):
    - Multi-page image upload
    - SHA-256 Caching (< 50ms for identical scans)
    - Gemini 2.5 Flash Vision Multimodal Extraction
    - Field-level Confidence Scores
    - Drug Normalization (Brand / Generic / Strength / Dosage Form)
    - Business Anomaly Validation & Duplicate Merger
    - 3-Level Medicine Matcher & FEFO Batch Selection
    """
    start_time = time.time()
    try:
        if not files:
            raise HTTPException(status_code=400, detail="Không tìm thấy tập tin ảnh đơn thuốc gửi lên")

        # Read images bytes
        images_data: List[Tuple[bytes, str]] = []
        bytes_list: List[bytes] = []
        for file in files:
            content = await file.read()
            images_data.append((content, file.content_type or "image/jpeg"))
            bytes_list.append(content)

        # 1. SHA-256 Cache Check
        cached_result = prescription_cache.get(bytes_list, branch_id)
        if cached_result:
            cached_result["from_cache"] = True
            cached_result["processing_time_sec"] = round(time.time() - start_time, 3)
            return cached_result

        # 2. Gemini 2.5 Flash Vision Analysis
        gemini_response = await analyze_prescription_images(images_data)

        raw_items = gemini_response.get("items", [])
        patient_info = gemini_response.get("patient_info", {})
        doctor_info = gemini_response.get("doctor_info", {})

        # 3. Drug Normalizer
        normalized_items = normalize_extracted_items(raw_items)

        # 4. Business Anomaly Validation & Duplicate Merger
        consolidated_items, validation_warnings = validate_and_consolidate(normalized_items)

        # 5. Medicine Matching & FEFO Batch Selection
        matched_results = match_medicines_with_db(consolidated_items, branch_id=branch_id)

        scan_id = f"scan_{uuid.uuid4().hex[:12]}"
        final_payload = {
            "success": True,
            "scan_id": scan_id,
            "prompt_version": gemini_response.get("prompt_version", "v2.1"),
            "from_cache": False,
            "patient": {
                "name": patient_info.get("name", {}).get("value"),
                "age": patient_info.get("age", {}).get("value"),
                "gender": patient_info.get("gender", {}).get("value"),
                "diagnosis": patient_info.get("diagnosis", {}).get("value")
            },
            "doctor": {
                "name": doctor_info.get("name", {}).get("value"),
                "hospital": doctor_info.get("hospital", {}).get("value")
            },
            "items": matched_results,
            "validation_warnings": validation_warnings,
            "processing_time_sec": round(time.time() - start_time, 2)
        }

        # Save to Cache
        prescription_cache.set(bytes_list, branch_id, final_payload)

        return final_payload
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý quét đơn thuốc AI: {str(e)}")
