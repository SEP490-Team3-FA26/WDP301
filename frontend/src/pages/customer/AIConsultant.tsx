import { useState, useEffect, useRef } from "react";
import { Mic, Square, Sparkles, AlertTriangle, CheckCircle, ShoppingCart, Volume2, Info, ArrowRight, HeartPulse } from "lucide-react";

export function AIConsultant() {
  const [recording, setRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  // Results
  const [result, setResult] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<any>(null);

  // Timer counter
  useEffect(() => {
    if (recording) {
      intervalRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
      setTimer(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [recording]);

  const startRecording = async () => {
    setError("");
    setResult(null);
    setAudioBlob(null);
    setSuccessMessage("");
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Groq Whisper supports webm, mp3, wav. Webm is standard and widely supported in modern browsers
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
    } catch (err: any) {
      console.error(err);
      setError("Không thể truy cập Microphone của trình duyệt. Vui lòng cấp quyền micro!");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const sendToAI = async () => {
    if (!audioBlob) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "consultation_voice.webm");

      const res = await fetch("/api/prescriptions/recommend", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Lỗi khi phân tích âm thanh.");
      }

      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Lỗi khi kết nối tới Trợ lý AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAllToCart = () => {
    if (!result?.prescription?.recommended_drugs || !result?.inventory_status?.available) return;

    try {
      const availableList = result.inventory_status.available;
      const cartData = localStorage.getItem("customer_cart");
      let cart = cartData ? JSON.parse(cartData) : [];
      let addedCount = 0;

      result.prescription.recommended_drugs.forEach((drug: any) => {
        // Find if this recommended drug exists in available inventory list
        const invMatch = availableList.find((av: any) => av.name.toLowerCase() === drug.name.toLowerCase());
        
        if (invMatch && invMatch.stock > 0) {
          const medId = invMatch.id || invMatch._id || `MED-AI-${Math.floor(100 + Math.random() * 900)}`;
          const existingIndex = cart.findIndex((c: any) => c.id === medId || c.name.toLowerCase() === drug.name.toLowerCase());
          
          if (existingIndex > -1) {
            if (cart[existingIndex].quantity < invMatch.stock) {
              cart[existingIndex].quantity += 1;
              addedCount++;
            }
          } else {
            cart.push({
              id: medId,
              name: invMatch.name,
              active_ingredient: drug.active_ingredient || "",
              price: invMatch.price,
              unit: "Hộp",
              stock: invMatch.stock,
              quantity: 1
            });
            addedCount++;
          }
        }
      });

      if (addedCount > 0) {
        localStorage.setItem("customer_cart", JSON.stringify(cart));
        window.dispatchEvent(new Event("cartUpdated"));
        setSuccessMessage(`Đã thêm thành công ${addedCount} loại thuốc khả dụng vào giỏ hàng!`);
      } else {
        setError("Không có loại thuốc đề xuất nào khả dụng hoặc còn hàng trong kho.");
      }
    } catch (err) {
      console.error(err);
      setError("Lỗi khi thêm thuốc vào giỏ hàng.");
    }
  };

  // Helper to check if a drug is available and in stock
  const getDrugStockInfo = (drugName: string) => {
    if (!result?.inventory_status?.available) return null;
    return result.inventory_status.available.find(
      (av: any) => av.name.toLowerCase() === drugName.toLowerCase()
    );
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(remainingSecs).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-6 flex-1 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3 border-b border-slate-150 pb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
          <Sparkles size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Trợ Lý Dược Sĩ AI</h1>
          <p className="text-xs text-slate-500 font-medium">Nói triệu chứng của bạn, AI sẽ tự động kê đơn và kiểm tra kho hàng.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left: Recording Widget */}
        <div className="md:col-span-5 bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm flex flex-col items-center justify-center text-center gap-6">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <Volume2 size={24} />
          </div>

          <div className="flex flex-col gap-1.5">
            <h4 className="font-extrabold text-slate-900 text-sm">Ghi Âm Triệu Chứng Của Bạn</h4>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Ví dụ: "Tôi tên là Nguyễn Văn Nam, tôi bị sốt cao kèm đau đầu và nghẹt mũi suốt 2 ngày hôm nay."
            </p>
          </div>

          {/* Micro Animation / Waveform Wrapper */}
          <div className="relative flex items-center justify-center w-36 h-36">
            {recording && (
              <>
                <div className="absolute inset-0 bg-purple-100 rounded-full animate-ping opacity-45"></div>
                <div className="absolute inset-4 bg-purple-100 rounded-full animate-pulse opacity-75"></div>
              </>
            )}
            <button
              onClick={recording ? stopRecording : startRecording}
              className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer ${
                recording 
                  ? "bg-rose-500 text-white shadow-rose-200" 
                  : "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200"
              }`}
            >
              {recording ? <Square size={28} className="fill-white" /> : <Mic size={32} />}
            </button>
          </div>

          {/* Status and timer */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[20px] font-black font-mono text-slate-800">
              {formatTime(timer)}
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              {recording ? "Đang ghi âm giọng nói..." : audioBlob ? "Đã ghi âm xong" : "Bấm nút để bắt đầu nói"}
            </span>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 border border-red-100 rounded-xl p-3.5 text-[11px] font-bold leading-normal w-full">
              {error}
            </div>
          )}

          {/* Submit action button */}
          {audioBlob && !recording && (
            <button
              onClick={sendToAI}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-purple-150 transition-all cursor-pointer"
            >
              <Sparkles size={14} />
              {loading ? "Đang gửi lên Trợ lý AI..." : "Phân tích và gợi ý thuốc"}
            </button>
          )}
        </div>

        {/* Right: AI suggestion display */}
        <div className="md:col-span-7 flex flex-col gap-6 w-full">
          
          {/* Instructions when empty */}
          {!loading && !result && !error && (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[24px] p-12 text-center flex flex-col items-center justify-center min-h-[360px]">
              <Sparkles size={44} className="text-purple-300 mb-3 animate-pulse" />
              <h3 className="font-extrabold text-slate-800 text-md">Thông Tin Đơn Thuốc Đang Chờ</h3>
              <p className="text-slate-400 text-xs mt-1.5 max-w-sm leading-normal">
                Bật Micro và mô tả chi tiết triệu chứng của bạn ở góc trái. Trợ lý AI sẽ tiến hành bóc tách giọng nói thành văn bản chuẩn và hiển thị gợi ý dược phẩm y khoa tại đây.
              </p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="bg-white border border-slate-200 rounded-[24px] p-12 text-center flex flex-col items-center justify-center min-h-[360px] gap-4">
              <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">AI Đang Xử Lý Dữ Liệu</h3>
                <p className="text-slate-400 text-xs max-w-xs leading-normal">
                  Chuyển giọng nói sang văn bản, truy xuất kiến thức y khoa RAG và so khớp số dư tồn kho thuốc...
                </p>
              </div>
            </div>
          )}

          {/* Success messages */}
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 shadow-sm">
              <CheckCircle size={18} className="text-emerald-500 shrink-0" />
              {successMessage}
            </div>
          )}

          {/* Results display */}
          {result && (
            <div className="flex flex-col gap-6">
              
              {/* Box A: Transcript */}
              <div className="bg-white border border-slate-200 rounded-[20px] p-5 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hội thoại đã chuyển ngữ / Transcript</span>
                <p className="mt-2 text-slate-800 text-xs leading-relaxed font-bold bg-slate-50 p-3.5 rounded-xl border border-slate-100/50">
                  "{result.transcribed_text}"
                </p>
              </div>

              {/* Box B: Diagnosed symptoms & Recommended drugs */}
              <div className="bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-5">
                <div className="flex justify-between items-start gap-4 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest block mb-0.5">Lời khuyên AI</span>
                    <h3 className="font-black text-slate-900 text-sm">Toa Thuốc Do Trợ Lý AI Đề Xuất</h3>
                  </div>
                  
                  {result.prescription?.recommended_drugs?.length > 0 && (
                    <button
                      onClick={handleAddAllToCart}
                      className="px-4.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <ShoppingCart size={13} /> Thêm Tất Cả Vào Giỏ
                    </button>
                  )}
                </div>

                {/* Patient Summary */}
                <div className="flex flex-col gap-1.5">
                  <div className="text-xs text-slate-600 font-semibold">
                    <span className="text-slate-400 font-bold">Chẩn đoán triệu chứng:</span> {result.prescription?.patient_symptoms || "N/A"}
                  </div>
                  {result.prescription?.warnings && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-800 text-[11px] font-bold leading-normal flex items-start gap-2.5">
                      <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="uppercase text-[9px] tracking-wider block font-black mb-0.5">Cảnh Báo Chống Chỉ Định</span>
                        {result.prescription.warnings}
                      </div>
                    </div>
                  )}
                </div>

                {/* Suggested Drugs List */}
                <div className="flex flex-col gap-3.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Danh mục thuốc</span>
                  
                  {result.prescription?.recommended_drugs && result.prescription.recommended_drugs.length > 0 ? (
                    <div className="flex flex-col gap-3">
                      {result.prescription.recommended_drugs.map((drug: any, idx: number) => {
                        const stockInfo = getDrugStockInfo(drug.name);
                        const isAvailable = !!stockInfo;
                        const hasStock = stockInfo && stockInfo.stock > 0;
                        
                        return (
                          <div
                            key={idx}
                            className={`border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                              isAvailable && hasStock
                                ? "bg-purple-50/20 border-purple-100 hover:border-purple-200"
                                : "bg-slate-50 border-slate-200/80 opacity-70"
                            }`}
                          >
                            <div className="flex flex-col gap-1 max-w-[70%]">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-extrabold text-slate-900 text-xs">{drug.name}</span>
                                {isAvailable && hasStock ? (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded font-sans uppercase">Sẵn hàng</span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[9px] font-black rounded font-sans uppercase">Hết hàng</span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 font-semibold">Hoạt chất: {drug.active_ingredient}</span>
                              <span className="text-[11px] font-bold text-slate-700 mt-1">Liều dùng: {drug.dosage}</span>
                              <span className="text-[11px] font-bold text-slate-500">Cách dùng: {drug.usage}</span>
                            </div>

                            <div className="text-right shrink-0 flex md:flex-col items-center md:items-end justify-between gap-2.5">
                              {isAvailable && (
                                <div>
                                  <span className="text-xs font-bold text-slate-500 block">Tồn: {stockInfo.stock}</span>
                                  <span className="font-black text-xs text-purple-600">{stockInfo.price.toLocaleString()}₫</span>
                                </div>
                              )}
                              
                              {isAvailable && hasStock && (
                                <button
                                  onClick={() => {
                                    const cartData = localStorage.getItem("customer_cart");
                                    let cart = cartData ? JSON.parse(cartData) : [];
                                    const existing = cart.find((c: any) => c.id === stockInfo.id || c.name.toLowerCase() === drug.name.toLowerCase());
                                    
                                    if (existing) {
                                      if (existing.quantity < stockInfo.stock) {
                                        existing.quantity += 1;
                                      }
                                    } else {
                                      cart.push({
                                        id: stockInfo.id || stockInfo._id || `MED-AI-${idx}`,
                                        name: stockInfo.name,
                                        active_ingredient: drug.active_ingredient || "",
                                        price: stockInfo.price,
                                        unit: "Hộp",
                                        stock: stockInfo.stock,
                                        quantity: 1
                                      });
                                    }

                                    localStorage.setItem("customer_cart", JSON.stringify(cart));
                                    window.dispatchEvent(new Event("cartUpdated"));
                                    setSuccessMessage(`Đã thêm thuốc ${drug.name} vào giỏ hàng!`);
                                  }}
                                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                                >
                                  <ShoppingCart size={11} /> Thêm
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 text-slate-500 border border-slate-100 rounded-xl text-xs font-semibold">
                      AI không tìm thấy hoặc không kê loại thuốc nào phù hợp với triệu chứng khai báo trong kho hàng.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
