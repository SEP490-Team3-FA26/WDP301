import React, { useState, useEffect } from "react";
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
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";

interface ForecastItem {
  medicineId: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
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
  const [searchQuery, setSearchQuery] = useState("");

  const fetchForecast = async (pDays: number) => {
    setLoading(true);
    setError(null);
    setSelectedIds([]);
    try {
      const response = await fetch(`/api/reports/ai-forecast?periodDays=${pDays}`);
      if (!response.ok) {
        throw new Error("Lỗi hệ thống khi tạo dự báo từ AI Service");
      }
      const data = await response.json();
      
      // Đảm bảo dữ liệu đúng định dạng
      if (data && data.recommendations) {
        setForecast(data);
      } else {
        throw new Error("Dữ liệu phản hồi từ AI không đúng định dạng chuẩn.");
      }
    } catch (err: any) {
      setError(err.message || "Không thể tải dự báo nhu cầu nhập hàng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast(period);
  }, [period]);

  const handleSelectAll = (filteredItems: ForecastItem[]) => {
    const allFilteredIds = filteredItems.map(item => item.medicineId);
    const allSelected = allFilteredIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds(prev => {
        const union = new Set([...prev, ...allFilteredIds]);
        return Array.from(union);
      });
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreatePR = () => {
    if (selectedIds.length === 0 || !forecast) return;
    
    const selectedItems = forecast.recommendations.filter(
      item => selectedIds.includes(item.medicineId) && item.suggestedOrderQty > 0
    );

    if (selectedItems.length === 0) {
      alert("Vui lòng chọn ít nhất một loại thuốc có số lượng khuyến nghị lớn hơn 0.");
      return;
    }

    const prefillData = selectedItems.map(item => ({
      medicineId: item.medicineId,
      medicineName: item.name,
      requestedQuantity: item.suggestedOrderQty,
      unit: item.unit || "Hộp"
    }));

    const prefillStr = encodeURIComponent(JSON.stringify(prefillData));
    
    // Điều hướng sang Warehouse Hub, tự động mở modal tạo PO
    navigate(`/warehouse/inventory/import?tab=purchase_requests&openCreatePO=true&prefill=${prefillStr}`);
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

  const filteredRecommendations = forecast?.recommendations.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

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
              <div>
                <h3 className="font-black text-base flex items-center gap-1.5">
                  Đánh giá toàn cảnh từ AI (AI Insights)
                </h3>
                <p className="text-purple-100/90 text-sm mt-2 leading-relaxed font-medium">
                  {forecast.summary}
                </p>
              </div>
            </div>

            {/* Table Panel */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              {/* Toolbar */}
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/50">
                <div className="relative w-full sm:max-w-xs">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    placeholder="Tìm tên thuốc hoặc danh mục..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-purple-500 shadow-sm"
                  />
                </div>
                
                {selectedIds.length > 0 && (
                  <button
                    onClick={handleCreatePR}
                    className="w-full sm:w-auto px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                  >
                    <ShoppingCart size={15} />
                    Tạo Đơn Nhập Hàng Tự Động ({selectedIds.length})
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="text-[10px] text-slate-500 uppercase font-black bg-slate-50 border-b border-slate-200 tracking-wider">
                    <tr>
                      <th className="px-5 py-4 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={filteredRecommendations.length > 0 && filteredRecommendations.every(x => selectedIds.includes(x.medicineId))}
                          onChange={() => handleSelectAll(filteredRecommendations)}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
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
                    {filteredRecommendations.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-12 text-slate-400 font-semibold">
                          Không tìm thấy đề xuất dự báo phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredRecommendations.map((item) => {
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
                                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
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
                                {item.currentStock.toLocaleString('vi-VN')} {item.unit}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center font-medium text-slate-700">
                              {(item.averageDailySales * period).toFixed(0)} {item.unit}
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
                              {item.suggestedOrderQty > 0 ? `${item.suggestedOrderQty.toLocaleString('vi-VN')} ${item.unit}` : "Đủ hàng"}
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
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
