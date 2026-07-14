"use client";

import React, { useState, useEffect } from "react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CreditCard, Banknote, QrCode, ClipboardList, Printer, ShoppingBag, FileCheck, CheckCircle2, ChevronRight, XCircle } from "lucide-react";
import { orderService } from "../../services/order.service";
import { cartService } from "../../services/cart.service";

export function CustomerCheckout() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [fullname, setFullname] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const [showPayOSModal, setShowPayOSModal] = useState(false);
  const [payosCheckoutUrl, setPayosCheckoutUrl] = useState("");
  const [payosQrCode, setPayosQrCode] = useState("");
  const [payosOrderCode, setPayosOrderCode] = useState<number | null>(null);
  const [payosPolling, setPayosPolling] = useState(false);

  // Custom premium non-blocking alert modal state
  const [alertModal, setAlertModal] = useState<{ message: string; title?: string; onConfirm?: () => void } | null>(null);

  const showAlert = (message: string, title = "Thông báo", onConfirm?: () => void) => {
    setAlertModal({ message, title, onConfirm });
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/login");
      return;
    }

    // Check if redirecting back from PayOS
    const queryParams = new URLSearchParams(window.location.search);
    const isSuccess = queryParams.get("success") === "true";
    const orderCode = queryParams.get("orderCode");

    if (orderCode) {
      setCheckingPayment(true);
      setOrderId(`PayOS Code: ${orderCode}`);

      // Call endpoint to verify payment status and trigger stock deduction
      orderService.checkOrderStatus(orderCode)
        .then((res) => {
          setCheckingPayment(false);
          const data = res.data;
          if (data && data.status === "PAID") {
            setFullname(data.order.patientName);
            setPhone(data.order.patientPhone);
            setAddress(data.order.shippingAddress);
            setPaymentMethod(data.order.paymentMethod);
            // Populate items for invoice preview
            setCartItems(data.order.items);
            setShowSuccessModal(true);

            // Clear cart
            clearAllCarts();

            // Remove search params from URL
            router.replace("/customer/checkout");
          } else {
            setPaymentError(`Đơn hàng #${orderCode} chưa thanh toán thành công hoặc đã bị hủy.`);
          }
        })
        .catch((err) => {
          setCheckingPayment(false);
          setPaymentError("Lỗi kết nối khi xác thực thanh toán đơn hàng.");
          console.error(err);
        });
    } else {
      try {
        const data = localStorage.getItem("customer_cart");
        if (data) {
          setCartItems(JSON.parse(data));
        }
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (payosPolling && payosOrderCode) {
      interval = setInterval(async () => {
        try {
          const data = await orderService.checkOrderStatus(payosOrderCode);
          if (data.status === "PAID") {
            setPayosPolling(false);
            setShowPayOSModal(false);
            
            setOrderId(`SP-ORD-${payosOrderCode}`);
            if (data.order) {
              setFullname(data.order.patientName);
              setPhone(data.order.patientPhone);
              setAddress(data.order.shippingAddress);
              setPaymentMethod(data.order.paymentMethod);
              setCartItems(data.order.items);
            }
            setShowSuccessModal(true);

            clearAllCarts();
          }
        } catch (err) {
          console.error("Lỗi polling status thanh toán:", err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [payosPolling, payosOrderCode]);

  const checkManualPayment = async () => {
    if (!payosOrderCode) return;
    try {
      const data = await orderService.checkOrderStatus(payosOrderCode);
      if (data.status === "PAID") {
        setPayosPolling(false);
        setShowPayOSModal(false);
        
        setOrderId(`SP-ORD-${payosOrderCode}`);
        if (data.order) {
          setFullname(data.order.patientName);
          setPhone(data.order.patientPhone);
          setAddress(data.order.shippingAddress);
          setPaymentMethod(data.order.paymentMethod);
          setCartItems(data.order.items);
        }
        setShowSuccessModal(true);

        clearAllCarts();
      } else {
        showAlert("Hệ thống chưa ghi nhận được thanh toán. Vui lòng chuyển khoản lại hoặc đợi vài giây.");
      }
    } catch (err) {
      console.error(err);
      showAlert("Lỗi kiểm tra trạng thái thanh toán.");
    }
  };

  const clearAllCarts = () => {
    localStorage.removeItem("customer_cart");
    localStorage.removeItem("guest_cart");
    const token = localStorage.getItem("token");
    if (token) {
      cartService.clearCart()
    }
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const memberDiscount = Math.round(subtotal * 0.05);
  const vat = Math.round((subtotal - memberDiscount) * 0.08);
  const total = subtotal - memberDiscount + vat;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
      if (!fullname || !phone || !address) {
        showAlert("Vui lòng điền đầy đủ các thông tin giao hàng!");
        return;
      }

      setIsSubmitting(true);
      setPaymentError("");

      try {
        const payload = {
          patientName: fullname,
          patientPhone: phone,
          shippingAddress: address,
          paymentMethod: paymentMethod,
          totalAmount: total,
          type: "ONLINE",
          items: cartItems.map(it => ({
            medicineId: it.id || it._id,
            name: it.name,
            quantity: it.quantity,
            price: it.price,
            unit: it.unit
          }))
        };

        const result = await orderService.createOrder(payload);

        setIsSubmitting(false);

        if (paymentMethod === "QR_PAY" && result.checkoutUrl) {
          // Show PayOS Modal instead of redirecting
          setPayosCheckoutUrl(result.checkoutUrl);
          setPayosQrCode(result.qrCode || "");
          setPayosOrderCode(result.orderCode);
          setShowPayOSModal(true);
          setPayosPolling(true);
        } else {
          // Cash or card payment completes instantly
          setOrderId(`SP-ORD-${result.orderCode || Math.floor(100000 + Math.random() * 900000)}`);
          setShowSuccessModal(true);

          // Clear cart
          clearAllCarts();
        }
      } catch (err: any) {
        setIsSubmitting(false);
        const msg = err.response?.data?.message || err.message || "Lỗi hệ thống khi gửi đơn hàng!";
        showAlert(msg);
      }
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

        {checkingPayment && (
          <div className="bg-white border border-slate-200 rounded-[24px] p-16 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 border-4 border-[#0d6efd] border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="font-bold text-slate-700 text-md">Đang kiểm tra giao dịch PayOS...</h3>
            <p className="text-slate-400 text-xs mt-1.5 max-w-xs">
              Hệ thống đang đối chiếu dữ liệu thanh toán từ PayOS, vui lòng giữ nguyên trình duyệt.
            </p>
          </div>
        )}

        {paymentError && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4.5 rounded-2xl font-bold text-xs uppercase flex items-center gap-3">
            <XCircle className="text-red-500 shrink-0" size={18} />
            <span>{paymentError}</span>
            <button onClick={() => setPaymentError("")} className="ml-auto text-red-400 hover:text-red-700 text-[16px]">×</button>
          </div>
        )}

        {!checkingPayment && (cartItems.length > 0 || showSuccessModal) ? (
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
                      className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all relative ${paymentMethod === "CASH"
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
                      className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all relative ${paymentMethod === "CARD"
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
                      className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all relative ${paymentMethod === "QR_PAY"
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
            <Link href="/customer/shop"
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
                <button onClick={() => { setShowSuccessModal(false); router.push("/customer/shop"); }} className="text-slate-400 hover:text-slate-700 cursor-pointer">
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
                  onClick={() => { setShowSuccessModal(false); router.push("/customer/shop"); }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl"
                >
                  Về Cửa Hàng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PAYOS MODAL FOR DIRECT CUSTOMER QR PAY */}
        {showPayOSModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform transition-all duration-300">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="font-black text-slate-900 text-md flex items-center gap-2 uppercase tracking-wide">
                  <QrCode className="text-[#0d6efd]" /> quét mã VietQR thanh toán
                </h3>
                <button onClick={() => { setShowPayOSModal(false); setPayosPolling(false); }} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <XCircle size={22} />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-5 items-center text-center">
                <div className="text-xs font-bold text-slate-500">
                  Hãy quét mã VietQR dưới đây bằng ứng dụng Ngân hàng (Mobile Banking) để thanh toán số tiền <span className="text-sm font-black text-[#0d6efd]">{total.toLocaleString()}₫</span>.
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payosQrCode || payosCheckoutUrl)}`}
                    alt="VietQR PayOS"
                    className="w-56 h-56 rounded-lg object-contain"
                  />
                </div>

                <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 justify-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                  Đang chờ bạn chuyển khoản (Tự động cập nhật...)
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button
                  onClick={checkManualPayment}
                  className="flex-1 py-3 bg-[#0d6efd] hover:bg-[#0a58ca] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow"
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

        {/* Premium Generic Alert Modal */}
        {alertModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-scale-up">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#0d6efd] flex items-center justify-center mb-5 border border-blue-100 shadow-inner animate-pulse">
                <ClipboardList size={28} />
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
