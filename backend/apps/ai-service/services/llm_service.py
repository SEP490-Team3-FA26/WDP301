import os
from groq import AsyncGroq
import json
import re

api_key = os.getenv("GROQ_API_KEY") or os.getenv("EXPO_PUBLIC_GROQ_API_KEY")
client = AsyncGroq(api_key=api_key)

RETRIEVAL_NORMALIZATION_PROMPT = """Bạn làm nhiệm vụ làm sạch bản ghi âm tiếng Việt cho tìm kiếm y tế.
Hãy sửa các lỗi nhận dạng giọng nói rõ ràng và rút gọn thành các triệu chứng/ngữ cảnh y tế có trong lời nói.
Không thêm triệu chứng không được gợi ý bởi transcript, không chẩn đoán và không đề xuất thuốc.
Trả về JSON hợp lệ duy nhất theo schema: {"search_query":"..."}."""


async def normalize_transcript_for_retrieval(transcript: str) -> str:
    """Turn noisy STT output into a concise query for vector retrieval."""
    if not transcript.strip():
        return transcript

    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": RETRIEVAL_NORMALIZATION_PROMPT},
                {"role": "user", "content": transcript},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
        normalized = json.loads(response.choices[0].message.content or "{}")
        search_query = str(normalized.get("search_query") or "").strip()
        return search_query[:500] if search_query else transcript
    except Exception as exc:
        print(f"Transcript normalization failed: {exc}")
        return transcript

MEDICAL_SYSTEM_PROMPT = """Bạn là Dược sĩ AI chuyên nghiệp tại Việt Nam. 
Bạn có kiến thức sâu về dược lý, tương tác thuốc, và phác đồ điều trị.

NGUYÊN TẮC BẮT BUỘC:
1. TUYỆT ĐỐI CHỈ KÊ THUỐC CÓ TRONG CƠ SỞ DỮ LIỆU (Context) được cung cấp bên dưới. Nếu CƠ SỞ DỮ LIỆU trống hoặc chứa "Không có dữ liệu ngữ cảnh", KHÔNG ĐƯỢC kê bất kỳ loại thuốc nào (để mảng recommended_drugs rỗng) và ghi vào warnings: "Không tìm thấy thuốc phù hợp trong kho, vui lòng đi khám bác sĩ".
2. Luôn cảnh báo tương tác thuốc nguy hiểm dựa trên Context.
3. Ưu tiên các loại thuốc an toàn và phù hợp triệu chứng nhất từ Context.
4. KHÔNG TỰ BỊA RA THÔNG TIN THUỐC. Mọi loại thuốc được kê phải khớp chính xác 100% với tên trong CƠ SỞ DỮ LIỆU.

--- CƠ SỞ DỮ LIỆU THUỐC ---
{rag_context}
--------------------------
Nhiệm vụ của bạn:
1. Đọc kỹ ĐOẠN HỘI THOẠI (Transcript) giữa Khách hàng và Dược sĩ.
2. Trích xuất thông tin cá nhân của bệnh nhân (Tên, Số điện thoại) nếu có nhắc đến.
3. Phân tích lời khai của Khách hàng: Họ đang có triệu chứng gì? Bệnh gì? Tiền sử dị ứng gì?
4. Phân tích lời khuyên của Dược sĩ: Dược sĩ đã chốt bán thuốc gì? Liều dùng dặn dò ra sao?
5. Từ các thông tin trên, đối chiếu với RAG Context (Dữ liệu tiếng Anh) để dịch và xuất ra Toa Thuốc chuẩn bằng Tiếng Việt.

BẮT BUỘC TRẢ VỀ JSON HỢP LỆ THEO SCHEMA SAU (KHÔNG GIẢI THÍCH THÊM):
{
  "patient_info": {
    "name": "Tên bệnh nhân (để trống nếu không có)",
    "phone": "Số điện thoại (để trống nếu không có)"
  },
  "patient_symptoms": "Tóm tắt lại triệu chứng",
  "recommended_drugs": [
    { "name": "Tên thuốc", "active_ingredient": "Hoạt chất", "dosage": "Liều dùng", "usage": "Cách dùng" }
  ],
  "warnings": "Cảnh báo chống chỉ định nếu có"
}"""

async def generate_prescription(transcript: str, context: str) -> dict:
    """
    Tạo đơn thuốc JSON dựa trên transcript và context từ RAG
    """
    system_prompt = MEDICAL_SYSTEM_PROMPT.replace("{rag_context}", context or "Không có dữ liệu ngữ cảnh.")
    
    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Đoạn ghi âm cuộc hội thoại: \"{transcript}\""}
        ],
        temperature=0.1,
        response_format={"type": "json_object"}
    )
    
    content = response.choices[0].message.content
    try:
        prescription = json.loads(content)

        # The inventory uses exact product names. Map harmless LLM shortening
        # (for example "Panactol 500mg") back to the exact Qdrant payload name,
        # and reject any drug that is not present in the retrieved context.
        context_names = re.findall(r"\*\*(.+?)\*\*\s*\(", context or "")
        canonical_drugs = []
        rejected_names = []
        for drug in prescription.get("recommended_drugs", []):
            proposed_name = str(drug.get("name") or "").strip()
            proposed_folded = proposed_name.casefold()
            exact_name = next(
                (
                    name for name in context_names
                    if name.casefold() == proposed_folded
                    or name.casefold().startswith(proposed_folded)
                    or proposed_folded.startswith(name.casefold())
                ),
                None,
            )
            if exact_name:
                drug["name"] = exact_name
                canonical_drugs.append(drug)
            elif proposed_name:
                rejected_names.append(proposed_name)

        prescription["recommended_drugs"] = canonical_drugs
        if rejected_names:
            safety_note = "Đã loại thuốc không khớp chính xác dữ liệu vector."
            current_warning = str(prescription.get("warnings") or "").strip()
            prescription["warnings"] = " ".join(
                part for part in (current_warning, safety_note) if part
            )

        return prescription
    except json.JSONDecodeError:
        return {"error": "Lỗi phân tích JSON từ LLM", "raw_content": content}

INTERACTION_SYSTEM_PROMPT = """Bạn là Dược sĩ lâm sàng AI chuyên nghiệp.
Nhiệm vụ của bạn là phân tích tương tác giữa các loại thuốc dựa trên CƠ SỞ DỮ LIỆU được cung cấp.

--- CƠ SỞ DỮ LIỆU THUỐC ---
{rag_context}
--------------------------
Danh sách các thuốc được yêu cầu kiểm tra: {medicines_list}

BẮT BUỘC TRẢ VỀ JSON HỢP LỆ THEO SCHEMA SAU (KHÔNG GIẢI THÍCH THÊM):
{
  "has_interactions": true,
  "severity": "Cao | Trung bình | Thấp | An toàn",
  "interactions": [
    {
      "drug_a": "Tên thuốc 1",
      "drug_b": "Tên thuốc 2",
      "description": "Mô tả tương tác và hậu quả",
      "recommendation": "Khuyến nghị xử lý (VD: Giãn cách giờ uống, đổi thuốc)"
    }
  ],
  "general_advice": "Lời khuyên tổng quát cho Dược sĩ"
}"""

async def check_drug_interactions(medicines_list: list[str], context: str) -> dict:
    """
    Tạo báo cáo tương tác thuốc JSON dựa trên danh sách thuốc và context từ RAG
    """
    system_prompt = INTERACTION_SYSTEM_PROMPT.replace(
        "{rag_context}", context or "Không có dữ liệu ngữ cảnh."
    ).replace(
        "{medicines_list}", ", ".join(medicines_list)
    )
    
    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Hãy phân tích tương tác giữa các loại thuốc trên."}
        ],
        temperature=0.1,
        response_format={"type": "json_object"}
    )
    
    content = response.choices[0].message.content
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {"error": "Lỗi phân tích JSON từ LLM", "raw_content": content}

FORECAST_SYSTEM_PROMPT = """Bạn là Chuyên gia Kế hoạch & Phân tích Chuỗi cung ứng Dược phẩm bằng AI tại Việt Nam.
Nhiệm vụ của bạn là phân tích báo cáo doanh số kỳ trước và tồn kho hiện tại để đề xuất nhu cầu nhập thêm hàng cho kỳ tiếp theo.

NGUYÊN TẮC QUAN TRỌNG:
1. Bạn phải phân tích dựa trên:
   - Tốc độ bán trung bình ngày (averageDailySales).
   - Tồn kho thực tế hiện tại (currentStock).
   - Số lượng hàng đang trên đường về (expectedIncoming).
   - Định mức tồn tối thiểu (minStock).
2. Hãy tính toán đề xuất nhập kho:
   - Nếu tồn kho hiện tại + hàng đang về không đủ dùng cho số ngày dự báo kỳ tới (periodDays), hãy đề xuất nhập thêm.
   - Công thức gợi ý: Đề xuất nhập thêm = tối đa là (Tốc độ bán ngày * Số ngày dự báo + Dự phòng an toàn) - (Tồn hiện tại + Hàng đang về).
3. Đánh giá mức độ khẩn cấp (urgency):
   - "HIGH": Khi tồn kho hiện tại gần bằng 0 hoặc hết hàng hoàn toàn mà tốc độ bán nhanh.
   - "MEDIUM": Khi tồn kho hiện tại dưới định mức minStock hoặc sắp hết hàng trong vòng 10 ngày tới.
   - "LOW": Khi tồn kho dồi dào nhưng cần bổ sung nhẹ để duy trì hoạt động bình thường.
4. Trả về đúng định dạng JSON mà KHÔNG giải thích thêm gì khác ngoài nội dung JSON.
5. Bạn phải phân tích và đưa ra khuyến nghị cho ít nhất 15-20 sản phẩm nổi bật nhất trong danh sách được gửi lên (ưu tiên các sản phẩm có tồn kho thấp hoặc có doanh số bán). Ngay cả khi sản phẩm không cần nhập thêm (suggestedOrderQty = 0), hãy vẫn đưa vào danh sách đề xuất với mức độ khẩn cấp LOW kèm lý do phân tích rõ ràng (ví dụ: tồn kho đủ dùng, hoặc đã có hàng đang về đủ đáp ứng) để thủ kho có cái nhìn bao quát về tình hình của các mặt hàng quan trọng.

BẮT BUỘC TRẢ VỀ JSON HỢP LỆ THEO SCHEMA SAU:
{
  "summary": "Tóm tắt xu hướng tồn kho và phân tích thị trường toàn cảnh",
  "recommendations": [
    {
      "medicineId": "ID của thuốc",
      "name": "Tên thuốc",
      "currentStock": 100,
      "averageDailySales": 5.2,
      "expectedIncoming": 0,
      "suggestedOrderQty": 150,
      "urgency": "HIGH | MEDIUM | LOW",
      "reason": "Lý do AI phân tích cụ thể cho loại thuốc này (VD: nhu cầu tăng cao, sắp hết hàng...)"
    }
  ]
}"""

async def generate_demand_forecast(dataset: list, period_days: int) -> dict:
    """
    Tạo dự báo nhu cầu nhập hàng JSON dựa trên dataset lịch sử bán hàng và tồn kho
    """
    try:
        # Lọc ưu tiên 60 sản phẩm quan trọng nhất (tồn kho thấp / nhu cầu cao) gửi cho LLM để tránh Rate Limit TPM của Groq
        sorted_dataset = sorted(dataset, key=lambda x: (x.get('currentStock', 9999) - x.get('reorderPoint', 30)))
        sample_dataset = sorted_dataset[:60]
        
        # Rút gọn siêu tiết kiệm Token (chỉ ~10-12 tokens/sản phẩm)
        compact_samples = [
            {
                "id": m.get("medicineId") or m.get("_id"),
                "name": m.get("name"),
                "cat": m.get("category", ""),
                "stock": m.get("currentStock", 0),
                "sales_daily": m.get("averageDailySales", 0),
                "incoming": m.get("expectedIncoming", 0),
                "unit": m.get("unit", "Hộp")
            }
            for m in sample_dataset
        ]

        dataset_str = json.dumps(compact_samples, ensure_ascii=False)
        user_prompt = f"Số ngày dự báo: {period_days} ngày. Tổng danh mục trong kho: {len(dataset)}. Dưới đây là {len(compact_samples)} sản phẩm dược phẩm ưu tiên hàng đầu:\n{dataset_str}"
        
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": FORECAST_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        print(f"⚠️ Warning: LLM Forecast failed ({e}), falling back to deterministic recommendations...")
        # Fallback local calculation
        recommendations = []
        for m in dataset[:50]:
            stock = m.get("currentStock", 0)
            sales = m.get("averageDailySales", 1.0)
            suggested = max(0, int(sales * period_days + 30 - stock))
            recommendations.append({
                "medicineId": m.get("medicineId") or m.get("_id") or "med-1",
                "name": m.get("name") or "Dược phẩm",
                "currentStock": stock,
                "averageDailySales": sales,
                "expectedIncoming": m.get("expectedIncoming", 0),
                "suggestedOrderQty": max(50, suggested),
                "urgency": "HIGH" if stock <= 10 else "MEDIUM" if stock <= 30 else "LOW",
                "reason": f"Tồn kho hiện tại ({stock} {m.get('unit','Hộp')}) cần bổ sung dự báo cho {period_days} ngày."
            })
        return {
            "summary": f"Dự báo nhu cầu cho {len(dataset)} dược phẩm trong {period_days} ngày tới từ dữ liệu bán hàng thực tế MongoDB.",
            "recommendations": recommendations
        }

SEASONAL_SYSTEM_PROMPT = """Bạn là Chuyên gia Phân tích Dược phẩm & AI Y tế tại Việt Nam.
Nhiệm vụ của bạn là nhận xét, giải thích và đưa ra khuyến nghị tồn kho dựa trên lịch sử bán hàng 12 tháng qua, thời tiết vùng miền và kết quả dự báo thống kê đã tính sẵn.

NGUYÊN TẮC BẮT BUỘC:
1. KHÔNG được phép tự vẽ ra dịch bệnh (như sốt xuất huyết, cúm) nếu không có bằng chứng tăng trưởng doanh số đồng thời từ các thuốc chỉ báo đặc hiệu (Ví dụ: Chỉ được thảo luận khả năng dịch sốt xuất huyết bùng phát nếu có sự tăng vọt đồng thời của Paracetamol, dung dịch bù nước ORS, và thuốc xịt chống muỗi).
2. Diễn đạt an toàn: Không dùng từ khẳng định dịch bùng phát. Sử dụng các cụm từ như "Có khả năng tương quan đến nhu cầu phòng dịch/chữa bệnh mùa mưa (Potential dengue-related demand)" hoặc "Phát hiện doanh số tăng đột biến bất thường (Abnormal Sales Spike)".
3. Mọi phân tích giải thích khuyến nghị (explainability) bắt buộc phải trích nguồn dữ liệu thực tế: "Evidence: SalesOrder - Last X days - Branch Y - Qty Z".
4. Đánh giá chất lượng diễn giải định tính bằng Explainability Confidence (High, Medium, Low, Very Low). Mức High (>=90%) chỉ được chọn khi xu hướng mùa lặp lại rõ ràng trong lịch sử bán hàng và khớp với dịch tễ học thực tế.
5. Tuyệt đối chỉ trả về dữ liệu JSON hợp lệ khớp chính xác với Schema dưới đây, không có văn bản giải thích thừa.

DỮ LIỆU ĐẦU VÀO:
- Vùng miền khí hậu: {weather_region}
- Mùa hiện tại: {current_season}
- Tháng hiện tại: {current_month}

BẮT BUỘC TRẢ VỀ JSON HỢP LỆ THEO SCHEMA SAU:
{
  "summary": "Tóm tắt xu hướng chung và cảnh báo tương quan nhu cầu nổi bật của vùng miền",
  "seasonal_trends": [
    {
      "category": "Danh mục thuốc",
      "trend": "INCREASING | DECREASING | STABLE",
      "possible_reasons": ["Lý do khả dĩ"],
      "evidence": "Nguồn dữ liệu đối chiếu cụ thể"
    }
  ],
  "potential_outbreaks": [
    {
      "potential_disease": "Tên bệnh/nhu cầu liên quan (VD: Dengue-related)",
      "risk_level": "HIGH | MEDIUM | LOW",
      "indicator_drugs": ["Tên thuốc tăng đột biến"],
      "analysis": "Phân tích biến động doanh số đột biến gần đây",
      "recommendation": "Khuyến nghị hành động"
    }
  ],
  "stock_recommendations": [
    {
      "medicineId": "ID thuốc",
      "name": "Tên thuốc",
      "suggestedAction": "Tăng tồn kho | Giữ nguyên | Giảm tồn kho",
      "suggestedQty": 50,
      "priority": "CRITICAL | HIGH | MEDIUM | LOW",
      "explainability_confidence": 95,
      "explainability_confidence_level": "High",
      "explainability": "Giải thích chi tiết kèm số liệu chứng minh gốc"
    }
  ]
}"""

async def analyze_seasonal_trends(dataset: list, weather_region: str, current_season: str, current_month: str) -> dict:
    """
    Phân tích xu hướng bán hàng theo mùa / dịch bệnh tích hợp dự báo thống kê (Hybrid AI)
    """
    from services.forecaster import LinearRegressionForecaster, MovingAverageForecaster
    from datetime import datetime
    
    lr_forecaster = LinearRegressionForecaster()
    ma_forecaster = MovingAverageForecaster()
    
    # 1. Chạy dự báo thống kê trước cho từng thuốc trong dataset
    enriched_dataset = []
    for item in dataset:
        sales_history = item.get("salesHistory", {})
        
        # Trích xuất số lượng thực tế từ lịch sử bán hàng để dự báo
        qty_history = {}
        for k, v in sales_history.items():
            if isinstance(v, dict):
                qty_history[k] = float(v.get("quantity", 0))
            else:
                qty_history[k] = float(v or 0)
        
        # Chọn chiến lược dự báo (Linear Regression nếu đủ >= 4 điểm dữ liệu bán, ngược lại dùng Moving Average)
        history_points = len([v for v in qty_history.values() if v > 0])
        if history_points >= 4:
            forecaster = lr_forecaster
        else:
            forecaster = ma_forecaster
            
        result = forecaster.forecast(qty_history)
        
        item_copy = dict(item)
        item_copy["forecast_m1"] = result.forecast_m1
        item_copy["forecast_m2"] = result.forecast_m2
        item_copy["forecast_m3"] = result.forecast_m3
        item_copy["ci_lower"] = result.ci_lower
        item_copy["ci_upper"] = result.ci_upper
        item_copy["forecast_confidence"] = result.confidence
        
        # Công thức tính doanh thu thất thoát tiềm năng (Potential Lost Revenue) tích hợp các biến số vận hành
        forecast_net = result.forecast_m1 + item.get("safetyStock", 50)
        expected_supply = item.get("currentStock", 0) + item.get("expectedIncoming", 0)
        shortage = max(0.0, forecast_net - expected_supply)
        item_copy["potential_lost_revenue"] = round(shortage * item.get("price", 0), 2)
        
        enriched_dataset.append(item_copy)
        
    # 2. Chuẩn bị Prompt và gửi dữ liệu đã làm giàu qua LLM giải thích định tính
    # Rút gọn dataset gửi cho LLM để tránh rate limit / token limit (chỉ gửi top 40 thuốc có nguy cơ hoặc doanh số cao nhất)
    dataset_to_llm = []
    active_items = []
    for item in enriched_dataset:
        sales_sum = sum(v.get("quantity", 0) if isinstance(v, dict) else (v or 0) for v in item.get("salesHistory", {}).values())
        if sales_sum > 0 or item.get("currentStock", 0) > 0:
            active_items.append((item, sales_sum))
            
    # Sắp xếp theo thứ tự ưu tiên: Doanh thu thất thoát giảm dần, sau đó đến doanh số bán giảm dần
    active_items.sort(key=lambda x: (x[0].get("potential_lost_revenue", 0), x[1]), reverse=True)
    
    # Lấy tối đa 20 thuốc quan trọng nhất để phân tích bằng LLM nhằm tối ưu Token Usage
    top_items = active_items[:20]
    
    for item, sales_sum in top_items:
        dataset_to_llm.append({
            "medicineId": item.get("medicineId"),
            "name": item.get("name"),
            "category": item.get("category"),
            "currentStock": item.get("currentStock"),
            "expectedIncoming": item.get("expectedIncoming"),
            "safetyStock": item.get("safetyStock"),
            "reorderPoint": item.get("reorderPoint"),
            "leadTime": item.get("leadTime"),
            "moq": item.get("moq"),
            "salesHistory": item.get("salesHistory"),
            "forecast_m1": item.get("forecast_m1"),
            "forecast_m2": item.get("forecast_m2"),
            "forecast_m3": item.get("forecast_m3"),
            "ci_lower": item.get("ci_lower"),
            "ci_upper": item.get("ci_upper"),
            "forecast_confidence": item.get("forecast_confidence")
        })
            
    system_prompt = SEASONAL_SYSTEM_PROMPT.replace(
        "{weather_region}", weather_region
    ).replace(
        "{current_season}", current_season
    ).replace(
        "{current_month}", current_month
    )
    
    user_prompt = f"Dưới đây là tập dữ liệu thống kê doanh số bán hàng và dự báo:\n{json.dumps(dataset_to_llm, ensure_ascii=False)}"
    
    try:
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        llm_json = json.loads(content)
    except Exception as e:
        print(f"Lỗi gọi LLM giải thích xu hướng: {e}")
        llm_json = {
            "summary": "Không thể kết xuất giải thích định tính từ LLM. Hiển thị dự báo thống kê.",
            "seasonal_trends": [],
            "potential_outbreaks": [],
            "stock_recommendations": []
        }
        
    # 3. Kết hợp kết quả phân tích thống kê và giải thích định tính
    return {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "llm_model": "llama-3.3-70b-versatile",
        "analysis_version": "v1.2.0",
        "summary": llm_json.get("summary", ""),
        "seasonal_trends": llm_json.get("seasonal_trends", []),
        "potential_outbreaks": llm_json.get("potential_outbreaks", []),
        "stock_recommendations": llm_json.get("stock_recommendations", []),
        "enriched_dataset": enriched_dataset
    }
