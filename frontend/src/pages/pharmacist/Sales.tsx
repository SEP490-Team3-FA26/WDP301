import { useState, useEffect, useRef } from "react";
import {
  Search, AlertTriangle, ShieldAlert, Sparkles, Printer, XCircle, FileText,
  CheckCircle2, ChevronRight, Stethoscope, Building, UserSquare2, CreditCard,
  Banknote, QrCode, PlusCircle, Save, FileCheck, Info, Check, SearchIcon,
  ArrowLeft, RefreshCw, ShoppingCart, Plus, Minus, Tag, Phone, Mic, Square,
  Eye
} from "lucide-react";
import { medicineService } from "../../services/medicine.service";
import { prescriptionService } from "../../services/prescription.service";
import { orderService } from "../../services/order.service";

export function Sales() {
  const [activeTab, setActiveTab] = useState("KÊ ĐƠN / PRESCRIPTION");
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "error" | "warning" }[]>([]);

  const showToast = (message: string, type: "success" | "error" | "warning" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const tabs = [
    "BÁN LẺ / RETAIL",
    "KÊ ĐƠN / PRESCRIPTION",
    "BÁN SỈ / WHOLESALE",
    "TRÀ HÀNG / RETURNS",
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans relative">
      {/* Sales Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-xs font-bold tracking-wide transition-all uppercase whitespace-nowrap ${activeTab === tab
                ? "bg-white text-[#0057cd] shadow-sm font-black"
                : "text-slate-500 hover:text-slate-800"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        {activeTab === "BÁN LẺ / RETAIL" && <RetailView showToast={showToast} />}
        {activeTab === "KÊ ĐƠN / PRESCRIPTION" && <PrescriptionView showToast={showToast} />}
        {activeTab === "BÁN SỈ / WHOLESALE" && <WholesaleView />}
        {activeTab === "TRÀ HÀNG / RETURNS" && <ReturnsView showToast={showToast} />}
      </div>

      {/* Custom Toast Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4.5 py-3.5 rounded-2xl shadow-xl border text-xs font-bold tracking-wide uppercase transition-all duration-300 animate-slide-in-right ${toast.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-200 shadow-rose-100/50"
                : toast.type === "warning"
                  ? "bg-amber-50 text-amber-800 border-amber-200 shadow-amber-100/50"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-100/50"
              }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === "error" ? (
                <XCircle className="text-rose-500 shrink-0" size={16} />
              ) : toast.type === "warning" ? (
                <AlertTriangle className="text-amber-500 shrink-0" size={16} />
              ) : (
                <CheckCircle2 className="text-emerald-500 shrink-0" size={16} />
              )}
              <span className="normal-case">{toast.message}</span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-slate-400 hover:text-slate-700 font-bold ml-1.5 focus:outline-none pointer-events-auto cursor-pointer"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}

const hospitalPresets = [
  { name: "Bệnh viện Bạch Mai", code: "BM-1029" },
  { name: "Bệnh viện Chợ Rẫy", code: "CR-2045" },
  { name: "Bệnh viện Trung ương Huế", code: "TWH-3012" },
  { name: "Bệnh viện Đà Nẵng", code: "DNG-4089" },
  { name: "Bệnh viện Hữu nghị Việt Đức", code: "VD-5076" },
  { name: "Bệnh viện Gia Định", code: "GĐ-6011" },
  { name: "Khác (Nhập thủ công)", code: "CUSTOM" }
];

const specialtyPresets = [
  "Nội khoa",
  "Ngoại khoa",
  "Nhi khoa",
  "Tim mạch",
  "Tai Mũi Họng",
  "Răng Hàm Mặt",
  "Da liễu",
  "Mắt",
  "Thần kinh",
  "Sản phụ khoa",
  "Khác"
];

// ==========================================
// 💊 PRESCRIPTION VIEW (BÁN THEO ĐƠN)
// ==========================================
function PrescriptionView({ showToast }: { showToast: (message: string, type?: "success" | "error" | "warning") => void }) {
  const [prescriptionMode, setPrescriptionMode] = useState<"QR" | "MANUAL">("QR");
  const [prescriptionCode, setPrescriptionCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPatientInfoOpen, setIsPatientInfoOpen] = useState(false);
  // Patient & Doctor state (For manual entry & e-Rx)
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("Nam");
  const [patientPhone, setPatientPhone] = useState("");

  const [doctorName, setDoctorName] = useState("");
  const [doctorSpecialty, setDoctorSpecialty] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [hospitalCode, setHospitalCode] = useState("");

  // Cart state for prescription items
  const [prescriptionItems, setPrescriptionItems] = useState<any[]>([]);

  // Search medicines state (direct inline search)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // DB Prescriptions for selection
  const [dbPrescriptions, setDbPrescriptions] = useState<any[]>([]);
  const [successMsg, setSuccessMsg] = useState("");

  // Checkout States
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [remarks, setRemarks] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  // Scan simulation states
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState("");

  // Helper variables for presets
  const matchedPreset = hospitalPresets.find(h => h.name === hospitalName);
  const dropdownValue = matchedPreset ? hospitalName : (hospitalName ? "CUSTOM" : "");

  const handleHospitalPresetChange = (val: string) => {
    if (val === "CUSTOM") {
      setHospitalName("");
      setHospitalCode("");
    } else {
      const selected = hospitalPresets.find(h => h.name === val);
      if (selected) {
        setHospitalName(selected.name);
        setHospitalCode(selected.code);
      }
    }
  };

  const matchedSpecialty = specialtyPresets.find(s => s === doctorSpecialty);
  const specialtyDropdownValue = matchedSpecialty ? doctorSpecialty : (doctorSpecialty ? "CUSTOM" : "");

  const handleSpecialtyChange = (val: string) => {
    if (val === "CUSTOM") {
      setDoctorSpecialty("");
    } else {
      setDoctorSpecialty(val);
    }
  };

  // Load prescriptions from DB
  const fetchDbPrescriptions = async () => {
    try {
      const data = await prescriptionService.getPrescriptions();
      setDbPrescriptions(data || []);
    } catch (err) {
      console.error("Lỗi lấy danh sách đơn thuốc:", err);
    }
  };

  useEffect(() => {
    fetchDbPrescriptions();
  }, []);

  // Search query debounce for direct medicine search
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
      const data = await medicineService.getMedicines({ limit: 10, search: query, _t: Date.now() });
      setSearchResults(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Tự động load đơn điện tử đầu tiên nếu có mã trên dòng nhập liệu
  useEffect(() => {
    if (prescriptionMode === "QR") {
      if (prescriptionCode) {
        fetchPrescription(prescriptionCode);
      }
    } else {
      // Clear forms for manual prescription
      setPatientName("");
      setPatientAge("");
      setPatientGender("Nam");
      setPatientPhone("");
      setDoctorName("");
      setDoctorSpecialty("");
      setHospitalName("");
      setHospitalCode("");
      setPrescriptionItems([]);
      setPrescriptionCode("");
    }
  }, [prescriptionMode]);

  const fetchPrescription = async (code: string) => {
    if (!code) return;
    setLoading(true);
    setError("");
    try {
      const data = await prescriptionService.getPrescriptionByCode(code);
      // Populate fields from fetched prescription
      setPatientName(data.patientName);
      setPatientAge(data.patientAge.toString());
      setPatientGender(data.patientGender);
      setPatientPhone(data.patientPhone);
      setDoctorName(data.doctorName);
      setDoctorSpecialty(data.doctorSpecialty);
      setHospitalName(data.hospitalName);
      setHospitalCode(data.hospitalCode);
      setPrescriptionItems(data.items);
      setPrescriptionCode(code);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Lỗi kết nối máy chủ");
      setPrescriptionItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleScanSimulation = (code: string) => {
    setIsScanning(true);
    setScannedCode(code);
    setTimeout(() => {
      setIsScanning(false);
      setShowQRModal(false);
      setPrescriptionMode("QR");
      fetchPrescription(code);
    }, 1500);
  };

  const handleAddMedicineDirect = (med: any) => {
    const medId = med.id || med._id;
    const existing = prescriptionItems.find(it => it.medicineId === medId);
    if (existing) {
      if (existing.quantity >= med.stock) {
        showToast("Đã vượt quá số lượng tồn kho khả dụng của thuốc!", "warning");
        return;
      }
      setPrescriptionItems(prescriptionItems.map(it =>
        it.medicineId === medId
          ? { ...it, quantity: it.quantity + 1 }
          : it
      ));
    } else {
      if (med.stock <= 0) {
        showToast("Thuốc này đã hết hàng khả dụng trong kho!", "error");
        return;
      }
      setPrescriptionItems([...prescriptionItems, {
        medicineId: medId,
        name: med.name,
        active_ingredient: med.active_ingredient,
        price: med.price,
        quantity: 1,
        dosage: "Ngày uống 2 lần, mỗi lần 1 viên sau ăn.",
        unit: med.unit,
        stock: med.stock,
        expiry: med.expiry,
        status: "In Stock"
      }]);
    }

    // Reset search
    setSearchQuery("");
    setSearchResults([]);
  };

  const [showPayOSModal, setShowPayOSModal] = useState(false);
  const [payosCheckoutUrl, setPayosCheckoutUrl] = useState("");
  const [payosQrCode, setPayosQrCode] = useState("");
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

      // Clear forms
      setPrescriptionItems([]);
      setPatientName("");
      setPatientAge("");
      setPatientPhone("");
      setDoctorName("");
      setDoctorSpecialty("");
      setHospitalName("");
      setHospitalCode("");
      setPrescriptionCode("");
      fetchDbPrescriptions();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Lỗi thanh toán");
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

  const handleCheckout = async () => {
    if (prescriptionItems.length === 0) {
      setError("Vui lòng thêm ít nhất một loại thuốc vào đơn kê.");
      return;
    }
    if (!patientName || !doctorName) {
      setError("Vui lòng điền tên bệnh nhân và tên bác sĩ kê đơn.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const code = prescriptionMode === "QR" && prescriptionCode ? prescriptionCode : `PRX-HAND-${Math.floor(10000 + Math.random() * 90000)}`;
      const payload = {
        prescriptionCode: code,
        type: "PRESCRIPTION",
        isManualPrescription: prescriptionMode === "MANUAL" || !prescriptionCode,
        items: prescriptionItems.map((it: any) => ({
          medicineId: it.medicineId,
          quantity: it.quantity,
          dosage: it.dosage || "Ngày uống 2 lần, mỗi lần 1 viên sau ăn."
        })),
        paymentMethod,
        patientName,
        patientPhone,
        patientAge: patientAge ? Number(patientAge) : 30,
        patientGender,
        doctorName,
        doctorSpecialty,
        hospitalName,
        hospitalCode,
        soldBy: "Dược sĩ Trần Thị A"
      };

      if (paymentMethod === "QR_PAY") {
        const payosResult = await orderService.createPayOSLink({
          patientName,
          patientPhone: patientPhone || "0900000000",
          totalAmount: total,
          items: prescriptionItems.map(it => ({
            medicineId: it.medicineId,
            name: it.name,
            quantity: it.quantity,
            price: it.price,
            unit: it.unit
          }))
        });

        setPayosCheckoutUrl(payosResult.checkoutUrl);
        setPayosQrCode(payosResult.qrCode || "");
        setPayosOrderCode(payosResult.orderCode);
        setPendingSalePayload(payload);
        setShowPayOSModal(true);
        setPayosPolling(true);
      } else {
        await finalizeSalesOrder(payload);
      }
    } catch (err: any) {
      setError(err.message || "Lỗi thanh toán");
    } finally {
      setLoading(false);
    }
  };

  // Tính toán tiền đơn thuốc
  const subtotal = prescriptionItems.reduce((sum: number, it: any) => sum + (it.price * it.quantity), 0);
  const vipDiscount = Math.round(subtotal * 0.05); // 5% discount
  const vat = Math.round((subtotal - vipDiscount) * 0.08); // 8% VAT
  const total = subtotal - vipDiscount + vat;

  // Kiểm tra tương tác thuốc nguy hiểm (Clopidogrel + Omeprazole)
  const hasClopidogrel = prescriptionItems.some((it: any) => it.active_ingredient.toLowerCase().includes("clopidogrel") || it.name.toLowerCase().includes("plavix") || it.name.toLowerCase().includes("platarex"));
  const hasOmeprazole = prescriptionItems.some((it: any) => it.active_ingredient.toLowerCase().includes("omeprazole") || it.name.toLowerCase().includes("losec") || it.name.toLowerCase().includes("ecosip"));
  const drugInteractionWarning = hasClopidogrel && hasOmeprazole;

  // Kiểm tra có sản phẩm nào cận HSD hoặc hết hàng
  const hasNearExpiry = prescriptionItems.some((it: any) => {
    if (!it.expiry) return false;
    const diffTime = new Date(it.expiry).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 180;
  });

  return (
    <div className="h-full flex flex-col xl:flex-row gap-6 overflow-hidden">
      {/* Cột trái: Chi tiết đơn & Giỏ hàng */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-6 pb-6">

        {/* Thanh tìm kiếm đơn thuốc & Quét QR */}
        <div className="bg-white rounded-[16px] border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row items-center gap-4 shrink-0">
          <div className="flex-1 relative w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <FileText size={18} />
            </div>
            <input
              type="text"
              placeholder="Nhập mã đơn thuốc điện tử (Ví dụ: RX-99281-HAN)..."
              value={prescriptionCode}
              onChange={(e) => setPrescriptionCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchPrescription(prescriptionCode)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-[12px] text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
            />
          </div>
          <div className="flex gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={() => fetchPrescription(prescriptionCode)}
              disabled={loading}
              className="flex-1 md:flex-none px-6 py-3 bg-[#0057cd] hover:bg-[#00419e] text-white font-bold rounded-[12px] shadow-sm transition-colors"
            >
              {loading ? "Đang tải..." : "Tra cứu"}
            </button>
            <button
              onClick={() => setShowQRModal(true)}
              className="flex-1 md:flex-none px-5 py-3 border-2 border-[#b1c5ff] text-[#0057cd] font-bold rounded-[12px] hover:bg-[#f2f3ff] transition-all flex items-center justify-center gap-2"
            >
              <QrCode size={18} /> Quét mã QR
            </button>
          </div>
        </div>

        {/* Thông tin Đơn thuốc & Người kê toa (Collapsible) */}
        <div className="bg-white rounded-[16px] border border-slate-200 p-5 shadow-sm flex flex-col gap-4 shrink-0">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <Stethoscope size={18} className="text-[#0057cd]" /> Thông tin bệnh nhân & bác sĩ
            </h3>
            <button
              type="button"
              onClick={() => setIsPatientInfoOpen(!isPatientInfoOpen)}
              className="text-xs font-bold text-[#0057cd] bg-[#f2f3ff] px-3 py-1.5 rounded-lg border border-[#b1c5ff] hover:bg-[#e0e7ff] transition-colors"
            >
              {isPatientInfoOpen ? "Thu gọn" : "Chỉnh sửa thông tin"}
            </button>
          </div>

          {!isPatientInfoOpen ? (
            /* Summary view when collapsed */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-semibold text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100/50">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-400 font-bold">Bệnh nhân:</span>
                <span className="font-extrabold text-slate-900">{patientName || "Chưa nhập"}</span>
                {patientAge && <span className="text-slate-400">({patientAge} tuổi, {patientGender})</span>}
                {patientPhone && <span className="text-slate-400 font-bold">| SĐT: {patientPhone}</span>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                <span className="text-slate-400 font-bold">Bác sĩ:</span>
                <span className="font-extrabold text-slate-900">{doctorName || "Chưa nhập"}</span>
                {hospitalName && <span className="text-slate-400">({hospitalName})</span>}
              </div>
            </div>
          ) : (
            /* Detailed form view when expanded */
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tên bệnh nhân *</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:border-[#0057cd]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tuổi</label>
                  <input
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder="30"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:border-[#0057cd]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Giới tính</label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:border-[#0057cd]"
                  >
                    <option>Nam</option>
                    <option>Nữ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="09xx xxx xxx"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:border-[#0057cd]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Bác sĩ kê đơn *</label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="BS. Lê Văn B"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:border-[#0057cd]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Chuyên khoa</label>
                  <select
                    value={specialtyDropdownValue}
                    onChange={(e) => handleSpecialtyChange(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:border-[#0057cd]"
                  >
                    <option value="" disabled>-- Chọn chuyên khoa --</option>
                    {specialtyPresets.map(spec => (
                      <option key={spec} value={spec === "Khác" ? "CUSTOM" : spec}>{spec}</option>
                    ))}
                  </select>
                  {specialtyDropdownValue === "CUSTOM" && (
                    <input
                      type="text"
                      value={doctorSpecialty}
                      onChange={(e) => setDoctorSpecialty(e.target.value)}
                      placeholder="Nhập chuyên khoa khác..."
                      className="w-full mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#0057cd]"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Bệnh viện / Phòng khám</label>
                  <select
                    value={dropdownValue}
                    onChange={(e) => handleHospitalPresetChange(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:border-[#0057cd]"
                  >
                    <option value="" disabled>-- Chọn bệnh viện --</option>
                    {hospitalPresets.map(h => (
                      <option key={h.name} value={h.code === "CUSTOM" ? "CUSTOM" : h.name}>{h.name}</option>
                    ))}
                  </select>
                  {dropdownValue === "CUSTOM" && (
                    <input
                      type="text"
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      placeholder="Nhập tên bệnh viện khác..."
                      className="w-full mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#0057cd]"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Mã cơ sở y tế</label>
                  <input
                    type="text"
                    value={hospitalCode}
                    onChange={(e) => setHospitalCode(e.target.value)}
                    disabled={dropdownValue !== "CUSTOM" && dropdownValue !== ""}
                    placeholder="BM-1029"
                    className={`w-full p-2.5 rounded-lg text-sm font-semibold focus:outline-none focus:border-[#0057cd] ${dropdownValue !== "CUSTOM" && dropdownValue !== ""
                        ? "bg-slate-100 text-slate-500 border-slate-250 cursor-not-allowed"
                        : "bg-slate-50 border border-slate-200 focus:bg-white"
                      }`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl font-medium flex items-center gap-3">
            <XCircle className="text-red-500 shrink-0" size={20} />
            {error}
          </div>
        )}

        {/* Tìm kiếm và thêm thuốc trực tiếp (Inline Search Bar) */}
        <div className="bg-white rounded-[16px] border border-slate-200 p-5 shadow-sm flex flex-col gap-3 shrink-0">
          <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">
            Tìm thuốc kê đơn từ kho và thêm trực tiếp
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <SearchIcon size={18} />
            </div>
            <input
              type="text"
              placeholder="Nhập tên thuốc, hoạt chất hoặc mã thuốc để tìm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-[12px] text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
            />

            {/* Dropdown kết quả tìm kiếm */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl border border-slate-200 shadow-xl max-h-60 overflow-y-auto z-40 divide-y divide-slate-100">
                {searchResults.map((med) => (
                  <button
                    key={med.id || med._id}
                    onClick={() => handleAddMedicineDirect(med)}
                    className="w-full p-4 text-left hover:bg-slate-50 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{med.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{med.category} | Hoạt chất: {med.active_ingredient || "N/A"}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-[#0057cd] text-sm">{med.price.toLocaleString()}₫</div>
                      <div className="text-xs text-slate-500 mt-0.5 font-semibold">Tồn kho: {med.stock} {med.unit}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bảng danh sách thuốc kê đơn */}
        {prescriptionItems.length > 0 ? (
          <>
            {/* Cảnh báo tương tác thuốc nguy hiểm */}
            {drugInteractionWarning && (
              <div className="bg-[#ffdad6] border border-[#93000a] rounded-[16px] p-5 shadow-sm flex items-start gap-4 animate-bounce">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm text-[#ba1a1a]">
                  <ShieldAlert size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[#93000a] font-bold text-[15px] mb-1 uppercase tracking-wide">
                    CẢNH BÁO TƯƠNG TÁC THUỐC NGUY HIỂM / DANGEROUS DRUG INTERACTION
                  </h3>
                  <p className="text-[#ba1a1a] text-[13px] leading-relaxed">
                    Đơn thuốc chứa hoạt chất <span className="font-bold underline">Clopidogrel</span> và <span className="font-bold underline">Omeprazole</span>. Việc kết hợp này làm giảm hoạt tính chuyển hóa của Clopidogrel, dẫn tới giảm hiệu quả chống đông và tăng nguy cơ huyết khối. Vui lòng xác nhận lại với bác sĩ điều trị trước khi cấp phát.
                  </p>
                </div>
              </div>
            )}

            {/* Danh mục thuốc kê đơn */}
            <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[480px]">
              <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100">
                <h2 className="text-[16px] font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <ShoppingCart size={18} className="text-[#0057cd]" /> Danh mục thuốc kê đơn
                </h2>
                {hasNearExpiry && (
                  <span className="px-3 py-1 bg-amber-50 text-[#a63b00] border border-amber-200 rounded-lg text-[11px] font-bold uppercase tracking-wider animate-pulse flex items-center gap-1.5">
                    <AlertTriangle size={12} /> Cảnh báo lô cận hạn sử dụng
                  </span>
                )}
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Tên thuốc / Item</th>
                      <th className="px-6 py-4">Hoạt chất / Ingredient</th>
                      <th className="px-6 py-4">Liều dùng / Dosage (Sửa trực tiếp)</th>
                      <th className="px-4 py-4 text-center">Yêu cầu</th>
                      <th className="px-4 py-4 text-center">Tồn kho</th>
                      <th className="px-6 py-4 text-right">Đơn giá</th>
                      <th className="px-6 py-4 text-right">Thành tiền</th>
                      <th className="px-4 py-4 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {prescriptionItems.map((it: any) => {
                      const isOutOfStock = it.stock < it.quantity;

                      // Kiểm tra xem HSD của lô xuất kho sắp tới có cận hạn hay không (< 180 ngày)
                      const diffTime = new Date(it.expiry).getTime() - new Date().getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      const isNearExp = diffDays > 0 && diffDays <= 180;

                      return (
                        <tr
                          key={it.medicineId}
                          className={`hover:bg-slate-50/50 transition-colors ${isOutOfStock ? "bg-red-50/30" : isNearExp ? "bg-amber-50/30" : ""
                            }`}
                        >
                          <td className="px-6 py-4 font-bold text-slate-900 text-[14px]">
                            {it.name}
                            <div className="text-[10px] text-[#a63b00] font-bold mt-1 uppercase tracking-wider flex items-center gap-1">
                              Đơn vị: {it.unit}
                              {isNearExp && (
                                <span className="ml-2 text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded text-[9px]">
                                  Lô cận hạn (Còn {diffDays} ngày)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-[13px]">{it.active_ingredient}</td>
                          <td className="px-6 py-4 min-w-[260px]">
                            <div className="flex flex-col gap-1.5">
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                                  <Sparkles size={13} className="text-[#0057cd]" />
                                </span>
                                <input
                                  type="text"
                                  value={it.dosage}
                                  onChange={(e) => {
                                    setPrescriptionItems(prescriptionItems.map(p =>
                                      p.medicineId === it.medicineId
                                        ? { ...p, dosage: e.target.value }
                                        : p
                                    ));
                                  }}
                                  placeholder="Ví dụ: Ngày uống 2 lần..."
                                  className="w-full pl-7 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0057cd] focus:border-[#0057cd] transition-all"
                                />
                              </div>
                              {/* Quick select presets */}
                              <div className="flex flex-wrap gap-1">
                                {[
                                  "Sáng 1 - Tối 1 (Sau ăn)",
                                  "Sáng 1 - Trưa 1 - Tối 1",
                                  "Uống trước ăn 30p",
                                  "Uống khi đau"
                                ].map((preset) => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => {
                                      setPrescriptionItems(prescriptionItems.map(p =>
                                        p.medicineId === it.medicineId
                                          ? { ...p, dosage: preset }
                                          : p
                                      ));
                                    }}
                                    className="px-1.5 py-0.5 bg-[#f1f5f9] hover:bg-[#e2e8f0] text-slate-600 rounded text-[9px] font-bold transition-colors"
                                  >
                                    {preset}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  if (it.quantity > 1) {
                                    setPrescriptionItems(prescriptionItems.map(p => p.medicineId === it.medicineId ? { ...p, quantity: p.quantity - 1 } : p));
                                  }
                                }}
                                className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="font-bold text-slate-900 text-[14px] w-6 text-center">{it.quantity}</span>
                              <button
                                onClick={() => {
                                  if (it.quantity < it.stock) {
                                    setPrescriptionItems(prescriptionItems.map(p => p.medicineId === it.medicineId ? { ...p, quantity: p.quantity + 1 } : p));
                                  } else {
                                    showToast("Vượt quá tồn kho khả dụng!", "warning");
                                  }
                                }}
                                className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </td>
                          <td className={`px-4 py-4 text-center font-bold text-[14px] ${isOutOfStock ? "text-red-600 bg-red-50" : "text-emerald-700"}`}>
                            {it.stock}
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-slate-600">{it.price.toLocaleString()}₫</td>
                          <td className="px-6 py-4 text-right font-bold text-slate-900">{(it.price * it.quantity).toLocaleString()}₫</td>
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={() => setPrescriptionItems(prescriptionItems.filter(p => p.medicineId !== it.medicineId))}
                              className="text-red-500 hover:text-red-800"
                            >
                              <XCircle size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-[24px] border-2 border-dashed border-slate-200 flex-1 min-h-[480px] flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#0057cd] mb-4 border border-[#b1c5ff]">
              <FileText size={32} />
            </div>
            <h3 className="text-[18px] font-bold text-slate-800">Đơn thuốc chưa có thuốc kê</h3>
            <p className="text-slate-500 text-sm max-w-sm mt-2">
              Vui lòng gõ tìm kiếm thuốc ở thanh tìm kiếm phía trên để thêm trực tiếp vào danh sách đơn thuốc kê.
            </p>
          </div>
        )}
      </div>

      {/* Cột phải: Thanh toán & Tổng tiền */}
      <div className="w-full xl:w-[400px] flex flex-col gap-6 shrink-0 pb-6 overflow-y-auto pl-1">

        {/* Hóa đơn tóm tắt */}
        <div className="bg-white rounded-[16px] border border-slate-200 p-6 shadow-sm">
          <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-4 border-b border-slate-100 pb-3">Chi tiết thanh toán</h3>
          <div className="space-y-4 text-[14px]">
            <div className="flex justify-between items-center text-slate-600 font-medium">
              <span>Tạm tính / Subtotal</span>
              <span className="font-bold text-slate-900">{subtotal.toLocaleString()}₫</span>
            </div>
            <div className="flex justify-between items-center font-medium">
              <span className="text-slate-600">Giảm giá VIP (5%)</span>
              <span className="font-bold text-[#ba1a1a]">-{vipDiscount.toLocaleString()}₫</span>
            </div>
            <div className="flex justify-between items-center text-slate-600 font-medium">
              <span>Thuế VAT (8%)</span>
              <span className="font-bold text-slate-900">{vat.toLocaleString()}₫</span>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-end justify-between">
              <div className="text-[12px] font-black text-slate-900 uppercase tracking-widest leading-tight">Tổng tiền thanh toán</div>
              <div className="text-[28px] font-black text-[#0057cd] tracking-tighter">{total.toLocaleString()}₫</div>
            </div>
          </div>
        </div>

        {/* Phương thức thanh toán */}
        <div className="bg-white rounded-[16px] border border-slate-200 p-6 shadow-sm">
          <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-4">Phương thức thanh toán</h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setPaymentMethod("CASH")}
              className={`flex flex-col items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all relative ${paymentMethod === "CASH"
                ? "border-[#0057cd] bg-[#f2f3ff] text-[#0057cd]"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
            >
              {paymentMethod === "CASH" && <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#0057cd] rounded-full"></div>}
              <Banknote size={20} />
              <span className="text-[12px] font-bold">Tiền mặt</span>
            </button>
            <button
              onClick={() => setPaymentMethod("CARD")}
              className={`flex flex-col items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all relative ${paymentMethod === "CARD"
                ? "border-[#0057cd] bg-[#f2f3ff] text-[#0057cd]"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
            >
              {paymentMethod === "CARD" && <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#0057cd] rounded-full"></div>}
              <CreditCard size={20} />
              <span className="text-[12px] font-bold">Thẻ quẹt</span>
            </button>
            <button
              onClick={() => setPaymentMethod("QR_PAY")}
              className={`flex flex-col items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all relative ${paymentMethod === "QR_PAY"
                ? "border-[#0057cd] bg-[#f2f3ff] text-[#0057cd]"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
            >
              {paymentMethod === "QR_PAY" && <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#0057cd] rounded-full"></div>}
              <QrCode size={20} />
              <span className="text-[12px] font-bold">QR Pay</span>
            </button>
          </div>

          <div className="mt-4">
            <label className="block text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wide">Ghi chú cấp phát</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Ghi chú liều dùng hoặc dặn dò đặc biệt cho bệnh nhân..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#0057cd] outline-none resize-none font-medium placeholder:font-normal"
            />
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex flex-col gap-3 mt-auto">
          <button
            onClick={handleCheckout}
            disabled={prescriptionItems.length === 0 || loading}
            className="w-full bg-[#0057cd] hover:bg-[#00419e] disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-[16px] py-4.5 shadow-sm transition-all flex flex-col items-center justify-center gap-1 group relative overflow-hidden"
          >
            <div className="flex items-center gap-2.5 font-black text-[16px] uppercase tracking-wide">
              <Printer size={20} />
              Hoàn tất & In đơn (F10)
            </div>
            <div className="text-[10px] opacity-75 font-semibold">Tự động xuất kho theo FIFO</div>
          </button>
          <button
            onClick={() => { setPrescriptionItems([]); setPatientName(""); setDoctorName(""); setPrescriptionCode(""); }}
            className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-[16px] py-3.5 shadow-sm transition-colors flex items-center justify-center gap-2 font-bold text-[14px]"
          >
            <XCircle size={18} /> Hủy bỏ đơn đang chọn
          </button>
        </div>
      </div>
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
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payosQrCode || payosCheckoutUrl)}`}
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
       * 🔎 MODAL QUÉT QR ĐIỆN TỬ GIẢ LẬP
       * ======================================= */}
      {showQRModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col transform transition-all duration-300">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                <QrCode className="text-[#0057cd]" /> Máy quét Đơn thuốc Điện tử
              </h3>
              <button onClick={() => setShowQRModal(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle size={22} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6 items-center">
              {isScanning ? (
                /* Giao diện quét camera giả lập */
                <div className="w-64 h-64 border-4 border-[#0057cd] rounded-3xl relative overflow-hidden bg-black flex items-center justify-center shadow-lg">
                  <div className="w-56 h-56 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-700 text-xs gap-2 relative">
                    <QrCode size={120} className="text-slate-800 opacity-60 animate-pulse" />
                    <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">Đang nhận diện: {scannedCode}</span>
                  </div>
                  {/* Laser scan line effect */}
                  <div className="absolute left-0 right-0 h-1 bg-red-500 shadow-[0_0_15px_#ef4444] animate-[bounce_1.5s_infinite]"></div>
                  <div className="absolute inset-0 bg-red-500/10 mix-blend-overlay"></div>
                </div>
              ) : (
                /* Giao diện hướng dẫn & Đơn thuốc mẫu */
                <div className="w-full flex flex-col gap-4">
                  <div className="text-center text-slate-600 text-sm">
                    Hướng camera điện thoại hoặc mã QR của đơn thuốc điện tử vào khung hình, hoặc chọn một **Đơn thuốc điện tử mẫu** để thử nghiệm nhanh:
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => handleScanSimulation("RX-99281-HAN")}
                      className="w-full p-4 rounded-xl border border-blue-200 hover:bg-blue-50/50 hover:border-[#0057cd] transition-all text-left flex items-start gap-3.5 group"
                    >
                      <div className="p-2 bg-[#f2f3ff] text-[#0057cd] rounded-lg border border-blue-50 shrink-0 group-hover:bg-[#0057cd] group-hover:text-white transition-colors">
                        <QrCode size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[15px] text-slate-900 group-hover:text-[#0057cd] transition-colors flex items-center gap-2">
                          Đơn 1: RX-99281-HAN
                          <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-bold">Cận HSD & Tương tác</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Bệnh nhân: Nguyễn Văn Nam | BS. Lê Quang Vinh (Tim mạch)
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleScanSimulation("RX-112233-DNA")}
                      className="w-full p-4 rounded-xl border border-slate-200 hover:bg-blue-50/50 hover:border-[#0057cd] transition-all text-left flex items-start gap-3.5 group"
                    >
                      <div className="p-2 bg-slate-100 text-slate-600 rounded-lg shrink-0 group-hover:bg-[#0057cd] group-hover:text-white transition-colors">
                        <QrCode size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[15px] text-slate-900 group-hover:text-[#0057cd] transition-colors flex items-center gap-2">
                          Đơn 2: RX-112233-DNA
                          <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">Đơn hợp lệ thường</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Bệnh nhân: Trần Văn B | BS. Nguyễn Thị Lan
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleScanSimulation("RX-445566-HCM")}
                      className="w-full p-4 rounded-xl border border-slate-200 hover:bg-blue-50/50 hover:border-[#0057cd] transition-all text-left flex items-start gap-3.5 group"
                    >
                      <div className="p-2 bg-slate-100 text-slate-600 rounded-lg shrink-0 group-hover:bg-[#0057cd] group-hover:text-white transition-colors">
                        <QrCode size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[15px] text-slate-900 group-hover:text-[#0057cd] transition-colors flex items-center gap-2">
                          Đơn 3: RX-445566-HCM
                          <span className="text-[10px] text-red-800 bg-red-100 px-1.5 py-0.5 rounded font-bold">Đã được bán trước đó</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Bệnh nhân: Lê Thị C | BS. Phạm Minh Hoàng (Lão khoa)
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =======================================
       * 📄 INVOICE SUCCESS MODAL (HÓA ĐƠN IN FIFO)
       * ======================================= */}
      {showInvoiceModal && invoiceData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col transform transition-all duration-300">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500" /> Thanh toán thành công!
              </h3>
              <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle size={22} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[75vh] scrollbar-hide">
              {/* Cảnh báo lô cận hạn nếu backend trả về */}
              {invoiceData.warnings && invoiceData.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">
                  <div className="font-bold text-sm flex items-center gap-1.5 uppercase mb-1">
                    <AlertTriangle size={16} /> Lưu ý hạn sử dụng khi bàn giao thuốc:
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
                  {invoiceData.data.prescriptionCode && (
                    <div className="flex justify-between">
                      <span>Mã đơn gốc:</span>
                      <span className="font-bold">{invoiceData.data.prescriptionCode}</span>
                    </div>
                  )}
                  <div className="flex justify-between flex-wrap gap-x-4">
                    <span>Khách hàng:</span>
                    <span>{invoiceData.data.patientName || "Khách lẻ"}</span>
                  </div>
                  {doctorName && (
                    <div className="flex justify-between flex-wrap gap-x-4">
                      <span>Bác sĩ kê đơn:</span>
                      <span>{doctorName}</span>
                    </div>
                  )}
                  {hospitalName && (
                    <div className="flex justify-between flex-wrap gap-x-4">
                      <span>Nơi kê đơn:</span>
                      <span>{hospitalName}</span>
                    </div>
                  )}
                </div>

                {/* Danh sách thuốc thực xuất & lô hàng allocated */}
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
    </div>
  );
}

// ==========================================
// 💊 RETAIL VIEW (BÁN LẺ)
// ==========================================
function RetailView({ showToast }: { showToast: (message: string, type?: "success" | "error" | "warning") => void }) {
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
                <Sparkles className="text-purple-600 animate-pulse animate-duration-1000" /> Trợ Lý Tư Vấn Triệu Chứng AI
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

// ==========================================
// 💊 WHOLESALE VIEW & RETURNS VIEW (MOCK)
// ==========================================
function WholesaleView() {
  return (
    <div className="h-full flex flex-col xl:flex-row gap-6">
      <div className="flex-1 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center">
        <Building className="text-slate-300 mb-4" size={48} />
        <h3 className="text-lg font-bold text-slate-800">Chức năng Bán sỉ thuốc</h3>
        <p className="text-slate-500 text-sm max-w-sm mt-2">
          Giao diện dành riêng cho khách hàng đại lý / nhóm bệnh viện. Áp dụng bảng giá chiết khấu theo cấp độ.
        </p>
      </div>
    </div>
  );
}

function ReturnsView({ showToast }: { showToast: (message: string, type?: "success" | "error" | "warning") => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal for editing/exchanging the selected order
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Modal for viewing the original invoice detailed view (read-only)
  const [viewInvoice, setViewInvoice] = useState<any>(null);

  // Return quantities & reasons
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [returnReasons, setReturnReasons] = useState<Record<string, string>>({});

  // Transaction Mode: RETURN_ONLY | EXCHANGE
  const [transactionMode, setTransactionMode] = useState<"RETURN_ONLY" | "EXCHANGE">("RETURN_ONLY");

  // Exchange search & items state
  const [exchangeSearchQuery, setExchangeSearchQuery] = useState("");
  const [exchangeSearchResults, setExchangeSearchResults] = useState<any[]>([]);
  const [exchangeCart, setExchangeCart] = useState<any[]>([]);

  // 1. Debounce search input for scaling
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 2. Fetch sales orders based on debounced query (initial load + search query)
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const data = await orderService.listSalesOrders(debouncedQuery);
        setSalesOrders(data || []);
      } catch (err) {
        showToast("Lỗi tải danh sách hóa đơn", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [debouncedQuery]);

  // 3. Search exchange medicines
  useEffect(() => {
    if (!exchangeSearchQuery) {
      setExchangeSearchResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      try {
        const data = await medicineService.getMedicines({ limit: 10, search: exchangeSearchQuery });
        setExchangeSearchResults(data.data || []);
      } catch (err) {
        console.error(err);
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [exchangeSearchQuery]);

  const handleSelectOrder = (order: any) => {
    setSelectedOrder(order);
    const initialQties: Record<string, number> = {};
    const initialReasons: Record<string, string> = {};
    order.items.forEach((item: any) => {
      initialQties[item.medicineId] = 0;
      initialReasons[item.medicineId] = "CHANGE_OF_MIND";
    });
    setReturnQuantities(initialQties);
    setReturnReasons(initialReasons);
    setExchangeCart([]);
    setExchangeSearchQuery("");
    setTransactionMode("RETURN_ONLY");
  };

  const addExchangeItem = (med: any) => {
    const medId = med.id || med._id;
    const existing = exchangeCart.find(it => (it.id || it._id) === medId);
    if (existing) {
      if (existing.quantity >= med.stock) {
        showToast("Đã vượt quá số lượng tồn kho khả dụng!", "warning");
        return;
      }
      setExchangeCart(exchangeCart.map(it => (it.id || it._id) === medId ? { ...it, quantity: it.quantity + 1 } : it));
    } else {
      if (med.stock <= 0) {
        showToast("Thuốc này đã hết hàng khả dụng trong kho!", "error");
        return;
      }
      setExchangeCart([...exchangeCart, { ...med, id: medId, quantity: 1 }]);
    }
    setExchangeSearchQuery("");
    setExchangeSearchResults([]);
  };

  const updateExchangeQty = (id: string, delta: number, stock: number) => {
    setExchangeCart(exchangeCart.map(it => {
      const itId = it.id || it._id;
      if (itId === id) {
        const newQty = it.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > stock) {
          showToast("Vượt quá số lượng tồn kho khả dụng!", "warning");
          return it;
        }
        return { ...it, quantity: newQty };
      }
      return it;
    }).filter(Boolean));
  };

  const returnItems = selectedOrder
    ? selectedOrder.items.map((item: any) => ({
        medicineId: item.medicineId,
        name: item.name,
        quantity: returnQuantities[item.medicineId] || 0,
        price: item.price,
        unit: item.unit,
        reason: returnReasons[item.medicineId] || "CHANGE_OF_MIND"
      })).filter((it: any) => it.quantity > 0)
    : [];

  const totalRefundAmount = returnItems.reduce((sum, item) => {
    return sum + Math.round((item.price * item.quantity) * 0.95 * 1.08);
  }, 0);

  const totalExchangeCost = exchangeCart.reduce((sum, it) => sum + (it.price * it.quantity), 0);
  const finalDifference = totalExchangeCost - totalRefundAmount;

  const handleSubmit = async () => {
    if (returnItems.length === 0) return;
    setSubmitting(true);
    try {
      if (transactionMode === "RETURN_ONLY") {
        const payload = {
          salesOrderId: selectedOrder._id,
          items: returnItems.map(it => ({
            medicineId: it.medicineId,
            quantity: it.quantity,
            reason: it.reason
          })),
          soldBy: "Dược sĩ Trần Thị A"
        };
        const res = await orderService.processReturn(payload);
        if (res.success) {
          showToast("Xử lý trả hàng hoàn tiền thành công!", "success");
          setSelectedOrder(null);
          const updatedList = await orderService.listSalesOrders(debouncedQuery);
          setSalesOrders(updatedList || []);
        } else {
          showToast(res.message || "Xử lý trả hàng thất bại", "error");
        }
      } else {
        const payload = {
          salesOrderId: selectedOrder._id,
          returnedItems: returnItems.map(it => ({
            medicineId: it.medicineId,
            quantity: it.quantity,
            reason: it.reason
          })),
          newItems: exchangeCart.map(it => ({
            medicineId: it.id || it._id,
            quantity: it.quantity
          })),
          soldBy: "Dược sĩ Trần Thị A"
        };
        const res = await orderService.processExchange(payload);
        if (res.success) {
          showToast("Xử lý đổi hàng thành công!", "success");
          setSelectedOrder(null);
          const updatedList = await orderService.listSalesOrders(debouncedQuery);
          setSalesOrders(updatedList || []);
        } else {
          showToast(res.message || "Xử lý đổi hàng thất bại", "error");
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || "Đã xảy ra lỗi hệ thống", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-hidden">
      {/* Tìm kiếm hóa đơn */}
      <div className="bg-white border border-slate-200 rounded-[16px] p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-3 uppercase tracking-wider">
          Tra cứu hóa đơn mua hàng
        </h3>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none text-slate-400">
            <SearchIcon size={18} />
          </div>
          <input
            type="text"
            placeholder="Nhập mã hóa đơn hoặc số điện thoại khách hàng để tra cứu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-[12px] text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
          />
        </div>
      </div>

      {/* Danh sách hóa đơn */}
      <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[400px]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <FileText size={18} className="text-[#0057cd]" />
            Danh sách hóa đơn (Tối đa 20 đơn gần nhất)
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="w-8 h-8 border-3 border-[#0057cd] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : salesOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <FileText size={40} className="text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-500">Không tìm thấy hóa đơn nào khớp</h3>
            </div>
          ) : (
            <div className="divide-y divide-slate-150">
              {salesOrders.map((order) => (
                <div
                  key={order._id}
                  onClick={() => handleSelectOrder(order)}
                  className="p-4.5 hover:bg-slate-50/80 transition-all flex items-center justify-between cursor-pointer border-l-4 border-transparent hover:border-[#0057cd]"
                >
                  <div className="flex flex-col gap-1.5">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewInvoice(order);
                      }}
                      className="font-mono font-bold text-[13px] text-[#0057cd] hover:text-[#00419e] hover:underline cursor-pointer flex items-center gap-1.5"
                    >
                      <Eye size={13} className="inline" /> {order._id}
                    </span>
                    <div className="text-xs font-bold text-slate-700">
                      Khách hàng: {order.patientName || "Khách lẻ vãng lai"}
                    </div>
                    {order.patientPhone && (
                      <div className="text-[11px] text-slate-500 font-semibold">
                        SĐT: {order.patientPhone}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400">
                      Ngày bán: {new Date(order.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right flex flex-col gap-1.5">
                    <span className="font-bold text-slate-900 text-sm">
                      {order.totalAmount.toLocaleString()}₫
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-block uppercase">
                      {order.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* =======================================
       * 📄 OVERLAY DETAIL MODAL FOR RETURN/EXCHANGE
       * ======================================= */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all duration-300">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide flex items-center gap-2">
                <RefreshCw className="text-[#0057cd]" />
                Chi tiết Đổi / Trả hàng cho hóa đơn gốc
              </h3>
              <div className="flex items-center gap-4.5">
                <span className="font-mono text-xs font-bold text-slate-500">Mã: {selectedOrder._id}</span>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <XCircle size={22} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6 scrollbar-hide">
              {/* Left Side: Original Items and new Exchange Items */}
              <div className="flex-1 flex flex-col gap-6">
                {/* Patient Info Card */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 rounded-xl p-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold">Khách hàng:</span>
                    <span className="font-bold text-slate-800">{selectedOrder.patientName || "Khách lẻ vãng lai"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Số điện thoại:</span>
                    <span className="font-bold text-slate-800">{selectedOrder.patientPhone || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Loại hóa đơn:</span>
                    <span className="font-bold text-slate-800 uppercase">{selectedOrder.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Ngày bán:</span>
                    <span className="font-bold text-slate-800">{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Sản phẩm đã mua</h3>
                  <div className="border border-slate-150 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Tên thuốc</th>
                          <th className="px-3 py-3 text-center">Đã mua</th>
                          <th className="px-3 py-3 text-center">Đã trả</th>
                          <th className="px-4 py-3 text-center">Số lượng trả</th>
                          <th className="px-4 py-3">Lý do trả</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedOrder.items.map((item: any) => {
                          const maxReturnable = item.quantity - (item.returnedQuantity || 0);
                          const currentQty = returnQuantities[item.medicineId] || 0;

                          return (
                            <tr key={item.medicineId} className="hover:bg-slate-50/50">
                              <td className="px-4 py-4">
                                <div className="font-bold text-slate-900">{item.name}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Đơn giá: {item.price.toLocaleString()}₫ | ĐVT: {item.unit}
                                </div>
                              </td>
                              <td className="px-3 py-4 text-center font-bold text-slate-700">{item.quantity}</td>
                              <td className="px-3 py-4 text-center font-bold text-rose-600">{item.returnedQuantity || 0}</td>
                              <td className="px-4 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    disabled={currentQty <= 0}
                                    onClick={() =>
                                      setReturnQuantities({
                                        ...returnQuantities,
                                        [item.medicineId]: currentQty - 1
                                      })
                                    }
                                    className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <span className="font-bold w-6 text-center">{currentQty}</span>
                                  <button
                                    disabled={currentQty >= maxReturnable}
                                    onClick={() =>
                                      setReturnQuantities({
                                        ...returnQuantities,
                                        [item.medicineId]: currentQty + 1
                                      })
                                    }
                                    className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <select
                                  disabled={currentQty === 0}
                                  value={returnReasons[item.medicineId] || "CHANGE_OF_MIND"}
                                  onChange={(e) =>
                                    setReturnReasons({
                                      ...returnReasons,
                                      [item.medicineId]: e.target.value
                                    })
                                  }
                                  className="px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 bg-white"
                                >
                                  <option value="CHANGE_OF_MIND">Đổi ý (Cộng kho)</option>
                                  <option value="FAULTY">Lỗi sản phẩm (Không cộng kho)</option>
                                  <option value="EXPIRED">Cận hạn sử dụng (Không cộng kho)</option>
                                  <option value="OTHER">Lý do khác (Không cộng kho)</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Option to toggle Exchange mode */}
                <div className="border-t border-slate-150 pt-4 flex flex-col gap-4">
                  <div className="flex bg-slate-100 p-1 rounded-xl gap-1 self-start">
                    <button
                      onClick={() => setTransactionMode("RETURN_ONLY")}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase ${
                        transactionMode === "RETURN_ONLY"
                          ? "bg-white text-[#0057cd] shadow-sm font-black"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Chỉ trả hàng (Hoàn tiền)
                    </button>
                    <button
                      onClick={() => setTransactionMode("EXCHANGE")}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase ${
                        transactionMode === "EXCHANGE"
                          ? "bg-white text-[#0057cd] shadow-sm font-black"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Đổi hàng (Bù trừ sản phẩm mới)
                    </button>
                  </div>

                  {/* Exchange section if selected */}
                  {transactionMode === "EXCHANGE" && (
                    <div className="border border-[#0057cd]/20 rounded-2xl p-5 bg-[#fcfdff] flex flex-col gap-4">
                      <h4 className="text-xs font-black text-[#0057cd] uppercase tracking-widest">
                        Chọn sản phẩm mới đổi
                      </h4>
                      
                      {/* Search bar */}
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <SearchIcon size={16} />
                        </div>
                        <input
                          type="text"
                          placeholder="Tìm kiếm thuốc mới..."
                          value={exchangeSearchQuery}
                          onChange={(e) => setExchangeSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#0057cd]"
                        />
                        
                        {/* Search Dropdown */}
                        {exchangeSearchResults.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg border border-slate-200 shadow-lg max-h-48 overflow-y-auto z-40 divide-y divide-slate-100">
                            {exchangeSearchResults.map((med) => (
                              <button
                                key={med.id || med._id}
                                onClick={() => addExchangeItem(med)}
                                className="w-full p-2.5 text-left hover:bg-slate-50 transition-colors flex items-center justify-between text-xs"
                              >
                                <div>
                                  <div className="font-bold text-slate-900">{med.name}</div>
                                  <div className="text-[10px] text-slate-500">Tồn: {med.stock} {med.unit}</div>
                                </div>
                                <span className="font-bold text-[#0057cd]">{med.price.toLocaleString()}₫</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Exchange Cart list */}
                      <div className="border border-slate-100 rounded-lg bg-white overflow-x-auto">
                        {exchangeCart.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 text-xs italic">
                            Chưa chọn sản phẩm đổi mới nào. Nhập tìm kiếm ở trên.
                          </div>
                        ) : (
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-[10px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-150">
                              <tr>
                                <th className="px-4 py-2">Sản phẩm mới</th>
                                <th className="px-3 py-2 text-center">Số lượng</th>
                                <th className="px-3 py-2 text-center">ĐVT</th>
                                <th className="px-4 py-2 text-right">Tổng tiền</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {exchangeCart.map((it) => (
                                <tr key={it.id || it._id} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-3">
                                    <div className="font-bold text-slate-800">{it.name}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      Đơn giá: {it.price.toLocaleString()}₫
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        onClick={() => updateExchangeQty(it.id || it._id, -1, it.stock)}
                                        className="w-5 h-5 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100"
                                      >
                                        <Minus size={10} />
                                      </button>
                                      <span className="font-bold">{it.quantity}</span>
                                      <button
                                        onClick={() => updateExchangeQty(it.id || it._id, 1, it.stock)}
                                        className="w-5 h-5 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100"
                                      >
                                        <Plus size={10} />
                                      </button>
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 text-center text-slate-500">{it.unit}</td>
                                  <td className="px-4 py-3 text-right font-bold text-[#0057cd]">
                                    {(it.price * it.quantity).toLocaleString()}₫
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Lịch sử Đổi / Trả hàng đã thực hiện trước đó */}
                  {((selectedOrder.returns && selectedOrder.returns.length > 0) || 
                    (selectedOrder.exchanges && selectedOrder.exchanges.length > 0)) && (
                    <div className="border-t border-slate-150 pt-4 flex flex-col gap-3">
                      <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                        Lịch sử Đổi / Trả đã thực hiện
                      </h4>
                      <div className="space-y-3">
                        {selectedOrder.returns?.map((ret: any, rIdx: number) => (
                          <div key={`ret-${rIdx}`} className="bg-rose-50/50 border border-rose-100/70 rounded-xl p-3.5 space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                              <span>Lần trả hàng #{rIdx + 1}</span>
                              <span>{new Date(ret.returnedAt).toLocaleString()}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-semibold">
                              Dược sĩ thực hiện: <span className="text-slate-800 font-bold">{ret.soldBy || "Dược sĩ"}</span>
                            </div>
                            <div className="space-y-1 pl-2 border-l-2 border-rose-200 text-xs">
                              {ret.items?.map((it: any, itIdx: number) => (
                                <div key={itIdx} className="flex justify-between text-slate-700 font-medium">
                                  <span>{it.name}</span>
                                  <span>
                                    {it.quantity} {it.unit} (Lý do: {
                                      it.reason === "CHANGE_OF_MIND" ? "Đổi ý" : 
                                      it.reason === "FAULTY" ? "Sản phẩm lỗi" : 
                                      it.reason === "EXPIRED" ? "Cận HSD" : "Lý do khác"
                                    })
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {selectedOrder.exchanges?.map((exc: any, eIdx: number) => (
                          <div key={`exc-${eIdx}`} className="bg-blue-50/50 border border-blue-100/70 rounded-xl p-3.5 space-y-2.5">
                            <div className="flex justify-between items-center text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                              <span>Lần đổi hàng #{eIdx + 1}</span>
                              <span>{new Date(exc.exchangedAt).toLocaleString()}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-semibold">
                              Dược sĩ thực hiện: <span className="text-slate-800 font-bold">{exc.soldBy || "Dược sĩ"}</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-[#ba1a1a] uppercase tracking-wide block">Sản phẩm trả lại:</span>
                                <div className="space-y-1 pl-2 border-l-2 border-rose-200">
                                  {exc.returnedItems?.map((it: any, itIdx: number) => (
                                    <div key={itIdx} className="text-slate-700 font-semibold">
                                      {it.name} <span className="text-slate-500 font-medium">({it.quantity} {it.unit})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide block">Sản phẩm đổi mới:</span>
                                <div className="space-y-1 pl-2 border-l-2 border-emerald-200">
                                  {exc.newItems?.map((it: any, itIdx: number) => (
                                    <div key={itIdx} className="text-slate-700 font-semibold">
                                      {it.name} <span className="text-slate-500 font-medium">({it.quantity} {it.unit})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Summary Card */}
              <div className="w-full lg:w-[360px] flex flex-col gap-6 shrink-0">
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col gap-5">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    Tổng kết đổi trả / Summary
                  </h3>

                  <div className="space-y-4 text-xs font-semibold">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Số sản phẩm hoàn trả:</span>
                      <span className="text-slate-900 font-bold">
                        {returnItems.reduce((sum, it) => sum + it.quantity, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-700 bg-emerald-100/50 p-2.5 rounded-lg border border-emerald-100">
                      <span>Tổng tiền hoàn trả khách:</span>
                      <span className="font-bold text-sm">+{totalRefundAmount.toLocaleString()}₫</span>
                    </div>

                    {transactionMode === "EXCHANGE" && (
                      <>
                        <div className="flex justify-between items-center text-slate-600 border-t border-dashed border-slate-200 pt-3">
                          <span>Số sản phẩm mua mới:</span>
                          <span className="text-slate-900 font-bold">
                            {exchangeCart.reduce((sum, it) => sum + it.quantity, 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[#ba1a1a] bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                          <span>Tổng tiền hàng mới:</span>
                          <span className="font-bold text-sm">-{totalExchangeCost.toLocaleString()}₫</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="border-t border-slate-200 pt-4 flex flex-col gap-2">
                    {transactionMode === "RETURN_ONLY" ? (
                      <div className="flex items-end justify-between text-slate-800">
                        <div className="text-xs font-black text-slate-900 uppercase tracking-widest pb-1">
                          HOÀN TIỀN LẠI KHÁCH
                        </div>
                        <div className="text-2xl font-black text-emerald-600 leading-none tracking-tighter">
                          {totalRefundAmount.toLocaleString()}₫
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-end justify-between text-slate-800">
                        <div className="text-xs font-black text-slate-900 uppercase tracking-widest pb-1">
                          {finalDifference >= 0 ? "KHÁCH PHẢI BÙ THÊM" : "THỐI LẠI TIỀN KHÁCH"}
                        </div>
                        <div
                          className={`text-2xl font-black leading-none tracking-tighter ${
                            finalDifference >= 0 ? "text-[#0057cd]" : "text-emerald-600"
                          }`}
                        >
                          {Math.abs(finalDifference).toLocaleString()}₫
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={returnItems.length === 0 || submitting}
                    className="w-full bg-[#0057cd] hover:bg-[#00419e] disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl py-4 flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wide mt-2 shadow transition-all cursor-pointer"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <RefreshCw size={14} />
                        Xác nhận đổi / trả hàng
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =======================================
       * 📄 VIEW ORIGINAL INVOICE MODAL (XEM HÓA ĐƠN GỐC)
       * ======================================= */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col transform transition-all duration-300">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2 uppercase tracking-wide">
                <FileText className="text-[#0057cd]" size={20} /> Chi tiết Hóa đơn gốc
              </h3>
              <button onClick={() => setViewInvoice(null)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <XCircle size={22} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[75vh] scrollbar-hide text-xs">
              {/* Receipt Header */}
              <div className="text-center border-b border-dashed border-slate-200 pb-4">
                <div className="font-bold text-[16px] text-slate-900 uppercase">HỆ THỐNG NHÀ THUỐC WDP</div>
                <div className="text-xs text-slate-500 mt-1">Đường 3/2, Quận Hải Châu, Đà Nẵng</div>
                <div className="text-xs text-slate-500">SĐT: 0236 123 456</div>
              </div>

              {/* Invoice Information */}
              <div className="flex flex-col gap-1.5 border-b border-slate-200 pb-3 font-semibold text-slate-700">
                <div className="flex justify-between">
                  <span>Mã hóa đơn:</span>
                  <span className="font-bold font-mono text-[#0057cd]">{viewInvoice._id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ngày bán:</span>
                  <span>{new Date(viewInvoice.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kiểu bán:</span>
                  <span className="font-bold uppercase text-[#0057cd]">{viewInvoice.type}</span>
                </div>
                {viewInvoice.prescriptionCode && (
                  <div className="flex justify-between">
                    <span>Mã đơn gốc:</span>
                    <span className="font-bold font-mono text-[#0057cd]">{viewInvoice.prescriptionCode}</span>
                  </div>
                )}
                <div className="flex justify-between flex-wrap gap-x-4 border-t border-slate-100 pt-1.5 mt-1">
                  <span>Khách hàng:</span>
                  <span className="font-bold text-slate-900">{viewInvoice.patientName || "Khách lẻ vãng lai"}</span>
                </div>
                {viewInvoice.patientPhone && (
                  <div className="flex justify-between flex-wrap gap-x-4">
                    <span>Số điện thoại:</span>
                    <span className="font-bold text-slate-900">{viewInvoice.patientPhone}</span>
                  </div>
                )}
                <div className="flex justify-between flex-wrap gap-x-4">
                  <span>Dược sĩ thực hiện:</span>
                  <span className="font-bold text-slate-900">{viewInvoice.soldBy || "Dược sĩ Trần Thị A"}</span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="font-bold border-b border-slate-200 pb-1.5 mb-2 uppercase text-slate-800 tracking-wider">Danh sách sản phẩm đã mua</div>
                <div className="space-y-3">
                  {viewInvoice.items.map((it: any, idx: number) => (
                    <div key={idx} className="flex flex-col">
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>{it.name}</span>
                        <span>{it.quantity} {it.unit}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 text-[10px] mt-0.5">
                        <span>Đơn giá: {it.price.toLocaleString()}₫</span>
                        <span>Thành tiền: {(it.price * it.quantity).toLocaleString()}₫</span>
                      </div>
                      {it.returnedQuantity > 0 && (
                        <div className="text-[10px] text-rose-600 font-bold mt-0.5 bg-rose-50 px-2 py-0.5 rounded border border-rose-100/50 inline-block self-start">
                          (Đã hoàn trả: {it.returnedQuantity} {it.unit})
                        </div>
                      )}
                      {it.batches && it.batches.length > 0 && (
                        <div className="text-[10px] text-slate-400 mt-1 pl-2 border-l border-slate-200">
                          Lô xuất kho: {it.batches.map((b: any) => `${b.batchNo} (${b.quantity})`).join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Lịch sử Đổi / Trả hàng của hóa đơn gốc */}
              {((viewInvoice.returns && viewInvoice.returns.length > 0) || 
                (viewInvoice.exchanges && viewInvoice.exchanges.length > 0)) && (
                <div className="border-t border-slate-200 pt-4 flex flex-col gap-3">
                  <div className="font-bold border-b border-slate-200 pb-1.5 mb-1 uppercase text-slate-800 tracking-wider">
                    Lịch sử Đổi / Trả hàng
                  </div>
                  <div className="space-y-3">
                    {viewInvoice.returns?.map((ret: any, rIdx: number) => (
                      <div key={`ret-${rIdx}`} className="bg-rose-50/50 border border-rose-100/70 rounded-xl p-3.5 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                          <span>Lần trả hàng #{rIdx + 1}</span>
                          <span>{new Date(ret.returnedAt).toLocaleString()}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold">
                          Dược sĩ thực hiện: <span className="text-slate-800 font-bold">{ret.soldBy || "Dược sĩ"}</span>
                        </div>
                        <div className="space-y-1 pl-2 border-l-2 border-rose-200 text-xs">
                          {ret.items?.map((it: any, itIdx: number) => (
                            <div key={itIdx} className="flex justify-between text-slate-700 font-medium">
                              <span>{it.name}</span>
                              <span>
                                {it.quantity} {it.unit} (Lý do: {
                                  it.reason === "CHANGE_OF_MIND" ? "Đổi ý" : 
                                  it.reason === "FAULTY" ? "Sản phẩm lỗi" : 
                                  it.reason === "EXPIRED" ? "Cận HSD" : "Lý do khác"
                                })
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {viewInvoice.exchanges?.map((exc: any, eIdx: number) => (
                      <div key={`exc-${eIdx}`} className="bg-blue-50/50 border border-blue-100/70 rounded-xl p-3.5 space-y-2.5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                          <span>Lần đổi hàng #{eIdx + 1}</span>
                          <span>{new Date(exc.exchangedAt).toLocaleString()}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold">
                          Dược sĩ thực hiện: <span className="text-slate-800 font-bold">{exc.soldBy || "Dược sĩ"}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-[#ba1a1a] uppercase tracking-wide block">Sản phẩm trả lại:</span>
                            <div className="space-y-1 pl-2 border-l-2 border-rose-200">
                              {exc.returnedItems?.map((it: any, itIdx: number) => (
                                <div key={itIdx} className="text-slate-700 font-semibold">
                                  {it.name} <span className="text-slate-500 font-medium">({it.quantity} {it.unit})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide block">Sản phẩm đổi mới:</span>
                            <div className="space-y-1 pl-2 border-l-2 border-emerald-200">
                              {exc.newItems?.map((it: any, itIdx: number) => (
                                <div key={itIdx} className="text-slate-700 font-semibold">
                                  {it.name} <span className="text-slate-500 font-medium">({it.quantity} {it.unit})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial summary */}
              <div className="border-t border-slate-200 pt-4 flex flex-col gap-1.5 text-slate-700">
                <div className="flex justify-between font-semibold">
                  <span>Tổng tiền hàng:</span>
                  <span className="text-slate-950 font-bold">{viewInvoice.totalAmount.toLocaleString()}₫</span>
                </div>
                <div className="flex justify-between font-black text-sm text-[#0057cd] border-t border-dashed border-slate-200 pt-2">
                  <span>Tổng cộng thanh toán:</span>
                  <span className="text-lg">{viewInvoice.totalAmount.toLocaleString()}₫</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[10px] mt-1">
                  <span>Phương thức thanh toán:</span>
                  <span className="font-bold uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-700">{viewInvoice.paymentMethod || "CASH"}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewInvoice(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
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

