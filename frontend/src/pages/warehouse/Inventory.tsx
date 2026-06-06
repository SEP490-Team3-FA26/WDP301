import React, { useState, useEffect } from "react";
import { Plus, Search, Filter, MoreHorizontal, AlertCircle, CheckCircle2, Loader2, Eye, X } from "lucide-react";

export function Inventory() {
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

  const fetchMedicineDetails = async (id: string) => {
    setFetchingDetails(true);
    setDetailModalOpen(true);
    try {
      const res = await fetch(`/api/medicines/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedMedicine(data);
      }
    } catch (error) {
      console.error("Failed to fetch details", error);
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingStatusId(id);
    try {
      const res = await fetch(`/api/medicines/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setInventory(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
      }
    } catch (error) {
      console.error("Failed to update status", error);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Fetch filter options on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await fetch('/api/medicines/filters');
        if (response.ok) {
          const data = await response.json();
          setFilterOptions(data);
        }
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
        let url = `/api/medicines?search=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=${limit}`;
        if (selectedCategory) url += `&category=${encodeURIComponent(selectedCategory)}`;
        if (selectedClassification) url += `&classification=${encodeURIComponent(selectedClassification)}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch medicines");
        const result = await response.json();
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
    <div className="space-y-6 flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tổng Quan Kho</h1>
          <p className="text-slate-500 mt-1">Quản lý danh sách thuốc và tồn kho hiện tại.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button className="px-5 py-2 bg-[#0057cd] text-white font-bold rounded-xl hover:bg-[#00419e] transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap">
            <Plus size={18} />
            Thêm thuốc
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50">
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm theo mã, tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 p-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={selectedClassification}
              onChange={(e) => setSelectedClassification(e.target.value)}
              className="w-full sm:w-auto p-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
            >
              <option value="">Tất cả phân loại</option>
              {filterOptions.classifications.map(c => (
                <option key={c} value={c}>
                  {c === 'PRESCRIPTION_ANTIBIOTIC' ? 'Kê đơn / Kháng sinh' : 
                   c === 'COMMON_SUPPLEMENT' ? 'Không kê đơn / TPCN' : c}
                </option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-auto p-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm"
            >
              <option value="">Tất cả danh mục</option>
              {filterOptions.categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table & Loading States */}
        <div className="overflow-x-auto relative min-h-[300px]">
          {loading ? (
            <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-3 z-10">
              <Loader2 className="animate-spin text-[#0057cd]" size={32} />
              <p className="text-sm font-semibold text-slate-500">Đang tải danh sách thuốc...</p>
            </div>
          ) : null}

          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th scope="col" className="px-6 py-4 font-medium">Mã & Tên Thuốc</th>
                <th scope="col" className="px-6 py-4 font-medium">Danh Mục</th>
                <th scope="col" className="px-6 py-4 font-medium text-right">Giá Bán</th>
                <th scope="col" className="px-6 py-4 font-medium text-center">Tồn Kho</th>
                <th scope="col" className="px-6 py-4 font-medium">Trạng Thái</th>
                <th scope="col" className="px-6 py-4 font-medium">Hạn Sử Dụng</th>
                <th scope="col" className="px-6 py-4 font-medium text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventory.map((item) => (
                <tr key={item.id} className="bg-white hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900 flex items-center gap-3">
                      {item.image && (
                        <div className="w-8 h-8 rounded border border-slate-100 overflow-hidden flex-shrink-0">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-slate-900 max-w-xs truncate" title={item.name}>{item.name}</div>
                        <div className="text-xs text-slate-500">{item.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 max-w-[200px]">
                    <div className="truncate font-medium text-slate-700" title={item.category}>{item.category}</div>
                    {item.active_ingredient && (
                      <div className="text-[11px] text-[#0057cd] font-semibold truncate mt-0.5 bg-blue-50 px-1.5 py-0.5 rounded inline-block max-w-full" title={item.active_ingredient}>
                        {item.active_ingredient}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-900 font-medium text-right whitespace-nowrap">
                    {item.price.toLocaleString("vi-VN")} ₫ <span className="text-slate-400 text-xs font-normal">/ {item.unit || 'Hộp'}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`font-semibold ${item.stock <= item.minStock ? 'text-rose-600' : 'text-slate-900'}`}>
                      {item.stock}
                    </span>
                    <span className="text-xs text-slate-400 ml-1">/ {item.minStock}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative inline-block">
                      <select
                        value={item.status}
                        disabled={updatingStatusId === item.id}
                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
                        className={`appearance-none pl-8 pr-6 py-1.5 rounded-full text-xs font-bold outline-none cursor-pointer transition-colors border-2
                          ${item.status === 'In Stock' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300' : 
                            item.status === 'Low Stock' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-300' : 
                            'bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-300'}
                          ${updatingStatusId === item.id ? 'opacity-50 cursor-wait' : ''}
                        `}
                      >
                        <option value="In Stock">Sẵn sàng</option>
                        <option value="Low Stock">Sắp hết</option>
                        <option value="Out of Stock">Hết hàng</option>
                      </select>
                      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        {item.status === 'In Stock' && <CheckCircle2 size={14} className="text-emerald-600" />}
                        {item.status === 'Low Stock' && <AlertCircle size={14} className="text-amber-600" />}
                        {item.status === 'Out of Stock' && <AlertCircle size={14} className="text-rose-600" />}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{item.expiry}</td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button 
                      onClick={() => fetchMedicineDetails(item.id)}
                      className="text-[#0057cd] hover:text-[#00419e] transition-colors p-1.5 rounded-md hover:bg-blue-50"
                      title="Xem chi tiết"
                    >
                      <Eye size={18} />
                    </button>
                    <button className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-md hover:bg-slate-100">
                      <MoreHorizontal size={18} />
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
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white text-sm">
          <span className="text-slate-500">
            Hiển thị <span className="font-medium text-slate-900">{inventory.length > 0 ? (page - 1) * limit + 1 : 0}</span> đến <span className="font-medium text-slate-900">{(page - 1) * limit + inventory.length}</span> trong số <span className="font-medium text-slate-900">{total}</span> thuốc
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
