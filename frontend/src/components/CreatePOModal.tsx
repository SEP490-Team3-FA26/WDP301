import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, AlertTriangle, CheckCircle2, PackagePlus, Loader2, Search, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ShopFilterSidebar } from "./ShopFilterSidebar";
import { MedicineCard } from "./MedicineCard";
import api from "../services/core/api";

export function CreatePOModal({ prefillPrItems, onClose, onSuccess }: { prefillPrItems?: any[]; onClose: () => void; onSuccess: () => void }) {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrefilling, setIsPrefilling] = useState(false);
  const prefillDone = useRef(false);

  const [searchQuery, setSearchQuery] = useState("");

  // Advanced Filter states
  const [selectedTargetGroup, setSelectedTargetGroup] = useState("");
  const [selectedPriceRange, setSelectedPriceRange] = useState("");
  const [selectedFlavour, setSelectedFlavour] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedIndication, setSelectedIndication] = useState("");
  const [selectedBrandOrigin, setSelectedBrandOrigin] = useState("");
  const [selectedIngredient, setSelectedIngredient] = useState("");
  const [selectedClassification, setSelectedClassification] = useState("");

  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    targetGroup: true,
    country: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleResetFilters = () => {
    setSelectedTargetGroup("");
    setSelectedPriceRange("");
    setSelectedFlavour("");
    setSelectedCountry("");
    setSelectedBrand("");
    setSelectedIndication("");
    setSelectedBrandOrigin("");
    setSelectedIngredient("");
    setSelectedClassification("");
  };

  const hasAnyFilter = !!(selectedTargetGroup || selectedPriceRange || selectedFlavour || selectedCountry || selectedBrand || selectedIndication || selectedBrandOrigin || selectedIngredient || selectedClassification);

  // Fetch full medicines for filtering
  useEffect(() => {
    Promise.all([
      api.get('/api/medicines?limit=500').then(res => res.data),
      api.get('/api/suppliers').then(res => res.data)
    ]).then(([medData, supData]) => {
      setMedicines(Array.isArray(medData?.data) ? medData.data : []);
      setSuppliers(Array.isArray(supData) ? supData : []);
    }).catch(err => {
      console.error("Lỗi khi tải dữ liệu thuốc/nhà cung cấp:", err);
      setMedicines([]);
      setSuppliers([]);
    });
  }, []);

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
    if (!prefillPrItems || prefillPrItems.length === 0) return;

    prefillDone.current = true;
    setIsPrefilling(true);

    const itemMap = new Map<string, any>();
    prefillPrItems.forEach(item => {
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
        }
      })
      .catch(err => console.error('Prefill error:', err))
      .finally(() => setIsPrefilling(false));
  }, [prefillPrItems]);

  const filteredMedicines = useMemo(() => {
    return medicines.filter(m => {
      if (searchQuery && !m.name?.toLowerCase().includes(searchQuery.toLowerCase()) && !m.id?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (selectedTargetGroup && m.targetGroup && m.targetGroup !== selectedTargetGroup) return false;
      if (selectedCountry && m.country && m.country !== selectedCountry) return false;
      if (selectedBrand && m.brand && m.brand !== selectedBrand) return false;
      if (selectedIndication && m.indication && m.indication !== selectedIndication) return false;
      if (selectedBrandOrigin && m.brandOrigin && m.brandOrigin !== selectedBrandOrigin) return false;
      if (selectedIngredient && m.ingredient && m.ingredient !== selectedIngredient) return false;
      if (selectedClassification && m.classification && m.classification !== selectedClassification) return false;
      if (selectedFlavour && m.flavour && m.flavour !== selectedFlavour) return false;
      return true;
    });
  }, [medicines, searchQuery, selectedTargetGroup, selectedCountry, selectedBrand, selectedIndication, selectedBrandOrigin, selectedIngredient, selectedClassification, selectedFlavour]);

  const getSupplierName = (id: string) => {
    if (!id) return "Không có thông tin";
    const s = suppliers.find(sup => sup._id === id || sup.id === id);
    return s ? s.name : id;
  };

  const handleAddMedicine = (med: any, quantity: number) => {
    setErrorMsg(null);
    if (!med) return;

    // Check expiry
    const isMedExpired = med.expiry && new Date(med.expiry) < new Date();
    if (isMedExpired) {
      setErrorMsg(`Lỗi Thẩm Định: Số đăng ký của thuốc "${med.name}" đã hết hạn vào ngày ${new Date(med.expiry).toLocaleDateString()}. Không thể nhập hàng!`);
      return;
    }

    const finalPrice = med.price || 0;
    const medId = med.id || med._id;

    const existingIndex = cart.findIndex(item => item.id === medId);
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += quantity;
      setCart(newCart);
    } else {
      setCart([...cart, { ...med, id: medId, quantity, unitPrice: finalPrice }]);
    }
  };

  const handleRemoveItem = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const updateItemQuantity = (id: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(id);
      return;
    }
    const newCart = [...cart];
    const idx = newCart.findIndex(item => item.id === id);
    if (idx >= 0) {
      newCart[idx].quantity = newQty;
      setCart(newCart);
    }
  };

  const updateItemPrice = (id: string, newPrice: number) => {
    const newCart = [...cart];
    const idx = newCart.findIndex(item => item.id === id);
    if (idx >= 0) {
      newCart[idx].unitPrice = newPrice;
      setCart(newCart);
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  const isGdpExpired = cart.some(item => {
    const supplier = suppliers.find(s => s._id === item.supplierId || s.id === item.supplierId);
    if (!supplier) return false;
    return supplier.gdp_expiry_date && new Date(supplier.gdp_expiry_date) < new Date();
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/purchase-orders/auto-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map(i => ({ medicineId: i.id, quantity: i.quantity, unitPrice: i.unitPrice })),
          prIds: [...new Set(cart.flatMap(i => i.prIds || []))].filter(Boolean)
        })
      });
      const resData = await res.json();
      if (res.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1800);
      } else {
        setErrorMsg(resData?.message || resData?.error || 'Lỗi không xác định từ máy chủ');
      }
    } catch (e) {
      setErrorMsg('Lỗi kết nối. Vui lòng kiểm tra máy chủ đang chạy.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-[#f8fafc] rounded-2xl shadow-2xl w-full max-w-[1500px] h-[90vh] flex flex-col overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-sm">
              <PackagePlus size={20} />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-lg">Tạo Đơn Nhập Hàng (PO) - Auto Routing</h2>
              <p className="text-xs font-semibold text-slate-500">Hệ thống sẽ tự động tách nhóm thuốc theo từng Nhà Cung Cấp</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left Column: Filter Sidebar */}
          <div className="w-full md:w-64 lg:w-72 border-r border-slate-200 bg-white flex flex-col overflow-y-auto shrink-0 p-5">
            <ShopFilterSidebar 
              selectedTargetGroup={selectedTargetGroup} setSelectedTargetGroup={setSelectedTargetGroup}
              selectedPriceRange={selectedPriceRange} setSelectedPriceRange={setSelectedPriceRange}
              selectedFlavour={selectedFlavour} setSelectedFlavour={setSelectedFlavour}
              selectedCountry={selectedCountry} setSelectedCountry={setSelectedCountry}
              selectedBrand={selectedBrand} setSelectedBrand={setSelectedBrand}
              selectedIndication={selectedIndication} setSelectedIndication={setSelectedIndication}
              selectedBrandOrigin={selectedBrandOrigin} setSelectedBrandOrigin={setSelectedBrandOrigin}
              selectedIngredient={selectedIngredient} setSelectedIngredient={setSelectedIngredient}
              selectedClassification={selectedClassification} setSelectedClassification={setSelectedClassification}
              expandedSections={expandedSections} toggleSection={toggleSection}
              handleResetFilters={handleResetFilters} hasAnyFilter={hasAnyFilter}
            />
          </div>

          {/* Middle Column: Medicine Grid */}
          <div className="flex-1 bg-slate-50 overflow-y-auto p-5 flex flex-col min-h-0">
            <div className="mb-4 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Tìm kiếm thuốc (tên, mã)..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
              {filteredMedicines.length === 0 ? (
                <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400">
                  <Search size={40} className="mb-4 opacity-50" />
                  <p className="text-sm font-bold">Không tìm thấy thuốc phù hợp</p>
                </div>
              ) : (
                filteredMedicines.map(med => (
                  <MedicineCard 
                    key={med.id || med._id} 
                    med={med} 
                    added={cart.some(i => i.id === (med.id || med._id))} 
                    onAddToCart={(m, q) => handleAddMedicine(m, q)} 
                    onClick={() => {}} 
                  />
                ))
              )}
            </div>
          </div>

          {/* Right Column: PO Cart */}
          <div className="w-full md:w-[450px] lg:w-[500px] xl:w-[600px] border-l border-slate-200 bg-white flex flex-col shrink-0">
            <div className="p-5 flex-1 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-4 shrink-0">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <PackagePlus size={16} className="text-blue-600" />
                  Chi Tiết Đơn Nhập
                </h3>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-100">
                  {cart.length} sản phẩm
                </span>
              </div>

              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 custom-scrollbar relative">
                {isPrefilling ? (
                  <div className="h-full flex flex-col items-center justify-center text-emerald-600 gap-3">
                    <Loader2 size={28} className="animate-spin" />
                    <p className="text-sm font-bold">Đang tải dữ liệu từ PR...</p>
                  </div>
                ) : cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3">
                    <PackagePlus size={36} className="opacity-50" />
                    <p className="text-sm font-bold">Chưa có thuốc trong đơn.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs text-slate-600 bg-white">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 w-[40%]">Tên Thuốc / NCC</th>
                        <th className="px-4 py-3 text-right w-[20%]">Đơn giá (đ)</th>
                        <th className="px-4 py-3 text-center w-[20%]">SL</th>
                        <th className="px-4 py-3 text-right w-[15%]">Tổng</th>
                        <th className="px-4 py-3 text-center w-[5%]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <AnimatePresence>
                        {cart.map((item) => (
                          <motion.tr key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 align-top">
                              <span className="font-bold text-slate-800 block line-clamp-2 leading-tight mb-1" title={item.name}>{item.name}</span>
                              <span className="text-[10px] font-semibold text-slate-500 block truncate" title={getSupplierName(item.supplierId)}>{getSupplierName(item.supplierId)}</span>
                            </td>
                            <td className="px-4 py-3 align-top">
                              <input 
                                type="number" value={item.unitPrice} onChange={e => updateItemPrice(item.id, parseInt(e.target.value) || 0)}
                                className="w-full text-right text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-blue-500 hide-arrow"
                              />
                            </td>
                            <td className="px-4 py-3 align-top text-center">
                              <div className="flex items-center justify-center bg-slate-100 rounded border border-slate-200 overflow-hidden">
                                <button onClick={() => updateItemQuantity(item.id, item.quantity - 1)} className="px-2 py-1 text-slate-600 hover:bg-slate-200 font-bold">-</button>
                                <input type="number" value={item.quantity} onChange={e => updateItemQuantity(item.id, parseInt(e.target.value) || 0)} className="w-10 text-center text-xs font-bold text-blue-600 bg-transparent border-none p-0 focus:ring-0 hide-arrow" />
                                <button onClick={() => updateItemQuantity(item.id, item.quantity + 1)} className="px-2 py-1 text-slate-600 hover:bg-slate-200 font-bold">+</button>
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top text-right font-bold text-slate-800">
                              {(item.unitPrice * item.quantity).toLocaleString('vi-VN')}
                            </td>
                            <td className="px-4 py-3 align-top text-center">
                              <button onClick={() => handleRemoveItem(item.id)} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded transition-colors"><Trash2 size={14} /></button>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                )}
              </div>

              {/* Warnings */}
              {errorMsg && !submitSuccess && (
                <div className="mt-4 flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              )}
              {isGdpExpired && (
                <div className="mt-4 flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed">Cảnh báo: Có nhà cung cấp đã hết hạn GDP. Hệ thống sẽ chặn tạo đơn.</span>
                </div>
              )}
            </div>

            {/* Footer Action */}
            <div className="p-5 border-t border-slate-200 bg-slate-50 shrink-0 space-y-4">
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">TỔNG CỘNG</span>
                  <span className="text-[10px] text-slate-400">Đã bao gồm VAT</span>
                </div>
                <div className="text-2xl font-black text-blue-600 tracking-tight">
                  {totalAmount.toLocaleString('vi-VN')} đ
                </div>
              </div>
              <button
                onClick={handleSubmit}
                disabled={cart.length === 0 || isSubmitting || isGdpExpired}
                className={`w-full py-3.5 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm text-sm
                  ${cart.length > 0 && !isSubmitting && !isGdpExpired ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}
                `}
              >
                {isSubmitting ? <><Loader2 size={18} className="animate-spin" /> Đang xử lý...</> 
                : submitSuccess ? <><CheckCircle2 size={18} /> Thành công!</> 
                : <><CheckCircle2 size={18} /> Tạo Đơn Nhập Hàng</>}
              </button>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
