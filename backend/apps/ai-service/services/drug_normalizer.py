import re
from typing import Dict, Any, List

UNIT_MAPPINGS = {
    "v": "viên",
    "vien": "viên",
    "h": "hộp",
    "hop": "hộp",
    "vỉ": "vỉ",
    "vi": "vỉ",
    "chai": "chai",
    "lo": "lọ",
    "lọ": "lọ",
    "ong": "ống",
    "ống": "ống",
    "goi": "gói",
    "gói": "gói",
    "tuyp": "tuýp",
    "tuýp": "tuýp"
}

def normalize_unit(unit_str: str) -> str:
    if not unit_str:
        return "viên"
    clean = unit_str.strip().lower()
    return UNIT_MAPPINGS.get(clean, clean)

def normalize_extracted_items(raw_items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Chuẩn hóa dữ liệu thô từ Gemini:
    - Tách brand_name, generic_name, strength, dosage_form
    - Chuẩn hóa đơn vị tính
    - Tính toán confidence tổng hợp cho từng mục
    """
    normalized_list = []
    
    for idx, item in enumerate(raw_items):
        raw_text = item.get("raw_line_text", "")
        parsed_drug = item.get("parsed_drug", {})
        usage = item.get("usage", {})
        quantity = item.get("quantity", {})
        
        brand_obj = parsed_drug.get("brand_name", {})
        generic_obj = parsed_drug.get("generic_name", {})
        strength_obj = parsed_drug.get("strength", {})
        dosage_form_obj = parsed_drug.get("dosage_form", {})
        
        brand_val = str(brand_obj.get("value") or "").strip()
        generic_val = str(generic_obj.get("value") or "").strip()
        strength_val = str(strength_obj.get("value") or "").strip()
        dosage_form_val = str(dosage_form_obj.get("value") or "").strip()
        
        brand_conf = float(brand_obj.get("confidence", 0.9))
        generic_conf = float(generic_obj.get("confidence", 0.85))
        qty_conf = float(quantity.get("confidence", 0.9))
        
        qty_val = quantity.get("value")
        try:
            qty_num = int(qty_val) if qty_val is not None else 1
        except (ValueError, TypeError):
            qty_num = 1
            
        unit_val = normalize_unit(str(quantity.get("unit") or "viên"))
        
        normalized_list.append({
            "item_index": idx + 1,
            "raw_text": raw_text,
            "brand_name": brand_val,
            "generic_name": generic_val,
            "strength": strength_val,
            "dosage_form": dosage_form_val,
            "usage_instruction": str(usage.get("instruction", {}).get("value") or ""),
            "quantity": qty_num,
            "unit": unit_val,
            "confidence": {
                "drug_name": brand_conf,
                "generic_name": generic_conf,
                "quantity": qty_conf,
                "overall": round((brand_conf + generic_conf + qty_conf) / 3, 2)
            }
        })
        
    return normalized_list
