import { useState, useEffect } from "react";
import {
  XCircle, AlertTriangle, CheckCircle2, QrCode, FileText, Stethoscope,
  ShoppingCart, Minus, Plus, Banknote, CreditCard, Sparkles, Printer, SearchIcon, Check,
  ShieldAlert
} from "lucide-react";
import { medicineService } from "../../../services/medicine.service";
import { prescriptionService } from "../../../services/prescription.service";
import { orderService } from "../../../services/order.service";

// Helper to decode JWT token to extract branchId and user info
function getBranchInfoFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return { branchId: null, fullName: "Dược sĩ Trần Thị A" };
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
      fullName: decoded.fullName || "Dược sĩ Trần Thị A"
    };
  } catch (e) {
    console.error("Lỗi giải mã token:", e);
    return { branchId: null, fullName: "Dược sĩ Trần Thị A" };
  }
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

interface PrescriptionViewProps {
  showToast: (message: string, type?: "success" | "error" | "warning") => void;
}

export default function PrescriptionView({ showToast }: PrescriptionViewProps) {
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
      const { branchId } = getBranchInfoFromToken();
      const data = await medicineService.getMedicines({ limit: 10, search: query, _t: Date.now(), branchId: branchId || undefined });
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
            setInvoiceData(data.saleResult || data);
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
        setInvoiceData(data.saleResult || data);
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
      const { branchId: currentBranchId, fullName: currentUserName } = getBranchInfoFromToken();
      const code = prescriptionMode === "QR" && prescriptionCode ? prescriptionCode : `PRX-HAND-${Math.floor(10000 + Math.random() * 90000)}`;
      
      const generatedOrderCode = Math.floor(10000000 + Math.random() * 90000000);
      const payload = {
        prescriptionCode: code,
        type: "PRESCRIPTION",
        branchId: currentBranchId || undefined,
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
        soldBy: currentUserName || "Dược sĩ Trần Thị A",
        orderCode: generatedOrderCode
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

        payload.orderCode = payosResult.orderCode;

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
