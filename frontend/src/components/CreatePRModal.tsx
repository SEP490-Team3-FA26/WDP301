import React, { useState, useMemo } from "react";
import { Plus, X, AlertTriangle, Loader2, ClipboardList, Package, Trash2, Send, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ShopFilterSidebar } from "./ShopFilterSidebar";
import { MedicineCard } from "./MedicineCard";

export function CreatePRModal({ medicines, onClose, onSuccess }: { medicines: any[]; onClose: () => void; onSuccess: (msg: string) => void }) {
  const [branchName, setBranchName] = useState("Chi nhánh Quận 1");
  const [reason, setReason] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [items, setItems] = useState<{ medicineId: string; quantity: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  
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

  const addItem = (medicineId: string, quantity: number) => {
    if (quantity <= 0) {
      setErr("Số lượng phải lớn hơn 0");
      return;
    }
    const idx = items.findIndex(i => i.medicineId === medicineId);
    if (idx >= 0) {
      const u = [...items];
      u[idx].quantity += quantity;
      setItems(u);
    } else {
      setItems([...items, { medicineId, quantity }]);
    }
    setErr(null);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItemQuantity = (idx: number, newQty: number) => {
    if (newQty <= 0) {
      removeItem(idx);
      return;
    }
    const u = [...items];
    u[idx].quantity = newQty;
    setItems(u);
  };

  const getMedDetails = (id: string) => medicines.find(m => m.id === id || m._id === id);
  const getMedName = (id: string) => getMedDetails(id)?.name || id.slice(-8);

  const handleSubmit = async () => {
    if (items.length === 0) {
      setErr("Vui lòng thêm ít nhất 1 sản phẩm vào danh sách");
      return;
    }
    if (!reason.trim()) {
      setErr("Vui lòng nhập lý do yêu cầu");
      return;
    }
    setIsSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/purchase-requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchName,
          reason,
          isUrgent,
          items: items.map(i => ({ medicineId: i.medicineId, requestedQuantity: i.quantity })),
        }),
      });
      const resData = await res.json();
      onSuccess(resData.message || "Gửi yêu cầu thành công!");
    } catch (e: any) {
      setErr(e.response?.data?.message || "Lỗi tạo yêu cầu");
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
        className="relative bg-[#f8fafc] rounded-2xl shadow-2xl w-full max-w-[1400px] h-[90vh] flex flex-col overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-sm">
              <Send size={20} />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-lg">Tạo Yêu Cầu Nhập Thuốc Mới</h2>
              <p className="text-xs font-semibold text-blue-700">Bước 1 — Gửi Purchase Requisition (PR) lên Trụ sở</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Left Column: Filter Sidebar */}
          <div className="w-full md:w-64 lg:w-72 border-r border-slate-200 bg-white flex flex-col overflow-y-auto shrink-0 p-5">
            <ShopFilterSidebar 
              selectedTargetGroup={selectedTargetGroup}
              setSelectedTargetGroup={setSelectedTargetGroup}
              selectedPriceRange={selectedPriceRange}
              setSelectedPriceRange={setSelectedPriceRange}
              selectedFlavour={selectedFlavour}
              setSelectedFlavour={setSelectedFlavour}
              selectedCountry={selectedCountry}
              setSelectedCountry={setSelectedCountry}
              selectedBrand={selectedBrand}
              setSelectedBrand={setSelectedBrand}
              selectedIndication={selectedIndication}
              setSelectedIndication={setSelectedIndication}
              selectedBrandOrigin={selectedBrandOrigin}
              setSelectedBrandOrigin={setSelectedBrandOrigin}
              selectedIngredient={selectedIngredient}
              setSelectedIngredient={setSelectedIngredient}
              selectedClassification={selectedClassification}
              setSelectedClassification={setSelectedClassification}
              expandedSections={expandedSections}
              toggleSection={toggleSection}
              handleResetFilters={handleResetFilters}
              hasAnyFilter={hasAnyFilter}
            />
          </div>

          {/* Middle Column: Medicine Grid */}
          <div className="flex-1 bg-slate-50 overflow-y-auto p-5 flex flex-col min-h-0">
            <div className="mb-4 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm thuốc (tên, mã)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
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
                    added={items.some(i => i.medicineId === (med.id || med._id))} 
                    onAddToCart={(m, q) => addItem(m.id || m._id, q)} 
                    onClick={() => {}} 
                  />
                ))
              )}
            </div>
          </div>

          {/* Right Column: Cart & General Info */}
          <div className="w-full md:w-80 lg:w-96 border-l border-slate-200 bg-white flex flex-col shrink-0">
            <div className="p-5 flex-1 overflow-y-auto space-y-5">
              
              {/* Form Thông tin chung */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60 space-y-3.5 shadow-sm">
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                  <ClipboardList size={14} className="text-blue-600" />
                  Thông tin chung
                </h3>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">CHI NHÁNH YÊU CẦU</label>
                  <select
                    value={branchName}
                    onChange={e => setBranchName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-sm"
                  >
                    <option>Chi nhánh Quận 1</option>
                    <option>Chi nhánh Quận 7</option>
                    <option>Chi nhánh Thủ Đức</option>
                    <option>Chi nhánh Bình Thạnh</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">LÝ DO YÊU CẦU *</label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="VD: Cần bổ sung kho..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="isUrgent"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                  />
                  <label htmlFor="isUrgent" className="text-sm font-bold text-rose-700 cursor-pointer">
                    Yêu Cầu Hỏa Tốc
                  </label>
                </div>
              </div>

              {/* Added Items */}
              <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col bg-slate-50 flex-1">
                <div className="px-4 py-3 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Package size={14} className="text-blue-600" />
                    Đã thêm
                  </span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold rounded-full">
                    {items.length} thuốc
                  </span>
                </div>
                <div className="p-3 flex-1 overflow-y-auto space-y-2 max-h-60">
                  <AnimatePresence initial={false}>
                    {items.length === 0 ? (
                      <div className="text-center py-6 text-slate-400">
                        <p className="text-xs font-bold text-slate-500">Chưa có thuốc nào</p>
                      </div>
                    ) : (
                      items.map((it, i) => {
                        const med = getMedDetails(it.medicineId);
                        return (
                          <motion.div
                            key={it.medicineId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <span className="text-xs font-bold text-slate-800 block truncate" title={med?.name}>
                                {getMedName(it.medicineId)}
                              </span>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] font-semibold text-slate-500">SL:</span>
                                <div className="flex items-center bg-slate-100 rounded-md border border-slate-200 overflow-hidden">
                                  <button onClick={() => updateItemQuantity(i, it.quantity - 1)} className="px-2 py-0.5 text-slate-600 hover:text-blue-600 hover:bg-slate-200 transition-colors font-bold cursor-pointer">-</button>
                                  <input 
                                    type="number" 
                                    value={it.quantity} 
                                    onChange={(e) => updateItemQuantity(i, parseInt(e.target.value) || 0)} 
                                    className="w-10 text-center text-xs font-bold text-blue-600 bg-transparent border-none focus:outline-none focus:ring-0 p-0 hide-arrow h-5"
                                  />
                                  <button onClick={() => updateItemQuantity(i, it.quantity + 1)} className="px-2 py-0.5 text-slate-600 hover:text-blue-600 hover:bg-slate-200 transition-colors font-bold cursor-pointer">+</button>
                                </div>
                              </div>
                            </div>
                            <button onClick={() => removeItem(i)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                              <Trash2 size={14} />
                            </button>
                          </motion.div>
                        );
                      })
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {err && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={15} />
                  {err}
                </div>
              )}

            </div>
            
            {/* Right Footer Action */}
            <div className="p-5 border-t border-slate-200 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || items.length === 0}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-sm disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg disabled:shadow-none"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu nhập thuốc"}
              </button>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
