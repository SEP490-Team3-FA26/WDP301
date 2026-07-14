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
          <p className="text-xs text-slate-500 font-semibold font-mono uppercase tracking-wider">Tổng ngân sách</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{(summary.totalBudget || 0).toLocaleString()}đ</h3>
          <p className="text-xs text-slate-400 mt-1">Chu kỳ: {summary.cycle}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="p-3.5 bg-rose-50 text-rose-600 rounded-xl">
          <TrendingUp size={24} />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-semibold font-mono uppercase tracking-wider">Đã sử dụng</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{(summary.totalUsed || 0).toLocaleString()}đ</h3>
          <p className="text-xs text-rose-500 font-semibold mt-1">
            {summary.totalBudget > 0 ? ((summary.totalUsed / summary.totalBudget) * 100).toFixed(1) : 0}% ngân sách
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
          <CheckCircle size={24} />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-semibold font-mono uppercase tracking-wider">Còn lại</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{(summary.totalRemaining || 0).toLocaleString()}đ</h3>
          <p className="text-xs text-slate-400 mt-1">Sẵn sàng phân bổ bổ sung</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl">
          <Building2 size={24} />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-semibold font-mono uppercase tracking-wider">Số chi nhánh</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{summary.branchCount} chi nhánh</h3>
          <p className="text-xs text-slate-400 mt-1">Đã cấu hình hạn mức</p>
        </div>
      </div>
    </div>
  );
}
