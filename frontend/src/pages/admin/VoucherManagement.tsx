import React, { useState, useEffect } from "react";
import {
  Tag,
  Search,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  Percent,
  CheckCircle2,
  AlertTriangle,
  X,
  ToggleLeft,
  ToggleRight,
  Loader2
} from "lucide-react";
import { voucherService, VoucherPayload } from "../../services/sales/voucher.service";

export function VoucherManagement() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  // Modals & form state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Form Fields
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED_AMOUNT">("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [minOrderValue, setMinOrderValue] = useState<number>(0);
  const [maxDiscountValue, setMaxDiscountValue] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [usageLimit, setUsageLimit] = useState<number | undefined>(undefined);
  const [isActive, setIsActive] = useState(true);

  const getMinExpiryDate = (startStr: string) => {
    if (!startStr) return "";
    const d = new Date(startStr);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  const fetchVouchers = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await voucherService.getVouchers();
      setVouchers(data || []);
    } catch (e: any) {
      setErrorMsg(e.response?.data?.message || e.message || "Không thể tải danh sách voucher.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const resetForm = () => {
    setCode("");
    setDiscountType("PERCENTAGE");
    setDiscountValue(0);
    setMinOrderValue(0);
    setMaxDiscountValue(undefined);
    setStartDate("");
    setExpiryDate("");
    setUsageLimit(undefined);
    setIsActive(true);
    setSelectedId(null);
    setIsEditing(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (v: any) => {
    setSelectedId(v._id);
    setCode(v.code);
    setDiscountType(v.discountType);
    setDiscountValue(v.discountValue);
    setMinOrderValue(v.minOrderValue);
    setMaxDiscountValue(v.maxDiscountValue);
    setStartDate(v.startDate ? new Date(v.startDate).toISOString().split("T")[0] : "");
    setExpiryDate(v.expiryDate ? new Date(v.expiryDate).toISOString().split("T")[0] : "");
    setUsageLimit(v.usageLimit !== null ? v.usageLimit : undefined);
    setIsActive(v.isActive);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || discountValue <= 0 || !startDate || !expiryDate) {
      setErrorMsg("Vui lòng điền đầy đủ và chính xác các thông tin bắt buộc.");
      return;
    }

    if (new Date(expiryDate) <= new Date(startDate)) {
      setErrorMsg("Ngày kết thúc phải lớn hơn ngày bắt đầu.");
      return;
    }

    if (usageLimit !== undefined && usageLimit !== null && usageLimit <= 0) {
      setErrorMsg("Tổng lượt dùng phải lớn hơn hoặc bằng 1.");
      return;
    }
    if (discountValue <= 0) {
      setErrorMsg("Giá trị giảm phải lớn hơn 0.");
      return;
    }
    if (discountType === "PERCENTAGE" && (discountValue <= 0 || discountValue > 100)) {
      setErrorMsg("Phần trăm giảm giá phải từ 1 đến 100%.");
      return;
    }
    if (minOrderValue < 0) {
      setErrorMsg("Giá trị đơn hàng tối thiểu không được âm.");
      return;
    }
    if (maxDiscountValue !== undefined && maxDiscountValue !== null && maxDiscountValue <= 0) {
      setErrorMsg("Giá trị giảm tối đa phải lớn hơn 0.");
      return;
    }

    const payload: VoucherPayload = {
      code: code.toUpperCase().trim(),
      discountType,
      discountValue: Number(discountValue),
      minOrderValue: Number(minOrderValue),
      maxDiscountValue: maxDiscountValue ? Number(maxDiscountValue) : undefined,
      startDate: new Date(startDate).toISOString(),
      expiryDate: new Date(expiryDate).toISOString(),
      usageLimit: usageLimit ? Number(usageLimit) : undefined,
      isActive,
    };

    setLoading(true);
    try {
      if (isEditing && selectedId) {
        await voucherService.updateVoucher(selectedId, payload);
        setSuccessMsg("Cập nhật voucher thành công!");
      } else {
        await voucherService.createVoucher(payload);
        setSuccessMsg("Tạo voucher mới thành công!");
      }
      setShowModal(false);
      resetForm();
      await fetchVouchers();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || "Lỗi khi lưu voucher.");
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (v: any) => {
    if (updatingIds.has(v._id)) return;

    // Đánh dấu voucher đang được xử lý để khóa click
    setUpdatingIds((prev) => {
      const next = new Set(prev);
      next.add(v._id);
      return next;
    });

    const originalStatus = v.isActive;
    
    // Cập nhật state local ngay lập tức (optimistic update) để UI thay đổi mượt mà
    setVouchers((prev) =>
      prev.map((item) => (item._id === v._id ? { ...item, isActive: !item.isActive } : item))
    );

    try {
      await voucherService.updateVoucher(v._id, { isActive: !originalStatus });
      // Không cần gọi fetchVouchers() giúp giảm tải API và tăng tốc độ phản hồi
    } catch (err: any) {
      // Hoàn tác lại trạng thái cũ nếu API xảy ra lỗi
      setVouchers((prev) =>
        prev.map((item) => (item._id === v._id ? { ...item, isActive: originalStatus } : item))
      );
      setErrorMsg(err.response?.data?.message || err.message || "Lỗi thao tác.");
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      // Mở khóa click sau khi hoàn tất API
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(v._id);
        return next;
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn vô hiệu hóa vĩnh viễn voucher này không?")) return;
    try {
      await voucherService.deleteVoucher(id);
      setSuccessMsg("Vô hiệu hóa voucher thành công!");
      await fetchVouchers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || "Lỗi xóa voucher.");
    }
  };

  const filteredVouchers = vouchers.filter((v) =>
    v.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics counters
  const activeCount = vouchers.filter((v) => v.isActive && new Date(v.expiryDate) > new Date()).length;
  const totalCount = vouchers.length;
  const usedTotal = vouchers.reduce((acc, v) => acc + (v.usedCount || 0), 0);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <Tag size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quản Lý Voucher</h1>
            <p className="text-slate-500 text-sm mt-0.5">Tạo và thiết lập chiến dịch khuyến mãi, mã giảm giá cho hệ thống</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fetchVouchers}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-sm transition shadow-sm"
          >
            Tải lại dữ liệu
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition shadow-md flex items-center gap-1.5"
          >
            <Plus size={16} /> Thêm Voucher
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm">
          <CheckCircle2 size={16} className="text-emerald-500" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm">
          <AlertTriangle size={16} className="text-rose-500" />
          {errorMsg}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">TỔNG VOUCHER</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">{totalCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center font-bold">
            All
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">VOUCHER ĐANG HOẠT ĐỘNG</span>
            <span className="text-xl font-black text-emerald-600 mt-1 block">{activeCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">LƯỢT ĐÃ SỬ DỤNG</span>
            <span className="text-xl font-black text-indigo-600 mt-1 block">{usedTotal}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <DollarSign size={20} />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col flex-1">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Tìm voucher theo mã code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-bold"
            />
          </div>
          <span className="text-xs font-bold text-slate-500">Hiển thị {filteredVouchers.length} voucher</span>
        </div>

        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center py-20 gap-3">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
              <p className="text-slate-500 text-sm">Đang tải danh sách voucher...</p>
            </div>
          ) : filteredVouchers.length === 0 ? (
            <div className="text-center py-20 text-slate-400 font-semibold">
              Không tìm thấy voucher nào.
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 font-bold uppercase bg-slate-50/50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Mã giảm giá</th>
                  <th className="px-5 py-3">Loại giảm</th>
                  <th className="px-5 py-3 text-right">Giá trị giảm</th>
                  <th className="px-5 py-3 text-right">Đơn tối thiểu</th>
                  <th className="px-5 py-3 text-right">Giảm tối đa</th>
                  <th className="px-5 py-3 text-center">Đợt áp dụng</th>
                  <th className="px-5 py-3 text-center">Giới hạn sử dụng</th>
                  <th className="px-5 py-3 text-center">Lượt đã dùng</th>
                  <th className="px-5 py-3 text-center">Trạng thái</th>
                  <th className="px-5 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVouchers.map((v) => {
                  const now = new Date();
                  const isExpired = new Date(v.expiryDate) < now;
                  const isStarted = new Date(v.startDate) <= now;

                  return (
                    <tr key={v._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold rounded-lg tracking-wider text-xs uppercase shadow-sm">
                          {v.code}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          v.discountType === "PERCENTAGE" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-blue-50 text-blue-700 border border-blue-100"
                        }`}>
                          {v.discountType === "PERCENTAGE" ? "% Phần trăm" : "Tiền mặt cố định"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-slate-700">
                        {v.discountType === "PERCENTAGE" ? `${v.discountValue}%` : `${v.discountValue.toLocaleString()}₫`}
                      </td>
                      <td className="px-5 py-4 text-right text-slate-500 font-semibold">
                        {v.minOrderValue ? `${v.minOrderValue.toLocaleString()}₫` : "0₫"}
                      </td>
                      <td className="px-5 py-4 text-right text-slate-500 font-semibold">
                        {v.maxDiscountValue ? `${v.maxDiscountValue.toLocaleString()}₫` : "—"}
                      </td>
                      <td className="px-5 py-4 text-center text-xs font-semibold text-slate-600">
                        <div>BD: {new Date(v.startDate).toLocaleDateString()}</div>
                        <div className="mt-0.5">KT: {new Date(v.expiryDate).toLocaleDateString()}</div>
                      </td>
                      <td className="px-5 py-4 text-center font-bold text-slate-600">
                        {v.usageLimit !== null && v.usageLimit !== undefined ? v.usageLimit : "Vô hạn"}
                      </td>
                      <td className="px-5 py-4 text-center font-extrabold text-indigo-600">
                        {v.usedCount || 0}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {isExpired ? (
                          <span className="px-2.5 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-full font-bold text-[10px] uppercase">Hết hạn</span>
                        ) : !isStarted ? (
                          <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-full font-bold text-[10px] uppercase">Chưa bắt đầu</span>
                        ) : v.isActive ? (
                          <span className="px-2.5 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full font-bold text-[10px] uppercase">Active</span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-full font-bold text-[10px] uppercase">Inactive</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            disabled={updatingIds.has(v._id)}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleToggleActive(v);
                            }}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                              v.isActive ? "bg-emerald-500" : "bg-slate-200"
                            } ${updatingIds.has(v._id) ? "opacity-50 pointer-events-none" : ""}`}
                            title={v.isActive ? "Nhấn để tạm dừng" : "Nhấn để kích hoạt"}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                v.isActive ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleOpenEdit(v);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="Sửa thông tin"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDelete(v._id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Vô hiệu hóa vĩnh viễn"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 bg-indigo-50/50 flex justify-between items-center">
              <h3 className="font-bold text-indigo-950 flex items-center gap-1.5">
                <Tag size={16} className="text-indigo-600" />
                {isEditing ? "Cập Nhật Thông Tin Voucher" : "Tạo Mới Chiến Dịch Voucher"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mã Voucher (Code) *</label>
                <input
                  type="text"
                  required
                  disabled={isEditing}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ví dụ: SUMMER20"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider focus:outline-none focus:border-indigo-500 focus:bg-white transition-all disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Loại giảm giá *</label>
                <div className="flex border border-slate-200 rounded-xl overflow-hidden p-1 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType("PERCENTAGE");
                      setErrorMsg(null);
                    }}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                      discountType === "PERCENTAGE"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    % Phần trăm
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType("FIXED_AMOUNT");
                      setMaxDiscountValue(undefined);
                      setErrorMsg(null);
                    }}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                      discountType === "FIXED_AMOUNT"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Tiền mặt cố định
                  </button>
                </div>
              </div>

              {discountType === "PERCENTAGE" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mức giảm (%) *</label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={100}
                        value={discountValue || ""}
                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                        placeholder="Ví dụ: 10"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Giảm tối đa (đ)</label>
                      <input
                        type="number"
                        min={1}
                        value={maxDiscountValue || ""}
                        onChange={(e) => setMaxDiscountValue(e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="Không giới hạn"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Đơn tối thiểu *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={minOrderValue}
                      onChange={(e) => setMinOrderValue(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Số tiền giảm (đ) *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={discountValue || ""}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      placeholder="Ví dụ: 30000"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Đơn tối thiểu *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={minOrderValue}
                      onChange={(e) => setMinOrderValue(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ngày bắt đầu *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setStartDate(newStart);
                      if (expiryDate && new Date(expiryDate) <= new Date(newStart)) {
                        setExpiryDate("");
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ngày kết thúc *</label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    min={getMinExpiryDate(startDate)}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tổng lượt dùng</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Vô hạn"
                    value={usageLimit || ""}
                    onChange={(e) => setUsageLimit(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-3 text-xs font-bold text-slate-600">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    Kích hoạt áp dụng ngay
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
                >
                  {isEditing ? "Cập Nhật" : "Tạo Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
