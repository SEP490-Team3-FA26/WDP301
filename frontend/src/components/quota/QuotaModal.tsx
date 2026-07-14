import React from "react";
import { X, AlertTriangle } from "lucide-react";
import { QuotaData } from "../../services/purchase/quota.service";

interface BranchListSelect {
  branchCode: string;
  name: string;
}

interface QuotaModalProps {
  editingQuota: QuotaData | null;
  formBranchId: string;
  setFormBranchId: (val: string) => void;
  formCycle: string;
  setFormCycle: (val: string) => void;
  formBudget: string;
  setFormBudget: (val: string) => void;
  formStatus: string;
  setFormStatus: (val: string) => void;
  formNote: string;
  setFormNote: (val: string) => void;
  formError: string;
  formSubmitting: boolean;
  branches: BranchListSelect[];
  setIsModalOpen: (val: boolean) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

export function QuotaModal({
  editingQuota,
  formBranchId,
  setFormBranchId,
  formCycle,
  setFormCycle,
  formBudget,
  setFormBudget,
  formStatus,
  setFormStatus,
  formNote,
  setFormNote,
  formError,
  formSubmitting,
  branches,
  setIsModalOpen,
  handleSubmit
}: QuotaModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">
            {editingQuota ? "Cáº­p nháº­t phÃ¢n bá»• háº¡n má»©c" : "PhÃ¢n bá»• háº¡n má»©c má»›i"}
          </h2>
          <button 
            onClick={() => setIsModalOpen(false)} 
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {formError && (
            <div className="p-3.5 bg-rose-50 border border-rose-150 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{formError}</span>
            </div>
          )}

          {/* Chi nhÃ¡nh */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Chi nhÃ¡nh nháº­n háº¡n má»©c</label>
            <select
              disabled={!!editingQuota}
              value={formBranchId}
              onChange={(e) => setFormBranchId(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] disabled:bg-slate-50"
            >
              <option value="">Chá»n chi nhÃ¡nh...</option>
              {branches.map(b => (
                <option key={b.branchCode} value={b.branchCode}>{b.name} ({b.branchCode})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Chu ká»³ */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Chu ká»³ (ThÃ¡ng)</label>
              <input
                type="month"
                disabled={!!editingQuota}
                value={formCycle}
                onChange={(e) => setFormCycle(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] disabled:bg-slate-50 font-semibold"
              />
            </div>

            {/* Tráº¡ng thÃ¡i */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Tráº¡ng thÃ¡i</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]"
              >
                <option value="Active">Äang Ã¡p dá»¥ng</option>
                <option value="Locked">Táº¡m khÃ³a</option>
              </select>
            </div>
          </div>

          {/* NgÃ¢n sÃ¡ch */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Tá»•ng háº¡n má»©c ngÃ¢n sÃ¡ch (VNÄ)</label>
            <div className="relative">
              <input
                type="number"
                value={formBudget}
                onChange={(e) => setFormBudget(e.target.value)}
                placeholder="Nháº­p sá»‘ tiá»n..."
                className="w-full pl-3.5 pr-12 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0057cd]"
              />
              <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400">VNÄ</span>
            </div>
          </div>

          {/* Ghi chÃº */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Ghi chÃº / LÃ½ do phÃ¢n bá»•</label>
            <textarea
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="Ghi chÃº phÃ¢n bá»• háº¡n má»©c..."
              rows={3}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]"
            />
          </div>

          {/* Submit Buttons */}
          <div className="pt-4 border-t border-slate-100 flex gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-colors text-sm"
            >
              Há»§y bá»
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="flex-1 py-2.5 bg-[#0057cd] text-white font-bold rounded-xl hover:bg-[#00419e] transition-colors text-sm flex items-center justify-center gap-2"
            >
              {formSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              {editingQuota ? "Cáº­p nháº­t" : "LÆ°u háº¡n má»©c"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

