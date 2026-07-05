import { useEffect, useMemo, useState } from "react";
import { Plus, Search, PackageSearch, Activity, Pill, AlertCircle, Edit2, X, CheckCircle2, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { medicineService, type Medicine } from "../../services/medicine.service";

export function Products() {
  const [products, setProducts] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const userRole = localStorage.getItem("userRole");
  const isAdmin = userRole === "admin";

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Medicine | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "error" }[]>([]);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await medicineService.getMedicines({ limit: 100 });
      setProducts(data.data || []);
    } catch {
      setProducts([]);
      showToast("Không thể tải danh sách sản phẩm", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const canEditPrice = useMemo(() => isAdmin, [isAdmin]);

  const openEditModal = (product: Medicine) => {
    if (!canEditPrice) return;
    setEditingProduct(product);
    setEditPrice(String(product.price ?? 0));
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingProduct(null);
    setEditPrice("");
  };

  const handleSavePrice = async () => {
    if (!editingProduct) return;
    try {
      setSaving(true);
      const priceNum = Number(editPrice);
      if (isNaN(priceNum) || priceNum < 0) {
        showToast("Giá không hợp lệ", "error");
        return;
      }

      await medicineService.updatePrice(editingProduct.id, priceNum);
      setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? { ...p, price: priceNum } : p)));
      showToast("Cập nhật giá thành công", "success");
      closeEditModal();
    } catch {
      showToast("Có lỗi xảy ra khi cập nhật giá", "error");
    } finally {
      setSaving(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "PRESCRIPTION":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200"><AlertCircle size={12}/> Thuốc kê đơn</span>;
      case "PSYCHOTROPIC":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200"><Activity size={12}/> Hướng thần</span>;
      case "NORMAL":
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><Pill size={12}/> Thuốc thường</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh mục Dược phẩm</h1>
          <p className="text-slate-500 mt-1">Quản lý SKU và cập nhật giá bán</p>
        </div>
        <button className="bg-[#0057cd] hover:bg-[#004bb1] text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm">
          <Plus size={18} />
          <span>Thêm Dược phẩm (SKU)</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm theo mã SKU, tên thuốc..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd] transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-white border-b border-slate-200 text-slate-900 font-medium uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4">Mã SKU</th>
                <th className="px-6 py-4">Tên Dược Phẩm</th>
                <th className="px-6 py-4">Phân loại</th>
                <th className="px-6 py-4 text-right">Giá bán</th>
                {canEditPrice && <th className="px-6 py-4 text-center">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8">Đang tải dữ liệu...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8">Không có dữ liệu</td></tr>
              ) : products.map((product) => (
                <motion.tr 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={product.id} 
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-500">
                    {product.sku || product.id.slice(-6).toUpperCase()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#f2f3ff] flex items-center justify-center text-[#0057cd] shrink-0">
                        {product.image ? (
                          <img src={product.image} alt="" className="w-8 h-8 object-contain" />
                        ) : (
                          <PackageSearch size={20} />
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 line-clamp-1">{product.name}</span>
                        <span className="text-xs text-slate-400 block">{product.active_ingredient}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getTypeBadge(product.drug_classification || product.type || "NORMAL")}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">
                    <>{(product.price || 0).toLocaleString("vi-VN")} đ</>
                  </td>
                  {canEditPrice && (
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEditModal(product)} className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200">
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showEditModal && editingProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={closeEditModal}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Cập nhật giá</h2>
                  <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{editingProduct.name}</p>
                </div>
                <button onClick={closeEditModal} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Giá mới (VNĐ)</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd]"
                    autoFocus
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={closeEditModal}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSavePrice}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium bg-[#0057cd] text-white hover:bg-[#004bb1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Lưu
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4.5 py-3.5 rounded-2xl shadow-xl border text-xs font-bold tracking-wide uppercase transition-all duration-300 ${toast.type === "error"
              ? "bg-rose-50 text-rose-800 border-rose-200 shadow-rose-100/50"
              : "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-100/50"
              }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === "error" ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
              <span className="leading-tight">{toast.message}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
