import React from "react";
import { Wallet, TrendingUp, CheckCircle, Building2 } from "lucide-react";
import { QuotaSummary } from "../../services/purchase/quota.service";

interface QuotaSummaryCardsProps {
  summary: QuotaSummary | null;
}

export function QuotaSummaryCards({ summary }: QuotaSummaryCardsProps) {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="p-3.5 bg-blue-50 text-[#0057cd] rounded-xl">
          <Wallet size={24} />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-semibold font-mono uppercase tracking-wider">Tá»•ng ngÃ¢n sÃ¡ch</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{(summary.totalBudget || 0).toLocaleString()}Ä‘</h3>
          <p className="text-xs text-slate-400 mt-1">Chu ká»³: {summary.cycle}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="p-3.5 bg-rose-50 text-rose-600 rounded-xl">
          <TrendingUp size={24} />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-semibold font-mono uppercase tracking-wider">ÄÃ£ sá»­ dá»¥ng</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{(summary.totalUsed || 0).toLocaleString()}Ä‘</h3>
          <p className="text-xs text-rose-500 font-semibold mt-1">
            {summary.totalBudget > 0 ? ((summary.totalUsed / summary.totalBudget) * 100).toFixed(1) : 0}% ngÃ¢n sÃ¡ch
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
          <CheckCircle size={24} />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-semibold font-mono uppercase tracking-wider">CÃ²n láº¡i</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{(summary.totalRemaining || 0).toLocaleString()}Ä‘</h3>
          <p className="text-xs text-slate-400 mt-1">Sáºµn sÃ ng phÃ¢n bá»• bá»• sung</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl">
          <Building2 size={24} />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-semibold font-mono uppercase tracking-wider">Sá»‘ chi nhÃ¡nh</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{summary.branchCount} chi nhÃ¡nh</h3>
          <p className="text-xs text-slate-400 mt-1">ÄÃ£ cáº¥u hÃ¬nh háº¡n má»©c</p>
        </div>
      </div>
    </div>
  );
}

