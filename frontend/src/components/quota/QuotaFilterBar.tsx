import React from "react";
import { Search, Calendar } from "lucide-react";

interface BranchListSelect {
  branchCode: string;
  name: string;
}

interface QuotaFilterBarProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filterCycle: string;
  setFilterCycle: (val: string) => void;
  filterBranch: string;
  setFilterBranch: (val: string) => void;
  branches: BranchListSelect[];
  getCurrentCycle: () => string;
}

export function QuotaFilterBar({
  searchTerm,
  setSearchTerm,
  filterCycle,
  setFilterCycle,
  filterBranch,
  setFilterBranch,
  branches,
  getCurrentCycle
}: QuotaFilterBarProps) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
      <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-3 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Tìm kiếm chi nhánh, mã, ghi chú..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-slate-400" />
          <input
            type="month"
            value={filterCycle || getCurrentCycle()}
            onChange={(e) => setFilterCycle(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]"
          />
        </div>

        <select
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]"
        >
          <option value="">Tất cả chi nhánh</option>
          {branches.map(b => (
            <option key={b.branchCode} value={b.branchCode}>{b.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
