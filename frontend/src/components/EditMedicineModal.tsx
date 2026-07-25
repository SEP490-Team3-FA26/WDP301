import React, { useState, useEffect } from "react";
import { X, Edit3, Pill, AlertCircle, Building2, Tag, ShieldAlert, DollarSign, Package, Save } from "lucide-react";
import { medicineService, Medicine } from "../services/inventory/medicine.service";
import { supplierService, Supplier } from "../services/purchase/supplier.service";

interface EditMedicineModalProps {
  isOpen: boolean;
  product: Medicine | null;
  onClose: () => void;
  onSuccess: (updatedMedicine: any) => void;
}

export function EditMedicineModal({ isOpen, product, onClose, onSuccess }: EditMedicineModalProps) {
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    barcode: "",
    category: "Thuốc thường",
    drug_classification: "NORMAL",
    active_ingredient: "",
    dosage_form: "Viên nén",
    unit: "Hộp",
    price: 0,
    manufacturer: "",
    registration_number: "",
    supplierId: "",
    safetyStock: 50,
    reorderPoint: 100,
    cong_dung: "",
    cach_dung: "",
    tac_dung_phu: "",
    status: "ACTIVE",
  });

  useEffect(() => {
    if (isOpen && product) {
      setFormData({
        name: product.name || "",
        sku: product.sku || "",
        barcode: (product as any).barcode || "",
        category: (product as any).category || "Thuốc thường",
        drug_classification: product.drug_classification || (product as any).type || "NORMAL",
        active_ingredient: product.active_ingredient || "",
        dosage_form: (product as any).dosage_form || "Viên nén",
        unit: product.unit || "Hộp",
        price: product.price ?? 0,
        manufacturer: (product as any).manufacturer || "",
        registration_number: (product as any).registration_number || "",
        supplierId: product.supplierId || "",
        safetyStock: (product as any).safetyStock ?? 50,
        reorderPoint: (product as any).reorderPoint ?? 100,
        cong_dung: (product as any).cong_dung || "",
        cach_dung: (product as any).cach_dung || "",
        tac_dung_phu: (product as any).tac_dung_phu || "",
        status: product.status || "ACTIVE",
      });

      // Fetch suppliers for select dropdown
      supplierService.getSuppliers()
        .then(data => setSuppliers(data || []))
        .catch(() => setSuppliers([]));
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("Vui lòng nhập tên dược phẩm");
      return;
    }
    if (formData.price < 0) {
      setErrorMsg("Giá bán không được nhỏ hơn 0");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      const result = await medicineService.updateMedicine(product.id, {
        ...formData,
        price: Number(formData.price),
        safetyStock: Number(formData.safetyStock),
        reorderPoint: Number(formData.reorderPoint),
      });

      onSuccess(result);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Có lỗi xảy ra khi cập nhật dược phẩm");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Edit3 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Cập nhật thông tin Dược phẩm</h2>
              <p className="text-xs text-slate-500">Mã SKU: <span className="font-mono font-bold text-slate-700">{formData.sku || product.id}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-xs font-semibold text-red-700">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tên dược phẩm <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Panadol Extra 500mg"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/30 focus:border-[#0057cd] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Tag size={12} /> Mã SKU
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/30 focus:border-[#0057cd] transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Tag size={12} /> Mã Vạch / Barcode
              </label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/30 focus:border-[#0057cd] transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Phân loại thuốc
              </label>
              <select
                value={formData.drug_classification}
                onChange={(e) => setFormData({ ...formData, drug_classification: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/30 focus:border-[#0057cd] transition-all"
              >
                <option value="NORMAL">Thuốc thường</option>
                <option value="PRESCRIPTION">Thuốc kê đơn (Rx)</option>
                <option value="PRESCRIPTION_ANTIBIOTIC">Thuốc kháng sinh kê đơn</option>
                <option value="PSYCHOTROPIC">Thuốc hướng thần / Kiểm soát đặc biệt</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Danh mục sản phẩm
              </label>
              <input
                type="text"
                placeholder="VD: Thuốc giảm đau, Kháng sinh, ..."
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/30 focus:border-[#0057cd] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Hoạt chất chính
              </label>
              <input
                type="text"
                placeholder="VD: Paracetamol 500mg, Caffeine 65mg"
                value={formData.active_ingredient}
                onChange={(e) => setFormData({ ...formData, active_ingredient: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/30 focus:border-[#0057cd] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <DollarSign size={12} /> Giá bán chung (đ) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/30 focus:border-[#0057cd] transition-all font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Đơn vị tính
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/30 focus:border-[#0057cd] transition-all"
              >
                <option value="Hộp">Hộp</option>
                <option value="Vỉ">Vỉ</option>
                <option value="Viên">Viên</option>
                <option value="Chai">Chai</option>
                <option value="Lọ">Lọ</option>
                <option value="Tuýp">Tuýp</option>
                <option value="Gói">Gói</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Building2 size={12} /> Nhà cung cấp
              </label>
              <select
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/30 focus:border-[#0057cd] transition-all"
              >
                <option value="">-- Chọn Nhà cung cấp (Tùy chọn) --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code || s.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nhà sản xuất
              </label>
              <input
                type="text"
                placeholder="VD: Dược Hậu Giang, Sanofi, ..."
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/30 focus:border-[#0057cd] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Số đăng ký (SĐK)
              </label>
              <input
                type="text"
                placeholder="VD: VD-12345-20"
                value={formData.registration_number}
                onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/30 focus:border-[#0057cd] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <ShieldAlert size={12} /> Ngưỡng tồn an toàn (Safety Stock)
              </label>
              <input
                type="number"
                min="0"
                value={formData.safetyStock}
                onChange={(e) => setFormData({ ...formData, safetyStock: Number(e.target.value) })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/30 focus:border-[#0057cd] transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Công dụng / Chỉ định
              </label>
              <textarea
                rows={2}
                placeholder="Mô tả ngắn gọn công dụng của thuốc..."
                value={formData.cong_dung}
                onChange={(e) => setFormData({ ...formData, cong_dung: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/30 focus:border-[#0057cd] transition-all resize-none"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-[#0057cd] hover:bg-[#004bb1] text-white text-sm font-semibold transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Đang lưu...</span>
              ) : (
                <>
                  <Save size={16} />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
