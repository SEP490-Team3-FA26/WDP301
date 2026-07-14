import React from "react";
import { Edit2, Trash2, Wallet } from "lucide-react";
import { QuotaData } from "../../services/purchase/quota.service";

interface QuotaTableProps {
  filteredQuotas: QuotaData[];
  openEditModal: (quota: QuotaData) => void;
  handleDelete: (id: string) => void;
}

export function QuotaTable({
  filteredQuotas,
  openEditModal,
  handleDelete
}: QuotaTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-4 pl-6">Chi nhÃ¡nh</th>
              <th className="p-4">Chu ká»³</th>
              <th className="p-4 text-right">Tá»•ng háº¡n má»©c</th>
              <th className="p-4 text-right">ÄÃ£ sá»­ dá»¥ng</th>
              <th className="p-4">Tá»· lá»‡ Ä‘Ã£ dÃ¹ng</th>
              <th className="p-4">Tráº¡ng thÃ¡i</th>
              <th className="p-4">Ghi chÃº</th>
              <th className="p-4 pr-6 text-center">Thao tÃ¡c</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {filteredQuotas.map((q) => {
              const percentUsed = q.totalBudget > 0 ? (q.usedAmount / q.totalBudget) * 100 : 0;
              const isHighUsage = percentUsed >= 90;
              const isWarningUsage = percentUsed >= 75 && percentUsed < 90;

              return (
                <tr key={q._id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 pl-6 font-semibold text-slate-900">
                    <div className="flex flex-col">
                      <span>{q.branchName || "Chi nhÃ¡nh chÆ°a cáº­p nháº­t"}</span>
                      <span className="text-xs text-slate-400 font-mono font-medium mt-0.5">{q.branchId}</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono font-semibold text-slate-600">{q.cycle}</td>
                  <td className="p-4 text-right font-bold text-slate-900">{q.totalBudget.toLocaleString()}Ä‘</td>
                  <td className="p-4 text-right font-bold text-slate-600">{(q.usedAmount || 0).toLocaleString()}Ä‘</td>
                  <td className="p-4">
                    <div className="w-full max-w-[150px]">
                      <div className="flex justify-between items-center text-xs font-semibold mb-1">
                        <span className={isHighUsage ? "text-rose-600" : isWarningUsage ? "text-amber-500" : "text-emerald-600"}>
                          {percentUsed.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            isHighUsage ? "bg-rose-500" : isWarningUsage ? "bg-amber-400" : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(percentUsed, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      q.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${q.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {q.status === 'Active' ? 'Äang Ã¡p dá»¥ng' : 'KhÃ³a'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 max-w-[200px] truncate" title={q.note}>{q.note || "â€”"}</td>
                  <td className="p-4 pr-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(q)}
                        className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                        title="Sá»­a háº¡n má»©c"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => q._id && handleDelete(q._id)}
                        className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                        title="XÃ³a háº¡n má»©c"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredQuotas.length === 0 && (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-400">
                  <Wallet size={40} className="mx-auto mb-3 text-slate-300" />
                  KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u háº¡n má»©c phÃ¢n bá»• nÃ o.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

