from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, Header, Depends, status
from services.stt_service import transcribe_audio
from services.llm_service import generate_prescription, check_drug_interactions
from services.rag_service import retrieve_medical_context, get_embedding, qdrant
from services.db_service import validate_drugs_in_inventory
import time
import os
import re
import traceback
import pymongo

async def verify_internal_token(x_internal_token: str = Header(None)):
    secret = os.getenv("JWT_SECRET") or "wdp301-super-secret-key-change-in-production"
    if not x_internal_token or x_internal_token != secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized internal request"
        )

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

    # 2. Get API Key & Configs from Env (Fail fast if missing)
    api_key = os.getenv("ROBOFLOW_API_KEY")
    if not api_key:
        raise RuntimeError("ROBOFLOW_API_KEY environment variable is not set.")
    
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
            "rawAiResponse": result, # Saved for audit debugging
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


