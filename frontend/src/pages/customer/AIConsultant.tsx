import { useState, useEffect, useRef } from "react";
import { Mic, Square, Sparkles, AlertTriangle, CheckCircle, ShoppingCart, Volume2, Info, ArrowRight, HeartPulse, Brain } from "lucide-react";
import { prescriptionService } from "../../services/sales/prescription.service";
import { cartService } from "../../services/sales/cart.service";

export function AIConsultant() {
  const [recording, setRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  // Results
  const [result, setResult] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Custom premium non-blocking alert modal state
  const [alertModal, setAlertModal] = useState<{ message: string; title?: string; onConfirm?: () => void } | null>(null);

  const showAlert = (message: string, title = "Thông báo", onConfirm?: () => void) => {
    setAlertModal({ message, title, onConfirm });
  };

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

      const data = await prescriptionService.recommendPrescription(formData);

      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Lỗi khi kết nối tới Trợ lý AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAllToCart = async () => {
    if (!result?.prescription?.recommended_drugs || !result?.inventory_status?.available) return;

    try {
      const availableList = result.inventory_status.available;
      const token = localStorage.getItem("token");
      let addedCount = 0;

      if (!token) {
        // Guest mode: update guest_cart
        const guestCartStr = localStorage.getItem("guest_cart");
        let cart = guestCartStr ? JSON.parse(guestCartStr) : [];

        result.prescription.recommended_drugs.forEach((drug: any) => {
          const invMatch = availableList.find((av: any) => av.name.toLowerCase() === drug.name.toLowerCase());
          if (invMatch && invMatch.stock > 0) {
            const medId = invMatch.id || invMatch._id;
            const existing = cart.find((it: any) => it.id === medId || it._id === medId);
            if (existing) {
              if (existing.quantity < invMatch.stock) {
                existing.quantity += 1;
                addedCount++;
              }
            } else {
              cart.push({
                id: medId,
                _id: medId,
                name: invMatch.name,
                category: invMatch.category || "Chưa phân loại",
                price: invMatch.price,
                quantity: 1,
                unit: invMatch.unit || "Viên",
                stock: invMatch.stock,
                active_ingredient: drug.active_ingredient || "",
                image: invMatch.image || ""
              });
              addedCount++;
            }
          }
        });

        if (addedCount > 0) {
          localStorage.setItem("guest_cart", JSON.stringify(cart));
          window.dispatchEvent(new Event("cartUpdated"));
          setSuccessMessage(`Đã thêm thành công ${addedCount} loại thuốc khả dụng vào giỏ hàng!`);
        } else {
          setError("Không có loại thuốc đề xuất nào khả dụng hoặc còn hàng trong kho.");
        }
      } else {
        // Logged-in mode: call API POST /api/users/cart for each drug
        for (const drug of result.prescription.recommended_drugs) {
          const invMatch = availableList.find((av: any) => av.name.toLowerCase() === drug.name.toLowerCase());
          if (invMatch && invMatch.stock > 0) {
            const medId = invMatch.id || invMatch._id;
            try {
              await cartService.addToCart(medId, 1);
              addedCount++;
            } catch (err) {
              console.error("Error adding drug to cart:", err);
            }
          }
        }

        if (addedCount > 0) {
          window.dispatchEvent(new Event("cartUpdated"));
          setSuccessMessage(`Đã thêm thành công ${addedCount} loại thuốc khả dụng vào giỏ hàng!`);
        } else {
          setError("Không thể thêm thuốc đề xuất vào giỏ hàng.");
        }
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
    <div className="flex flex-col gap-6 flex-1 max-w-5xl mx-auto w-full px-4 py-2 animate-fade-in">
      {/* Premium Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Brain size={24} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Trợ Lý Dược Sĩ AI <span className="px-2 py-0.5 text-[10px] bg-blue-100 text-blue-800 font-black rounded-full uppercase tracking-wider">PRO</span>
            </h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Nói triệu chứng bằng giọng nói, AI tự động chẩn đoán triệu chứng, kê đơn và đối chiếu kho thực tế.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Recording Widget (Premium Dark Theme Card) */}
        <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-slate-950 text-white border border-slate-800 rounded-[28px] p-8 shadow-xl flex flex-col items-center justify-center text-center gap-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full filter blur-3xl pointer-events-none"></div>
          
          <div className="w-12 h-12 bg-slate-800 text-blue-400 rounded-xl flex items-center justify-center border border-slate-700/50 shadow-inner">
            <Volume2 size={22} />
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="font-black text-white text-md tracking-tight">Ghi Âm Triệu Chứng Của Bạn</h4>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed font-semibold">
              Nhấn nút mic bên dưới và kể lại triệu chứng của bạn (Ví dụ: "Tôi bị sốt cao, đau đầu và sổ mũi 2 ngày qua").
            </p>
          </div>

          {/* Micro Animation / Waveform Wrapper */}
          <div className="relative flex items-center justify-center w-40 h-40">
            {recording && (
              <>
                <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping opacity-45"></div>
                <div className="absolute inset-4 bg-indigo-500/30 rounded-full animate-pulse opacity-75"></div>
                <div className="absolute inset-8 bg-blue-500/30 rounded-full animate-pulse duration-1000 opacity-60"></div>
              </>
            )}
            <button
              onClick={recording ? stopRecording : startRecording}
              className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 active:scale-95 cursor-pointer border ${
                recording 
                  ? "bg-rose-500 border-rose-400 text-white shadow-rose-900/50 hover:bg-rose-600" 
                  : "bg-gradient-to-tr from-blue-600 to-indigo-600 border-blue-500 text-white hover:shadow-blue-500/20 shadow-lg"
              }`}
            >
              {recording ? <Square size={28} className="fill-white animate-pulse" /> : <Mic size={32} />}
            </button>
          </div>

          {/* Status and timer */}
          <div className="flex flex-col items-center gap-1.5">
            <span className={`text-2xl font-black font-mono tracking-wider ${recording ? "text-rose-400 animate-pulse" : "text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"}`}>
              {formatTime(timer)}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-555">
              {recording ? "Hệ thống đang ghi âm..." : audioBlob ? "Ghi âm thành công" : "Nhấn nút để bắt đầu nói"}
            </span>
          </div>

          {error && (
            <div className="bg-rose-950/50 text-rose-300 border border-rose-900/50 rounded-2xl p-4 text-[11px] font-bold leading-normal w-full shadow-inner">
              <div className="flex items-center gap-2 justify-center mb-1">
                <AlertTriangle size={14} className="text-rose-400" />
                <span>PHÁT HIỆN LỖI:</span>
              </div>
              {error}
            </div>
          )}

          {/* Submit action button */}
          {audioBlob && !recording && (
            <button
              onClick={sendToAI}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Sparkles size={14} className={loading ? "animate-spin" : "animate-pulse"} />
              {loading ? "Đang gửi lên Trợ lý AI..." : "Phân tích và gợi ý thuốc"}
            </button>
          )}
        </div>

        {/* Right: AI suggestion display */}
        <div className="lg:col-span-7 flex flex-col gap-6 w-full">
          
          {/* Instructions when empty */}
          {!loading && !result && !error && (
            <div className="bg-gradient-to-b from-blue-50/20 to-indigo-50/10 border-2 border-dashed border-slate-200 rounded-[28px] p-12 text-center flex flex-col items-center justify-center min-h-[380px] shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-4 shadow-inner">
                <Sparkles size={32} className="animate-pulse" />
              </div>
              <h3 className="font-black text-slate-800 text-md">Đơn Thuốc Đang Chờ Phân Tích</h3>
              <p className="text-slate-400 text-xs mt-2 max-w-sm leading-relaxed font-semibold">
                Sau khi anh/chị ghi âm xong ở góc trái và nhấn nút "Phân tích và gợi ý thuốc", Trợ lý AI sẽ hiển thị kết quả chẩn đoán cùng danh sách thuốc phù hợp tại đây.
              </p>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="bg-white border border-slate-200 rounded-[28px] p-8 flex flex-col items-center justify-center min-h-[380px] gap-6 shadow-sm">
              <div className="relative flex items-center justify-center w-16 h-16">
                <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              
              <div className="flex flex-col gap-4 w-full max-w-xs font-semibold">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider text-center">AI Đang Xử Lý Dữ Liệu</h3>
                <div className="flex flex-col gap-2.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">1</div>
                    <span>Nhận diện giọng nói (STT)...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">2</div>
                    <span>Truy xuất dữ liệu thuốc y khoa (RAG)...</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">3</div>
                    <span>Kiểm tra số dư tồn kho thuốc...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success messages */}
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 shadow-sm animate-fade-in animate-pulse">
              <CheckCircle size={18} className="text-emerald-500 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Results display */}
          {result && (
            <div className="flex flex-col gap-6 animate-fade-in">
              
              {/* Box A: Transcript */}
              <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Lời khai triệu chứng gốc</span>
                <div className="relative bg-slate-50 p-4 rounded-2xl border border-slate-100/80 font-sans italic text-slate-700 text-xs leading-relaxed">
                  <span className="text-2xl text-blue-200 absolute top-0 left-2 font-serif">“</span>
                  <p className="pl-5 pr-2">{result.transcribed_text}</p>
                </div>
              </div>

              {/* Box B: Diagnosed symptoms & Recommended drugs */}
              <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm flex flex-col gap-6">
                
                {/* Header of Prescription */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-0.5">Kết Quả Phân Tích</span>
                    <h3 className="font-black text-slate-900 text-md tracking-tight">Đơn Thuốc Đề Xuất Bằng Trí Tuệ Nhân Tạo</h3>
                  </div>
                  
                  {result.prescription?.recommended_drugs?.length > 0 && (
                    <button
                      onClick={handleAddAllToCart}
                      className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 shrink-0"
                    >
                      <ShoppingCart size={13} /> Thêm Tất Cả Vào Giỏ
                    </button>
                  )}
                </div>

                {/* Diagnostics */}
                <div className="flex flex-col gap-2 font-sans bg-blue-50/30 p-4 rounded-2xl border border-blue-100/50">
                  <div className="text-xs text-slate-700 font-semibold flex items-center gap-1.5 flex-wrap">
                    <span className="text-slate-400 font-bold">Chẩn đoán triệu chứng:</span>
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[10px] font-black rounded-lg uppercase tracking-wider">
                      {result.prescription?.patient_symptoms || "Không xác định"}
                    </span>
                  </div>
                </div>

                {/* Warnings Section from LLM */}
                {result.prescription?.warnings && (
                  <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 text-xs font-semibold text-amber-900 flex items-start gap-3 shadow-inner">
                    <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-extrabold text-[10px] uppercase tracking-wider text-amber-700">Lưu ý chống chỉ định:</span>
                      <p className="leading-relaxed">{result.prescription.warnings}</p>
                    </div>
                  </div>
                )}

                {/* Suggested Drugs List */}
                <div className="flex flex-col gap-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Danh mục thuốc kê đơn</span>
                  
                  {result.prescription?.recommended_drugs && result.prescription.recommended_drugs.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {result.prescription.recommended_drugs.map((drug: any, idx: number) => {
                        const stockInfo = getDrugStockInfo(drug.name);
                        const isAvailable = !!stockInfo;
                        const hasStock = stockInfo && stockInfo.stock > 0;
                        
                        return (
                          <div
                            key={idx}
                            className={`border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 transform hover:scale-[1.01] ${
                              isAvailable && hasStock
                                ? "bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200"
                                : "bg-slate-50 border-slate-200/85 opacity-70"
                            }`}
                          >
                            <div className="flex items-start gap-4 max-w-[75%]">
                              {/* Pill Icon / Place Holder */}
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                                isAvailable && hasStock
                                  ? "bg-blue-50 text-blue-600 border-blue-100"
                                  : "bg-slate-100 text-slate-400 border-slate-200"
                              }`}>
                                <HeartPulse size={22} className={isAvailable && hasStock ? "animate-pulse" : ""} />
                              </div>

                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <span className="font-black text-slate-800 text-xs">{drug.name}</span>
                                  {isAvailable && hasStock ? (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[8px] font-black rounded-md font-sans uppercase tracking-wider">Sẵn hàng</span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[8px] font-black rounded-md font-sans uppercase tracking-wider">Hết hàng</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hoạt chất: {drug.active_ingredient}</span>
                                <div className="mt-1.5 flex flex-col gap-0.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                                  <span className="text-slate-600 font-semibold"><span className="text-slate-400 font-bold">Liều lượng:</span> {drug.dosage}</span>
                                  <span className="text-slate-600 font-semibold"><span className="text-slate-400 font-bold">Cách dùng:</span> {drug.usage}</span>
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                              {isAvailable ? (
                                <div className="text-left sm:text-right">
                                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">Kho: {stockInfo.stock} hộp</span>
                                  <span className="font-black text-sm text-blue-600">{stockInfo.price.toLocaleString()}₫</span>
                                </div>
                              ) : (
                                <div className="text-left sm:text-right">
                                  <span className="text-[10px] font-extrabold text-slate-400 block uppercase tracking-wider">Không có trong kho</span>
                                  <span className="font-black text-sm text-slate-400">---</span>
                                </div>
                              )}
                              
                              {isAvailable && hasStock && (
                                <button
                                  onClick={async () => {
                                    const medId = stockInfo.id || stockInfo._id;
                                    const token = localStorage.getItem("token");

                                    if (!token) {
                                      const guestCartStr = localStorage.getItem("guest_cart");
                                      let cart = guestCartStr ? JSON.parse(guestCartStr) : [];
                                      const existing = cart.find((c: any) => c.id === medId || c._id === medId);
                                      
                                      if (existing) {
                                        if (existing.quantity < stockInfo.stock) {
                                          existing.quantity += 1;
                                        } else {
                                          showAlert(`Chỉ còn ${stockInfo.stock} sản phẩm khả dụng trong kho!`);
                                          return;
                                        }
                                      } else {
                                        cart.push({
                                          id: medId,
                                          _id: medId,
                                          name: stockInfo.name,
                                          category: stockInfo.category || "Chưa phân loại",
                                          price: stockInfo.price,
                                          unit: stockInfo.unit || "Hộp",
                                          stock: stockInfo.stock,
                                          quantity: 1,
                                          active_ingredient: drug.active_ingredient || "",
                                          image: stockInfo.image || ""
                                        });
                                      }

                                      localStorage.setItem("guest_cart", JSON.stringify(cart));
                                      window.dispatchEvent(new Event("cartUpdated"));
                                      setSuccessMessage(`Đã thêm thuốc ${drug.name} vào giỏ hàng!`);
                                    } else {
                                      try {
                                        await cartService.addToCart(medId, 1);
                                        window.dispatchEvent(new Event("cartUpdated"));
                                        setSuccessMessage(`Đã thêm thuốc ${drug.name} vào giỏ hàng!`);
                                      } catch (err: any) {
                                        console.error(err);
                                        const msg = err.response?.data?.message || err.message || "Không thể thêm thuốc vào giỏ hàng.";
                                        showAlert(msg);
                                      }
                                    }
                                  }}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer hover:shadow-md transition-all"
                                >
                                  <ShoppingCart size={12} /> Thêm
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 text-slate-500 border border-slate-100 rounded-xl text-xs font-semibold text-center">
                      AI không tìm thấy hoặc không kê loại thuốc nào phù hợp với triệu chứng khai báo trong kho hàng.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* Premium Generic Alert Modal */}
      {alertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-scale-up">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0d6efd] flex items-center justify-center mb-5 border border-blue-100 shadow-inner animate-pulse">
              <Info size={28} />
            </div>
            
            <h3 className="text-md font-black text-slate-800 tracking-tight mb-2">
              {alertModal.title || "Thông báo"}
            </h3>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed max-w-xs mb-6">
              {alertModal.message}
            </p>
            
            <button
              onClick={() => {
                if (alertModal.onConfirm) {
                  alertModal.onConfirm();
                }
                setAlertModal(null);
              }}
              className="w-full px-5 py-3 bg-[#0d6efd] hover:bg-[#0a58ca] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-blue-500/10 transition-all cursor-pointer"
            >
              Đồng ý
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
