import React, { useState } from "react";
import { X, Plus, DollarSign, Building2, Calendar, FileText, AlertCircle } from "lucide-react";
import { financeService, ExpensePayload } from "../services/finance.service";

interface CreateExpenseModalProps {
  isOpen: boolean;
  branches: { id: string; name: string; code?: string }[];
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateExpenseModal({ isOpen, branches, onClose, onSuccess }: CreateExpenseModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    category: "",
    title: "",
    amount: "",
    branchId: branches[0]?.id || "BR-001",
    transactionDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // Abnormal Case Validation: Expense category is unselected -> block submission
    if (!formData.category) {
      setErrorMsg("Vui lòng chọn Loại chi phí (Mặt bằng, Lương, Điện nước...)");
      return;
    }

    // Validation: Expense amount must be a positive number > 0
    const numAmount = Number(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("Số tiền chi phí phải là số dương lớn hơn 0");
      return;
    }

    const selectedBranch = branches.find((b) => b.id === formData.branchId || b.code === formData.branchId);
    const branchName = selectedBranch ? selectedBranch.name : `Chi nhánh ${formData.branchId}`;

    const defaultTitles: Record<string, string> = {
      RENT: "Chi phí tiền thuê mặt bằng",
      SALARY: "Chi phí trả lương nhân viên",
      UTILITY: "Chi phí điện nước & internet",
      OTHER: "Chi phí vận hành khác",
    };

    const payload: ExpensePayload = {
      category: formData.category as any,
      title: formData.title.trim() || defaultTitles[formData.category] || "Chi phí vận hành",
      amount: numAmount,
      branchId: formData.branchId,
      branchName,
      transactionDate: formData.transactionDate,
      notes: formData.notes,
      createdBy: "Admin",
    };

    try {
      setLoading(true);
      await financeService.createExpense(payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Lỗi khi ghi nhận chi phí");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <DollarSign size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ghi nhận Chi phí Vận hành (UC-59)</h2>
              <p className="text-xs text-slate-500">Ghi nhận chi phí cố định (mặt bằng, lương, điện nước...)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-red-700">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Loại chi phí <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all font-medium"
            >
              <option value="">-- Chọn Loại chi phí --</option>
              <option value="RENT">Mặt bằng (Rent)</option>
              <option value="SALARY">Lương nhân viên (Salary)</option>
              <option value="UTILITY">Điện nước & Dịch vụ (Utilities)</option>
              <option value="OTHER">Chi phí khác (Other)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <DollarSign size={12} /> Số tiền (VND) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              placeholder="VD: 25000000"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Building2 size={12} /> Chi nhánh áp dụng
              </label>
              <select
                value={formData.branchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all"
              >
                {branches.map((b) => (
                  <option key={b.id || b.code} value={b.id || b.code}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Calendar size={12} /> Ngày ghi nhận
              </label>
              <input
                type="date"
                value={formData.transactionDate}
                onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <FileText size={12} /> Tên / Nội dung khoản chi
            </label>
            <input
              type="text"
              placeholder="VD: Tiền thuê mặt bằng tháng 7/2026 Chi nhánh #1"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Ghi chú / Chứng từ đính kèm
            </label>
            <textarea
              rows={2}
              placeholder="Ghi chú thêm về mã hóa đơn, hóa đơn GTGT, tài khoản thụ hưởng..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 transition-all resize-none"
            />
          </div>

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
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Đang lưu...</span>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Lưu Khoản Chi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
