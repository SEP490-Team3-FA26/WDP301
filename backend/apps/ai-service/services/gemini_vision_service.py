import os
import base64
import json
import httpx
import asyncio
from typing import List, Tuple, Dict, Any

PROMPT_VERSION = "PROMPT_VERSION_V2-[OpenRouter-Gemini-2.5-Flash]"

GEMINI_SYSTEM_PROMPT = """Bạn là Dược sĩ Chuyên khoa kiêm Chuyên gia AI phân tích Đơn thuốc Y tế tại Việt Nam.
Nhiệm vụ của bạn: Đọc hiểu và phân tích hình ảnh Đơn thuốc (viết tay hoặc in máy), bao gồm cả đơn nhiều trang hoặc kèm phiếu khám.

NGUYÊN TẮC BẮT BUỘC:
1. Đọc chính xác từng dòng thuốc kê đơn: Tên biệt dược (brand_name), Hoạt chất chính (generic_name), Hàm lượng (strength), Dạng bào chế (dosage_form), Liều dùng (usage) và Số lượng mua (quantity).
2. Đánh giá ĐỘ TIN CẬY (confidence score từ 0.00 đến 1.00) cho từng thuộc tính dựa trên mức độ rõ nét của chữ viết/layout trên hình ảnh.
3. Nếu thuộc tính bị mờ hoặc không ghi rõ, ghi nhận giá trị rỗng/ước lượng và gắn confidence thấp (< 0.70).
4. Chuẩn hóa đơn vị tính (unit) về đơn vị bán lẻ: viên, hộp, chai, lọ, ống, gói, vỉ.

SCHEMA BẮT BUỘC TRẢ VỀ DẠNG STRUCTURED JSON DƯỚI ĐÂY (KHÔNG KÈM MARKDOWN HOẶC GIẢI THÍCH):
{
  "prompt_version": "v2.1",
  "patient_info": {
    "name": { "value": "Tên bệnh nhân", "confidence": 0.95 },
    "age": { "value": 30, "confidence": 0.90 },
    "gender": { "value": "Nam/Nữ", "confidence": 0.95 },
    "diagnosis": { "value": "Chẩn đoán y tế", "confidence": 0.90 }
  },
  "doctor_info": {
    "name": { "value": "Tên bác sĩ", "confidence": 0.85 },
    "hospital": { "value": "Tên bệnh viện/phòng khám", "confidence": 0.85 }
  },
  "items": [
    {
      "raw_line_text": "Tên dòng thuốc thô trên đơn",
      "parsed_drug": {
        "brand_name": { "value": "Tên biệt dược", "confidence": 0.95 },
        "generic_name": { "value": "Hoạt chất chính", "confidence": 0.90 },
        "strength": { "value": "Hàm lượng (VD: 500mg, 1g)", "confidence": 0.90 },
        "dosage_form": { "value": "Dạng bào chế (Viên nén, Viên sủi, Siro,...)", "confidence": 0.85 }
      },
      "usage": {
        "dose_per_time": { "value": "Liều mỗi lần", "confidence": 0.90 },
        "frequency": { "value": "Tần suất (VD: 2 lần/ngày)", "confidence": 0.90 },
        "duration_days": { "value": 7, "confidence": 0.90 },
        "instruction": { "value": "Hướng dẫn chi tiết (Uống sau ăn...)", "confidence": 0.85 }
      },
      "quantity": {
        "value": 10,
        "unit": "viên",
        "confidence": 0.95
      }
    }
  ]
}
"""

async def analyze_prescription_images(images: List[Tuple[bytes, str]]) -> Dict[str, Any]:
    """
    Gửi ảnh đơn thuốc tới OpenRouter Gemini 2.5 Flash Vision (fallback Google Direct API).
    """
    openrouter_key = os.getenv("OPEN_ROUTER_API") or os.getenv("OPENROUTER_API_KEY")
    google_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")


    # Strategy 1: Call OpenRouter Gemini 2.5 Flash API
    if openrouter_key:
        try:
            res = await _call_openrouter_gemini_vision(images, openrouter_key)
            if res:
                return res
        except Exception as e:
            print(f"OpenRouter Gemini Vision call error: {e}")

    # Strategy 2: Call Google AI Studio Direct API if Google key present
    if google_key and google_key.startswith("AIza"):
        try:
            res = await _call_google_direct_api(images, google_key)
            if res:
                return res
        except Exception as e:
            print(f"Google Direct API call error: {e}")

    raise Exception("Không thể kết nối dịch vụ AI Vision (OpenRouter/Google API). Vui lòng kiểm tra lại cấu hình API key.")

async def _call_openrouter_gemini_vision(images: List[Tuple[bytes, str]], api_key: str) -> Dict[str, Any]:
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    content_list = [{"type": "text", "text": GEMINI_SYSTEM_PROMPT}]

    for idx, (img_bytes, mime_type) in enumerate(images):
        b64 = base64.b64encode(img_bytes).decode('utf-8')
        m_type = mime_type if mime_type and "image" in mime_type else "image/jpeg"
        content_list.append({
            "type": "text",
            "text": f"--- HÌNH ĐƠN THUỐC TRANG {idx + 1} ---"
        })
        content_list.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:{m_type};base64,{b64}"
            }
        })

    payload = {
        "model": "google/gemini-2.5-flash",
        "max_tokens": 3000,
        "temperature": 0.1,
        "messages": [
            {
                "role": "user",
                "content": content_list
            }
        ],
        "response_format": {"type": "json_object"}
    }

    async with httpx.AsyncClient(timeout=45.0) as client:
        for attempt in range(1, 3):
            try:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices:
                        raw_msg = choices[0].get("message", {}).get("content", "")
                        parsed = json.loads(raw_msg)
                        parsed["prompt_version"] = "v2.1 (OpenRouter Gemini 2.5 Flash)"
                        return parsed
                print(f"OpenRouter attempt {attempt} status {res.status_code}: {res.text[:200]}")
                await asyncio.sleep( attempt * 1.0 )
            except Exception as exc:
                print(f"OpenRouter attempt {attempt} error: {exc}")
                await asyncio.sleep(attempt * 1.0)
    return {}

async def _call_google_direct_api(images: List[Tuple[bytes, str]], api_key: str) -> Dict[str, Any]:
    models_to_try = ["gemini-1.5-flash", "gemini-2.0-flash"]
    parts = [{"text": GEMINI_SYSTEM_PROMPT}]
    for idx, (img_bytes, mime_type) in enumerate(images):
        b64_data = base64.b64encode(img_bytes).decode('utf-8')
        parts.append({"text": f"--- TRANG ĐƠN THUỐC SỐ {idx + 1} ---"})
        parts.append({
            "inline_data": {
                "mime_type": mime_type or "image/jpeg",
                "data": b64_data
            }
        })

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"response_mime_type": "application/json", "temperature": 0.1}
    }
    headers = {"Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=45.0) as client:
        for model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            try:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code == 200:
                    text_content = res.json()["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(text_content)
                    parsed["prompt_version"] = f"v2.1 (Google {model})"
                    return parsed
            except Exception as e:
                print(f"Google Direct {model} error: {e}")
    return {}
