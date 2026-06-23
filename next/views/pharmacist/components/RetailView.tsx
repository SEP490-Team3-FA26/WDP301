import { useState, useEffect, useRef } from "react";
import {
  ShoppingCart, Minus, Plus, SearchIcon, Sparkles, XCircle, AlertTriangle, ShieldAlert,
  Banknote, QrCode, Printer, CheckCircle2, Mic, Square, Check
} from "lucide-react";
import { medicineService } from "../../../services/medicine.service";
import { orderService } from "../../../services/order.service";
import { prescriptionService } from "../../../services/prescription.service";

interface RetailViewProps {
  showToast: (message: string, type?: "success" | "error" | "warning") => void;
}

export default function RetailView({ showToast }: RetailViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [remarks, setRemarks] = useState("");

  // Checkout Modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [error, setError] = useState("");

  const [showPayOSModal, setShowPayOSModal] = useState(false);
  const [payosCheckoutUrl, setPayosCheckoutUrl] = useState("");
  const [payosOrderCode, setPayosOrderCode] = useState<number | null>(null);
  const [payosPolling, setPayosPolling] = useState(false);
  const [pendingSalePayload, setPendingSalePayload] = useState<any>(null);

  const finalizeSalesOrder = async (payload: any) => {
    setLoading(true);
    setError("");
    try {
      const result = await orderService.createSale(payload);

      setInvoiceData(result);
      setShowInvoiceModal(true);
      setCart([]); // Clear cart
    } catch (err: any) {
      setError(err.message || "Lỗi khi bán lẻ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (payosPolling && payosOrderCode) {
      interval = setInterval(async () => {
        try {
          const data = await orderService.checkOrderStatus(payosOrderCode);
          if (data.status === "PAID") {
            setPayosPolling(false);
            setShowPayOSModal(false);
            showToast("Thanh toán PayOS thành công!", "success");
            await finalizeSalesOrder(pendingSalePayload);
          }
        } catch (err) {
          console.error("Lỗi polling status thanh toán:", err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [payosPolling, payosOrderCode, pendingSalePayload]);

  const checkManualPayment = async () => {
    if (!payosOrderCode) return;
    try {
      const data = await orderService.checkOrderStatus(payosOrderCode);
      if (data.status === "PAID") {
        setPayosPolling(false);
        setShowPayOSModal(false);
        showToast("Thanh toán PayOS thành công!", "success");
        await finalizeSalesOrder(pendingSalePayload);
      } else {
        showToast("Hệ thống chưa ghi nhận được thanh toán. Vui lòng chuyển khoản lại hoặc đợi vài giây.", "warning");
      }
    } catch (err: any) {
      console.error(err);
      showToast("Lỗi kiểm tra trạng thái thanh toán.", "error");
    }
  };

  // AI Voice Recording States for Counter Sales
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [aiResult, setAiResult] = useState<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<any>(null);

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

  const startVoiceRecording = async () => {
    setAiResult(null);
    setVoiceBlob(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = () => {
        setVoiceBlob(new Blob(audioChunksRef.current, { type: "audio/webm" }));
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error(err);
      showToast("Không thể kết nối Microphone. Vui lòng cấp quyền micro!", "error");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleSendVoiceToAI = async () => {
    if (!voiceBlob) return;
    setAiLoading(true);
    try {
      const formData = new FormData();
      formData.append("audio", voiceBlob, "counter_recording.webm");

      const data = await prescriptionService.recommendPrescription(formData);
      setAiResult(data);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || "Lỗi phân tích cuộc thoại từ AI.";
      showToast(errMsg, "error");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddAiToCart = () => {
    if (!aiResult?.prescription?.recommended_drugs || !aiResult?.inventory_status?.available) return;
    const available = aiResult.inventory_status.available;
    let newCart = [...cart];
    let count = 0;

    aiResult.prescription.recommended_drugs.forEach((drug: any) => {
      const match = available.find((av: any) => av.name.toLowerCase() === drug.name.toLowerCase());
      if (match && match.stock > 0) {
        const medId = match.id || match._id;
        const existing = newCart.find(it => (it.id || it._id) === medId);
        if (existing) {
          if (existing.quantity < match.stock) {
            existing.quantity += 1;
            count++;
          }
        } else {
          newCart.push({
            ...match,
            id: medId,
            quantity: 1,
            active_ingredient: drug.active_ingredient
          });
          count++;
        }
      }
    });

    if (count > 0) {
      setCart(newCart);
      showToast(`Đã thêm ${count} thuốc đề xuất của AI vào giỏ hàng!`, "success");
      setVoiceModalOpen(false);
    } else {
      showToast("Không tìm thấy thuốc khả dụng trong kho khớp với đề xuất!", "warning");
    }
  };

  // Debounce search query
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const delay = setTimeout(() => {
      searchMedicines(searchQuery);
    }, 300);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const searchMedicines = async (query: string) => {
    setLoading(true);
    try {
      const data = await medicineService.getMedicines({ limit: 10, search: query });
      setSearchResults(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (med: any) => {
    const medId = med.id || med._id;
    const existing = cart.find(it => (it.id || it._id) === medId);
    if (existing) {
      if (existing.quantity >= med.stock) {
        showToast("Đã vượt quá số lượng tồn kho khả dụng!", "warning");
        return;
      }
      setCart(cart.map(it => (it.id || it._id) === medId ? { ...it, quantity: it.quantity + 1 } : it));
    } else {
      if (med.stock <= 0) {
        showToast("Thuốc này đã hết hàng khả dụng trong kho!", "error");
        return;
      }
      setCart([...cart, { ...med, id: medId, quantity: 1 }]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const updateQty = (id: string, change: number, maxStock: number) => {
    const item = cart.find(it => it.id === id);
    if (!item) return;
    const newQty = item.quantity + change;
    if (newQty <= 0) {
      setCart(cart.filter(it => it.id !== id));
    } else {
      if (newQty > maxStock) {
        showToast("Đã vượt quá tồn kho khả dụng!", "warning");
        return;
      }
      setCart(cart.map(it => it.id === id ? { ...it, quantity: newQty } : it));
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setError("");
    try {
      const payload = {
        type: "RETAIL",
        items: cart.map(it => ({
          medicineId: it.id,
          quantity: it.quantity
        })),
        paymentMethod,
        soldBy: "Dược sĩ Trần Thị A"
      };

      if (paymentMethod === "QR_PAY") {
        const payosResult = await orderService.createPayOSLink({
          patientName: "Khách lẻ vãng lai",
          patientPhone: "0900000000",
          totalAmount: total,
          items: cart.map(it => ({
            medicineId: it.id || it._id,
            name: it.name,
            quantity: it.quantity,
            price: it.price,
            unit: it.unit
          }))
        });

        setPayosCheckoutUrl(payosResult.checkoutUrl);
        setPayosOrderCode(payosResult.orderCode);
        setPendingSalePayload(payload);
        setShowPayOSModal(true);
        setPayosPolling(true);
      } else {
        await finalizeSalesOrder(payload);
      }
    } catch (err: any) {
      setError(err.message || "Lỗi khi bán lẻ");
    }
  };

  // Tính toán
  const subtotal = cart.reduce((sum, it) => sum + (it.price * it.quantity), 0);
  const discount = Math.round(subtotal * 0.05); // VIP discount
  const vat = Math.round((subtotal - discount) * 0.08);
  const total = subtotal - discount + vat;

  // Cảnh báo tương tác thuốc trong giỏ hàng lẻ
  const hasCiprofloxacin = cart.some(it => it.name.toLowerCase().includes("ciprofloxacin") || it.active_ingredient.toLowerCase().includes("ciprofloxacin"));
  const hasWarfarin = cart.some(it => it.name.toLowerCase().includes("warfarin") || it.active_ingredient.toLowerCase().includes("warfarin"));
  const hasInteraction = hasCiprofloxacin && hasWarfarin;

  return (
    <div className="h-full flex flex-col xl:flex-row gap-6 overflow-hidden">
      {/* Cột trái: Tìm kiếm & Giỏ hàng */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-6 pb-6">

        {/* Tìm kiếm & Tư vấn bằng giọng nói AI */}
        <div className="relative shrink-0">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none text-slate-400">
                <SearchIcon size={18} />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm nhanh theo tên thuốc hoặc hoạt chất để thêm vào giỏ hàng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-[12px] text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all shadow-sm"
              />
            </div>
            <button
              onClick={() => setVoiceModalOpen(true)}
              className="px-5 py-3.5 bg-gradient-to-r from-purple-600 to-[#0057cd] hover:from-purple-700 hover:to-[#00419e] text-white font-extrabold rounded-[12px] flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer text-xs uppercase tracking-wider shrink-0"
            >
              <Sparkles size={15} /> Ghi âm & Tư vấn AI
            </button>
          </div>

          {/* Kết quả tìm kiếm dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl border border-slate-200 shadow-xl max-h-72 overflow-y-auto z-40 divide-y divide-slate-100">
              {searchResults.map((med) => (
                <button
                  key={med.id}
                  onClick={() => addToCart(med)}
                  className="w-full p-4 text-left hover:bg-slate-50 transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-[14px]">{med.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{med.category} | Hoạt chất: {med.active_ingredient || "N/A"}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-[#0057cd]">{med.price.toLocaleString()}₫</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-semibold">Tồn kho khả dụng: {med.stock} {med.unit}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl font-medium flex items-center gap-3">
            <XCircle className="text-red-500 shrink-0" size={20} />
            {error}
          </div>
        )}

        {/* Cảnh báo tương tác */}
        {hasInteraction && (
          <div className="bg-[#ffdad6] border border-[#93000a] rounded-[16px] p-5 shadow-sm flex items-start gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm text-[#ba1a1a]">
              <ShieldAlert size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-[#93000a] font-bold text-[15px] mb-1 uppercase tracking-wide">
                CẢNH BÁO TƯƠNG TÁC THUỐC TRONG GIỎ HÀNG
              </h3>
              <p className="text-[#ba1a1a] text-[13px]">
                Sử dụng đồng thời <span className="font-bold">Ciprofloxacin</span> và <span className="font-bold">Warfarin</span> có thể làm tăng tác dụng chống đông của Warfarin một cách đột ngột, tăng đáng kể nguy cơ chảy máu nghiêm trọng. Vui lòng kiểm tra lại đơn!
              </p>
            </div>
          </div>
        )}

        {/* Giỏ hàng lẻ */}
        <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[480px]">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-[16px]">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <ShoppingCart size={18} className="text-[#0057cd]" />
              Giỏ hàng bán lẻ / Shopping Cart
            </div>
            <div className="px-3 py-1 bg-[#d8e3fb] text-[#00419e] font-bold text-[11px] rounded-full uppercase tracking-wider">
              {cart.reduce((sum, it) => sum + it.quantity, 0)} SẢN PHẨM
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center min-h-[250px]">
                <ShoppingCart size={40} className="text-slate-300 mb-3" />
                <h3 className="text-[15px] font-bold text-slate-500">Giỏ hàng trống</h3>
                <p className="text-slate-400 text-xs mt-1">Tìm kiếm thuốc ở trên để thêm vào giỏ hàng.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-4">Tên thuốc</th>
                    <th className="px-4 py-4">Hoạt chất</th>
                    <th className="px-4 py-4 text-center">Số lượng</th>
                    <th className="px-4 py-4 text-center">ĐVT</th>
                    <th className="px-6 py-4 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.map((it) => {
                    const diffTime = new Date(it.expiry).getTime() - new Date().getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const isNearExp = diffDays > 0 && diffDays <= 180;

                    return (
                      <tr key={it.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 text-[14px]">{it.name}</div>
                          {isNearExp && (
                            <div className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-bold inline-block mt-1">
                              Lô sắp xuất cận hạn (Còn {diffDays} ngày)
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-500 text-[13px]">{it.active_ingredient || "N/A"}</td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => updateQty(it.id, -1, it.stock)}
                              className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="font-bold text-[15px] text-slate-900 w-6 text-center">{String(it.quantity).padStart(2, "0")}</span>
                            <button
                              onClick={() => updateQty(it.id, 1, it.stock)}
                              className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-slate-500">{it.unit}</td>
                        <td className="px-6 py-4 text-right font-bold text-[#0057cd] text-[15px]">{(it.price * it.quantity).toLocaleString()}₫</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Cột phải: Thanh toán */}
      <div className="w-full xl:w-[380px] flex flex-col gap-6 shrink-0 pb-6 pl-1">

        {/* Tóm tắt khách sỉ/ VIP */}
        <div className="bg-white border border-slate-200 rounded-[16px] p-5 shadow-sm text-center">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">KHÁCH HÀNG THÂN THIẾT</h3>
            <span className="text-[10px] font-bold text-[#0057cd] bg-[#f2f3ff] px-2 py-0.5 rounded">Silver VIP</span>
          </div>
          <div className="text-left font-bold text-slate-800 text-[15px]">Khách lẻ vãng lai</div>
          <div className="text-[12px] text-slate-500 mt-1">Được áp dụng ưu đãi thành viên 5% khi bán hàng.</div>
        </div>

        {/* Thanh toán tóm tắt */}
        <div className="bg-white rounded-[16px] border border-slate-200 p-6 shadow-sm">
          <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-3">Tóm tắt đơn hàng</h3>
          <div className="space-y-4 text-[14px]">
            <div className="flex justify-between items-center text-slate-600">
              <span>Tạm tính / Subtotal</span>
              <span className="text-slate-900 font-bold">{subtotal.toLocaleString()}₫</span>
            </div>
            <div className="flex justify-between items-center text-[#ba1a1a]">
              <span>Ưu đãi VIP (5%)</span>
              <span className="font-bold">-{discount.toLocaleString()}₫</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Thuế VAT (8%)</span>
              <span className="text-slate-900 font-bold">{vat.toLocaleString()}₫</span>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200 flex items-end justify-between">
            <div className="text-[13px] font-black text-slate-900 uppercase tracking-widest pb-1">TỔNG THANH TOÁN</div>
            <div className="text-[28px] font-black text-[#0057cd] leading-none tracking-tighter">{total.toLocaleString()}₫</div>
          </div>
        </div>

        {/* Phương thức thanh toán */}
        <div className="bg-white border border-slate-200 rounded-[16px] p-5 shadow-sm">
          <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-3">Hình thức thanh toán</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPaymentMethod("CASH")}
              className={`flex items-center justify-center gap-2 py-3.5 border-2 rounded-xl font-bold text-sm transition-all ${paymentMethod === "CASH"
                ? "border-[#0057cd] bg-[#f0f6ff] text-[#0057cd]"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
            >
              <Banknote size={16} /> Tiền mặt
            </button>
            <button
              onClick={() => setPaymentMethod("QR_PAY")}
              className={`flex items-center justify-center gap-2 py-3.5 border-2 rounded-xl font-bold text-sm transition-all ${paymentMethod === "QR_PAY"
                ? "border-[#0057cd] bg-[#f0f6ff] text-[#0057cd]"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
            >
              <QrCode size={16} /> VNPay/QR
            </button>
          </div>
        </div>

        <button
          onClick={handleCheckout}
          disabled={cart.length === 0}
          className="w-full bg-[#0057cd] hover:bg-[#00419e] disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl py-5 shadow-sm transition-all flex items-center justify-center gap-2 font-black text-[16px] uppercase tracking-wide mt-auto"
        >
          <Printer size={20} />
          XÁC NHẬN & IN HÓA ĐƠN
        </button>
      </div>

      {/* =======================================
       * 📄 INVOICE SUCCESS MODAL (HÓA ĐƠN IN FIFO RETAIL)
       * ======================================= */}
      {showInvoiceModal && invoiceData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col transform transition-all duration-300">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500" /> Bán lẻ thành công!
              </h3>
              <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle size={22} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[75vh] scrollbar-hide">
              {/* Warnings nếu có */}
              {invoiceData.warnings && invoiceData.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">
                  <div className="font-bold text-sm flex items-center gap-1.5 uppercase mb-1">
                    <AlertTriangle size={16} /> Cảnh báo hạn sử dụng lô xuất:
                  </div>
                  <ul className="list-disc pl-5 text-xs space-y-1">
                    {invoiceData.warnings.map((w: string, idx: number) => (
                      <li key={idx} className="font-semibold">{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Mẫu hóa đơn bán thuốc */}
              <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 shadow-inner font-mono text-[13px] text-slate-800 flex flex-col gap-4">
                <div className="text-center border-b border-slate-200 pb-3">
                  <div className="font-bold text-[16px] text-slate-900 uppercase">HỆ THỐNG NHÀ THUỐC WDP</div>
                  <div className="text-xs text-slate-500 mt-1">Đường 3/2, Quận Hải Châu, Đà Nẵng</div>
                  <div className="text-xs text-slate-500">SĐT: 0236 123 456</div>
                </div>

                <div className="flex flex-col gap-1 border-b border-slate-200 pb-3">
                  <div className="flex justify-between">
                    <span>Mã hóa đơn:</span>
                    <span className="font-bold">{invoiceData.data._id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ngày lập:</span>
                    <span>{new Date(invoiceData.data.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kiểu bán:</span>
                    <span className="font-bold uppercase text-[#0057cd]">{invoiceData.data.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Khách hàng:</span>
                    <span>Khách lẻ vãng lai</span>
                  </div>
                </div>

                {/* Chi tiết xuất kho allocated */}
                <div>
                  <div className="font-bold border-b border-slate-200 pb-1.5 mb-2 uppercase">Chi tiết xuất kho (FIFO)</div>
                  <div className="space-y-3">
                    {invoiceData.data.items.map((it: any) => (
                      <div key={it.medicineId} className="flex flex-col">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>{it.name}</span>
                          <span>{it.quantity} {it.unit}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 italic mt-0.5 pl-2">
                          Lô xuất: {it.batches.map((b: any) => `${b.batchNo} (${b.quantity} ${it.unit})`).join(", ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3 flex flex-col gap-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Tổng tiền hàng:</span>
                    <span>{invoiceData.data.totalAmount.toLocaleString()}₫</span>
                  </div>
                  <div className="flex justify-between text-[#ba1a1a]">
                    <span>Ưu đãi thành viên (5%):</span>
                    <span>-{Math.round(invoiceData.data.totalAmount * 0.05).toLocaleString()}₫</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Thuế VAT (8%):</span>
                    <span>{Math.round(invoiceData.data.totalAmount * 0.95 * 0.08).toLocaleString()}₫</span>
                  </div>
                  <div className="flex justify-between font-black text-slate-900 text-[16px] border-t border-slate-200 pt-2.5">
                    <span>TỔNG THÀNH TIỀN:</span>
                    <span className="text-[#0057cd]">
                      {Math.round(invoiceData.data.totalAmount * 0.95 * 1.08).toLocaleString()}₫
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-[#0057cd] hover:bg-[#00419e] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow"
              >
                <Printer size={18} /> In hóa đơn (F10)
              </button>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
              >
                Đóng / Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================
       * 💳 MODAL THANH TOÁN PAYOS VIETQR
       * ======================================= */}
      {showPayOSModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform transition-all duration-300">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-900 text-md flex items-center gap-2 uppercase tracking-wide">
                <QrCode className="text-[#0057cd]" /> Khách quét mã VietQR thanh toán
              </h3>
              <button onClick={() => { setShowPayOSModal(false); setPayosPolling(false); }} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <XCircle size={22} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5 items-center text-center">
              <div className="text-xs font-bold text-slate-500">
                Hãy hướng dẫn khách hàng quét mã VietQR dưới đây bằng ứng dụng Ngân hàng (Mobile Banking) để thanh toán số tiền <span className="text-sm font-black text-[#0057cd]">{total.toLocaleString()}₫</span>.
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payosCheckoutUrl)}`}
                  alt="VietQR PayOS"
                  className="w-56 h-56 rounded-lg object-contain"
                />
              </div>

              <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 justify-center">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                Đang chờ khách chuyển khoản (Tự động cập nhật...)
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button
                onClick={checkManualPayment}
                className="flex-1 py-3 bg-[#0057cd] hover:bg-[#00419e] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow"
              >
                Kiểm tra thanh toán
              </button>
              <button
                onClick={() => { setShowPayOSModal(false); setPayosPolling(false); }}
                className="px-4 py-3 bg-slate-150 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================
       * 🎙️ MODAL GHI ÂM CUỘC THOẠI & ĐỀ XUẤT AI
       * ======================================= */}
      {voiceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col transform transition-all duration-300">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2 uppercase tracking-wide">
                <Sparkles className="text-purple-600 animate-pulse" /> Trợ Lý Tư Vấn Triệu Chứng AI
              </h3>
              <button
                onClick={() => { setVoiceModalOpen(false); setAiResult(null); setVoiceBlob(null); }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <XCircle size={22} />
              </button>
            </div>

            <div className="p-6 flex flex-col md:flex-row gap-6 overflow-y-auto max-h-[70vh]">
              {/* Cột trái: Ghi âm */}
              <div className="flex-1 flex flex-col items-center justify-center border border-slate-100 p-5 rounded-2xl bg-slate-50/50 text-center gap-4.5">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  {recording && (
                    <>
                      <div className="absolute inset-0 bg-purple-100 rounded-full animate-ping opacity-45"></div>
                      <div className="absolute inset-3 bg-purple-100 rounded-full animate-pulse opacity-75"></div>
                    </>
                  )}
                  <button
                    onClick={recording ? stopVoiceRecording : startVoiceRecording}
                    className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer ${recording ? "bg-rose-500 text-white shadow-rose-200" : "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200"
                      }`}
                  >
                    {recording ? <Square size={20} className="fill-white" /> : <Mic size={24} />}
                  </button>
                </div>
                <div>
                  <div className="text-lg font-black font-mono text-slate-800">
                    {String(Math.floor(timer / 60)).padStart(2, "0")}:{String(timer % 60).padStart(2, "0")}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                    {recording ? "Đang thu âm cuộc hội thoại..." : voiceBlob ? "Đã lưu bản ghi" : "Nhấp nút để ghi âm triệu chứng"}
                  </span>
                </div>

                {voiceBlob && !recording && (
                  <button
                    onClick={handleSendVoiceToAI}
                    disabled={aiLoading}
                    className="w-full py-2.5 bg-[#0057cd] hover:bg-[#00419e] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow cursor-pointer disabled:opacity-50"
                  >
                    {aiLoading ? "Đang phân tích..." : "Gửi AI Phân Tích"}
                  </button>
                )}
              </div>

              {/* Cột phải: Đề xuất */}
              <div className="flex-[1.4] flex flex-col gap-4">
                {aiLoading && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">AI đang bóc tách triệu chứng...</span>
                  </div>
                )}

                {!aiLoading && !aiResult && (
                  <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center flex flex-col items-center justify-center h-full">
                    <Sparkles size={28} className="text-purple-300 mb-2 animate-bounce" />
                    <span className="text-xs font-bold text-slate-700">Chờ kết quả AI</span>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-normal">
                      Hãy ghi âm giọng nói của khách hàng ở cột trái để bắt đầu phân tích.
                    </p>
                  </div>
                )}

                {aiResult && (
                  <div className="flex flex-col gap-4">
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-[11px] leading-relaxed">
                      <span className="font-bold text-slate-500">Khách hàng nói:</span>
                      <p className="font-bold text-slate-800 mt-0.5">"{aiResult.transcribed_text}"</p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Đơn thuốc AI gợi ý:</span>
                      {aiResult.prescription?.recommended_drugs?.length > 0 ? (
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                          {aiResult.prescription.recommended_drugs.map((drug: any, idx: number) => {
                            const match = aiResult.inventory_status?.available?.find(
                              (av: any) => av.name.toLowerCase() === drug.name.toLowerCase()
                            );

                            return (
                              <div key={idx} className="border border-slate-100 rounded-lg p-2.5 bg-slate-50/50 flex items-center justify-between gap-3 text-xs">
                                <div>
                                  <div className="font-bold text-slate-800">{drug.name}</div>
                                  <div className="text-[10px] text-slate-500">{drug.dosage}</div>
                                </div>
                                {match && match.stock > 0 ? (
                                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">Còn kho</span>
                                ) : (
                                  <span className="text-[10px] text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">Hết/Không có</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 italic">Không có thuốc phù hợp.</div>
                      )}
                    </div>

                    {aiResult.prescription?.warnings && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-[10px] leading-relaxed font-semibold">
                        ⚠️ Cảnh báo: {aiResult.prescription.warnings}
                      </div>
                    )}

                    <button
                      onClick={handleAddAiToCart}
                      className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow"
                    >
                      Thêm vào đơn hàng
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
