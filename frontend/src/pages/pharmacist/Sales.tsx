import { useState, useEffect } from "react";
import { 
  Search, AlertTriangle, ShieldAlert, Sparkles, Printer, XCircle, FileText, 
  CheckCircle2, ChevronRight, Stethoscope, Building, UserSquare2, CreditCard, 
  Banknote, QrCode, PlusCircle, Save, FileCheck, Info, Check, SearchIcon, 
  ArrowLeft, RefreshCw, ShoppingCart, Plus, Minus, Tag, Phone 
} from "lucide-react";

export function Sales() {
  const [activeTab, setActiveTab] = useState("KÊ ĐƠN / PRESCRIPTION");
  
  const tabs = [
    "BÁN LẺ / RETAIL",
    "KÊ ĐƠN / PRESCRIPTION",
    "BÁN SỈ / WHOLESALE",
    "TRẢ HÀNG / RETURNS",
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans">
      {/* Sales Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 pt-2 flex flex-col md:flex-row md:items-end justify-between overflow-x-auto shrink-0 shadow-sm">
        <div className="flex gap-8 whitespace-nowrap">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-[13px] font-bold tracking-wider border-b-2 transition-colors uppercase ${
                activeTab === tab
                  ? "border-[#0057cd] text-[#0057cd]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 pb-3 border-l border-slate-200 pl-6 text-right">
          <div className="hidden sm:block">
            <div className="text-xs font-bold text-slate-900">Dược sĩ: Trần Thị A</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Quầy số #04</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#0057cd] text-xs font-bold border border-[#b1c5ff] shadow-sm">
            TA
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        {activeTab === "BÁN LẺ / RETAIL" && <RetailView />}
        {activeTab === "KÊ ĐƠN / PRESCRIPTION" && <PrescriptionView />}
        {activeTab === "BÁN SỈ / WHOLESALE" && <WholesaleView />}
        {activeTab === "TRẢ HÀNG / RETURNS" && <ReturnsView />}
      </div>
    </div>
  );
}

// ==========================================
// 💊 PRESCRIPTION VIEW (BÁN THEO ĐƠN)
// ==========================================
function PrescriptionView() {
  const [prescriptionMode, setPrescriptionMode] = useState<"QR" | "MANUAL">("QR");
  const [prescriptionCode, setPrescriptionCode] = useState("RX-99281-HAN");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
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

  // Checkout States
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [remarks, setRemarks] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  // Scan simulation states
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState("");

  // Load prescriptions from DB
  const fetchDbPrescriptions = async () => {
    try {
      const res = await fetch("/api/prescriptions");
      if (res.ok) {
        const data = await res.json();
        setDbPrescriptions(data || []);
      }
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
      const res = await fetch(`/api/medicines?limit=10&search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) {
        setSearchResults(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Tự động load đơn điện tử đầu tiên để demo cho đẹp
  useEffect(() => {
    if (prescriptionMode === "QR") {
      fetchPrescription("RX-99281-HAN");
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
      const res = await fetch(`/api/prescriptions/${code}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Không tìm thấy đơn thuốc điện tử.");
      }
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
      setError(err.message || "Lỗi kết nối máy chủ");
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
    const existing = prescriptionItems.find(it => it.medicineId === med.id);
    if (existing) {
      if (existing.quantity >= med.stock) {
        alert("Đã vượt quá số lượng tồn kho khả dụng của thuốc!");
        return;
      }
      setPrescriptionItems(prescriptionItems.map(it => 
        it.medicineId === med.id 
          ? { ...it, quantity: it.quantity + 1 } 
          : it
      ));
    } else {
      if (med.stock <= 0) {
        alert("Thuốc này đã hết hàng khả dụng trong kho!");
        return;
      }
      setPrescriptionItems([...prescriptionItems, {
        medicineId: med.id,
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
        isManualPrescription: prescriptionMode === "MANUAL",
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

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Lỗi khi xử lý thanh toán");
      }

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
        
        {/* Toggle Mode: Nhập tay hay Quét QR */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 flex gap-2 shadow-sm shrink-0">
          <button
            onClick={() => setPrescriptionMode("QR")}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all uppercase flex items-center justify-center gap-2 ${
              prescriptionMode === "QR"
                ? "bg-[#0057cd] text-white shadow-md"
                : "bg-transparent text-slate-600 hover:bg-slate-50"
            }`}
          >
            <QrCode size={18} /> Bán qua đơn điện tử (Quét QR)
          </button>
          <button
            onClick={() => setPrescriptionMode("MANUAL")}
            className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all uppercase flex items-center justify-center gap-2 ${
              prescriptionMode === "MANUAL"
                ? "bg-[#0057cd] text-white shadow-md"
                : "bg-transparent text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FileText size={18} /> Nhập đơn tay (Đơn giấy thuốc kê toa)
          </button>
        </div>

        {/* Cột điều khiển Đơn điện tử QR */}
        {prescriptionMode === "QR" && (
          <div className="bg-white rounded-[16px] border border-slate-200 p-5 shadow-sm flex flex-col lg:flex-row items-end gap-4 shrink-0">
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Chọn đơn từ database (Thử nghiệm)</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      fetchPrescription(e.target.value);
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-[12px] text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                >
                  <option value="">-- Click chọn đơn từ database --</option>
                  {dbPrescriptions.map((p) => (
                    <option key={p.id} value={p.prescriptionCode}>
                      {p.prescriptionCode} - {p.patientName} ({p.status === "FILLED" ? "Đã bán" : "Chờ bán"})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wide">Nhập mã đơn thuốc điện tử</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <FileText size={18} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Mã đơn (Ví dụ: RX-99281-HAN)..."
                    value={prescriptionCode}
                    onChange={(e) => setPrescriptionCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchPrescription(prescriptionCode)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-[12px] text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all" 
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 w-full lg:w-auto shrink-0">
              <button 
                onClick={() => fetchPrescription(prescriptionCode)}
                disabled={loading}
                className="flex-1 lg:flex-none px-6 py-3 bg-[#0057cd] hover:bg-[#00419e] text-white font-bold rounded-[12px] shadow-sm transition-colors"
              >
                {loading ? "Đang tải..." : "Tra cứu"}
              </button>
              <button 
                onClick={() => setShowQRModal(true)}
                className="flex-1 lg:flex-none px-5 py-3 border-2 border-[#b1c5ff] text-[#0057cd] font-bold rounded-[12px] hover:bg-[#f2f3ff] transition-all flex items-center justify-center gap-2"
              >
                <QrCode size={18} /> Quét mã QR
              </button>
            </div>
          </div>
        )}

        {/* Thông tin Đơn thuốc & Người kê toa (Luôn hiển thị và có thể chỉnh sửa) */}
        <div className="bg-white rounded-[16px] border border-slate-200 p-6 shadow-sm flex flex-col gap-5 shrink-0">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <Stethoscope size={18} className="text-[#0057cd]" /> Thông tin bệnh nhân & bác sĩ kê đơn
          </h3>
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
              <input 
                type="text" 
                value={doctorSpecialty} 
                onChange={(e) => setDoctorSpecialty(e.target.value)}
                placeholder="Nội khoa" 
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:border-[#0057cd]" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Bệnh viện / Phòng khám</label>
              <input 
                type="text" 
                value={hospitalName} 
                onChange={(e) => setHospitalName(e.target.value)}
                placeholder="Bệnh viện Bạch Mai" 
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:border-[#0057cd]" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Mã cơ sở y tế</label>
              <input 
                type="text" 
                value={hospitalCode} 
                onChange={(e) => setHospitalCode(e.target.value)}
                placeholder="BM-1029" 
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:border-[#0057cd]" 
              />
            </div>
          </div>
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
                    key={med.id}
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
            <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[300px]">
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
                          className={`hover:bg-slate-50/50 transition-colors ${
                            isOutOfStock ? "bg-red-50/30" : isNearExp ? "bg-amber-50/30" : ""
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
                          <td className="px-6 py-4">
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
                              placeholder="Ví dụ: Ngày uống 2 lần, mỗi lần 1 viên..."
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#0057cd]" 
                            />
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
                                    alert("Vượt quá tồn kho khả dụng!");
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
          <div className="bg-white rounded-[24px] border-2 border-dashed border-slate-200 flex-1 min-h-[300px] flex flex-col items-center justify-center p-8 text-center">
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
              className={`flex flex-col items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all relative ${
                paymentMethod === "CASH" 
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
              className={`flex flex-col items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all relative ${
                paymentMethod === "CARD" 
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
              className={`flex flex-col items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all relative ${
                paymentMethod === "QR_PAY" 
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
function RetailView() {
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
      const res = await fetch(`/api/medicines?limit=10&search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) {
        setSearchResults(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (med: any) => {
    const existing = cart.find(it => it.id === med.id);
    if (existing) {
      if (existing.quantity >= med.stock) {
        alert("Đã vượt quá số lượng tồn kho khả dụng!");
        return;
      }
      setCart(cart.map(it => it.id === med.id ? { ...it, quantity: it.quantity + 1 } : it));
    } else {
      if (med.stock <= 0) {
        alert("Thuốc này đã hết hàng khả dụng trong kho!");
        return;
      }
      setCart([...cart, { ...med, quantity: 1 }]);
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
        alert("Đã vượt quá tồn kho khả dụng!");
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

      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Lỗi thanh toán");
      }

      setInvoiceData(result);
      setShowInvoiceModal(true);
      setCart([]); // Clear cart
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
        
        {/* Tìm kiếm */}
        <div className="relative shrink-0">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <SearchIcon size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Tìm kiếm nhanh theo tên thuốc hoặc hoạt chất để thêm vào giỏ hàng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-[12px] text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all shadow-sm" 
          />

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
        <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[300px]">
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
                              <Minus size={14}/>
                            </button>
                            <span className="font-bold text-[15px] text-slate-900 w-6 text-center">{String(it.quantity).padStart(2, "0")}</span>
                            <button 
                              onClick={() => updateQty(it.id, 1, it.stock)} 
                              className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                            >
                              <Plus size={14}/>
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
              className={`flex items-center justify-center gap-2 py-3.5 border-2 rounded-xl font-bold text-sm transition-all ${
                paymentMethod === "CASH" 
                  ? "border-[#0057cd] bg-[#f0f6ff] text-[#0057cd]" 
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Banknote size={16}/> Tiền mặt
            </button>
            <button 
              onClick={() => setPaymentMethod("QR_PAY")}
              className={`flex items-center justify-center gap-2 py-3.5 border-2 rounded-xl font-bold text-sm transition-all ${
                paymentMethod === "QR_PAY" 
                  ? "border-[#0057cd] bg-[#f0f6ff] text-[#0057cd]" 
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <QrCode size={16}/> VNPay/QR
            </button>
          </div>
        </div>

        <button 
          onClick={handleCheckout}
          disabled={cart.length === 0}
          className="w-full bg-[#0057cd] hover:bg-[#00419e] disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl py-5 shadow-sm transition-all flex items-center justify-center gap-2 font-black text-[16px] uppercase tracking-wide mt-auto"
        >
          <Printer size={20}/>
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

function ReturnsView() {
  return (
    <div className="h-full flex flex-col xl:flex-row gap-6">
      <div className="flex-1 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center">
        <RefreshCw className="text-slate-300 mb-4" size={48} />
        <h3 className="text-lg font-bold text-slate-800">Chức năng Quản lý Hoàn trả</h3>
        <p className="text-slate-500 text-sm max-w-sm mt-2">
          Xử lý hoàn trả thuốc lỗi, cận hạn hoặc đổi hàng của bệnh nhân dựa trên số hóa đơn gốc.
        </p>
      </div>
    </div>
  );
}
