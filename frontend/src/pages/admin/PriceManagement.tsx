import { useState, useEffect, useCallback } from "react";
import {
  Tag, Search, Plus, Copy, Trash2, Edit3, X, Check, ChevronDown,
  Building2, DollarSign, Layers, AlertCircle, RefreshCw, Save
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { branchService } from "../../services/admin/branch.service";
import { medicineService } from "../../services/inventory/medicine.service";
import { pricingService } from "../../services/inventory/pricing.service";

interface WholesaleTier {
  minQuantity: number;
  price: number;
}

interface PriceEntry {
  id: string;
  branchId: string;
  medicineId: string;
  medicineName: string;
  medicineSku: string;
  medicineUnit: string;
  defaultPrice: number;
  retailPrice: number | null;
  wholesalePrice: number | null;
  wholesaleTiers: WholesaleTier[];
  isActive: boolean;
  updatedAt: string;
}

interface Branch {
  _id: string;
  branchCode: string;
  name: string;
}

interface Medicine {
  _id: string;
  name: string;
  sku?: string;
  price: number;
  unit?: string;
}

// Utility to format VND
const formatVND = (val: number | null | undefined) => {
  if (val == null || val === 0) return "—";
  return val.toLocaleString("vi-VN") + " đ";
};

export function PriceManagement() {
  // Decode JWT to get user role and branchId
  const getAuthInfo = () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return { role: "", branchId: "" };
      const payload = JSON.parse(atob(token.split(".")[1]));
      return { role: payload.role || "", branchId: payload.branchId || "" };
    } catch {
      return { role: "", branchId: "" };
    }
  };
  const { role: userRole, branchId: userBranchId } = getAuthInfo();

  // State
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>(userBranchId || "");
  const [priceList, setPriceList] = useState<PriceEntry[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PriceEntry | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medSearch, setMedSearch] = useState("");

  // Edit form state
  const [formRetailPrice, setFormRetailPrice] = useState<string>("");
  const [formWholesalePrice, setFormWholesalePrice] = useState<string>("");
  const [formTiers, setFormTiers] = useState<WholesaleTier[]>([]);
  const [formIsActive, setFormIsActive] = useState(true);

  // Copy modal state
  const [copyToBranch, setCopyToBranch] = useState<string>("");
  const [copyLoading, setCopyLoading] = useState(false);
  const [syncAll, setSyncAll] = useState(false);

  // Add modal state
  const [addMedicineId, setAddMedicineId] = useState<string>("");

  // Fetch branches
  useEffect(() => {
    branchService.getBranches()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setBranches(list);
        if (!selectedBranch && list.length > 0) {
          setSelectedBranch(list[0]._id);
        }
      })
      .catch(() => setBranches([]));
  }, []);

  // Fetch price list for selected branch
  const fetchPriceList = useCallback(async () => {
    if (!selectedBranch) return;
    setLoading(true);
    try {
      const data = await pricingService.getBranchPrices(selectedBranch, {
        page: pagination.page,
        limit: pagination.limit,
        search,
      });
      setPriceList(data.data || []);
      if (data.pagination) setPagination(data.pagination);
    } catch {
      setPriceList([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, pagination.page, search]);

  useEffect(() => {
    fetchPriceList();
  }, [fetchPriceList]);

  // Fetch medicines (for add modal)
  const fetchMedicines = async (q: string = "") => {
    try {
      const data = await medicineService.getMedicines({
        page: 1,
        limit: 50,
        search: q,
      });
      setMedicines(data.data || []);
    } catch {
      setMedicines([]);
    }
  };

  // Open edit modal
  const openEditModal = (item: PriceEntry) => {
    setEditingItem(item);
    setFormRetailPrice(item.retailPrice != null ? String(item.retailPrice) : "");
    setFormWholesalePrice(item.wholesalePrice != null ? String(item.wholesalePrice) : "");
    setFormTiers(item.wholesaleTiers?.length ? [...item.wholesaleTiers] : []);
    setFormIsActive(item.isActive);
    setShowEditModal(true);
  };

  // Open add modal
  const openAddModal = () => {
    setAddMedicineId("");
    setFormRetailPrice("");
    setFormWholesalePrice("");
    setFormTiers([]);
    setFormIsActive(true);
    setMedSearch("");
    fetchMedicines();
    setShowAddModal(true);
  };

  // Save price (upsert)
  const handleSavePrice = async (medicineId: string) => {
    if (!selectedBranch || !medicineId) return;
    try {
      const body: any = { isActive: formIsActive };
      if (formRetailPrice !== "") body.retailPrice = Number(formRetailPrice);
      if (formWholesalePrice !== "") body.wholesalePrice = Number(formWholesalePrice);
      if (formTiers.length > 0) body.wholesaleTiers = formTiers;

      await pricingService.saveBranchPrice(selectedBranch, medicineId, body);
      setShowEditModal(false);
      setShowAddModal(false);
      fetchPriceList();
    } catch (err) {
      console.error("Lỗi lưu bảng giá", err);
    }
  };

  // Delete price override
  const handleDelete = async (medicineId: string) => {
    if (!window.confirm("Xóa override giá? Chi nhánh sẽ dùng giá mặc định.")) return;
    try {
      await pricingService.deleteBranchPrice(selectedBranch, medicineId);
      fetchPriceList();
    } catch (err) {
      console.error("Lỗi xóa bảng giá", err);
    }
  };

  // Copy price list
  const handleCopy = async () => {
    if (!selectedBranch) return;
    if (!syncAll && (!copyToBranch || selectedBranch === copyToBranch)) return;
    
    setCopyLoading(true);
    try {
      if (syncAll) {
        await fetch(`${API_BASE}/api/pricing/sync-all`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ fromBranchId: selectedBranch }),
        });
        alert("Đồng bộ giá tới tất cả chi nhánh thành công!");
      } else {
        await fetch(`${API_BASE}/api/pricing/copy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ fromBranchId: selectedBranch, toBranchId: copyToBranch }),
        });
        alert("Sao chép bảng giá thành công!");
      }
      setShowCopyModal(false);
    } catch (err) {
      console.error("Lỗi sao chép bảng giá", err);
    } finally {
      setCopyLoading(false);
    }
  };

  // Add tier
  const addTier = () => setFormTiers([...formTiers, { minQuantity: 10, price: 0 }]);
  const removeTier = (idx: number) => setFormTiers(formTiers.filter((_, i) => i !== idx));
  const updateTier = (idx: number, field: keyof WholesaleTier, val: number) => {
    const updated = [...formTiers];
    updated[idx] = { ...updated[idx], [field]: val };
    setFormTiers(updated);
  };

  const selectedBranchName = branches.find((b) => b._id === selectedBranch)?.name || "";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Tag className="text-[#0057cd]" size={26} />
            Bảng giá bán lẻ / sỉ theo chi nhánh
          </h1>
          <p className="text-slate-500 mt-1">
            Thiết lập giá bán riêng cho từng chi nhánh. Giá mặc định từ Danh mục Dược phẩm nếu không override.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCopyModal(true)}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <Copy size={16} />
            <span>Sao chép giá</span>
          </button>
          <button
            onClick={openAddModal}
            className="bg-[#0057cd] hover:bg-[#004bb1] text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus size={18} />
            <span>Thêm giá</span>
          </button>
        </div>
      </div>

      {/* Branch Selector + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
            Chi nhánh
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              disabled={userRole === "branch"}
              className={`w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 appearance-none focus:outline-none focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd] transition-all ${userRole === "branch" ? "bg-slate-100 cursor-not-allowed opacity-80" : "bg-white cursor-pointer"}`}
            >
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.branchCode} — {b.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>

        {/* Quick stats */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl shadow-sm border border-emerald-200 p-4 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-emerald-700 mb-1">
            <DollarSign size={18} />
            <span className="text-xs font-semibold uppercase tracking-wider">Giá đã thiết lập</span>
          </div>
          <span className="text-2xl font-bold text-emerald-900">{pagination.total}</span>
          <span className="text-xs text-emerald-600 mt-0.5">sản phẩm có giá riêng</span>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-4 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-blue-700 mb-1">
            <Layers size={18} />
            <span className="text-xs font-semibold uppercase tracking-wider">Chi nhánh</span>
          </div>
          <span className="text-2xl font-bold text-blue-900">{branches.length}</span>
          <span className="text-xs text-blue-600 mt-0.5">đang hoạt động</span>
        </div>
      </div>

      {/* Price Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              placeholder="Tìm kiếm theo tên thuốc, SKU..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd] transition-all"
            />
          </div>
          <button
            onClick={fetchPriceList}
            className="text-slate-500 hover:text-[#0057cd] p-2 rounded-lg hover:bg-slate-100 transition-colors"
            title="Làm mới"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-white border-b border-slate-200 text-slate-900 font-medium uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4">Dược phẩm</th>
                <th className="px-6 py-4 text-right">Giá gốc</th>
                <th className="px-6 py-4 text-right">Giá bán lẻ</th>
                <th className="px-6 py-4 text-right">Giá sỉ</th>
                <th className="px-6 py-4 text-center">Bậc thang</th>
                <th className="px-6 py-4 text-center">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <RefreshCw className="animate-spin mx-auto text-slate-400 mb-2" size={24} />
                    <span className="text-slate-400">Đang tải...</span>
                  </td>
                </tr>
              )}
              {!loading && priceList.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <AlertCircle className="mx-auto text-slate-300 mb-2" size={32} />
                    <p className="text-slate-400 font-medium">Chưa có bảng giá riêng cho chi nhánh này</p>
                    <p className="text-slate-400 text-xs mt-1">Nhấn "Thêm giá" để thiết lập giá bán lẻ/sỉ riêng</p>
                  </td>
                </tr>
              )}
              {!loading &&
                priceList.map((item) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#f2f3ff] flex items-center justify-center text-[#0057cd] shrink-0">
                          <Tag size={18} />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block truncate">{item.medicineName}</span>
                          {item.medicineSku && (
                            <span className="text-xs text-slate-400 font-mono">{item.medicineSku}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-400 font-mono text-xs">
                      {formatVND(item.defaultPrice)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-bold ${item.retailPrice != null ? "text-emerald-700" : "text-slate-300"}`}>
                        {item.retailPrice != null ? formatVND(item.retailPrice) : "Giá gốc"}
                      </span>
                      {item.retailPrice != null && item.defaultPrice > 0 && (
                        <span className={`block text-[10px] mt-0.5 ${item.retailPrice < item.defaultPrice ? "text-red-500" : item.retailPrice > item.defaultPrice ? "text-emerald-500" : "text-slate-400"}`}>
                          {item.retailPrice < item.defaultPrice
                            ? `▼ ${Math.round(((item.defaultPrice - item.retailPrice) / item.defaultPrice) * 100)}%`
                            : item.retailPrice > item.defaultPrice
                            ? `▲ ${Math.round(((item.retailPrice - item.defaultPrice) / item.defaultPrice) * 100)}%`
                            : "= giá gốc"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-bold ${item.wholesalePrice != null ? "text-blue-700" : "text-slate-300"}`}>
                        {item.wholesalePrice != null ? formatVND(item.wholesalePrice) : "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.wholesaleTiers?.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 text-violet-800 border border-violet-200">
                          <Layers size={11} /> {item.wholesaleTiers.length} bậc
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <Check size={12} /> Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          Tạm dừng
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-2 text-slate-400 hover:text-[#0057cd] hover:bg-blue-50 rounded-lg transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.medicineId)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa override"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
            <span className="text-xs text-slate-500">
              Trang {pagination.page} / {pagination.totalPages} — Tổng {pagination.total} mục
            </span>
            <div className="flex gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Trước
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========== EDIT MODAL ========== */}
      <AnimatePresence>
        {showEditModal && editingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Chỉnh sửa bảng giá</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{editingItem.medicineName}</p>
                </div>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-5">
                {/* Default price info */}
                <div className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Giá gốc (Medicine.price)</span>
                  <span className="font-bold text-slate-700">{formatVND(editingItem.defaultPrice)}</span>
                </div>

                {/* Retail Price */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Giá bán lẻ (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={formRetailPrice}
                    onChange={(e) => setFormRetailPrice(e.target.value)}
                    placeholder="Để trống = dùng giá gốc"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd]"
                  />
                </div>

                {/* Wholesale Price */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Giá bán sỉ cơ bản (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={formWholesalePrice}
                    onChange={(e) => setFormWholesalePrice(e.target.value)}
                    placeholder="Giá sỉ mặc định"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd]"
                  />
                </div>

                {/* Wholesale Tiers */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Bậc thang giá sỉ
                    </label>
                    <button
                      onClick={addTier}
                      className="text-xs text-[#0057cd] hover:text-[#004bb1] font-medium flex items-center gap-1"
                    >
                      <Plus size={14} /> Thêm bậc
                    </button>
                  </div>
                  {formTiers.length === 0 && (
                    <p className="text-xs text-slate-400 italic">Không có bậc thang. Sẽ dùng giá sỉ cơ bản.</p>
                  )}
                  <div className="space-y-2">
                    {formTiers.map((tier, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5">
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-400 block mb-0.5">Từ (SL)</label>
                          <input
                            type="number"
                            value={tier.minQuantity}
                            onChange={(e) => updateTier(idx, "minQuantity", Number(e.target.value))}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#0057cd]/20"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-slate-400 block mb-0.5">Giá (VNĐ)</label>
                          <input
                            type="number"
                            value={tier.price}
                            onChange={(e) => updateTier(idx, "price", Number(e.target.value))}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#0057cd]/20"
                          />
                        </div>
                        <button
                          onClick={() => removeTier(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors mt-4"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active toggle */}
                <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                  <span className="text-sm font-medium text-slate-700">Kích hoạt bảng giá</span>
                  <button
                    onClick={() => setFormIsActive(!formIsActive)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${formIsActive ? "bg-[#0057cd]" : "bg-slate-300"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${formIsActive ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleSavePrice(editingItem.medicineId)}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-[#0057cd] hover:bg-[#004bb1] rounded-lg transition-colors flex items-center gap-2"
                >
                  <Save size={16} />
                  Lưu thay đổi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== ADD MODAL ========== */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Thêm giá cho sản phẩm</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Chi nhánh: {selectedBranchName}</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-5">
                {/* Medicine search */}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Chọn dược phẩm
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={medSearch}
                      onChange={(e) => {
                        setMedSearch(e.target.value);
                        fetchMedicines(e.target.value);
                      }}
                      placeholder="Tìm tên thuốc..."
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd]"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {medicines.map((m, index) => (
                      <button
                        key={m._id || m.id || index}
                        onClick={() => setAddMedicineId(m._id || m.id)}
                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-blue-50 transition-colors flex items-center justify-between ${addMedicineId === m._id ? "bg-blue-50 text-[#0057cd] font-medium" : "text-slate-700"}`}
                      >
                        <span className="truncate">{m.name}</span>
                        <span className="text-xs text-slate-400 shrink-0 ml-2">{formatVND(m.price)}</span>
                      </button>
                    ))}
                    {medicines.length === 0 && (
                      <div className="px-4 py-3 text-xs text-slate-400 text-center">Không tìm thấy</div>
                    )}
                  </div>
                </div>

                {addMedicineId && (
                  <>
                    {/* Retail Price */}
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                        Giá bán lẻ (VNĐ)
                      </label>
                      <input
                        type="number"
                        value={formRetailPrice}
                        onChange={(e) => setFormRetailPrice(e.target.value)}
                        placeholder="Để trống = dùng giá gốc"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd]"
                      />
                    </div>

                    {/* Wholesale Price */}
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                        Giá bán sỉ cơ bản (VNĐ)
                      </label>
                      <input
                        type="number"
                        value={formWholesalePrice}
                        onChange={(e) => setFormWholesalePrice(e.target.value)}
                        placeholder="Giá sỉ mặc định"
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd]"
                      />
                    </div>

                    {/* Wholesale Tiers */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Bậc thang giá sỉ
                        </label>
                        <button
                          onClick={addTier}
                          className="text-xs text-[#0057cd] hover:text-[#004bb1] font-medium flex items-center gap-1"
                        >
                          <Plus size={14} /> Thêm bậc
                        </button>
                      </div>
                      <div className="space-y-2">
                        {formTiers.map((tier, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2.5">
                            <div className="flex-1">
                              <label className="text-[10px] text-slate-400 block mb-0.5">Từ (SL)</label>
                              <input
                                type="number"
                                value={tier.minQuantity}
                                onChange={(e) => updateTier(idx, "minQuantity", Number(e.target.value))}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#0057cd]/20"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[10px] text-slate-400 block mb-0.5">Giá (VNĐ)</label>
                              <input
                                type="number"
                                value={tier.price}
                                onChange={(e) => updateTier(idx, "price", Number(e.target.value))}
                                className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#0057cd]/20"
                              />
                            </div>
                            <button
                              onClick={() => removeTier(idx)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors mt-4"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-200 flex justify-end gap-3 sticky bottom-0 bg-white rounded-b-2xl">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  disabled={!addMedicineId}
                  onClick={() => handleSavePrice(addMedicineId)}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-[#0057cd] hover:bg-[#004bb1] rounded-lg transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  Thêm bảng giá
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== COPY MODAL ========== */}
      <AnimatePresence>
        {showCopyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowCopyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Sao chép bảng giá</h2>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Sao chép từ <strong>{selectedBranchName}</strong> sang chi nhánh khác
                  </p>
                </div>
                <button onClick={() => setShowCopyModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                  <strong>Lưu ý:</strong> Các bảng giá đã tồn tại ở chi nhánh đích sẽ bị ghi đè.
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="syncAll"
                    checked={syncAll}
                    onChange={(e) => setSyncAll(e.target.checked)}
                    className="w-4 h-4 text-[#0057cd] border-slate-300 rounded focus:ring-[#0057cd]"
                  />
                  <label htmlFor="syncAll" className="text-sm text-slate-700 font-medium">Đồng bộ cho TẤT CẢ chi nhánh</label>
                </div>

                {!syncAll && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                      Chi nhánh đích
                    </label>
                    <select
                      value={copyToBranch}
                      onChange={(e) => setCopyToBranch(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd]"
                    >
                      <option value="">— Chọn chi nhánh —</option>
                      {branches
                        .filter((b) => b._id !== selectedBranch)
                        .map((b) => (
                          <option key={b._id} value={b._id}>
                            {b.branchCode} — {b.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowCopyModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  disabled={(!syncAll && !copyToBranch) || copyLoading}
                  onClick={handleCopy}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-[#0057cd] hover:bg-[#004bb1] rounded-lg transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {copyLoading ? <RefreshCw size={16} className="animate-spin" /> : <Copy size={16} />}
                  {copyLoading ? "Đang sao chép..." : "Sao chép"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
