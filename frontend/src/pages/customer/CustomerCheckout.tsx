import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CreditCard, Banknote, QrCode, ClipboardList, Printer, ShoppingBag, FileCheck, CheckCircle2, ChevronRight, XCircle } from "lucide-react";

export function CustomerCheckout() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [fullname, setFullname] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    try {
      const data = localStorage.getItem("customer_cart");
      if (data) {
        setCartItems(JSON.parse(data));
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const memberDiscount = Math.round(subtotal * 0.05);
  const vat = Math.round((subtotal - memberDiscount) * 0.08);
  const total = subtotal - memberDiscount + vat;

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullname || !phone || !address) {
      alert("Vui lòng điền đầy đủ các thông tin giao hàng!");
      return;
    }
    
    setIsSubmitting(true);

    // Simulate database insertion and stock allocation delay
    setTimeout(() => {
      setIsSubmitting(false);
      const generatedId = `SP-ORD-${Math.floor(100000 + Math.random() * 900000)}`;
      setOrderId(generatedId);
      setShowSuccessModal(true);
      
      // Clear cart
      localStorage.removeItem("customer_cart");
      window.dispatchEvent(new Event("cartUpdated"));
    }, 1200);
  };

  return (
    <div className="flex flex-col gap-6 flex-1 relative">
      <div className="flex items-center gap-3 border-b border-slate-150 pb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-[#0d6efd]">
          <ClipboardList size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Xác Nhận Đặt Hàng</h1>
          <p className="text-xs text-slate-500 font-medium">Nhập thông tin giao nhận và hoàn tất quá trình mua sắm.</p>
        </div>
      </div>

      {cartItems.length > 0 || showSuccessModal ? (
        <div className="flex flex-col xl:flex-row gap-8 items-start">
          {/* Left: Form Giao Hàng */}
          <div className="flex-1 w-full bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider mb-5 pb-2 border-b border-slate-100">
              1. Thông tin giao nhận hàng
            </h3>
            
            <form onSubmit={handleSubmitOrder} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase">Tên người nhận *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={fullname}
                    onChange={(e) => setFullname(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#0d6efd] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    placeholder="0905 xxx xxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#0d6efd] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase">Địa chỉ nhận hàng *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Nhập số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#0d6efd] transition-all resize-none"
                />
              </div>

              {/* Payment Methods */}
              <div className="mt-4">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
                  2. Chọn hình thức thanh toán
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH")}
                    className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all relative ${
                      paymentMethod === "CASH"
                        ? "border-[#0d6efd] bg-[#f2f3ff] text-[#0d6efd] font-bold"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <Banknote size={20} />
                    <span className="text-[11px] uppercase tracking-wider font-extrabold">Tiền mặt (COD)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CARD")}
                    className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all relative ${
                      paymentMethod === "CARD"
                        ? "border-[#0d6efd] bg-[#f2f3ff] text-[#0d6efd] font-bold"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <CreditCard size={20} />
                    <span className="text-[11px] uppercase tracking-wider font-extrabold">Thẻ tín dụng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("QR_PAY")}
                    className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all relative ${
                      paymentMethod === "QR_PAY"
                        ? "border-[#0d6efd] bg-[#f2f3ff] text-[#0d6efd] font-bold"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <QrCode size={20} />
                    <span className="text-[11px] uppercase tracking-wider font-extrabold">VNPay / QR Code</span>
                  </button>
                </div>
              </div>

              {/* Form submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-6 bg-[#0d6efd] hover:bg-[#0a58ca] disabled:bg-slate-100 disabled:text-slate-400 text-white font-black text-xs uppercase tracking-wider py-4 rounded-xl shadow-md transition-all active:scale-98"
              >
                {isSubmitting ? "Hệ thống đang xử lý..." : "Xác nhận đặt & thanh toán"}
              </button>
            </form>
          </div>

          {/* Right: Order summary */}
          <div className="w-full xl:w-[380px] shrink-0 lg:sticky lg:top-24 flex flex-col gap-6">
            <div className="bg-white border border-slate-200 rounded-[20px] p-6 shadow-sm flex flex-col gap-4">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-3">Chi tiết đơn hàng</h3>
              
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 pr-1 flex flex-col gap-3">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-start pt-3 first:pt-0">
                    <div className="max-w-[70%]">
                      <span className="font-extrabold text-slate-900 text-xs line-clamp-1">{item.name}</span>
                      <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{item.quantity} {item.unit} x {item.price.toLocaleString()}₫</span>
                    </div>
                    <span className="font-bold text-xs text-slate-800">{(item.price * item.quantity).toLocaleString()}₫</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-150 pt-4 mt-2 flex flex-col gap-2 text-xs font-semibold text-slate-500">
                <div className="flex justify-between items-center">
                  <span>Tạm tính / Subtotal</span>
                  <span className="font-bold text-slate-900">{subtotal.toLocaleString()}₫</span>
                </div>
                <div className="flex justify-between items-center text-[#ba1a1a]">
                  <span>Chiết khấu VIP Silver (5%)</span>
                  <span className="font-bold">-{memberDiscount.toLocaleString()}₫</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Thuế giá trị gia tăng (VAT 8%)</span>
                  <span className="font-bold text-slate-900">{vat.toLocaleString()}₫</span>
                </div>
                <div className="flex justify-between items-end border-t border-slate-100 pt-3.5 mt-1">
                  <span className="text-slate-900 font-black uppercase tracking-wider text-[11px] pb-0.5">Tổng thanh toán</span>
                  <span className="text-xl font-black text-[#0d6efd] tracking-tight">{total.toLocaleString()}₫</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-[24px] p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 border border-slate-100 mb-4">
            <ShoppingBag size={28} />
          </div>
          <h3 className="font-bold text-slate-700 text-md">Đơn hàng trống</h3>
          <p className="text-slate-400 text-xs mt-1.5 max-w-xs">
            Bạn không có thuốc nào để đặt mua. Quay lại shop để chọn thuốc nhé!
          </p>
          <Link
            to="/customer/shop"
            className="mt-5 px-6 py-2.5 bg-[#0d6efd] text-white text-xs font-bold rounded-xl hover:bg-[#0a58ca] transition-all uppercase tracking-wider shadow-sm"
          >
            Vào cửa hàng
          </Link>
        </div>
      )}

      {/* SUCCESS MODAL / INVOICE PREVIEW */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col transform transition-all duration-300">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-900 text-md flex items-center gap-2 uppercase tracking-wide">
                <CheckCircle2 className="text-emerald-500" /> Đặt hàng thành công!
              </h3>
              <button onClick={() => { setShowSuccessModal(false); navigate("/customer/shop"); }} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <XCircle size={22} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[68vh] scrollbar-hide">
              <div className="text-center text-xs font-semibold text-slate-500">
                Mã đơn hàng của bạn là <span className="font-black text-slate-900">{orderId}</span>. Cửa hàng đang đóng gói và sẽ bàn giao cho đơn vị vận chuyển sớm nhất.
              </div>

              {/* Premium Print Invoice mock */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 shadow-inner font-mono text-[11px] text-slate-700 flex flex-col gap-3">
                <div className="text-center border-b border-slate-200 pb-3">
                  <div className="font-bold text-[14px] text-slate-900 uppercase">HỆ THỐNG NHÀ THUỐC WDP</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Đường 3/2, Quận Hải Châu, Đà Nẵng</div>
                  <div className="text-[10px] text-slate-500">SĐT Hỗ trợ: 0236 123 456</div>
                </div>

                <div className="flex flex-col gap-1 border-b border-slate-200 pb-3">
                  <div className="flex justify-between">
                    <span>Mã đơn hàng:</span>
                    <span className="font-bold">{orderId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ngày lập:</span>
                    <span>{new Date().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Người nhận:</span>
                    <span className="font-bold uppercase">{fullname}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SĐT liên hệ:</span>
                    <span>{phone}</span>
                  </div>
                  <div className="flex justify-between flex-wrap gap-x-4">
                    <span>Địa chỉ nhận:</span>
                    <span className="text-right flex-1 truncate">{address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Thanh toán:</span>
                    <span className="font-bold text-[#0d6efd]">{paymentMethod === "CASH" ? "Tiền mặt (COD)" : paymentMethod === "CARD" ? "Thẻ tín dụng" : "QR Code / VNPay"}</span>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="font-bold border-b border-slate-200 pb-1 mb-2 uppercase">Chi tiết đơn thuốc (Định giá FIFO)</div>
                  <div className="space-y-2">
                    {cartItems.map((it) => (
                      <div key={it.id} className="flex justify-between items-center font-bold text-slate-900 text-xs">
                        <span>{it.name} ({it.quantity} {it.unit})</span>
                        <span>{(it.price * it.quantity).toLocaleString()}₫</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3 flex flex-col gap-1.5">
                  <div className="flex justify-between text-slate-500">
                    <span>Tạm tính / Subtotal:</span>
                    <span>{subtotal.toLocaleString()}₫</span>
                  </div>
                  <div className="flex justify-between text-[#ba1a1a]">
                    <span>Ưu đãi thành viên (5%):</span>
                    <span>-{memberDiscount.toLocaleString()}₫</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Thuế VAT (8%):</span>
                    <span>{vat.toLocaleString()}₫</span>
                  </div>
                  <div className="flex justify-between font-black text-slate-900 text-xs border-t border-slate-250 pt-2">
                    <span>TỔNG THÀNH TIỀN:</span>
                    <span className="text-[#0d6efd] text-sm">{total.toLocaleString()}₫</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-[#0d6efd] hover:bg-[#0a58ca] text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow"
              >
                <Printer size={15} /> In hóa đơn
              </button>
              <button
                onClick={() => { setShowSuccessModal(false); navigate("/customer/shop"); }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl"
              >
                Về Cửa Hàng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
