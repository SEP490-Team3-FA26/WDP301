import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Building2, AlertTriangle, Search, Plus, Trash2, CheckCircle2, ShieldAlert, PackagePlus, ClipboardList, Loader2 } from "lucide-react";
import { motion } from "motion/react";

export function PurchaseOrderCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { prefilledMedicineId?: string, prefillPrItems?: any[] } | null;

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [cart, setCart] = useState<any[]>([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvedPrs, setApprovedPrs] = useState<any[]>([]);
  const [selectedPrId, setSelectedPrId] = useState<string>("");
  const [isPrefilling, setIsPrefilling] = useState(false);
  const prefillDone = useRef(false);

  // --- Helper: fetch a single medicine by ID ---
  const fetchMedicineById = async (id: string) => {
    try {
      const res = await fetch(`/api/medicines/${id}`);
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  };

  // --- Fast prefill: fetch only the medicines referenced in PR items ---
  useEffect(() => {
    if (prefillDone.current) return;
    if (!state?.prefillPrItems || state.prefillPrItems.length === 0) return;

    prefillDone.current = true;
    setIsPrefilling(true);

    // 1. Consolidate PR items by medicineId
    const itemMap = new Map<string, any>();
    state.prefillPrItems.forEach(item => {
      if (!item || !item.medicineId) return;
      if (itemMap.has(item.medicineId)) {
        const existing = itemMap.get(item.medicineId);
        if (existing) {
          existing.quantity += item.requestedQuantity || item.quantity || 0;
          if (item.prId) {
            existing.prIds = [...(existing.prIds || []), item.prId];
          }
        }
      } else {
        itemMap.set(item.medicineId, {
          ...item,
          quantity: item.requestedQuantity || item.quantity || 0,
          prIds: item.prId ? [item.prId] : []
        });
      }
    });

    // 2. Fetch only the needed medicines by ID (parallel, very fast)
    const uniqueIds = [...itemMap.keys()];
    Promise.all(uniqueIds.map(id => fetchMedicineById(id)))
      .then(results => {
        const medMap = new Map<string, any>();
        results.forEach(med => {
          if (med) {
            const id = med.id || med._id;
            medMap.set(id, med);
          }
        });

        const newCart: any[] = [];
        itemMap.forEach((item, medicineId) => {
          const med = medMap.get(medicineId);
          if (med) {
            newCart.push({
              ...med,
              id: med.id || med._id,
              quantity: item.quantity,
              unitPrice: med.price || 0,
              prId: item.prId,
              prIds: item.prIds || []
            });
          }
        });

        if (newCart.length > 0) {
          setCart(newCart);
          if (newCart[0].supplierId) {
            setSelectedSupplierId(newCart[0].supplierId);
          }
        }
      })
      .catch(err => console.error('Prefill error:', err))
      .finally(() => setIsPrefilling(false));
  }, [state]);

  useEffect(() => {
    // Fetch Suppliers
    fetch('/api/suppliers')
      .then(res => res.json())
      .then(data => setSuppliers(data))
      .catch(err => console.error(err));

    // Fetch Medicines for dropdown (lazy — not needed for prefill)
    fetch('/api/medicines?limit=10000')
      .then(res => res.json())
      .then(data => setMedicines(data.data || data))
      .catch(err => console.error(err));

    // Fetch Approved PRs
    fetch('/api/purchase-requisitions?status=APPROVED')
      .then(res => res.json())
      .then(data => {
        const list = data.value || data || [];
        setApprovedPrs(list.filter((pr: any) => !pr.linkedPoId));
      })
      .catch(err => console.error(err));
  }, []);

  // Prefill effect for single medicine (e.g. from low-stock alert)
  useEffect(() => {
    if (state?.prefilledMedicineId && medicines.length > 0) {
      const med = medicines.find(m => m.id === state.prefilledMedicineId);
      if (med) {
        setSelectedMedicineId(state.prefilledMedicineId);
        setUnitPrice(med.price || 0);
        setQuantity(100); // Prefill a sensible restock quantity
        if (med.supplierId) {
          setSelectedSupplierId(med.supplierId);
        }
      }
    }
  }, [state, medicines]);

  const handlePrSelect = async (prId: string) => {
    setSelectedPrId(prId);
    if (!prId) {
      setCart([]);
      setSelectedSupplierId("");
      return;
    }

    const selectedPr = approvedPrs.find(pr => pr._id === prId);
    if (!selectedPr) return;

    setIsPrefilling(true);

    const prItems = (selectedPr.items || []).map((item: any) => ({
      medicineId: item.medicineId,
      medicineName: item.medicineName,
      requestedQuantity: item.requestedQuantity || item.quantity || 0,
      unit: item.unit || "Hộp",
      prId: selectedPr._id,
      prCode: selectedPr.prCode,
    }));

    const itemMap = new Map();
    prItems.forEach(item => {
      if (!item || !item.medicineId) return;
      if (itemMap.has(item.medicineId)) {
        const existing = itemMap.get(item.medicineId);
        if (existing) {
          existing.quantity += item.requestedQuantity || 0;
          existing.prIds = [...(existing.prIds || []), item.prId];
        }
      } else {
        itemMap.set(item.medicineId, {
          ...item,
          quantity: item.requestedQuantity,
          prIds: [item.prId]
        });
      }
    });

    try {
      // Fetch only the medicines referenced in this PR (fast parallel fetch)
      const uniqueIds = [...itemMap.keys()];
      const results = await Promise.all(uniqueIds.map(id => fetchMedicineById(id)));
      
      const medMap = new Map<string, any>();
      results.forEach(med => {
        if (med) {
          const id = med.id || med._id;
          medMap.set(id, med);
        }
      });

      const newCart: any[] = [];
      itemMap.forEach((item, medicineId) => {
        const med = medMap.get(medicineId);
        if (med) {
          newCart.push({
            ...med,
            id: med.id || med._id,
            quantity: item.quantity,
            unitPrice: med.price || 0,
            prId: item.prId,
            prIds: item.prIds || []
          });
        }
      });

      if (newCart.length > 0) {
        setCart(newCart);
        if (newCart[0].supplierId) {
          setSelectedSupplierId(newCart[0].supplierId);
        }
      }
    } catch (err) {
      console.error('PR select prefill error:', err);
    } finally {
      setIsPrefilling(false);
    }
  };

  // Lấy thông tin NCC đang chọn
  const supplier = suppliers.find(s => s._id === selectedSupplierId);

  // Kiểm tra hạn GDP
  const isGdpExpired = supplier ? new Date(supplier.gdp_expiry_date) < new Date() : false;

  const handleAddMedicine = () => {
    setErrorMsg(null);
    if (!selectedMedicineId) return;

    const med = medicines.find(m => m.id === selectedMedicineId);
    if (!med) return;

    // Kiểm tra thẩm định pháp lý Thuốc (field 'expiry' từ API)
    const isMedExpired = med.expiry && new Date(med.expiry) < new Date();
    if (isMedExpired) {
      setErrorMsg(`Lỗi Thẩm Định: Số đăng ký của thuốc "${med.name}" đã hết hạn vào ngày ${new Date(med.expiry).toLocaleDateString()}. Không thể nhập hàng!`);
      return;
    }

    const finalPrice = unitPrice > 0 ? unitPrice : (med.price || 0);

    // Nếu thuốc đã có trong giỏ thì cộng thêm số lượng
    const existingIndex = cart.findIndex(item => item.id === med.id);
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += quantity;
      setCart(newCart);
    } else {
      setCart([...cart, { ...med, quantity, unitPrice: finalPrice }]);
    }

    // Reset form chọn thuốc
    setSelectedMedicineId("");
    setQuantity(1);
    setUnitPrice(0);
  };

  const handleRemoveItem = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  // Khi chọn thuốc → tự động điền giá đề xuất
  const handleMedicineSelect = (medId: string) => {
    setSelectedMedicineId(medId);
    setErrorMsg(null);
    const med = medicines.find(m => m.id === medId);
    if (med) setUnitPrice(med.price || 0);
    else setUnitPrice(0);
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  return (
    <div className="flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tạo Đơn Nhập Hàng (PO)</h1>
          <p className="text-slate-500 mt-1 text-sm">Kiểm tra pháp lý tự động & Lên đơn nhập hàng từ Nhà cung cấp</p>
        </div>
      </div>

      {/* Selector for Approved PRs */}
      {approvedPrs.length > 0 && (
        <div className="mb-6 bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
            <ClipboardList size={18} className="text-emerald-600" />
            Nhập nhanh từ Yêu cầu thuốc (PR) đã duyệt
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <label className="text-sm font-semibold text-slate-700 block mb-1.5">Chọn phiếu yêu cầu (PR)</label>
              <select
                value={selectedPrId}
                onChange={(e) => handlePrSelect(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
              >
                <option value="">-- Chọn phiếu PR để tự động điền đơn --</option>
                {approvedPrs.map(pr => (
                  <option key={pr._id} value={pr._id}>
                    {pr.prCode} ({pr.branchName}) - {pr.items?.length || 0} sản phẩm
                  </option>
                ))}
              </select>
            </div>
            {selectedPrId && (
              <button
                onClick={() => {
                  setSelectedPrId("");
                  setCart([]);
                  setSelectedSupplierId("");
                }}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-sm transition-colors cursor-pointer"
              >
                Xóa điền tự động
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT TRÁI: THÔNG TIN NCC & THÊM THUỐC */}
        <div className="lg:col-span-1 flex flex-col gap-6">

          {/* Box Chọn Nhà Cung Cấp */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 size={18} className="text-[#0057cd]" />
              1. Chọn Nhà Cung Cấp
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Nhà cung cấp</label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                >

                  <option value="">-- Chọn Nhà cung cấp --</option>
                  {suppliers.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Thông tin thẩm định NCC */}
              {supplier && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl border ${isGdpExpired ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}
                >
                  <div className="flex items-start gap-3">
                    {isGdpExpired ? (
                      <ShieldAlert size={20} className="text-rose-600 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h3 className={`font-bold text-sm ${isGdpExpired ? 'text-rose-800' : 'text-emerald-800'}`}>
                        {isGdpExpired ? 'LỖI THẨM ĐỊNH PHÁP LÝ' : 'Hồ sơ pháp lý hợp lệ'}
                      </h3>
                      <p className={`text-xs mt-1 leading-relaxed ${isGdpExpired ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {isGdpExpired
                          ? `Giấy chứng nhận GDP của "${supplier.name}" đã hết hạn vào ngày ${new Date(supplier.gdp_expiry_date).toLocaleDateString()}. Yêu cầu bộ phận R&D gia hạn hồ sơ trước khi nhập hàng!`
                          : `Giấy chứng nhận GDP còn hạn đến ${new Date(supplier.gdp_expiry_date).toLocaleDateString()}. Đủ điều kiện tạo đơn.`}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Box Thêm Thuốc (Chỉ hiện khi NCC hợp lệ) */}
          <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-6 transition-opacity ${(!supplier || isGdpExpired) ? 'opacity-50 pointer-events-none' : ''}`}>
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <PackagePlus size={18} className="text-[#0057cd]" />
              2. Thêm Thuốc Vào Đơn
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Sản phẩm thuốc</label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                  value={selectedMedicineId}
                  onChange={(e) => handleMedicineSelect(e.target.value)}
                >
                  <option value="">-- Chọn Thuốc Cần Nhập --</option>
                  {medicines.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Số lượng</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">
                  Đơn giá nhập (đ)
                  <span className="text-xs text-slate-400 font-normal ml-1">— tự điền từ giá tham khảo</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
                />
              </div>

              {errorMsg && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2 text-rose-600 bg-rose-50 p-3 rounded-xl text-xs font-semibold border border-rose-100">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </motion.div>
              )}

              <button
                onClick={handleAddMedicine}
                className="w-full py-2.5 bg-[#0057cd] hover:bg-[#004bb1] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Plus size={18} />
                Thêm vào đơn
              </button>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: CHI TIẾT ĐƠN HÀNG */}
        <div className="lg:col-span-2 flex flex-col h-full min-h-[500px]">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-800">Chi Tiết Đơn Nhập Hàng</h2>
              <p className="text-xs text-slate-500 mt-1">Danh sách các sản phẩm thuốc dự kiến nhập kho</p>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
              {isPrefilling ? (
                <div className="h-full flex flex-col items-center justify-center text-emerald-600 gap-3 py-16">
                  <Loader2 size={28} className="animate-spin" />
                  <p className="text-sm font-semibold text-slate-600">Đang tải dữ liệu từ PR...</p>
                  <p className="text-xs text-slate-400">Vui lòng chờ trong giây lát</p>
                </div>
              ) : cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-dashed border-slate-300">
                    <PackagePlus size={24} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-medium">Chưa có sản phẩm nào trong đơn.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-white border-b border-slate-100 text-slate-900 font-medium uppercase text-[11px] tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="px-5 py-3">Mã Thuốc</th>
                      <th className="px-5 py-3 w-[40%]">Tên Thuốc</th>
                      <th className="px-5 py-3 text-right">Đơn giá</th>
                      <th className="px-5 py-3 text-center">Số lượng</th>
                      <th className="px-5 py-3 text-right">Thành tiền</th>
                      <th className="px-5 py-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {cart.map((item) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-5 py-3 font-mono text-xs text-slate-400 max-w-[80px] truncate" title={item.id}>{item.id?.slice(-6)}</td>
                        <td className="px-5 py-3 font-bold text-slate-800">{item.name}</td>
                        <td className="px-5 py-3 text-right">{item.unitPrice.toLocaleString('vi-VN')}đ</td>
                        <td className="px-5 py-3 text-center font-bold text-[#0057cd]">{item.quantity}</td>
                        <td className="px-5 py-3 text-right font-bold text-slate-800">
                          {(item.unitPrice * item.quantity).toLocaleString('vi-VN')}đ
                        </td>
                        <td className="px-5 py-3 text-center">
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Tính Tiền */}
            <div className="p-6 border-t border-slate-100 bg-slate-50">
              <div className="flex justify-between items-center mb-6">
                <span className="text-slate-600 font-semibold">Tổng số lượng:</span>
                <span className="font-bold text-slate-900">{cart.reduce((s, i) => s + i.quantity, 0)} sản phẩm</span>
              </div>
              <div className="flex justify-between items-end border-t border-slate-200 pt-4 mb-6">
                <div>
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-widest block">TỔNG CỘNG</span>
                  <span className="text-xs text-slate-400 block mt-1">Đã bao gồm VAT</span>
                </div>
                <div className="text-3xl font-black text-[#0057cd] tracking-tight">
                  {totalAmount.toLocaleString('vi-VN')} đ
                </div>
              </div>

              <button
                onClick={async () => {
                  setIsSubmitting(true);
                  setErrorMsg(null);
                  try {
                    const res = await fetch('/api/purchase-orders', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        supplierId: selectedSupplierId,
                        items: cart.map(i => ({ medicineId: i.id, quantity: i.quantity, unitPrice: i.unitPrice })),
                        linkedPrId: cart[0]?.prId || "",
                        requisitionIds: [...new Set(cart.flatMap(i => i.prIds || []))].filter(Boolean)
                      })
                    });
                    const resData = await res.json();
                    if (res.ok) {
                      setSubmitSuccess(true);
                      setTimeout(() => navigate(-1), 1800);
                    } else {
                      // Hiển thị thông báo lỗi từ backend (GDP hết hạn, thuốc hết hạn, v.v)
                      setErrorMsg(resData?.message || resData?.error || 'Lỗi không xác định từ máy chủ');
                    }
                  } catch (e) {
                    setErrorMsg('Lỗi kết nối. Vui lòng kiểm tra máy chủ đang chạy.');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={cart.length === 0 || isSubmitting || isGdpExpired}
                className={`w-full py-3.5 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm
                  ${cart.length > 0 && !isSubmitting && !isGdpExpired
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
                `}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Đang xử lý...
                  </>
                ) : submitSuccess ? (
                  <><CheckCircle2 size={20} /> Tạo đơn thành công! Đang chuyển hướng...</>
                ) : (
                  <><CheckCircle2 size={20} /> Xác Nhập & Tạo Đơn</>
                )}
              </button>

              {/* Khu vực hiển thị lỗi từ backend (GDP hết hạn, thuốc hết hạn...) */}
              {errorMsg && !submitSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm font-semibold"
                >
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </motion.div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
