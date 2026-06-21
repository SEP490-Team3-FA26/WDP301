import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, MoreHorizontal, AlertCircle, CheckCircle2, Loader2, Eye, X, Package, TrendingUp, Calendar, Truck } from "lucide-react";
import { medicineService } from "../../services/medicine.service";

export function Inventory() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedClassification, setSelectedClassification] = useState("");
  const [filterOptions, setFilterOptions] = useState<{ categories: string[], classifications: string[] }>({ categories: [], classifications: [] });
  
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  // New States
  const [selectedMedicine, setSelectedMedicine] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Custom stats and reports states
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"inventory" | "expiration" | "low_stock">("inventory");
  const [expirationReport, setExpirationReport] = useState<any[]>([]);
  const [expirationLoading, setExpirationLoading] = useState(false);
  const [lowStockReport, setLowStockReport] = useState<any[]>([]);
  const [lowStockLoading, setLowStockLoading] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const fetchMedicineDetails = async (id: string) => {
    setFetchingDetails(true);
    setDetailModalOpen(true);
    try {
      const data = await medicineService.getMedicineById(id);
      setSelectedMedicine(data);
    } catch (error) {
      console.error("Failed to fetch details", error);
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingStatusId(id);
    try {
      await medicineService.updateMedicineStatus(id, newStatus);
      setInventory(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
    } catch (error) {
      console.error("Failed to update status", error);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await medicineService.getMedicineStats();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats", err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchExpirationReport = async () => {
    setExpirationLoading(true);
    try {
      const data = await medicineService.getExpirationReport();
      setExpirationReport(data);
    } catch (err) {
      console.error("Failed to fetch expiration report", err);
    } finally {
      setExpirationLoading(false);
    }
  };

  const fetchLowStockReport = async () => {
    setLowStockLoading(true);
    try {
      const res = await fetch("/api/medicines?limit=5000");
      if (res.ok) {
        const data = await res.json();
        const items = data.data || data;
        const filtered = items.filter((m: any) => m.stock <= (m.minStock || 50));
        setLowStockReport(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLowStockLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [inventory]);

  useEffect(() => {
    if (activeTab === "expiration") {
      fetchExpirationReport();
    } else if (activeTab === "low_stock") {
      fetchLowStockReport();
    }
  }, [activeTab]);

  // Fetch filter options on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const data = await medicineService.getFilters();
        setFilterOptions(data);
      } catch (error) {
        console.error("Error fetching filters:", error);
      }
    };
    fetchFilters();
  }, []);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on new search
    }, 400);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, selectedClassification]);

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await medicineService.getMedicines({
          search: debouncedSearch || undefined,
          page,
          limit,
          category: selectedCategory || undefined,
          classification: selectedClassification || undefined
        });
        setInventory(result.data);
        setTotal(result.total);
      } catch (error) {
        console.error("Error fetching inventory:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [debouncedSearch, page, limit, selectedCategory, selectedClassification]);

  const totalPages = Math.ceil(total / limit);

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);

      if (page <= 3) {
        end = 4;
      }
      if (page >= totalPages - 2) {
        start = totalPages - 3;
      }

      if (start > 2) {
        pages.push("ellipsis-1");
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push("ellipsis-2");
      }

      pages.push(totalPages);
    }

    return pages.map((p, idx) => {
      if (typeof p === "string") {
        return (
          <span key={p} className="px-2 py-1 text-slate-400">
            ...
          </span>
        );
      }
      return (
        <button
          key={p}
          onClick={() => setPage(p)}
          disabled={loading}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            page === p
              ? "bg-[#0057cd] text-white shadow-sm"
              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          {p}
        </button>
      );
    });
  };

  return (
    <div className="flex flex-col gap-2 h-full bg-[#faf8ff] px-6 pt-4 pb-3 lg:px-8 overflow-hidden">
      <div className="flex flex-row justify-between items-center">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tổng Quan Kho</h1>
        <button className="px-4 py-1.5 bg-[#0057cd] text-white font-bold rounded-xl hover:bg-[#00419e] transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap text-sm">
          <Plus size={16} />
          Thêm thuốc
        </button>
      </div>

      {/* Stats Cards - compact */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 animate-in fade-in duration-300">
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Package size={18} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tổng loại thuốc</p>
              <p className="text-lg font-extrabold text-slate-900">{stats.totalMedicines}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tổng tồn kho</p>
              <p className="text-lg font-extrabold text-slate-900">{stats.totalStock.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-400">đv</span></p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={18} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Cần bổ sung hàng</p>
              <p className="text-xs font-extrabold text-slate-900">
                <span className="text-amber-600">{stats.lowStockCount} sắp hết</span>
                <span className="text-slate-300 mx-1">|</span>
                <span className="text-rose-600">{stats.outOfStockCount} hết</span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Hạn sử dụng lô</p>
              <p className="text-xs font-extrabold text-slate-900">
                <span className="text-amber-600">{stats.soonToExpireCount} cận hạn</span>
                <span className="text-slate-300 mx-1">|</span>
                <span className="text-rose-600">{stats.expiredCount} hết hạn</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs - compact */}
      <div className="flex bg-slate-100/70 p-1 rounded-xl w-fit border border-slate-200/40 backdrop-blur-sm gap-1">
        <button
          onClick={() => setActiveTab("inventory")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-extrabold text-xs transition-all duration-200 ${
            activeTab === "inventory"
              ? "bg-white text-[#0057cd] shadow-md shadow-slate-200/50"
              : "text-slate-500 hover:text-slate-800 hover:bg-white/30"
          }`}
        >
          <Package size={13} />
          Danh Sách Tồn Kho
        </button>
        <button
          onClick={() => setActiveTab("expiration")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-extrabold text-xs transition-all duration-200 relative ${
            activeTab === "expiration"
              ? "bg-white text-[#0057cd] shadow-md shadow-slate-200/50"
              : "text-slate-500 hover:text-slate-800 hover:bg-white/30"
          }`}
        >
          <Calendar size={13} />
          Báo Cáo Hết Hạn
          {stats?.expiredCount > 0 && (
            <span className="bg-rose-500 text-white text-[9px] font-black rounded-full px-1.5 py-0.5 shadow-sm shadow-rose-500/20">
              {stats.expiredCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("low_stock")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-extrabold text-xs transition-all duration-200 relative ${
            activeTab === "low_stock"
              ? "bg-white text-[#0057cd] shadow-md shadow-slate-200/50"
              : "text-slate-500 hover:text-slate-800 hover:bg-white/30"
          }`}
        >
          <AlertCircle size={13} />
          Thuốc Cần Bổ Sung
          {(stats?.lowStockCount + stats?.outOfStockCount) > 0 && (
            <span className="bg-amber-500 text-white text-[9px] font-black rounded-full px-1.5 py-0.5 shadow-sm shadow-amber-500/20">
              {stats.lowStockCount + stats.outOfStockCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === "inventory" ? (
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-100/40 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/30">
          {/* Toolbar - compact */}
          <div className="px-4 py-3 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-center justify-between bg-gradient-to-r from-slate-50/60 to-white">
            <div className="relative w-full md:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={14} />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm theo mã, tên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200/80 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:ring-4 focus:ring-blue-500/10 focus:border-[#0057cd] outline-none transition-all shadow-sm"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative w-full sm:w-auto">
                <select
                  value={selectedClassification}
                  onChange={(e) => setSelectedClassification(e.target.value)}
                  className="w-full sm:w-auto pl-3 pr-8 py-2 bg-white border border-slate-200/80 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors focus:ring-4 focus:ring-blue-500/10 focus:border-[#0057cd] outline-none shadow-sm appearance-none cursor-pointer"
                >
                  <option value="">Tất cả phân loại</option>
                  {filterOptions.classifications.map(c => (
                    <option key={c} value={c}>
                      {c === 'PRESCRIPTION_ANTIBIOTIC' ? 'Kê đơn / Kháng sinh' : 
                       c === 'COMMON_SUPPLEMENT' ? 'Không kê đơn / TPCN' : c}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</div>
              </div>

              <div className="relative w-full sm:w-auto">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full sm:w-auto pl-3 pr-8 py-2 bg-white border border-slate-200/80 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors focus:ring-4 focus:ring-blue-500/10 focus:border-[#0057cd] outline-none shadow-sm appearance-none cursor-pointer"
                >
                  <option value="">Tất cả danh mục</option>
                  {filterOptions.categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">▼</div>
              </div>
            </div>
          </div>

          {/* Table & Loading States */}
          <div className="overflow-x-auto overflow-y-auto relative flex-1 min-h-0 custom-scrollbar">
            {loading ? (
              <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-3 z-10">
                <Loader2 className="animate-spin text-[#0057cd]" size={32} />
                <p className="text-sm font-semibold text-slate-500">Đang tải danh sách thuốc...</p>
              </div>
            ) : null}

            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-[10px] text-slate-400 uppercase bg-slate-50/60 border-b border-slate-100/80 tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-2 font-bold">Mã & Tên Thuốc</th>
                  <th scope="col" className="px-4 py-2 font-bold">Danh Mục & Hoạt Chất</th>
                  <th scope="col" className="px-4 py-2 font-bold text-right">Giá Bán</th>
                  <th scope="col" className="px-4 py-2 font-bold text-center">Tồn Kho</th>
                  <th scope="col" className="px-4 py-2 font-bold">Trạng Thái</th>
                  <th scope="col" className="px-4 py-2 font-bold">Hạn Sử Dụng</th>
                  <th scope="col" className="px-4 py-2 font-bold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {inventory.map((item) => (
                  <tr key={item.id} className="group bg-white hover:bg-slate-50/40 hover:shadow-[inset_4px_0_0_0_#0057cd] transition-all duration-200">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/40 shadow-sm overflow-hidden flex-shrink-0 flex items-center justify-center p-0.5 group-hover:scale-105 transition-transform duration-200">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                          ) : (
                            <Package className="text-slate-400 w-4 h-4" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <div className="font-bold text-slate-800 max-w-xs truncate text-xs sm:text-sm" title={item.name}>{item.name}</div>
                          <div className="mt-1 font-mono text-[9px] text-slate-400 bg-slate-50 border border-slate-100/80 px-1.5 py-0.5 rounded-md w-fit">{item.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 max-w-[180px]">
                      <div className="truncate font-bold text-slate-700 text-xs sm:text-sm" title={item.category}>{item.category}</div>
                      {item.active_ingredient && (
                        <div className="text-[10px] text-[#0057cd] font-black truncate mt-1 bg-blue-50/60 px-2 py-0.5 rounded-md inline-block max-w-full border border-blue-100/40" title={item.active_ingredient}>
                          {item.active_ingredient}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-900 font-black text-right whitespace-nowrap text-xs">
                      {item.price.toLocaleString("vi-VN")} ₫ <span className="text-slate-400 text-[10px] font-normal">/ {item.unit || 'Hộp'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <div className="flex items-center gap-1">
                          <span className={`font-black text-xs sm:text-sm ${item.stock <= item.minStock ? 'text-rose-600' : 'text-slate-800'}`}>
                            {item.stock}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">{item.unit || 'Hộp'}</span>
                        </div>
                        {/* Miniature progress bar */}
                        <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              item.stock === 0 ? 'bg-rose-500 w-0' :
                              item.stock <= item.minStock ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} 
                            style={{ width: `${Math.min(100, (item.stock / (item.minStock || 50)) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 font-semibold">Min: {item.minStock}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {(() => {
                        const isOutOfStock = item.stock === 0;
                        const isLowStock = item.stock > 0 && item.stock <= item.minStock;
                        if (isOutOfStock) return (
                          <span className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
                            <AlertCircle size={12} className="text-rose-500" />
                            Hết hàng
                          </span>
                        );
                        if (isLowStock) return (
                          <span className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                            <AlertCircle size={12} className="text-amber-500" />
                            Sắp hết
                          </span>
                        );
                        return (
                          <span className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            Sẵn sàng
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 relative">
                      {item.batches && item.batches.length > 1 ? (
                        <div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(openDropdownId === item.id ? null : item.id);
                            }}
                            className="flex items-center gap-1.5 bg-blue-50/60 text-[#0057cd] hover:bg-blue-50 hover:text-blue-700 text-xs font-extrabold rounded-lg px-3 py-1.5 transition-all border border-blue-100/50 shadow-sm whitespace-nowrap"
                          >
                            <span>{item.batches.length} Lô</span>
                            <span className="text-[9px]">▼</span>
                          </button>
                          {openDropdownId === item.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-20" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                }}
                              />
                              <div className="absolute left-6 mt-1 w-64 rounded-xl bg-white border border-slate-200 shadow-xl z-30 p-2 py-3 space-y-2 text-xs divide-y divide-slate-100 text-left animate-in fade-in zoom-in-95 duration-100">
                                <div className="font-extrabold text-slate-700 px-2 pb-1 bg-slate-50 rounded">Hạn sử dụng chi tiết:</div>
                                <div className="pt-2 max-h-40 overflow-y-auto space-y-1 px-1 custom-scrollbar">
                                  {item.batches.map((b: any) => (
                                    <div key={b.batchNo} className="flex flex-col py-1 px-1 justify-between hover:bg-slate-50 rounded">
                                      <div className="flex justify-between font-bold text-slate-800">
                                        <span>Lô: {b.batchNo}</span>
                                        <span className={b.status === 'EXPIRED' ? 'text-rose-600' : 'text-slate-600'}>
                                          {b.stock} {item.unit || 'Hộp'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-[11px] text-slate-500 mt-0.5">
                                        <span>Hạn: {new Date(b.expDate).toLocaleDateString("vi-VN")}</span>
                                        <span className={`font-semibold ${b.status === 'EXPIRED' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                          {b.status === 'EXPIRED' ? 'Hết hạn' : 'Hoạt động'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="font-extrabold text-slate-700 text-xs sm:text-sm">
                          {item.expiry ? new Date(item.expiry).toLocaleDateString("vi-VN") : 'N/A'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right flex justify-end gap-1">
                      {item.stock <= item.minStock && (
                        <button
                          onClick={() => {
                            const isWarehouse = window.location.pathname.startsWith('/warehouse');
                            const importPath = isWarehouse ? '/warehouse/inventory/import/new' : '/admin/inventory/import/new';
                            navigate(importPath, {
                              state: {
                                prefillPrItems: [{ medicineId: item.id, quantity: Math.max(20, (item.minStock || 50) * 2 - item.stock) }]
                              }
                            });
                          }}
                          className="text-amber-600 hover:text-amber-800 transition-colors p-1.5 rounded-lg hover:bg-amber-50 border border-transparent hover:border-amber-100"
                          title="Nhập hàng ngay"
                        >
                          <Truck size={15} />
                        </button>
                      )}
                      <button 
                        onClick={() => fetchMedicineDetails(item.id)}
                        className="text-[#0057cd] hover:text-[#00419e] transition-colors p-1.5 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-100"
                        title="Xem chi tiết"
                      >
                        <Eye size={15} />
                      </button>
                      <button className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-200">
                        <MoreHorizontal size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {!loading && inventory.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-500">Không tìm thấy thuốc nào khớp với từ khóa.</p>
              </div>
            )}
          </div>
          
          {/* Pagination - compact */}
          <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between bg-white text-sm">
            <span className="text-xs text-slate-500">
              Hiển thị <span className="font-semibold text-slate-800">{inventory.length > 0 ? (page - 1) * limit + 1 : 0}</span>–<span className="font-semibold text-slate-800">{(page - 1) * limit + inventory.length}</span> / <span className="font-semibold text-slate-800">{total}</span> thuốc
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Trước
              </button>
              
              <div className="flex items-center gap-1">
                {renderPageNumbers()}
              </div>

              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0 || loading}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === "expiration" ? (
        /* Expiration Report View */
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-100/40 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/30 animate-in fade-in duration-200">
          <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white flex items-center gap-2">
            <AlertCircle className="text-[#0057cd]" size={16} />
            <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">Danh sách các lô thuốc hết hạn hoặc cận hạn sử dụng (trong vòng 90 ngày)</h3>
          </div>
          
          <div className="overflow-x-auto overflow-y-auto relative flex-1 min-h-0 custom-scrollbar">
            {expirationLoading ? (
              <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-3 z-10">
                <Loader2 className="animate-spin text-[#0057cd]" size={32} />
                <p className="text-sm font-semibold text-slate-500">Đang tải báo cáo hết hạn...</p>
              </div>
            ) : null}
 
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-[11px] text-slate-400 uppercase bg-slate-50/60 border-b border-slate-100/80 tracking-wider font-extrabold">
                <tr>
                  <th scope="col" className="px-6 py-4 font-bold">Tên Thuốc & Mã</th>
                  <th scope="col" className="px-6 py-4 font-bold">Số Lô</th>
                  <th scope="col" className="px-6 py-4 font-bold">Danh Mục</th>
                  <th scope="col" className="px-6 py-4 font-bold text-center">Tồn Lô</th>
                  <th scope="col" className="px-6 py-4 font-bold">Hạn Sử Dụng</th>
                  <th scope="col" className="px-6 py-4 font-bold text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!expirationLoading && expirationReport.map((batch) => (
                  <tr key={batch.id} className="group bg-white hover:bg-slate-50/50 hover:shadow-[inset_4px_0_0_0_#ef4444] transition-all duration-150">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 text-xs sm:text-sm">{batch.medicineName}</div>
                      <div className="mt-1 font-mono text-[9px] text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md w-fit">{batch.medicineId}</div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-600 text-xs">{batch.batchNo}</td>
                    <td className="px-6 py-4">
                      <span className="truncate font-semibold text-slate-600 text-xs sm:text-sm" title={batch.category}>{batch.category}</span>
                    </td>
                    <td className="px-6 py-4 text-center font-extrabold text-slate-800 text-xs sm:text-sm">
                      {batch.stock} <span className="text-slate-400 text-[10px] font-normal">/ {batch.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-bold text-xs sm:text-sm">
                      {new Date(batch.expDate).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold inline-block border shadow-sm whitespace-nowrap
                        ${batch.status === 'EXPIRED' 
                          ? 'bg-rose-50 text-rose-700 border-rose-100' 
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                        }
                      `}>
                        {batch.status === 'EXPIRED' ? 'Đã hết hạn' : 'Sắp hết hạn'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!expirationLoading && expirationReport.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-500 font-semibold">Tuyệt vời! Không có lô thuốc nào bị hết hạn hoặc sắp hết hạn.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Low Stock Report View */
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-100/40 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/30 animate-in fade-in duration-200">
          <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-amber-500" size={16} />
              <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">Danh sách thuốc hết hàng hoặc sắp hết hàng (Dưới mức tối thiểu)</h3>
            </div>
            {!lowStockLoading && lowStockReport.length > 0 && (
              <button
                onClick={() => {
                  const isWarehouse = window.location.pathname.startsWith('/warehouse');
                  const importPath = isWarehouse ? '/warehouse/inventory/import/new' : '/admin/inventory/import/new';
                  navigate(importPath, {
                    state: {
                      prefillPrItems: lowStockReport.map(item => ({ medicineId: item.id, quantity: Math.max(20, (item.minStock || 50) * 2 - item.stock) }))
                    }
                  });
                }}
                className="px-4 py-2 bg-[#0057cd] hover:bg-[#004bb1] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all"
              >
                <Truck size={14} />
                Nhập Tất Cả Thuốc Này
              </button>
            )}
          </div>
          
          <div className="overflow-x-auto overflow-y-auto relative flex-1 min-h-0 custom-scrollbar">
            {lowStockLoading ? (
              <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-3 z-10">
                <Loader2 className="animate-spin text-[#0057cd]" size={32} />
                <p className="text-sm font-semibold text-slate-500">Đang tải danh sách thuốc...</p>
              </div>
            ) : null}
 
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-[10px] text-slate-400 uppercase bg-slate-50/60 border-b border-slate-100/80 tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-2 font-bold">Mã & Tên Thuốc</th>
                  <th scope="col" className="px-4 py-2 font-bold">Danh Mục & Hoạt Chất</th>
                  <th scope="col" className="px-4 py-2 font-bold text-right">Giá Bán</th>
                  <th scope="col" className="px-4 py-2 font-bold text-center">Tồn Kho</th>
                  <th scope="col" className="px-4 py-2 font-bold">Trạng Thái</th>
                  <th scope="col" className="px-4 py-2 font-bold">Hạn Sử Dụng</th>
                  <th scope="col" className="px-4 py-2 font-bold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {!lowStockLoading && lowStockReport.map((item) => (
                  <tr key={item.id} className="group bg-white hover:bg-slate-50/40 hover:shadow-[inset_4px_0_0_0_#f59e0b] transition-all duration-200">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/40 shadow-sm overflow-hidden flex-shrink-0 flex items-center justify-center p-0.5 group-hover:scale-105 transition-transform duration-200">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                          ) : (
                            <Package className="text-slate-400 w-4 h-4" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <div className="font-bold text-slate-800 max-w-xs truncate text-xs sm:text-sm" title={item.name}>{item.name}</div>
                          <div className="mt-1 font-mono text-[9px] text-slate-400 bg-slate-50 border border-slate-100/80 px-1.5 py-0.5 rounded-md w-fit">{item.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 max-w-[180px]">
                      <div className="truncate font-bold text-slate-700 text-xs sm:text-sm" title={item.category}>{item.category}</div>
                      {item.active_ingredient && (
                        <div className="text-[10px] text-[#0057cd] font-black truncate mt-1 bg-blue-50/60 px-2 py-0.5 rounded-md inline-block max-w-full border border-blue-100/40" title={item.active_ingredient}>
                          {item.active_ingredient}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-900 font-black text-right whitespace-nowrap text-xs">
                      {item.price?.toLocaleString("vi-VN")} ₫ <span className="text-slate-400 text-[10px] font-normal">/ {item.unit || 'Hộp'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <div className="flex items-center gap-1">
                          <span className={`font-black text-xs sm:text-sm ${item.stock <= item.minStock ? 'text-rose-600' : 'text-slate-800'}`}>
                            {item.stock}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">{item.unit || 'Hộp'}</span>
                        </div>
                        {/* Miniature progress bar */}
                        <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              item.stock === 0 ? 'bg-rose-500 w-0' :
                              item.stock <= item.minStock ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} 
                            style={{ width: `${Math.min(100, (item.stock / (item.minStock || 50)) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 font-semibold">Min: {item.minStock}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {(() => {
                        const isOutOfStock = item.stock === 0;
                        const isLowStock = item.stock > 0 && item.stock <= item.minStock;
                        if (isOutOfStock) return (
                          <span className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
                            <AlertCircle size={12} className="text-rose-500" />
                            Hết hàng
                          </span>
                        );
                        if (isLowStock) return (
                          <span className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                            <AlertCircle size={12} className="text-amber-500" />
                            Sắp hết
                          </span>
                        );
                        return (
                          <span className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            Sẵn sàng
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 relative">
                      {item.batches && item.batches.length > 1 ? (
                        <div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDropdownId(openDropdownId === item.id ? null : item.id);
                            }}
                            className="flex items-center gap-1.5 bg-blue-50/60 text-[#0057cd] hover:bg-blue-50 hover:text-blue-700 text-xs font-extrabold rounded-lg px-3 py-1.5 transition-all border border-blue-100/50 shadow-sm whitespace-nowrap"
                          >
                            <span>{item.batches.length} Lô</span>
                            <span className="text-[9px]">▼</span>
                          </button>
                          {openDropdownId === item.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-20" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                }}
                              />
                              <div className="absolute left-6 mt-1 w-64 rounded-xl bg-white border border-slate-200 shadow-xl z-30 p-2 py-3 space-y-2 text-xs divide-y divide-slate-100 text-left animate-in fade-in zoom-in-95 duration-100">
                                <div className="font-extrabold text-slate-700 px-2 pb-1 bg-slate-50 rounded">Hạn sử dụng chi tiết:</div>
                                <div className="pt-2 max-h-40 overflow-y-auto space-y-1 px-1 custom-scrollbar">
                                  {item.batches.map((b: any) => (
                                    <div key={b.batchNo} className="flex flex-col py-1 px-1 justify-between hover:bg-slate-50 rounded">
                                      <div className="flex justify-between font-bold text-slate-800">
                                        <span>Lô: {b.batchNo}</span>
                                        <span className={b.status === 'EXPIRED' ? 'text-rose-600' : 'text-slate-600'}>
                                          {b.stock} {item.unit || 'Hộp'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-[11px] text-slate-500 mt-0.5">
                                        <span>Hạn: {new Date(b.expDate).toLocaleDateString("vi-VN")}</span>
                                        <span className={`font-semibold ${b.status === 'EXPIRED' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                          {b.status === 'EXPIRED' ? 'Hết hạn' : 'Hoạt động'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="font-extrabold text-slate-700 text-xs sm:text-sm">
                          {item.expiry ? new Date(item.expiry).toLocaleDateString("vi-VN") : 'N/A'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right flex justify-end gap-1">
                      {item.stock <= item.minStock && (
                        <button
                          onClick={() => {
                            const isWarehouse = window.location.pathname.startsWith('/warehouse');
                            const importPath = isWarehouse ? '/warehouse/inventory/import/new' : '/admin/inventory/import/new';
                            navigate(importPath, {
                              state: {
                                prefillPrItems: [{ medicineId: item.id, quantity: Math.max(20, (item.minStock || 50) * 2 - item.stock) }]
                              }
                            });
                          }}
                          className="text-amber-600 hover:text-amber-800 transition-colors p-1.5 rounded-lg hover:bg-amber-50 border border-transparent hover:border-amber-100"
                          title="Nhập hàng ngay"
                        >
                          <Truck size={15} />
                        </button>
                      )}
                      <button 
                        onClick={() => fetchMedicineDetails(item.id)}
                        className="text-[#0057cd] hover:text-[#00419e] transition-colors p-1.5 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-100"
                        title="Xem chi tiết"
                      >
                        <Eye size={15} />
                      </button>
                      <button className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100 border border-transparent hover:border-slate-200">
                        <MoreHorizontal size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!lowStockLoading && lowStockReport.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-500 font-semibold">Tất cả các loại thuốc đều đủ số lượng tồn kho an toàn.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
              <h2 className="text-lg font-bold text-slate-900">Chi Tiết Thông Tin Dược Phẩm</h2>
              <button 
                onClick={() => setDetailModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {fetchingDetails ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="animate-spin text-[#0057cd]" size={32} />
                  <p className="text-slate-500 font-medium">Đang tải dữ liệu y khoa...</p>
                </div>
              ) : selectedMedicine ? (
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    {selectedMedicine.image && (
                      <div className="w-32 h-32 rounded-xl border border-slate-200 overflow-hidden flex-shrink-0 p-2 bg-white shadow-sm">
                        <img src={selectedMedicine.image} alt={selectedMedicine.name} className="w-full h-full object-contain" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">{selectedMedicine.name}</h3>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-2.5 py-1 bg-blue-50 text-[#0057cd] text-xs font-bold rounded-md border border-blue-100">
                          {selectedMedicine.category || 'Chưa phân loại'}
                        </span>
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-md border border-slate-200">
                          {selectedMedicine.drug_classification === 'PRESCRIPTION_ANTIBIOTIC' ? 'Kê đơn / Kháng sinh' : 'Không kê đơn'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-500">Mã SKU:</span>
                          <span className="font-semibold text-slate-900">{selectedMedicine._id?.toString()?.substring(0,8).toUpperCase()}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-500">Hạn sử dụng:</span>
                          <span className="font-semibold text-slate-900">{selectedMedicine.expiry_date || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-500">Tồn kho:</span>
                          <span className="font-semibold text-slate-900">{selectedMedicine.stock} {selectedMedicine.unit}</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-500">Quy cách:</span>
                          <span className="font-semibold text-slate-900 max-w-[150px] truncate" title={selectedMedicine.thong_tin_chi_tiet?.['Quy cách']}>
                            {selectedMedicine.thong_tin_chi_tiet?.['Quy cách'] || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col max-h-[250px]">
                      <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-3 shrink-0">
                        <div className="w-2 h-2 rounded-full bg-[#0057cd]"></div> Thành phần chính
                      </h4>
                      <div className="overflow-y-auto pr-2 custom-scrollbar">
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {selectedMedicine.thong_tin_chi_tiet?.['Thành phần'] || 'Không có thông tin'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-emerald-50/50 rounded-xl p-5 border border-emerald-100 shadow-sm flex flex-col max-h-[250px]">
                      <h4 className="font-bold text-emerald-900 flex items-center gap-2 mb-3 shrink-0">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Công dụng
                      </h4>
                      <div className="overflow-y-auto pr-2 custom-scrollbar">
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                          {selectedMedicine.cong_dung || 'Không có thông tin'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50/50 rounded-xl p-5 border border-amber-100 shadow-sm flex flex-col max-h-[250px]">
                    <h4 className="font-bold text-amber-900 flex items-center gap-2 mb-3 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div> Liều dùng & Cách dùng
                    </h4>
                    <div className="overflow-y-auto pr-2 custom-scrollbar">
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                        {selectedMedicine.cach_dung || 'Theo chỉ định của bác sĩ'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-rose-50/50 rounded-xl p-5 border border-rose-100 shadow-sm flex flex-col max-h-[300px]">
                    <h4 className="font-bold text-rose-900 flex items-center gap-2 mb-3 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-rose-500"></div> Lưu ý & Chống chỉ định
                    </h4>
                    <div className="overflow-y-auto pr-2 custom-scrollbar">
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                        {selectedMedicine.luu_y || 'Không có thông tin'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-500 py-10">Không tìm thấy thông tin.</div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setDetailModalOpen(false)}
                className="px-5 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
