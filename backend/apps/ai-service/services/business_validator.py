from typing import List, Dict, Any, Tuple

def validate_and_consolidate(items: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    1. Consolidation: Gộp các mục thuốc bị lặp lại trong đơn (cùng brand_name hoặc generic_name + strength).
    2. Business Validation: Kiểm tra dị biệt số lượng (Anomaly Limit > 100) và phát cảnh báo.
    """
    consolidated_map: Dict[str, Dict[str, Any]] = {}
    warnings: List[str] = []

    for item in items:
        brand = item.get("brand_name", "").strip().lower()
        generic = item.get("generic_name", "").strip().lower()
        strength = item.get("strength", "").strip().lower()
        
        # Deduplication key
        key = f"{brand}|{generic}|{strength}" if (brand or generic) else f"raw_{item.get('item_index')}"

        qty = item.get("quantity", 1)
        if qty > 100:
            warnings.append(f"Cảnh báo: Số lượng '{item.get('brand_name') or item.get('raw_text')}' lớn bất thường ({qty} {item.get('unit')}). Vui lòng dược sĩ kiểm tra lại.")

        if item.get("confidence", {}).get("overall", 1.0) < 0.85:
            warnings.append(f"Cảnh báo: Độ chính xác quét cho dòng '{item.get('raw_text')}' dưới 85%. Dược sĩ cần đối chiếu ảnh gốc.")

        if key in consolidated_map:
            # Merge quantity
            existing = consolidated_map[key]
            existing["quantity"] += qty
            existing["raw_text"] += f" + {item.get('raw_text')}"
        else:
            consolidated_map[key] = dict(item)

    consolidated_items = list(consolidated_map.values())
    return consolidated_items, warnings
