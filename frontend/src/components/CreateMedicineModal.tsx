import React, { useState, useEffect } from "react";
import { X, Plus, Pill, AlertCircle, Building2, Tag, ShieldAlert, DollarSign, Package } from "lucide-react";
import { medicineService } from "../services/inventory/medicine.service";
import { supplierService, Supplier } from "../services/purchase/supplier.service";

interface CreateMedicineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newMedicine: any) => void;
}

export function CreateMedicineModal({ isOpen, onClose, onSuccess }: CreateMedicineModalProps) {
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
    stock: 0,
    safetyStock: 50,
    reorderPoint: 100,
    cong_dung: "",
    cach_dung: "",
    tac_dung_phu: "",
  });

  useEffect(() => {
    if (isOpen) {
      // Fetch suppliers for select dropdown
      supplierService.getSuppliers()
        .then(data => setSuppliers(data || []))
        .catch(() => setSuppliers([]));
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
      const result = await medicineService.createMedicine({
        ...formData,
        price: Number(formData.price),
        stock: Number(formData.stock),
        safetyStock: Number(formData.safetyStock),
        reorderPoint: Number(formData.reorderPoint),
      });

      onSuccess(result);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Có lỗi xảy ra khi tạo dược phẩm");
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
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0057cd] flex items-center justify-center font-bold">
              <Pill size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Thêm Dược phẩm mới (SKU)</h2>
              <p className="text-xs text-slate-500">Khai báo danh mục và thông tin quản lý dược phẩm</p>
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

          {/* Basic Info */}
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
                <Tag size={12} /> Mã SKU (Auto nếu trống)
              </label>
              <input
                type="text"
                placeholder="Tự động tạo nếu để trống"
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
                placeholder="Nhập mã vạch hoặc để trống"
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
                <Package size={12} /> Tồn kho ban đầu
              </label>
              <input
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
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
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Tạo Dược phẩm</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
