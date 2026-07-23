import os
import re
import pymongo
from typing import List, Dict, Any, Optional

def get_mongo_db():
    uri = os.getenv("MONGODB_URI") or os.getenv("MONGODB_CONNECTION_STRING")
    if not uri:
        return None
    try:
        client = pymongo.MongoClient(uri)
        db_name = "WDP201"
        if "net/" in uri:
            parts = uri.split("net/")
            if len(parts) > 1:
                db_name = parts[1].split("?")[0]
        return client[db_name]
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return None

def find_fefo_batch(db, medicine_id: str, branch_id: str = "CENTRAL_WH") -> Optional[Dict[str, Any]]:
    """
    Truy vấn lô thuốc FEFO (First Expired, First Out) có hạn sử dụng gần nhất còn hiệu lực.
    """
    if db is None:
        return None
    try:
        batches_col = db["medicinebatches"]
        # Query active batches for medicine_id with stock > 0
        query = {
            "medicineId": medicine_id,
            "stock": {"$gt": 0},
            "status": "ACTIVE"
        }
        if branch_id and branch_id != "CENTRAL_WH":
            query["branchId"] = branch_id

        # Sort expDate ascending (FEFO)
        cursor = batches_col.find(query).sort("expDate", pymongo.ASCENDING).limit(1)
        batch_list = list(cursor)
        if not batch_list and branch_id != "CENTRAL_WH":
            # Fallback to CENTRAL_WH if specific branch has no batch
            del query["branchId"]
            cursor = batches_col.find(query).sort("expDate", pymongo.ASCENDING).limit(1)
            batch_list = list(cursor)

        if batch_list:
            b = batch_list[0]
            exp_date_str = str(b.get("expDate"))[:10] if b.get("expDate") else "N/A"
            return {
                "batch_id": str(b.get("_id")),
                "batch_no": b.get("batchNo", "BATCH-DEFAULT"),
                "exp_date": exp_date_str,
                "available_stock": b.get("stock", 0),
                "import_price": b.get("importPrice", 0)
            }
    except Exception as exc:
        print(f"FEFO Query Error: {exc}")
    return None

def match_medicines_with_db(items: List[Dict[str, Any]], branch_id: str = "CENTRAL_WH") -> List[Dict[str, Any]]:
    """
    Khớp danh sách thuốc đã trích xuất từ AI với CSDL Cửa hàng/Chi nhánh theo 3 cấp độ:
    - Level 1: Khớp Tên SKU chính xác / Barcode / Tên biệt dược
    - Level 2: Khớp theo Hoạt chất chính (Active Ingredient) + Hàm lượng
    - Level 3: Gợi ý thuốc thay thế cùng hoạt chất
    Đồng thời tự gán Lô FEFO hạn dùng gần nhất.
    """
    db = get_mongo_db()
    if db is None:
        # Fallback response if DB disconnected
        return [
            {
                "extracted": item,
                "match_status": "NOT_FOUND",
                "selected_sku": None,
                "fefo_batch": None,
                "suggested_substitutes": []
            }
            for item in items
        ]

    med_col = db["medicines"]
    results = []

    for item in items:
        brand = item.get("brand_name", "")
        generic = item.get("generic_name", "")
        raw_text = item.get("raw_text", "")
        
        target_search = brand or generic or raw_text
        if not target_search:
            results.append({
                "extracted": item,
                "match_status": "NOT_FOUND",
                "selected_sku": None,
                "fefo_batch": None,
                "suggested_substitutes": []
            })
            continue

        matched_med = None
        match_status = "NOT_FOUND"

        # Level 1: Exact / Regex Name Match
        regex_exact = re.compile(rf"^{re.escape(target_search)}$", re.IGNORECASE)
        matched_med = med_col.find_one({"name": regex_exact})
        if matched_med:
            match_status = "EXACT_MATCH"

        # Level 2: Substring Name / Active Ingredient Match
        if not matched_med:
            regex_sub = re.compile(re.escape(target_search), re.IGNORECASE)
            matched_med = med_col.find_one({"$or": [{"name": regex_sub}, {"active_ingredient": regex_sub}]})
            if matched_med:
                match_status = "EXACT_MATCH"

        # Level 3: Active Ingredient Match if generic name exists
        if not matched_med and generic:
            regex_gen = re.compile(re.escape(generic), re.IGNORECASE)
            matched_med = med_col.find_one({"active_ingredient": regex_gen})
            if matched_med:
                match_status = "SUBSTITUTE_AVAILABLE"

        substitutes = []
        if matched_med:
            med_id = str(matched_med.get("_id"))
            act_ing = matched_med.get("active_ingredient") or generic
            
            # Find substitute medicines with same active ingredient if available
            if act_ing:
                sub_cursor = med_col.find({
                    "_id": {"$ne": matched_med.get("_id")},
                    "active_ingredient": re.compile(re.escape(act_ing), re.IGNORECASE)
                }).limit(3)
                for s in sub_cursor:
                    substitutes.append({
                        "product_id": str(s.get("_id")),
                        "product_name": s.get("name"),
                        "active_ingredient": s.get("active_ingredient"),
                        "price": s.get("price", 0),
                        "stock": s.get("stock", 0)
                    })

            # Fetch FEFO batch
            fefo_batch = find_fefo_batch(db, med_id, branch_id)

            results.append({
                "extracted": item,
                "match_status": match_status,
                "selected_sku": {
                    "product_id": med_id,
                    "sku_code": matched_med.get("registration_number") or f"SKU-{med_id[:8]}",
                    "product_name": matched_med.get("name"),
                    "active_ingredient": matched_med.get("active_ingredient") or generic,
                    "dosage_form": matched_med.get("dosage_form") or item.get("dosage_form"),
                    "unit": matched_med.get("unit") or item.get("unit"),
                    "retail_price": matched_med.get("price", 0),
                    "stock": matched_med.get("stock", 0),
                    "category": matched_med.get("category") or "Chưa phân loại"
                },
                "fefo_batch": fefo_batch,
                "suggested_substitutes": substitutes
            })
        else:
            results.append({
                "extracted": item,
                "match_status": "NOT_FOUND",
                "selected_sku": None,
                "fefo_batch": None,
                "suggested_substitutes": []
            })

    return results
