import { useState, useEffect } from "react";
import {
  SearchIcon, XCircle, ShoppingCart, Minus, Plus, Building, Banknote, CreditCard, QrCode, FileText, Check, Printer
} from "lucide-react";
import { medicineService } from "../../../services/inventory/medicine.service";
import { orderService } from "../../../services/sales/order.service";

// Helper to decode JWT token to extract branchId and user info
function getBranchInfoFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return { branchId: null, fullName: "Dược sĩ phòng sỉ" };
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    return {
      branchId: decoded.branchId || null,
      fullName: decoded.fullName || "Dược sĩ phòng sỉ"
    };
  } catch (e) {
    console.error("Lỗi giải mã token:", e);
    return { branchId: null, fullName: "Dược sĩ phòng sỉ" };
  }
}

export default function WholesaleView() {
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Agent / Customer states
  const [agentName, setAgentName] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [agentAddress, setAgentAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  // Invoicing & PayOS modals
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [showPayOSModal, setShowPayOSModal] = useState(false);
  const [payosCheckoutUrl, setPayosCheckoutUrl] = useState("");
  const [payosQrCode, setPayosQrCode] = useState("");
  const [payosOrderCode, setPayosOrderCode] = useState<number | null>(null);
  const [payosPolling, setPayosPolling] = useState(false);
  const [pendingSalePayload, setPendingSalePayload] = useState<any>(null);

  // Search debounce
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
    try {
      const { branchId } = getBranchInfoFromToken();
      const data = await medicineService.getBranchMedicines(branchId || '', { limit: 10, search: query, _t: Date.now() });
      setSearchResults(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMedicine = (med: any) => {
    const medId = med.id || med._id;
    const existing = cart.find(it => it.medicineId === medId);
    if (existing) {
      if (existing.quantity >= med.stock) {
        alert("Đã vượt quá số lượng tồn kho khả dụng!");
        return;
      }
      setCart(cart.map(it => it.medicineId === medId ? { ...it, quantity: it.quantity + 10 } : it));
    } else {
      if (med.stock <= 0) {
        alert("Thuốc đã hết hàng khả dụng!");
        return;
      }
      setCart([...cart, {
        medicineId: medId,
        name: med.name,
        active_ingredient: med.active_ingredient || '',
        price: med.price || 50000,
        priceTiers: med.priceTiers || [],
        quantity: 10, // Sỉ tối thiểu 10 đơn vị
        unit: med.unit || 'Hộp',
        stock: med.stock,
        expiry: med.expiry
      }]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const updateQuantity = (medId: string, qty: number) => {
    const item = cart.find(it => it.medicineId === medId);
    if (!item) return;

    if (qty > item.stock) {
      alert(`Chỉ còn ${item.stock} sản phẩm khả dụng trong kho.`);
      qty = item.stock;
    }
    if (qty < 1) qty = 1;

    setCart(cart.map(it => it.medicineId === medId ? { ...it, quantity: qty } : it));
  };

  const removeItem = (medId: string) => {
    setCart(cart.filter(it => it.medicineId !== medId));
  };

  // Helper tính giá theo cấp bậc sỉ
  const getTieredPrice = (item: any) => {
    const quantity = item.quantity;
    if (item.priceTiers && item.priceTiers.length > 0) {
      const sortedTiers = [...item.priceTiers].sort((a, b) => b.minQuantity - a.minQuantity);
      for (const tier of sortedTiers) {
        if (quantity >= tier.minQuantity) {
          return tier.price;
        }
      }
    }
    // Mặc định nếu không cấu hình riêng
    const basePrice = item.price;
    if (quantity >= 100) return Math.round(basePrice * 0.85);
    if (quantity >= 50) return Math.round(basePrice * 0.90);
    if (quantity >= 10) return Math.round(basePrice * 0.95);
    return basePrice;
  };

  // Tính chiết khấu so với giá bán lẻ thông thường
  const getSavings = (item: any) => {
    const retail = item.price * item.quantity;
    const tiered = getTieredPrice(item) * item.quantity;
    return retail - tiered;
  };

  const subtotal = cart.reduce((sum, item) => sum + (getTieredPrice(item) * item.quantity), 0);
  const totalSavings = cart.reduce((sum, item) => sum + getSavings(item), 0);
  const vat = Math.round(subtotal * 0.08); // 8% VAT
  const total = subtotal + vat;

  // PayOS Polling
  useEffect(() => {
    let interval: any;
    if (payosPolling && payosOrderCode) {
      interval = setInterval(async () => {
        try {
          const data = await orderService.checkOrderStatus(payosOrderCode);
          if (data.status === "PAID") {
            setPayosPolling(false);
            setShowPayOSModal(false);
            alert("Thanh toán PayOS thành công!");

            const saleRes = data.saleResult || data;
            setInvoiceData(saleRes.data || saleRes);
            setShowInvoiceModal(true);
            setCart([]);
            setAgentName("");
            setAgentPhone("");
            setAgentAddress("");
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
        alert("Thanh toán PayOS thành công!");

        const saleRes = data.saleResult || data;
        setInvoiceData(saleRes.data || saleRes);
        setShowInvoiceModal(true);
        setCart([]);
        setAgentName("");
        setAgentPhone("");
        setAgentAddress("");
      } else {
        alert("Hệ thống chưa ghi nhận được thanh toán. Vui lòng chuyển khoản lại hoặc đợi vài giây.");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kiểm tra trạng thái thanh toán.");
    }
  };

  const finalizeSale = async (payload: any) => {
    setLoading(true);
    setError("");
    try {
      const result = await orderService.createSale(payload);
      // Kết quả lưu từ inventory-service
      setInvoiceData(result.data || result);
      setShowInvoiceModal(true);
      setCart([]);
      setAgentName("");
      setAgentPhone("");
      setAgentAddress("");
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Lỗi thanh toán");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      setError("Vui lòng thêm sản phẩm vào giỏ hàng sỉ.");
      return;
    }
    if (!agentName) {
      setError("Vui lòng điền tên đại lý / bệnh viện mua hàng.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { branchId: currentBranchId, fullName: currentUserName } = getBranchInfoFromToken();

      const generatedOrderCode = Math.floor(10000000 + Math.random() * 90000000);
      const payload = {
        type: "WHOLESALE" as const,
        branchId: currentBranchId || undefined,
        items: cart.map(it => ({
          medicineId: it.medicineId,
          quantity: it.quantity
        })),
        paymentMethod,
        patientName: agentName, // Mapped to patientName field
        patientPhone: agentPhone || "0900000000",
        soldBy: currentUserName || "Dược sĩ phòng sỉ",
        orderCode: generatedOrderCode
      };

      if (paymentMethod === "QR_PAY") {
        const payosResult = await orderService.createPayOSLink({
          patientName: agentName,
          patientPhone: agentPhone || "0900000000",
          totalAmount: total,
          items: cart.map(it => ({
            medicineId: it.medicineId,
            name: it.name,
            quantity: it.quantity,
            price: getTieredPrice(it),
            unit: it.unit
          }))
        });

        payload.orderCode = payosResult.orderCode;

        setPayosCheckoutUrl(payosResult.checkoutUrl);
        setPayosQrCode(payosResult.qrCode || "");
        setPayosOrderCode(payosResult.orderCode);
        setPendingSalePayload(payload);
        setShowPayOSModal(true);
        setPayosPolling(true);
      } else {
        await finalizeSale(payload);
      }
    } catch (err: any) {
      setError(err.message || "Lỗi thanh toán");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col xl:flex-row gap-6 overflow-hidden">
      {/* CỘT TRÁI: Tìm kiếm và Giỏ hàng sỉ */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-6 pb-6">

        {/* Tìm kiếm thuốc */}
        <div className="bg-white rounded-[16px] border border-slate-200 p-5 shadow-sm flex flex-col gap-3 shrink-0">
          <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">
            Tìm sản phẩm bán sỉ từ kho hàng
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <SearchIcon size={18} />
            </div>
            <input
              type="text"
              placeholder="Nhập tên thuốc, hoạt chất để tìm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-[12px] text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
            />

            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl border border-slate-200 shadow-xl max-h-60 overflow-y-auto z-40 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                {searchResults.map((med) => (
                  <button
                    key={med.id || med._id}
                    onClick={() => handleAddMedicine(med)}
                    className="w-full p-4 text-left hover:bg-slate-50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{med.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{med.category} | Hoạt chất: {med.active_ingredient || "N/A"}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-[#0057cd] text-sm">{med.price.toLocaleString()}₫ <span className="text-[10px] text-slate-400">lẻ</span></div>
                      <div className="text-xs text-slate-500 mt-0.5 font-semibold">Tồn kho: {med.stock} {med.unit}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl font-medium flex items-center gap-3">
            <XCircle className="text-red-500 shrink-0" size={20} />
            {error}
          </div>
        )}

        {/* Giỏ hàng sỉ */}
        <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[400px]">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
            <h2 className="text-[15px] font-black text-slate-800 tracking-tight flex items-center gap-2">
              <ShoppingCart size={18} className="text-[#0057cd]" /> CHI TIẾT ĐƠN HÀNG SỈ
            </h2>
            <span className="text-xs text-slate-400 font-bold uppercase">{cart.length} SẢN PHẨM</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Tên thuốc</th>
                  <th className="px-6 py-4 text-center">Số lượng sỉ</th>
                  <th className="px-6 py-4 text-right">Giá bán lẻ</th>
                  <th className="px-6 py-4 text-right">Giá sỉ áp dụng</th>
                  <th className="px-6 py-4 text-right">Thành tiền</th>
                  <th className="px-6 py-4 text-center">Xóa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cart.map((item) => {
                  const unitPrice = getTieredPrice(item);
                  const discountPct = Math.round((1 - (unitPrice / item.price)) * 100);

                  return (
                    <tr key={item.medicineId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-[13px]">{item.name}</div>
                        <div className="text-[10px] text-slate-500 mt-1 font-semibold">ĐVT: {item.unit} | Tồn: {item.stock}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.medicineId, item.quantity - 10)}
                            className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                          >
                            -10
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.medicineId, Number(e.target.value))}
                            className="w-16 text-center border border-slate-200 rounded p-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0057cd]"
                          />
                          <button
                            onClick={() => updateQuantity(item.medicineId, item.quantity + 10)}
                            className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold"
                          >
                            +10
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-500 text-xs">
                        {item.price.toLocaleString()}₫
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-bold text-[#0057cd] text-[13px]">
                          {unitPrice.toLocaleString()}₫
                        </div>
                        {discountPct > 0 && (
                          <span className="inline-block bg-emerald-50 text-emerald-700 text-[9px] font-black rounded px-1.5 py-0.5 mt-1 border border-emerald-200">
                            Giảm {discountPct}% (Giá bậc thang)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-900 text-[13px]">
                        {(unitPrice * item.quantity).toLocaleString()}₫
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => removeItem(item.medicineId)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {cart.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                      <Building className="mx-auto mb-3 text-slate-300" size={32} />
                      Chưa chọn sản phẩm bán sỉ nào. Vui lòng tìm kiếm phía trên!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CỘT PHẢI: Thông tin đại lý & Thanh toán */}
      <div className="w-full xl:w-[380px] bg-white border border-slate-200 rounded-[16px] p-5 shadow-sm shrink-0 flex flex-col gap-6 justify-between overflow-y-auto">
        <div className="space-y-6">
          <div>
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-3">
              Thông tin Đại lý / Đối tác
            </h3>
            <div className="space-y-4.5 mt-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tên đại lý/bệnh viện *</label>
                <input
                  type="text"
                  placeholder="Nhập tên đối tác sỉ..."
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0057cd]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Số điện thoại liên hệ</label>
                <input
                  type="text"
                  placeholder="Nhập SĐT..."
                  value={agentPhone}
                  onChange={(e) => setAgentPhone(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0057cd]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Địa chỉ đại lý</label>
                <input
                  type="text"
                  placeholder="Nhập địa chỉ đại lý..."
                  value={agentAddress}
                  onChange={(e) => setAgentAddress(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0057cd]"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-3">
              Phương thức thanh toán
            </h3>
            <div className="grid grid-cols-3 gap-2.5 mt-4">
              <button
                type="button"
                onClick={() => setPaymentMethod("CASH")}
                className={`py-3.5 px-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center focus:outline-none ${paymentMethod === "CASH"
                  ? "border-[#0057cd] bg-[#f2f3ff] text-[#0057cd] font-black"
                  : "border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-50"
                  }`}
              >
                <Banknote size={16} />
                <span className="text-[10px]">Tiền mặt</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("CARD")}
                className={`py-3.5 px-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center focus:outline-none ${paymentMethod === "CARD"
                  ? "border-[#0057cd] bg-[#f2f3ff] text-[#0057cd] font-black"
                  : "border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-50"
                  }`}
              >
                <CreditCard size={16} />
                <span className="text-[10px]">Thẻ quẹt</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("QR_PAY")}
                className={`py-3.5 px-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center focus:outline-none ${paymentMethod === "QR_PAY"
                  ? "border-[#0057cd] bg-[#f2f3ff] text-[#0057cd] font-black"
                  : "border-slate-200 bg-slate-50/50 text-slate-500 hover:bg-slate-50"
                  }`}
              >
                <QrCode size={16} />
                <span className="text-[10px]">PayOS QR</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tổng tiền & Xuất hóa đơn */}
        <div className="border-t border-slate-100 pt-5 space-y-4">
          <div className="space-y-2.5 text-xs text-slate-500 font-bold">
            <div className="flex justify-between">
              <span>Thành tiền (Đã giảm sỉ):</span>
              <span className="text-slate-800 font-extrabold">{subtotal.toLocaleString()}₫</span>
            </div>
            <div className="flex justify-between text-emerald-600 font-black">
              <span>Đã chiết khấu sỉ:</span>
              <span>-{totalSavings.toLocaleString()}₫</span>
            </div>
            <div className="flex justify-between">
              <span>Thuế GTGT (VAT 8%):</span>
              <span className="text-slate-800 font-extrabold">{vat.toLocaleString()}₫</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2.5 text-sm text-[#0057cd] font-black">
              <span className="text-slate-800 font-black">TỔNG PHẢI THU:</span>
              <span className="text-[16px]">{total.toLocaleString()}₫</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full py-4.5 bg-[#0057cd] hover:bg-[#00419e] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? "ĐANG XỬ LÝ..." : "XUẤT HÓA ĐƠN SỈ"}
          </button>
        </div>
      </div>

      {/* MODAL THANH TOÁN QR PAYOS */}
      {showPayOSModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => {
            setPayosPolling(false);
            setShowPayOSModal(false);
          }} />
          <div className="relative bg-white rounded-3xl shadow-2xl p-6.5 max-w-sm w-full flex flex-col items-center text-center gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0057cd] flex items-center justify-center font-black text-lg">
              QR
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-sm">Quét mã VietQR chuyển khoản (PayOS)</h3>
              <p className="text-xs text-[#0057cd] font-bold mt-1">Đơn hàng sỉ: {total.toLocaleString()}₫</p>
            </div>

            {payosQrCode ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <img src={payosQrCode} alt="PayOS VietQR Code" className="w-56 h-56 object-contain" />
              </div>
            ) : (
              <div className="w-56 h-56 bg-slate-100 flex items-center justify-center text-slate-400 font-semibold animate-pulse rounded-2xl">
                Đang tạo mã QR...
              </div>
            )}

            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
              Vui lòng quét QR bằng ứng dụng ngân hàng của bạn. Hệ thống tự động xác nhận sau khi nhận được tiền.
            </p>

            <div className="flex gap-2.5 w-full mt-2">
              <button
                onClick={() => {
                  setPayosPolling(false);
                  setShowPayOSModal(false);
                }}
                className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 font-bold text-slate-600 rounded-xl text-xs transition-colors"
              >
                Hủy giao dịch
              </button>
              <button
                onClick={checkManualPayment}
                className="flex-1 py-3 bg-[#0057cd] hover:bg-[#00419e] font-black text-white rounded-xl text-xs transition-all flex items-center justify-center gap-1"
              >
                Kiểm tra thanh toán
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HÓA ĐƠN THÀNH CÔNG */}
      {showInvoiceModal && invoiceData && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowInvoiceModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Check size={18} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-[15px]">Thanh Toán Thành Công</h3>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">HÓA ĐƠN BÁN SỈ SỐ: #{invoiceData._id?.substring(18).toUpperCase() || 'N/A'}</p>
                </div>
              </div>
              <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg">×</button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold bg-slate-50 p-4 rounded-2xl border border-slate-150">
                <div>
                  <span className="text-slate-400 block font-bold mb-0.5">KHÁCH HÀNG / ĐẠI LÝ:</span>
                  <span className="text-slate-800 font-black">{invoiceData.patientName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold mb-0.5">SỐ ĐIỆN THOẠI:</span>
                  <span className="text-slate-800 font-black">{invoiceData.patientPhone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold mb-0.5">HÌNH THỨC THANH TOÁN:</span>
                  <span className="text-slate-800 font-black">{invoiceData.paymentMethod}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold mb-0.5">NHÂN VIÊN THỰC HIỆN:</span>
                  <span className="text-slate-800 font-black">{invoiceData.soldBy}</span>
                </div>
              </div>

              <div>
                <h4 className="font-black text-slate-700 mb-3 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={14} className="text-[#0057cd]" /> Chi tiết sản phẩm bán sỉ
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold">
                      <tr>
                        <th className="p-3">Sản phẩm</th>
                        <th className="p-3 text-center">Số lượng</th>
                        <th className="p-3 text-right">Đơn giá sỉ</th>
                        <th className="p-3 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoiceData.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-800">
                            {item.name}
                            {item.batches && item.batches.length > 0 && (
                              <div className="text-[9px] text-[#0057cd] font-bold mt-0.5">
                                Lô xuất: {item.batches.map((b: any) => `${b.batchNo} (${b.quantity}đv)`).join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center font-bold">{item.quantity}</td>
                          <td className="p-3 text-right">{item.price?.toLocaleString()}₫</td>
                          <td className="p-3 text-right font-bold">{(item.price * item.quantity)?.toLocaleString()}₫</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex flex-col items-end gap-1.5 text-xs text-slate-500 font-bold">
                <div className="flex justify-between w-56">
                  <span>Thành tiền:</span>
                  <span className="text-slate-800 font-extrabold">{invoiceData.totalAmount?.toLocaleString()}₫</span>
                </div>
                <div className="flex justify-between w-56 border-t border-slate-100 pt-2 text-[#0057cd] text-sm font-black">
                  <span>TỔNG THU:</span>
                  <span>{invoiceData.totalAmount?.toLocaleString()}₫</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4.5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3.5">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4.5 py-2.5 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-black text-slate-600 transition-colors flex items-center gap-1.5 focus:outline-none"
              >
                <Printer size={14} /> In hóa đơn sỉ
              </button>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="px-5 py-2.5 bg-[#0057cd] hover:bg-[#00419e] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
