import os
import pymongo
import re

def get_mongo_collection():
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
        return client[db_name]["medicines"]
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return None

async def validate_drugs_in_inventory(drug_names: list[str]) -> dict:
    """
    Kiểm tra danh sách thuốc có tồn tại trong kho (MongoDB medicines collection) hay không.
    Trả về danh sách thuốc có sẵn và thông tin tồn kho.
    """
    collection = get_mongo_collection()
    if collection is None:
        return {"error": "MongoDB client not initialized"}
        
    if not drug_names:
        return {"available": [], "unavailable": []}
        
    try:
        # Search for medicines by name in MongoDB
        query = {"name": {"$in": drug_names}}
        cursor = collection.find(query)
        
        available_drugs = {}
        for row in cursor:
            name = row.get("name")
            stock = row.get("stock") or row.get("stock_quantity") or 0
            details = row.get("thong_tin_chi_tiet") or {}
            price_raw = details.get("Giá bán") or details.get("price") or row.get("price")
            try:
                price = int(float(re.sub(r'[^0-9.]', '', str(price_raw)))) if price_raw else 50000
            except:
                price = 50000
            
            # Use name as the key (exact match)
            if name:
                available_drugs[name] = {
                    "id": str(row.get("_id")),
                    "name": name,
                    "stock": stock,
                    "price": price,
                    "category": row.get("category") or details.get("Danh mục") or "Chưa phân loại",
                    "unit": row.get("unit") or "Hộp",
                    "image": row.get("image") or row.get("image_url") or "",
                }
        
        return {
            "available": [
                {
                    "id": available_drugs[name]["id"],
                    "name": name, 
                    "stock": available_drugs[name]["stock"], 
                    "price": available_drugs[name]["price"],
                    "category": available_drugs[name]["category"],
                    "unit": available_drugs[name]["unit"],
                    "image": available_drugs[name]["image"],
                } 
                for name in drug_names if name in available_drugs
            ],
            "unavailable": [name for name in drug_names if name not in available_drugs]
        }
    except Exception as e:
        print(f"DB Validation Error: {e}")
        return {"error": str(e)}
