import React, { useState, useEffect, useMemo } from "react";
import api from "../../services/core/api";
import { 
  Sparkles, 
  ShoppingCart, 
  AlertTriangle, 
  TrendingUp, 
  Package, 
  RefreshCw, 
  Check, 
  ArrowRight,
  ChevronRight,
  TrendingDown,
  Info,
  Calendar,
  Layers,
  ArrowDownToLine,
  Search,
  Filter,
  RotateCcw,
  X,
  Building,
  CheckCircle2,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Pagination } from "../Pagination";

interface ForecastItem {
  medicineId: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  totalSold?: number;
  averageDailySales: number;
  expectedIncoming: number;
  suggestedOrderQty: number;
  urgency: "HIGH" | "MEDIUM" | "LOW";
  reason: string;
}

interface ForecastResult {
  summary: string;
  recommendations: ForecastItem[];
}

export function AIForecast() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Filtering & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUrgency, setSelectedUrgency] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);

  const fetchForecast = async (pDays: number) => {
    setLoading(true);
    setError(null);
    setSelectedIds([]);
    try {
      const res = await api.get(`/api/reports/ai-forecast?periodDays=${pDays}`);
      const data = res.data;
      
      if (data && data.recommendations) {
        setForecast(data);
      } else if (data && data.data && data.data.recommendations) {
        setForecast(data.data);
      } else {
        throw new Error("Dữ liệu phản hồi từ AI không đúng định dạng chuẩn.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Không thể tải dự báo nhu cầu nhập hàng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast(period);
  }, [period]);

  // Extract unique categories dynamically for filter dropdown
  const availableCategories = useMemo(() => {
    if (!forecast?.recommendations) return [];
    const set = new Set<string>();
    forecast.recommendations.forEach(item => {
      if (item.category) set.add(item.category.trim());
    });
    return Array.from(set).sort();
  }, [forecast]);

  // Filter recommendations based on Search + Urgency + Category
  const filteredRecommendations = useMemo(() => {
    if (!forecast?.recommendations) return [];
    return forecast.recommendations.filter(item => {
      const nameStr = (item.name || "").toLowerCase();
      const catStr = (item.category || "").toLowerCase();
      const medIdStr = (item.medicineId || "").toLowerCase();
      const q = searchQuery.toLowerCase();

      // Search text match
      const matchesSearch = 
        nameStr.includes(q) ||
        catStr.includes(q) ||
        medIdStr.includes(q);

      // Urgency match
      const matchesUrgency = selectedUrgency === "ALL" || item.urgency === selectedUrgency;

      // Category match
      const matchesCategory = selectedCategory === "ALL" || (item.category || "").trim() === selectedCategory.trim();

      return matchesSearch && matchesUrgency && matchesCategory;
    });
  }, [forecast, searchQuery, selectedUrgency, selectedCategory]);

  // Reset page to 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedUrgency, selectedCategory, itemsPerPage]);

  // Calculate paginated items
  const totalItems = filteredRecommendations.length;
  const isShowAll = itemsPerPage === -1;
  const totalPages = isShowAll ? 1 : Math.ceil(totalItems / itemsPerPage) || 1;

  const paginatedRecommendations = useMemo(() => {
    if (isShowAll) return filteredRecommendations;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecommendations.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecommendations, currentPage, itemsPerPage, isShowAll]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedUrgency("ALL");
    setSelectedCategory("ALL");
    setCurrentPage(1);
  };

  const handleSelectAll = (itemsToSelect: ForecastItem[]) => {
    const itemIds = itemsToSelect.map(item => item.medicineId);
    const allSelected = itemIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !itemIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...itemIds])));
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // UC-35 Auto PO Modal State
  const [isAutoPoModalOpen, setIsAutoPoModalOpen] = useState(false);
  const [isSubmittingPo, setIsSubmittingPo] = useState(false);
  const [autoPoSuccess, setAutoPoSuccess] = useState<any | null>(null);
  const [suppliersMap, setSuppliersMap] = useState<Record<string, string>>({});
  const [poQuantities, setPoQuantities] = useState<Record<string, number>>({});
  const [modalSelectedItems, setModalSelectedItems] = useState<ForecastItem[]>([]);

  const getMedId = (item: any) => String(item.medicineId || item._id || item.id || '').trim();

  const handleOpenAutoPoModal = async () => {
    if (!forecast || !forecast.recommendations) return;
    
    const strSelectedSet = new Set(selectedIds.map(id => String(id).trim()));

    let selectedItems = forecast.recommendations.filter(item => {
      const idStr = getMedId(item);
      return strSelectedSet.has(idStr) || selectedIds.includes(item.medicineId);
    });

    if (selectedItems.length === 0 && selectedIds.length > 0) {
      selectedItems = forecast.recommendations.slice(0, Math.min(forecast.recommendations.length, selectedIds.length));
    }

    if (selectedItems.length === 0) {
      alert("Vui lòng chọn ít nhất một loại thuốc để sinh đơn nhập.");
      return;
    }

    setModalSelectedItems(selectedItems);

    // Initialize quantities
    const initialQtys: Record<string, number> = {};
    selectedItems.forEach(item => {
      const id = getMedId(item);
      initialQtys[id] = item.suggestedOrderQty > 0 ? item.suggestedOrderQty : 50;
    });
    setPoQuantities(initialQtys);

    // Fetch suppliers list for auto-mapping display
    try {
      const res = await api.get('/api/suppliers');
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      const map: Record<string, string> = {};
      list.forEach((s: any) => {
        const id = String(s._id || s.id || '');
        if (id) map[id] = s.name || s.supplierName || 'Nhà cung cấp';
      });
      setSuppliersMap(map);
    } catch (err) {
      console.warn("Lỗi tải danh sách NCC:", err);
    }

    setAutoPoSuccess(null);
    setIsAutoPoModalOpen(true);
  };

  const handleConfirmAutoRoutePo = async () => {
    setIsSubmittingPo(true);
    try {
      let activeItems = modalSelectedItems;
      if (activeItems.length === 0 && forecast?.recommendations) {
        activeItems = forecast.recommendations.filter(it => (it.suggestedOrderQty || 0) > 0).slice(0, 5);
      }

      const itemsPayload = activeItems.map(item => {
        const id = getMedId(item);
        return {
          medicineId: id,
          medicineName: item.name,
          quantity: Number(poQuantities[id] || item.suggestedOrderQty || 50),
          unitPrice: 50000 // Fallback price
        };
      });

      if (itemsPayload.length === 0) {
        alert("Không tìm thấy sản phẩm hợp lệ để khởi tạo đơn hàng.");
        setIsSubmittingPo(false);
        return;
      }

      const res = await api.post('/api/purchase-orders/auto-route', {
        items: itemsPayload,
        prIds: []
      });

      setAutoPoSuccess(res.data);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Lỗi khi tự động sinh đơn PO nháp");
    } finally {
      setIsSubmittingPo(false);
    }
  };

  const handleCreatePR = () => {
    handleOpenAutoPoModal();
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'HIGH':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'LOW':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case 'HIGH': return 'Khẩn cấp';
      case 'MEDIUM': return 'Cần nhập';
      case 'LOW': return 'Bình thường';
      default: return urgency;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shadow-sm border border-purple-200">
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dự Báo Nhu Cầu Nhập Hàng Theo Kỳ (AI Forecast)</h1>
            <p className="text-slate-500 mt-1 text-sm">AI tự động phân tích doanh số kỳ trước và mức độ cạn kho để đề xuất kế hoạch mua sắm tối ưu.</p>
          </div>
        </div>
        
        {/* Period tabs */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-fit shrink-0">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setPeriod(days)}
              disabled={loading}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                period === days
                  ? "bg-white text-purple-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Dự báo {days} ngày tới
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-200 shadow-sm"
          >
            <div className="w-12 h-12 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin mb-4" />
            <p className="text-slate-600 font-bold text-sm">AI đang tổng hợp và tính toán nhu cầu tồn kho...</p>
            <p className="text-xs text-slate-400 mt-1">Quá trình phân tích dữ liệu bán hàng có thể mất vài giây.</p>
          </motion.div>
        ) : error ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl flex items-start gap-3"
          >
            <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={22} />
            <div>
              <h4 className="font-bold mb-1">Không thể kết xuất dự báo AI</h4>
              <p className="text-sm text-rose-700 mb-4">{error}</p>
              <button 
                onClick={() => fetchForecast(period)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RefreshCw size={14} /> Thử lại
              </button>
            </div>
          </motion.div>
        ) : forecast ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* AI Summary Banner */}
            <div className="bg-gradient-to-r from-purple-900 to-indigo-850 text-white rounded-2xl shadow-md p-6 border border-purple-950 flex flex-col md:flex-row items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center shrink-0 text-yellow-300">
                <Sparkles size={20} className="animate-pulse" />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-base flex items-center gap-1.5">
                  Đánh giá toàn cảnh từ AI (AI Insights)
                </h3>
                <p className="text-purple-100/90 text-sm mt-2 leading-relaxed font-medium">
                  {forecast.summary}
                </p>
              </div>
              <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20 text-xs font-bold shrink-0">
                Tổng số dược phẩm: <span className="text-yellow-300 font-black">{forecast.recommendations.length.toLocaleString('vi-VN')}</span>
              </div>
            </div>

            {/* Table Panel */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              {/* Filter Toolbar */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
                <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                  {/* Search input */}
                  <div className="relative w-full md:w-72">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Search size={16} />
                    </span>
                    <input
                      type="text"
                      placeholder="Tìm tên thuốc, mã hoặc danh mục..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-purple-500 shadow-sm"
                    />
                  </div>

                  {/* Filters & Actions */}
                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Urgency Filter */}
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                      <Filter size={14} className="text-slate-400" />
                      <select
                        value={selectedUrgency}
                        onChange={(e) => setSelectedUrgency(e.target.value)}
                        className="text-xs font-bold text-slate-700 bg-transparent border-none outline-none cursor-pointer"
                      >
                        <option value="ALL">Tất cả mức độ</option>
                        <option value="HIGH">🔴 Khẩn cấp</option>
                        <option value="MEDIUM">🟡 Cần nhập</option>
                        <option value="LOW">🔵 Bình thường</option>
                      </select>
                    </div>

                    {/* Category Filter */}
                    {availableCategories.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm max-w-[200px]">
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="text-xs font-bold text-slate-700 bg-transparent border-none outline-none cursor-pointer truncate w-full"
                        >
                          <option value="ALL">Tất cả danh mục ({availableCategories.length})</option>
                          {availableCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Items per page */}
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                      <span className="text-[11px] font-bold text-slate-500">Hiển thị:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        className="text-xs font-bold text-slate-700 bg-transparent border-none outline-none cursor-pointer"
                      >
                        <option value={15}>15 / trang</option>
                        <option value={30}>30 / trang</option>
                        <option value={50}>50 / trang</option>
                        <option value={100}>100 / trang</option>
                        <option value={-1}>Tất cả ({totalItems})</option>
                      </select>
                    </div>

                    {(searchQuery || selectedUrgency !== "ALL" || selectedCategory !== "ALL") && (
                      <button
                        onClick={handleResetFilters}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors border border-slate-200"
                        title="Xóa bộ lọc"
                      >
                        <RotateCcw size={14} />
                      </button>
                    )}

                    {selectedIds.length > 0 && (
                      <button
                        onClick={handleCreatePR}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-95 ml-auto"
                      >
                        <ShoppingCart size={15} />
                        Tạo Đơn Nhập Hàng Tự Động ({selectedIds.length})
                      </button>
                    )}
                  </div>
                </div>

                {/* Active filter counters bar */}
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-1">
                  <div>
                    Hiển thị <span className="font-bold text-slate-900">{totalItems.toLocaleString('vi-VN')}</span> kết quả 
                    {(searchQuery || selectedUrgency !== "ALL" || selectedCategory !== "ALL") && " (Đã lọc)"}
                  </div>
                  {selectedIds.length > 0 && (
                    <div className="text-purple-600 font-bold">
                      Đã chọn {selectedIds.length} dược phẩm
                    </div>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="text-[10px] text-slate-500 uppercase font-black bg-slate-50 border-b border-slate-200 tracking-wider">
                    <tr>
                      <th className="px-5 py-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={paginatedRecommendations.length > 0 && paginatedRecommendations.every(x => selectedIds.includes(x.medicineId))}
                          onChange={() => handleSelectAll(paginatedRecommendations)}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-5 py-4">Tên dược phẩm</th>
                      <th className="px-5 py-4 text-center">Tồn kho hiện tại</th>
                      <th className="px-5 py-4 text-center">Bán kỳ trước ({period} ngày)</th>
                      <th className="px-5 py-4 text-center">Tốc độ/ngày</th>
                      <th className="px-5 py-4 text-center">Hàng đang về</th>
                      <th className="px-5 py-4 text-center text-purple-700 bg-purple-50/50 border-x border-purple-100">AI Đề Xuất</th>
                      <th className="px-5 py-4 text-center">Mức khẩn cấp</th>
                      <th className="px-5 py-4 max-w-[200px]">Phân tích lý do</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedRecommendations.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-slate-400 font-semibold">
                          Không tìm thấy đề xuất dự báo phù hợp với bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      paginatedRecommendations.map((item) => {
                        const isSelected = selectedIds.includes(item.medicineId);
                        const isLowStock = item.currentStock <= 10;
                        return (
                          <tr 
                            key={item.medicineId}
                            className={`hover:bg-slate-50/70 transition-colors ${
                              isSelected ? 'bg-purple-50/20' : ''
                            }`}
                          >
                            <td className="px-5 py-4 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectItem(item.medicineId)}
                                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-5 py-4">
                              <div className="font-bold text-slate-900">{item.name}</div>
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 mt-1 inline-block">
                                {item.category}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`font-bold ${isLowStock ? 'text-rose-600' : 'text-slate-800'}`}>
                                {item.currentStock.toLocaleString('vi-VN')} {item.unit || 'Hộp'}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center font-medium text-slate-700">
                              {(item.totalSold !== undefined && item.totalSold > 0 ? item.totalSold : Math.round(item.averageDailySales * period)).toLocaleString('vi-VN')} {item.unit || 'Hộp'}
                            </td>
                            <td className="px-5 py-4 text-center font-semibold text-slate-700">
                              {item.averageDailySales} /ngày
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={item.expectedIncoming > 0 ? "text-indigo-600 font-bold" : "text-slate-400"}>
                                {item.expectedIncoming > 0 ? `+${item.expectedIncoming.toLocaleString('vi-VN')}` : "—"}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center bg-purple-50/30 border-x border-purple-100 font-black text-purple-700">
                              {item.suggestedOrderQty > 0 
                                ? `${item.suggestedOrderQty.toLocaleString('vi-VN')} ${item.unit || 'Hộp'}` 
                                : item.expectedIncoming > 0 
                                  ? "Đang chờ hàng về" 
                                  : "Đủ hàng"}
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`inline-block text-[9px] font-black border uppercase tracking-wider px-2 py-0.5 rounded-full ${getUrgencyBadge(item.urgency)}`}>
                                {getUrgencyText(item.urgency)}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-500 max-w-[200px] leading-relaxed">
                              {item.reason}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              {!isShowAll && totalPages > 1 && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                  <Pagination
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                  />
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {/* ================================================================================= */}
      {/* MODAL UC-35: TỰ ĐỘNG TẠO ĐƠN ĐẶT HÀNG TỪ KẾT QUẢ DỰ BÁO (AUTO-MAPPING & DRAFT PO) */}
      {/* ================================================================================= */}
      <AnimatePresence>
        {isAutoPoModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                    <Sparkles className="w-6 h-6 text-emerald-200" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">UC-35: Sinh Đơn PO Nháp Tự Động</h3>
                    <p className="text-xs text-emerald-100/90 font-medium mt-0.5">
                      AI Forecast ➔ Auto-Mapping NCC ➔ Sinh Đơn PO Nháp ➔ Chuyển Phê Duyệt
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAutoPoModalOpen(false)}
                  className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Step Visual Process */}
                <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/60 text-center text-xs font-semibold">
                  <div className="flex items-center gap-1.5 justify-center text-emerald-700">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-[10px]">1</span>
                    AI Forecast
                  </div>
                  <div className="flex items-center gap-1.5 justify-center text-teal-700">
                    <span className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center font-bold text-[10px]">2</span>
                    Auto-Mapping
                  </div>
                  <div className="flex items-center gap-1.5 justify-center text-cyan-700">
                    <span className="w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center font-bold text-[10px]">3</span>
                    Draft PO
                  </div>
                  <div className="flex items-center gap-1.5 justify-center text-blue-700">
                    <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center font-bold text-[10px]">4</span>
                    Approval
                  </div>
                </div>

                {!autoPoSuccess ? (
                  <>
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 flex items-start gap-3">
                      <Zap className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm text-emerald-950">Hệ thống Auto-mapping đã phân tích {modalSelectedItems.length} thuốc được chọn:</p>
                        <p className="mt-1 leading-relaxed text-emerald-800">
                          Tự động tra cứu Nhà cung cấp mặc định và gom các mặt hàng cùng NCC vào 1 Đơn Đặt Hàng Nháp (Draft PO). Đơn sẽ ở trạng thái chờ Admin / HQ phê duyệt.
                        </p>
                      </div>
                    </div>

                    {/* Auto Mapping Items List */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-slate-800 flex items-center justify-between">
                        <span>Danh sách dược phẩm đề xuất đặt hàng:</span>
                        <span className="text-xs font-medium text-slate-500">Tổng cộng: {modalSelectedItems.length} sản phẩm</span>
                      </h4>

                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden max-h-[260px] overflow-y-auto">
                        {modalSelectedItems.map((item, idx) => {
                          const id = getMedId(item);
                          const qty = poQuantities[id] || item.suggestedOrderQty || 50;
                          const estimatedPrice = 50000;
                          const totalPrice = qty * estimatedPrice;

                            return (
                              <div key={item.medicineId || idx} className="p-3.5 hover:bg-slate-50/80 flex items-center justify-between gap-4 transition-colors">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-slate-900 truncate">{item.name}</span>
                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">{item.unit || 'Hộp'}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                    <span className="text-emerald-700 font-medium">NCC: {suppliersMap[item.medicineId] || 'Nhà cung cấp ưu tiên'}</span>
                                    <span>• Tồn: {item.currentStock}</span>
                                    <span>• Giá ước tính: {estimatedPrice.toLocaleString('vi-VN')}đ</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                    <span className="px-2 py-1 text-xs text-slate-400 font-medium">SL:</span>
                                    <input
                                      type="number"
                                      min={1}
                                      value={qty}
                                      onChange={(e) => {
                                        const val = Math.max(1, parseInt(e.target.value) || 1);
                                        setPoQuantities(prev => ({ ...prev, [item.medicineId]: val }));
                                      }}
                                      className="w-20 px-2 py-1 text-xs font-bold text-slate-900 border-l border-slate-200 outline-none"
                                    />
                                  </div>
                                  <span className="text-xs font-bold text-emerald-700 w-24 text-right">
                                    {totalPrice.toLocaleString('vi-VN')}đ
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </>
                ) : (
                  /* Success State Result */
                  <div className="py-6 text-center space-y-5">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-xl font-extrabold text-slate-900">Sinh Đơn PO Nháp Thành Công!</h4>
                      <p className="text-sm text-slate-600 max-w-md mx-auto">
                        {autoPoSuccess.message || `Đã tự động tạo ${autoPoSuccess.poIds?.length || 1} Đơn đặt hàng PO ở trạng thái Chờ Duyệt.`}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left max-w-lg mx-auto text-xs space-y-2">
                      <p className="font-bold text-slate-800 flex items-center justify-between border-b pb-2">
                        <span>Mã đơn đặt hàng PO khởi tạo:</span>
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono font-extrabold">
                          {autoPoSuccess.poIds?.length || 1} Đơn PO Nháp
                        </span>
                      </p>
                      <ul className="space-y-1.5 text-slate-600 font-mono">
                        {autoPoSuccess.poIds?.map((id: string, index: number) => (
                          <li key={id} className="flex items-center justify-between bg-white p-2 rounded border border-slate-100">
                            <span className="font-bold text-slate-700">Đơn #{index + 1}: PO-{id.substring(id.length - 8).toUpperCase()}</span>
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-sans font-bold px-2 py-0.5 rounded">PENDING_APPROVAL</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                {!autoPoSuccess ? (
                  <>
                    <button
                      onClick={() => setIsAutoPoModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
                    >
                      Hủy Bỏ
                    </button>
                    <button
                      onClick={handleConfirmAutoRoutePo}
                      disabled={isSubmittingPo}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSubmittingPo ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Đang Tách Đơn & Sinh PO...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Xác Nhận Sinh Đơn PO Nháp (Auto-Route)
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="w-full flex items-center justify-between gap-3">
                    <button
                      onClick={() => setIsAutoPoModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
                    >
                      Đóng Màn Hình
                    </button>
                    <button
                      onClick={() => {
                        setIsAutoPoModalOpen(false);
                        navigate('/admin/approvals');
                      }}
                      className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-md"
                    >
                      <Building className="w-4 h-4 text-emerald-400" />
                      Đến Màn Hình Phê Duyệt PO (HQ Approval) ➔
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

