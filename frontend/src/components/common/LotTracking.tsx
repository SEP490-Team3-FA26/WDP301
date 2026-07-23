import React, { useState, useEffect } from "react";
import { 
  Search, 
  History, 
  Package, 
  Truck, 
  User, 
  Calendar, 
  DollarSign, 
  MapPin, 
  ArrowRight, 
  Activity, 
  AlertTriangle,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import api from "../../services/core/api";

interface BatchInfo {
  branchId: string;
  stock: number;
  expDate: string;
  status: string;
}

interface OriginInfo {
  grnId: string;
  poId: string;
  importDate: string;
  supplierId: string;
  supplierName: string;
  importQty: number;
  importPrice: number;
  receivedBy: string;
}

interface TimelineItem {
  _id: string;
  type: string;
  quantityChange: number;
  stockBefore: number;
  stockAfter: number;
  referenceId: string;
  referenceType: string;
  performedBy: string;
  notes: string;
  createdAt: string;
}

interface TraceResult {
  batchNo: string;
  medicine: {
    _id: string;
    name: string;
    sku: string;
    unit: string;
    category: string;
  } | null;
  batches: BatchInfo[];
  origin: OriginInfo | null;
  timeline: TimelineItem[];
}

export function LotTracking() {
  const [searchBatchNo, setSearchBatchNo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TraceResult | null>(null);
  const [activeTab, setActiveTab] = useState<"origin" | "branches" | "timeline">("origin");

  // Một số gợi ý lô mẫu để người dùng dễ thử nghiệm
  const mockSuggestedLots = ["INIT-BATCH", "LOT-2026-A", "LOT-2026-B"];

  const handleSearch = async (batchNo: string) => {
    if (!batchNo.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await api.get(`/api/inventory-transactions/trace/${encodeURIComponent(batchNo.trim())}`);
      setResult(response.data);
      setSearchBatchNo(batchNo);
      setActiveTab("origin");
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || `Không tìm thấy thông tin cho lô "${batchNo}"`;
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const getTxnBadge = (type: string) => {
    switch (type) {
      case 'GRN_IMPORT':
        return { label: 'Nhập kho', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'SALE_EXPORT':
        return { label: 'Xuất bán', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'DISPOSE':
        return { label: 'Hủy thuốc', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'TRANSFER':
        return { label: 'Chuyển kho', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'ADJUSTMENT':
        return { label: 'Điều chỉnh', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      default:
        return { label: type, color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN');
  };

  return (
    <div className="flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-200">
          <History size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Truy Xuất Nguồn Gốc Lô Thuốc (Lot Tracking)</h1>
          <p className="text-slate-500 mt-1 text-sm">Tra cứu nguồn gốc, nhà cung cấp, thông tin nhập kho và lịch sử lưu chuyển của từng lô thuốc.</p>
        </div>
      </div>

      {/* Search Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="max-w-3xl">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Nhập mã lô thuốc cần truy xuất</label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search size={18} />
              </span>
              <input
                type="text"
                value={searchBatchNo}
                onChange={(e) => setSearchBatchNo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchBatchNo)}
                placeholder="Ví dụ: INIT-BATCH, LOT-2026-A..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all text-sm font-medium"
              />
            </div>
            <button
              onClick={() => handleSearch(searchBatchNo)}
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-2 text-sm"
            >
              {loading ? "Đang truy xuất..." : "Truy xuất ngay"}
            </button>
          </div>

          {/* Quick Suggestions */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Mã lô mẫu:</span>
            {mockSuggestedLots.map((lot) => (
              <button
                key={lot}
                onClick={() => {
                  setSearchBatchNo(lot);
                  handleSearch(lot);
                }}
                className="px-2.5 py-1 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/50 text-xs font-bold rounded-lg transition-colors"
              >
                {lot}
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-4" />
            <p className="text-slate-500 font-semibold text-sm">Hệ thống đang truy vấn chuỗi cung ứng...</p>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-rose-50 border border-rose-200 text-rose-800 p-5 rounded-2xl flex items-start gap-3"
          >
            <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-bold mb-1">Không thể truy xuất dữ liệu</h4>
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          </motion.div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left: General info card */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <span className="text-[10px] uppercase tracking-widest font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">Thông tin thuốc</span>
                <h2 className="text-xl font-black text-slate-800 mt-4 leading-tight">
                  {result.medicine?.name || "Thuốc không tên"}
                </h2>
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between py-2 border-b border-slate-100 text-sm">
                    <span className="text-slate-500 font-medium">Mã lô sản phẩm:</span>
                    <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">{result.batchNo}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 text-sm">
                    <span className="text-slate-500 font-medium">Danh mục thuốc:</span>
                    <span className="font-semibold text-slate-700">{result.medicine?.category || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100 text-sm">
                    <span className="text-slate-500 font-medium">Mã SKU:</span>
                    <span className="font-mono text-slate-700">{result.medicine?.sku || "N/A"}</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm">
                    <span className="text-slate-500 font-medium">Đơn vị tính:</span>
                    <span className="font-semibold text-slate-700">{result.medicine?.unit || "Hộp"}</span>
                  </div>
                </div>
              </div>

              {/* Tồn kho các chi nhánh */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                  <MapPin size={18} className="text-indigo-600" /> Vị trí lưu kho & Tồn kho
                </h3>
                <div className="space-y-3">
                  {result.batches.length === 0 ? (
                    <div className="text-slate-400 text-center py-4 text-xs font-semibold">Lô thuốc này đã xuất bán hết.</div>
                  ) : (
                    result.batches.map((b: any, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            {b.branchId === "CENTRAL_WH" || b.branchId === "main" ? "Kho Tổng Trung Tâm" : `Chi nhánh ${b.branchId}`}
                          </div>
                          {b.medicineName && (
                            <div className="text-xs font-semibold text-indigo-700 mt-0.5">
                              {b.medicineName} {b.sku ? `(${b.sku})` : ''}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                            <Clock size={12} /> Hạn: {formatDateOnly(b.expDate)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-indigo-700 text-sm">{b.stock.toLocaleString('vi-VN')} {b.unit || result.medicine?.unit || 'Hộp'}</div>
                          <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 border ${
                            b.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}>
                            {b.status === "ACTIVE" ? "Đang bán" : "Hết hạn"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: Details and Timeline */}
            <div className="lg:col-span-2 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
              {/* Tab Header */}
              <div className="flex bg-slate-50 border-b border-slate-200">
                <button
                  onClick={() => setActiveTab("origin")}
                  className={`flex-1 py-4 text-center text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${
                    activeTab === "origin" ? "border-indigo-600 text-indigo-600 bg-white" : "border-transparent text-slate-500 hover:bg-slate-100/50"
                  }`}
                >
                  <Truck size={16} /> Nguồn Gốc Nhập Hàng
                </button>
                <button
                  onClick={() => setActiveTab("timeline")}
                  className={`flex-1 py-4 text-center text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${
                    activeTab === "timeline" ? "border-indigo-600 text-indigo-600 bg-white" : "border-transparent text-slate-500 hover:bg-slate-100/50"
                  }`}
                >
                  <Activity size={16} /> Hành Trình (Timeline)
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {activeTab === "origin" && (
                    <motion.div
                      key="origin"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-6"
                    >
                      {result.origin ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                              <span className="text-xs font-semibold text-slate-500">Nhà cung cấp</span>
                              <div className="font-bold text-slate-800 text-base mt-1 flex items-center gap-1.5">
                                <Truck size={18} className="text-slate-400 shrink-0" />
                                {result.origin.supplierName}
                              </div>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                              <span className="text-xs font-semibold text-slate-500">Nhân viên nhận hàng</span>
                              <div className="font-bold text-slate-800 text-base mt-1 flex items-center gap-1.5">
                                <User size={18} className="text-slate-400 shrink-0" />
                                {result.origin.receivedBy}
                              </div>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                              <span className="text-xs font-semibold text-slate-500">Ngày nhập kho</span>
                              <div className="font-bold text-slate-800 text-base mt-1 flex items-center gap-1.5">
                                <Calendar size={18} className="text-slate-400 shrink-0" />
                                {formatDateTime(result.origin.importDate)}
                              </div>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                              <span className="text-xs font-semibold text-slate-500">Giá nhập & Số lượng</span>
                              <div className="font-bold text-indigo-700 text-base mt-1">
                                {result.origin.importQty.toLocaleString('vi-VN')} {result.medicine?.unit || 'Hộp'} @ {result.origin.importPrice.toLocaleString('vi-VN')} đ
                              </div>
                            </div>
                          </div>

                          <div className="p-4 border border-slate-200 rounded-xl flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                              <FileText size={18} />
                              <span>Phiếu nhập kho liên kết: <strong className="font-mono">{result.origin.grnId.substring(18).toUpperCase()}</strong></span>
                            </div>
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-bold uppercase">GRN</span>
                          </div>

                          <div className="p-4 border border-slate-200 rounded-xl flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                              <FileText size={18} />
                              <span>Đơn đặt hàng PO liên kết: <strong className="font-mono">{result.origin.poId.substring(18).toUpperCase()}</strong></span>
                            </div>
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-bold uppercase">PO</span>
                          </div>

                          <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-3 text-indigo-800">
                            <Info className="shrink-0 text-indigo-500" size={20} />
                            <div className="text-xs leading-relaxed">
                              <p className="font-bold">Lưu ý nghiệp vụ Lot Tracking:</p>
                              <p className="mt-1">Thông tin nguồn gốc trên được xác thực 100% bằng chứng từ nhập kho điện tử đã qua kiểm định chất lượng (GRN) được số hóa trực tiếp xuống MongoDB dưới sự giám sát của chuỗi cung ứng.</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                          <AlertTriangle size={48} className="text-slate-300 mb-4" />
                          <p className="font-bold text-sm">Không tìm thấy chứng từ nhập gốc</p>
                          <p className="text-xs mt-1 text-slate-400 max-w-sm text-center">Lô hàng này có thể đã được nạp trực tiếp qua các công cụ chuyển đổi dữ liệu ban đầu hoặc hệ thống nhập kho cũ.</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === "timeline" && (
                    <motion.div
                      key="timeline"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-6"
                    >
                      <div className="relative pl-6 border-l-2 border-slate-200 space-y-8 py-2">
                        {result.timeline.map((item, i) => {
                          const badge = getTxnBadge(item.type);
                          return (
                            <div key={item._id} className="relative">
                              {/* Dot Icon Indicator */}
                              <span className={`absolute -left-[33px] top-1.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${
                                item.type === 'GRN_IMPORT' ? 'bg-emerald-500' :
                                item.type === 'SALE_EXPORT' ? 'bg-blue-500' :
                                item.type === 'DISPOSE' ? 'bg-rose-500' : 'bg-slate-500'
                              } shadow-md`} />
                              
                              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${badge.color}`}>
                                      {badge.label}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-400">
                                      {formatDateTime(item.createdAt)}
                                    </span>
                                  </div>
                                  <div className="text-sm font-bold">
                                    Biến động:{" "}
                                    <span className={item.quantityChange > 0 ? "text-emerald-600" : "text-rose-600"}>
                                      {item.quantityChange > 0 ? `+${item.quantityChange}` : item.quantityChange} {result.medicine?.unit || 'Hộp'}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed">
                                  {item.notes || "Không có ghi chú bổ sung."}
                                </p>
                                <div className="mt-3 pt-3 border-t border-slate-200/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-500">
                                  <div>
                                    Tồn trước: <strong className="text-slate-700">{item.stockBefore}</strong>
                                  </div>
                                  <div>
                                    Tồn sau: <strong className="text-slate-700">{item.stockAfter}</strong>
                                  </div>
                                  {item.referenceId && (
                                    <div className="col-span-2">
                                      Chất chứng: <span className="font-mono text-slate-600">{item.referenceType}: {item.referenceId.substring(18).toUpperCase()}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                                  <User size={12} /> Thực hiện bởi: {item.performedBy}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
