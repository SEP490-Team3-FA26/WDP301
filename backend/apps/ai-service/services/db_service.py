import os
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

try:
    if SUPABASE_URL and SUPABASE_KEY:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    else:
        supabase = None
except Exception as e:
    print(f"Error initializing Supabase client: {e}")
    supabase = None

async def validate_drugs_in_inventory(drug_names: list[str]) -> dict:
    """
    Kiểm tra danh sách thuốc có tồn tại trong kho (public.medicines) hay không.
    Trả về danh sách thuốc có sẵn và thông tin tồn kho.
    """
    if not supabase:
        return {"error": "Supabase client not initialized"}
        
    if not drug_names:
        return {"available": [], "unavailable": []}
        
    try:
        # Search for medicines by name
        response = supabase.table("medicines").select("name, stock_quantity, price").in_("name", drug_names).execute()
        
        available_drugs = {row["name"]: row for row in response.data}
        
        return {
            "available": [
                {
                    "name": name, 
                    "stock": available_drugs[name]["stock_quantity"], 
                    "price": available_drugs[name]["price"]
                } 
                for name in drug_names if name in available_drugs
            ],
            "unavailable": [name for name in drug_names if name not in available_drugs]
        }
    except Exception as e:
        print(f"DB Validation Error: {e}")
        return {"error": str(e)}
