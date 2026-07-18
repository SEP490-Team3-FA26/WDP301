import React, { useState, useEffect } from "react";
import { Search, Filter, AlertCircle, CheckCircle2, Loader2, Eye, Package, Calendar } from "lucide-react";
import { medicineService } from "../../services/inventory/medicine.service";
import { useSocket } from "../../hooks/useSocket";

// Helper to decode JWT token to extract branchId
function getBranchIdFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    return decoded.branchId || null;
  } catch (e) {
    console.error("Lỗi giải mã token:", e);
    return null;
  }
}

export function BranchInventory() {
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

  const [selectedMedicine, setSelectedMedicine] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const branchId = getBranchIdFromToken() || "BR-001"; // Fallback to BR-001 for test account

  const fetchMedicineDetails = async (id: string) => {
    setFetchingDetails(true);
    setDetailModalOpen(true);
    try {
      const data = await medicineService.getMedicineById(id);
      setSelectedMedicine(data);
    } catch (error) {
      console.error("Không thể lấy chi tiết thuốc:", error);
    } finally {
      setFetchingDetails(false);
    }
  };

  // Fetch filter options on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const data = await medicineService.getFilters();
        setFilterOptions(data);
      } catch (error) {
        console.error("Lỗi lấy danh sách bộ lọc:", error);
      }
    };
    fetchFilters();
  }, []);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, selectedClassification]);

  // Fetch branch inventory from backend
  const fetchBranchInventory = async () => {
    setLoading(true);
    try {
      const result = await medicineService.getBranchMedicines(branchId, {
        search: debouncedSearch || undefined,
        page,
        limit,
        category: selectedCategory || undefined,
        classification: selectedClassification || undefined,
        branchStockOnly: true
      });
      setInventory(result.data || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error("Lỗi tải tồn kho chi nhánh:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranchInventory();
  }, [debouncedSearch, page, limit, selectedCategory, selectedClassification, branchId]);

  const { onEvent, offEvent } = useSocket();

  useEffect(() => {
    const handleInventoryUpdate = (data: any) => {
      console.log('Inventory updated event received:', data);
      fetchBranchInventory();
    };

    onEvent('broadcast.inventory_updated', handleInventoryUpdate);

    return () => {
      offEvent('broadcast.inventory_updated', handleInventoryUpdate);
    };
  }, [onEvent, offEvent, debouncedSearch, page, limit, selectedCategory, selectedClassification, branchId]);

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
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${page === p
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
    <div className="flex flex-col gap-4 h-full bg-[#faf8ff] p-6 lg:p-8 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-100 text-[#0057cd]">
              <Package size={20} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tồn Kho Chi Nhánh ({branchId})</h1>
          </div>
          <p className="text-slate-500 mt-1 ml-13">
            Xem và kiểm tra số lượng tồn kho khả dụng của các sản phẩm thuốc tại cơ sở của bạn.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-100/40 overflow-hidden flex flex-col transition-all duration-300">
        
        {/* Search & Filter Toolbar */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-center justify-between bg-gradient-to-r from-slate-50/60 to-white">
          <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm theo mã, tên thuốc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:ring-4 focus:ring-blue-500/10 focus:border-[#0057cd] outline-none transition-all shadow-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full sm:w-auto">
              <select
                value={selectedClassification}
                onChange={(e) => setSelectedClassification(e.target.value)}
                className="w-full sm:w-auto pl-3 pr-8 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors focus:ring-4 focus:ring-blue-500/10 focus:border-[#0057cd] outline-none shadow-sm appearance-none cursor-pointer"
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
                className="w-full sm:w-auto pl-3 pr-8 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors focus:ring-4 focus:ring-blue-500/10 focus:border-[#0057cd] outline-none shadow-sm appearance-none cursor-pointer"
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

        {/* Table View */}
        <div className="overflow-x-auto overflow-y-auto relative flex-1 min-h-0 custom-scrollbar">
          {loading ? (
            <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-3 z-10">
              <Loader2 className="animate-spin text-[#0057cd]" size={32} />
              <p className="text-sm font-semibold text-slate-500">Đang tải danh sách tồn kho...</p>
            </div>
          ) : null}

          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-[10px] text-slate-400 uppercase bg-slate-50/60 border-b border-slate-100 tracking-wider">
              <tr>
                <th scope="col" className="px-4 py-3 font-bold">Mã & Tên Thuốc</th>
                <th scope="col" className="px-4 py-3 font-bold">Phân loại</th>
                <th scope="col" className="px-4 py-3 font-bold">Danh Mục & Hoạt Chất</th>
                <th scope="col" className="px-4 py-3 font-bold text-right">Giá Bán</th>
                <th scope="col" className="px-4 py-3 font-bold text-center">Tồn Kho</th>
                <th scope="col" className="px-4 py-3 font-bold">Trạng Thái</th>
                <th scope="col" className="px-4 py-3 font-bold">Hạn Sử Dụng</th>
                <th scope="col" className="px-4 py-3 text-right font-bold">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventory.map((item) => (
                <tr key={item.id} className="group bg-white hover:bg-slate-50/40 hover:shadow-[inset_4px_0_0_0_#0057cd] transition-all duration-200">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 shadow-sm overflow-hidden flex-shrink-0 flex items-center justify-center p-0.5">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                        ) : (
                          <Package className="text-slate-400 w-4 h-4" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <div className="font-bold text-slate-800 max-w-xs truncate text-xs sm:text-sm">{item.name}</div>
                        <div className="mt-1 font-mono text-[9px] text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md w-fit">{item.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {item.drug_classification === 'PRESCRIPTION_ANTIBIOTIC' ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 shadow-sm">
                        Kê đơn / Kháng sinh
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-[#f0f6ff] text-[#0057cd] border border-blue-100 shadow-sm">
                        Không kê đơn / TPCN
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-[180px]">
                    <div className="truncate font-bold text-slate-700 text-xs sm:text-sm">{item.category}</div>
                    {item.active_ingredient && (
                      <div className="text-[10px] text-[#0057cd] font-black truncate mt-1 bg-blue-50 px-2 py-0.5 rounded-md inline-block max-w-full border border-blue-100/40">
                        {item.active_ingredient}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-900 font-black text-right whitespace-nowrap text-xs">
                    {item.price.toLocaleString("vi-VN")} ₫ <span className="text-slate-400 text-[10px] font-normal">/ {item.unit || 'Hộp'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <div className="flex items-center gap-1">
                        <span className={`font-black text-xs sm:text-sm ${item.stock <= (item.minStock || 50) ? 'text-rose-600' : 'text-slate-800'}`}>
                          {item.stock}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">{item.unit || 'Hộp'}</span>
                      </div>
                      <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden shadow-inner">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${item.stock === 0 ? 'bg-rose-500 w-0' :
                            item.stock <= (item.minStock || 50) ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          style={{ width: `${Math.min(100, (item.stock / (item.minStock || 50)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const isOutOfStock = item.stock === 0;
                      const isLowStock = item.stock > 0 && item.stock <= (item.minStock || 50);
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
                  <td className="px-4 py-3 text-slate-600 relative">
                    {item.batches && item.batches.length > 1 ? (
                      <div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(openDropdownId === item.id ? null : item.id);
                          }}
                          className="flex items-center gap-1.5 bg-blue-50/60 text-[#0057cd] hover:bg-blue-50 hover:text-blue-700 text-xs font-extrabold rounded-lg px-3 py-1.5 transition-all border border-blue-100/50 shadow-sm"
                        >
                          <span>{item.batches.length} Lô</span>
                          <span className="text-[9px]">▼</span>
                        </button>
                        {openDropdownId === item.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); }} />
                            <div className="absolute left-6 mt-1 w-64 rounded-xl bg-white border border-slate-200 shadow-xl z-30 p-2 py-3 space-y-2 text-xs divide-y divide-slate-100 text-left animate-in fade-in zoom-in-95 duration-100">
                              <div className="font-extrabold text-slate-700 px-2 pb-1 bg-slate-50 rounded">Chi tiết các lô hàng chi nhánh:</div>
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
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => fetchMedicineDetails(item.id)}
                      className="text-[#0057cd] hover:text-[#00419e] transition-colors p-1.5 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-105"
                      title="Xem chi tiết"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && inventory.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">Chi nhánh chưa có hàng hóa hoặc không tìm thấy kết quả.</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between bg-white text-sm">
          <span className="text-xs text-slate-500">
            Hiển thị <span className="font-semibold text-slate-800">{inventory.length > 0 ? (page - 1) * limit + 1 : 0}</span>–<span className="font-semibold text-slate-800">{(page - 1) * limit + inventory.length}</span> / <span className="font-semibold text-slate-800">{total}</span> sản phẩm
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

      {/* Details Modal */}
      {detailModalOpen && selectedMedicine && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-250 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Chi tiết thuốc</h3>
              <button onClick={() => setDetailModalOpen(false)} className="text-slate-400 hover:text-slate-700 text-sm font-extrabold">✕</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <h4 className="text-lg font-bold text-slate-900">{selectedMedicine.name}</h4>
                <span className="text-[10px] font-mono text-slate-400 uppercase">{selectedMedicine.id}</span>
              </div>
              <div className="grid grid-cols-12 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="col-span-6">
                  <span className="text-slate-400 font-bold block">Danh mục</span>
                  <span className="font-extrabold text-slate-800">{selectedMedicine.category}</span>
                </div>
                <div className="col-span-6">
                  <span className="text-slate-400 font-bold block">Đơn vị tính</span>
                  <span className="font-extrabold text-slate-800">{selectedMedicine.unit}</span>
                </div>
                <div className="col-span-6">
                  <span className="text-slate-400 font-bold block">Hoạt chất</span>
                  <span className="font-extrabold text-slate-800">{selectedMedicine.active_ingredient || "N/A"}</span>
                </div>
                <div className="col-span-6">
                  <span className="text-slate-400 font-bold block">Giá bán lẻ</span>
                  <span className="font-extrabold text-[#0057cd]">{selectedMedicine.price.toLocaleString("vi-VN")} ₫</span>
                </div>
                <div className="col-span-6">
                  <span className="text-slate-400 font-bold block">Thành phần</span>
                  <span className="font-extrabold text-slate-800">
                    {selectedMedicine.thong_tin_chi_tiet?.['Thành phần'] || 
                     selectedMedicine.thong_tin_chi_tiet?.['thành phần'] || 
                     selectedMedicine.thong_tin_chi_tiet?.['thanh_phan'] || 
                     "N/A"}
                  </span>
                </div>
                <div className="col-span-6">
                  <span className="text-slate-400 font-bold block">Nhà sản xuất</span>
                  <span className="font-extrabold text-slate-800">
                    {selectedMedicine.thong_tin_chi_tiet?.['Nhà sản xuất'] || 
                     selectedMedicine.manufacturer || 
                     "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
