import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  Clock, 
  DollarSign, 
  RefreshCw, 
  Building2, 
  Info,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { reportService } from "../../services/report/report.service";
import api from "../../services/core/api";
import { useNavigate } from "react-router-dom";

export function SeasonalAnalysisDashboard() {
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const navigate = useNavigate();

  // Decode JWT to find user role and branch
  const token = localStorage.getItem("token") || "";
  let userDetails = { branchId: null, fullName: "Người dùng", role: "branch" };
  if (token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      userDetails = JSON.parse(jsonPayload);
    } catch (e) {
      console.error("Lỗi giải mã token:", e);
    }
  }

  const isAdmin = userDetails.role === 'admin' || userDetails.role === 'head_branch';

  useEffect(() => {
    if (isAdmin) {
      fetchBranches();
    } else if (userDetails.branchId) {
      setSelectedBranch(userDetails.branchId);
    }
  }, [isAdmin, userDetails.branchId]);

  useEffect(() => {
    fetchAnalysis();
  }, [selectedBranch]);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/api/branches');
      if (Array.isArray(res.data)) {
        setBranchesList(res.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách chi nhánh:', err);
    }
  };

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportService.getSeasonalAnalysis(selectedBranch);
      if (res && res.success) {
        setData(res.data);
      } else {
        setError(res?.message || "Không thể lấy dữ liệu phân tích từ AI");
      }
    } catch (err: any) {
      setError(err?.message || "Lỗi kết nối API phân tích xu hướng");
    } finally {
      setLoading(false);
    }
  };

  const handleEvictCache = async () => {
    setRefreshing(true);
    setSuccessMsg(null);
    try {
      const res = await reportService.evictSeasonalAnalysis(selectedBranch);
      if (res && res.success) {
        setSuccessMsg("Làm mới bộ đệm thành công! Hệ thống đang phân tích lại...");
        await fetchAnalysis();
      } else {
        setError("Không thể làm mới bộ đệm cache");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleApplyRecommendation = (rec: any) => {
    const enrichedItem = data?.enriched_dataset?.find((item: any) => item.medicineId === rec.medicineId);
    if (!enrichedItem) return;

    const prefillData = [{
      medicineId: rec.medicineId,
      medicineName: rec.name,
      requestedQuantity: rec.suggestedQty || 50,
      unit: enrichedItem.unit || "Hộp",
      isAiGenerated: true,
      aiConfidence: rec.explainability_confidence || 90,
      aiReason: rec.explainability || "Được đề xuất từ AI do phân tích xu hướng mùa",
      aiAnalysisVersion: data?.analysis_version || "v1.2.0"
    }];

    const prefillStr = encodeURIComponent(JSON.stringify(prefillData));

    if (isAdmin) {
      // Admin/HQ: chuyển sang lập đơn hàng mua PO
      navigate(`/admin/inventory/import?tab=purchase_requests&openCreatePO=true&prefill=${prefillStr}`);
    } else {
      // Chi nhánh: chuyển sang trang tạo PR gửi HQ duyệt
      navigate(`/branch/requisition?prefill=${prefillStr}`);
    }
  };

  // Tính toán KPIs tổng hợp
  const totalForecastRevenue = data?.enriched_dataset?.reduce((acc: number, item: any) => acc + (item.forecast_m1 * item.price), 0) || 0;
  const potentialLostRevenue = data?.enriched_dataset?.reduce((acc: number, item: any) => acc + (item.potential_lost_revenue || 0), 0) || 0;
  const riskItemsCount = data?.enriched_dataset?.filter((item: any) => item.currentStock < item.reorderPoint).length || 0;
  const potentialOutbreaksCount = data?.potential_outbreaks?.length || 0;

  // Lấy danh sách thuốc được khuyến nghị tăng tồn
  const recommendations = data?.stock_recommendations || [];

  // Tạo dữ liệu vẽ biểu đồ cho top 3 sản phẩm tăng trưởng
  const getChartData = () => {
    if (!data?.enriched_dataset) return null;
    const sorted = [...data.enriched_dataset]
      .filter((item: any) => Object.keys(item.salesHistory || {}).length > 0)
      .sort((a: any, b: any) => {
        const getGrowth = (item: any) => {
          if (!item.salesHistory) return 0;
          const histVals = Object.values(item.salesHistory);
          const histSum = histVals.reduce<number>((sum: number, val: any) => {
            const qty = typeof val === 'object' && val !== null ? (val as any).quantity : Number(val || 0);
            return sum + qty;
          }, 0);
          const histAvg = histSum / Math.max(1, histVals.length);
          return (item.forecast_m1 || 0) - histAvg;
        };
        return getGrowth(b) - getGrowth(a);
      })
      .slice(0, 3);
      
    if (sorted.length === 0) return null;

    // Lấy danh sách các tháng gần nhất
    const allMonthsSet = new Set<string>();
    sorted.forEach((item: any) => {
      Object.keys(item.salesHistory || {}).forEach(m => allMonthsSet.add(m));
    });
    const months = sortedMonths(Array.from(allMonthsSet)).slice(-6); // Lấy 6 tháng gần nhất

    return {
      medicines: sorted,
      months,
    };
  };

  const sortedMonths = (months: string[]) => {
    return months.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  };

  const chartData = getChartData();

  // Helper Badge Color
  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case "CRITICAL": return "bg-rose-100 text-rose-800 border-rose-200";
      case "HIGH": return "bg-orange-100 text-orange-800 border-orange-200";
      case "MEDIUM": return "bg-amber-100 text-amber-800 border-amber-200";
      case "LOW": return "bg-slate-100 text-slate-800 border-slate-200";
      default: return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "CRITICAL": return "Nguy cấp";
      case "HIGH": return "Cao";
      case "MEDIUM": return "Trung bình";
      case "LOW": return "Thấp";
      default: return priority;
    }
  };

  const getConfidenceLevelClass = (level: string) => {
    switch (level?.toLowerCase()) {
      case "high": return "text-emerald-600 bg-emerald-50";
      case "medium": return "text-amber-600 bg-amber-50";
      case "low": return "text-rose-600 bg-rose-50";
      default: return "text-slate-500 bg-slate-50";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Filters & Refresh cache */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-purple-600" />
          <span className="font-bold text-slate-800">Báo cáo dự phòng & Xu hướng mùa (AI)</span>
          {data?.cache_hit && (
            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-100 shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Cache Hit (Redis)
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {isAdmin && (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 bg-white rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Tất cả chi nhánh</option>
              {branchesList.map(b => (
                <option key={b.branchCode} value={b.branchCode}>{b.name}</option>
              ))}
            </select>
          )}

          <button 
            onClick={handleEvictCache}
            disabled={refreshing || loading}
            className="px-4 py-2 bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-700 font-bold border border-slate-200 hover:border-purple-200 rounded-xl transition-all shadow-sm flex items-center gap-2 text-xs"
            title="Xóa cache và chạy lại LLM phân tích"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Làm mới phân tích
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-sm text-emerald-800 font-semibold flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          {successMsg}
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-sm text-rose-800 font-semibold flex items-center gap-2.5 shadow-sm">
          <AlertTriangle size={18} className="text-rose-600 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-96 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 animate-bounce">
            <Sparkles size={28} />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-sm font-black text-slate-800">Đang khởi tạo công cụ phân tích lai (Hybrid Forecaster)...</p>
            <p className="text-xs text-slate-400 font-semibold">Tích hợp mô hình dự báo toán học và lập luận Groq LLM</p>
          </div>
          <RefreshCw size={24} className="animate-spin text-purple-500 mt-2" />
        </div>
      ) : !data ? (
        <div className="h-64 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-slate-400 font-semibold">
          Không có dữ liệu phân tích. Hãy nhấn nút làm mới hoặc kiểm tra lại doanh số bán hàng của chi nhánh.
        </div>
      ) : (
        <>
          {/* Metadata banner */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider justify-between items-center shadow-inner">
            <div className="flex items-center gap-4">
              <span>Model: <b className="text-slate-700">{data.llm_model}</b></span>
              <span>Phiên bản AI: <b className="text-slate-700">{data.analysis_version}</b></span>
              <span>Thời gian tạo: <b className="text-slate-700">{new Date(data.generated_at).toLocaleString("vi-VN")}</b></span>
            </div>
            {data.enriched_dataset?.length < 3 && (
              <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 lowercase">
                ⚠️ Dữ liệu lịch sử ngắn, kết quả mang tính chất tham khảo
              </span>
            )}
          </div>

          {/* AI Executive Summary Card */}
          <div className="bg-gradient-to-r from-purple-900 to-indigo-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden border border-purple-800">
            <div className="absolute right-0 top-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-purple-300 shrink-0">
                <Sparkles size={24} />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                  AI EXECUTIVE SUMMARY
                </h2>
                <p className="text-sm font-semibold text-purple-200 leading-relaxed max-w-5xl">
                  {data.summary || "Đang kết xuất tóm tắt xu hướng phân tích..."}
                </p>
              </div>
            </div>
          </div>

          {/* KPIs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* KPI 1: Doanh số dự báo tháng tới */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-slate-300 hover:shadow-md transition-all">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Doanh số Dự báo (T1)</h3>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{totalForecastRevenue.toLocaleString('vi-VN')} đ</p>
                <p className="text-[10px] text-slate-400 font-semibold">Tổng doanh số dự phóng của các SKU đang bán</p>
              </div>
              <div className="p-4 rounded-xl shrink-0 bg-blue-50 text-[#0057cd]">
                <DollarSign size={22} />
              </div>
            </div>

            {/* KPI 2: Thất thoát doanh thu tiềm năng */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-slate-300 hover:shadow-md transition-all">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  Mất doanh thu do thiếu hàng
                  <div className="group relative cursor-pointer text-slate-400">
                    <Info size={12} />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-[9px] font-bold p-2 rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity w-56 leading-relaxed normal-case z-20">
                      Tính toán rủi ro: Thiếu hàng dự trữ (Forecast + Safety Stock &gt; Tồn thực tế + In-transit) nhân đơn giá bán.
                    </div>
                  </div>
                </h3>
                <p className={`text-2xl font-black tracking-tight ${potentialLostRevenue > 0 ? "text-rose-600 animate-pulse" : "text-slate-900"}`}>
                  {potentialLostRevenue.toLocaleString('vi-VN')} đ
                </p>
                <p className="text-[10px] text-slate-400 font-semibold">Ước tính tổn thất nếu không đặt thêm hàng</p>
              </div>
              <div className={`p-4 rounded-xl shrink-0 ${potentialLostRevenue > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-500"}`}>
                <TrendingDown size={22} />
              </div>
            </div>

            {/* KPI 3: Mặt hàng có rủi ro hết hàng */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-slate-300 hover:shadow-md transition-all">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mặt hàng dưới điểm đặt</h3>
                <p className="text-2xl font-black text-slate-900 tracking-tight">{riskItemsCount} SKU</p>
                <p className="text-[10px] text-slate-400 font-semibold">Tồn kho hiện tại thấp hơn điểm đặt hàng lại (ROP)</p>
              </div>
              <div className="p-4 rounded-xl shrink-0 bg-amber-50 text-amber-600">
                <Package size={22} />
              </div>
            </div>

            {/* KPI 4: Cảnh báo dịch bệnh tương quan */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-slate-300 hover:shadow-md transition-all">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tương quan dịch mùa</h3>
                <p className={`text-2xl font-black tracking-tight ${potentialOutbreaksCount > 0 ? "text-orange-600" : "text-slate-900"}`}>
                  {potentialOutbreaksCount > 0 ? `${potentialOutbreaksCount} cảnh báo` : "An toàn"}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold">Khả năng bùng phát bệnh theo mùa vụ khu vực</p>
              </div>
              <div className={`p-4 rounded-xl shrink-0 ${potentialOutbreaksCount > 0 ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-600"}`}>
                {potentialOutbreaksCount > 0 ? <AlertTriangle size={22} /> : <ShieldCheck size={22} />}
              </div>
            </div>
          </div>

          {/* SVG Forecast Chart & Outbreaks section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Forecast Chart */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-purple-600" />
                Biểu đồ xu hướng & Khoảng tin cậy dự báo 95% (Top 3 danh mục tăng trưởng)
              </h3>

              {!chartData ? (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-semibold">
                  Chưa đủ dữ liệu lịch sử để vẽ biểu đồ đường xu hướng.
                </div>
              ) : (
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-4 mb-2 justify-end">
                    {chartData.medicines.map((med: any, idx: number) => {
                      const colors = ["#8B5CF6", "#10B981", "#F59E0B"];
                      return (
                        <div key={idx} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[idx] }}></span>
                          {med.name}
                        </div>
                      );
                    })}
                  </div>

                  {/* Draw Custom SVG Chart */}
                  <div className="relative h-64 border-b border-l border-slate-100 pt-6 px-4">
                    <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                      {/* Grid Lines */}
                      <line x1="0" y1="50" x2="500" y2="50" stroke="#F1F5F9" strokeDasharray="3" />
                      <line x1="0" y1="100" x2="500" y2="100" stroke="#F1F5F9" strokeDasharray="3" />
                      <line x1="0" y1="150" x2="500" y2="150" stroke="#F1F5F9" strokeDasharray="3" />

                      {/* Render lines and Confidence Interval for the first medicine */}
                      {chartData.medicines.map((med: any, medIdx: number) => {
                        const colors = ["#8B5CF6", "#10B981", "#F59E0B"];
                        const fillColors = ["rgba(139, 92, 246, 0.08)", "rgba(16, 185, 129, 0.08)", "rgba(245, 158, 11, 0.08)"];
                        
                        // X points are mapped across 6 historical months + 1 forecast month (total 7 points)
                        const points: { x: number; y: number }[] = [];
                        const histMonths = chartData.months;
                        
                        // Find max sales value to scale
                        let maxVal = 100;
                        chartData.medicines.forEach((m: any) => {
                          Object.values(m.salesHistory || {}).forEach((v: any) => {
                            if (v > maxVal) maxVal = v;
                          });
                          if (m.forecast_m1 > maxVal) maxVal = m.forecast_m1;
                          if (m.ci_upper > maxVal) maxVal = m.ci_upper;
                        });

                        const scaleY = (val: number) => 180 - (val / maxVal * 150);
                        const numHistoryMonths = histMonths.length;
                        const stepX = 500 / Math.max(1, numHistoryMonths);

                        histMonths.forEach((m: string, i: number) => {
                          const rawVal = med.salesHistory?.[m];
                          const val = typeof rawVal === 'object' && rawVal !== null ? (rawVal as any).quantity : Number(rawVal || 0);
                          points.push({ x: i * stepX, y: scaleY(val) });
                        });

                        // Append forecast Month+1
                        points.push({ x: numHistoryMonths * stepX, y: scaleY(med.forecast_m1) });

                        // Draw Shaded 95% Confidence Interval area for month+1
                        const yLower = scaleY(med.ci_lower);
                        const yUpper = scaleY(med.ci_upper);
                        const xForecast = numHistoryMonths * stepX;
                        const xHistoryLast = Math.max(0, numHistoryMonths - 1) * stepX;
                        const yHistoryLast = points.length >= 2 ? points[points.length - 2].y : scaleY(med.forecast_m1);

                        // Create area points for CI
                        const areaPath = `M ${xHistoryLast} ${yHistoryLast} L ${xForecast} ${yUpper} L ${xForecast} ${yLower} Z`;

                        return (
                          <g key={medIdx}>
                            {/* Shaded Area for CI */}
                            <path d={areaPath} fill={fillColors[medIdx]} className="transition-all duration-300" />
                            
                            {/* Trend Line */}
                            <path
                              d={points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                              fill="none"
                              stroke={colors[medIdx]}
                              strokeWidth="2.5"
                              strokeDasharray={medIdx === 0 ? "none" : medIdx === 1 ? "none" : "4 2"}
                              className="transition-all duration-300"
                            />

                            {/* Bullet points */}
                            {points.map((p, i) => (
                              <circle
                                key={i}
                                cx={p.x}
                                cy={p.y}
                                r="4"
                                fill={colors[medIdx]}
                                stroke="#FFFFFF"
                                strokeWidth="1.5"
                                className="cursor-pointer hover:r-6 hover:stroke-purple-900 transition-all"
                              />
                            ))}

                            {/* Draw Forecast marker text */}
                            <text
                              x={xForecast - 15}
                              y={yUpper - 8}
                              fill={colors[medIdx]}
                              fontSize="8"
                              fontWeight="bold"
                            >
                              F: {Math.round(med.forecast_m1)} (±{Math.round((med.ci_upper - med.ci_lower)/2)})
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                  
                  {/* Axis labels */}
                  <div className="flex justify-between px-4 mt-2 text-[9px] font-bold text-slate-400 font-mono">
                    {chartData.months.map((m, i) => (
                      <span key={i}>{m}</span>
                    ))}
                    <span className="text-purple-600">Tháng tới (F)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Potential Outbreaks warnings */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <AlertTriangle size={16} className="text-orange-500" />
                Cảnh báo dịch mùa vùng miền (Outbreaks)
              </h3>
              
              {data.potential_outbreaks?.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs font-semibold gap-2 py-8">
                  <ShieldCheck size={36} className="text-emerald-500" />
                  Không phát hiện tín hiệu bùng phát dịch bệnh
                </div>
              ) : (
                <div className="space-y-4 overflow-y-auto flex-1 max-h-64 pr-1">
                  {data.potential_outbreaks?.map((ob: any, idx: number) => (
                    <div key={idx} className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-orange-950 text-xs uppercase">{ob.potential_disease}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          ob.risk_level === 'HIGH' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {ob.risk_level === 'HIGH' ? 'RỦI RO CAO' : 'RỦI RO TRUNG BÌNH'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                        {ob.analysis}
                      </p>
                      <div className="text-[10px] text-slate-500 font-bold bg-white/70 p-2 rounded border border-slate-100 flex flex-wrap gap-x-2">
                        <span>Thuốc chỉ chỉ báo:</span>
                        {ob.indicator_drugs?.map((d: string, i: number) => (
                          <span key={i} className="text-orange-700 bg-orange-50 px-1 py-0.2 rounded font-mono">{d}</span>
                        ))}
                      </div>
                      <p className="text-[11px] text-orange-800 font-bold leading-relaxed">
                        👉 {ob.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI Stocking Recommendations table */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Layers size={16} className="text-purple-600" />
                Khuyến nghị điều phối và tăng tồn kho dự phòng bằng AI
              </h3>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">
                Gợi ý bổ sung hàng theo mô hình toán học & Leadtime
              </span>
            </div>

            {recommendations.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-slate-400 text-xs font-semibold">
                Không có khuyến nghị đặc biệt. Tồn kho hiện tại đang đáp ứng tốt các dự báo xu hướng mùa.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="text-[11px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Tên thuốc</th>
                      <th className="px-4 py-3 text-center">Hành động AI</th>
                      <th className="px-4 py-3 text-center">SL đề xuất</th>
                      <th className="px-4 py-3 text-center">Độ ưu tiên</th>
                      <th className="px-4 py-3 text-center">
                        <span className="flex items-center justify-center gap-1">
                          Độ tin cậy (Dự báo | Diễn giải)
                          <div className="group relative cursor-pointer text-slate-400">
                            <Info size={11} />
                            <div className="absolute bottom-full right-0 mb-2 bg-slate-900 text-white text-[9px] font-bold p-2 rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity w-64 leading-relaxed normal-case z-20">
                              <b>Forecast Confidence</b>: Tính từ sai số thống kê số liệu bán.<br/>
                              <b>Explainability Confidence</b>: LLM tự đánh giá mức độ tin cậy của lập luận đối với thời tiết/mùa vụ.
                            </div>
                          </div>
                        </span>
                      </th>
                      <th className="px-4 py-3">Chứng cứ số liệu (Explainability)</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {recommendations.map((rec: any, idx: number) => {
                      const enriched = data.enriched_dataset?.find((item: any) => item.medicineId === rec.medicineId);
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-4.5 font-bold text-slate-900">
                            <div>{rec.name}</div>
                            {enriched && (
                              <div className="text-[9px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">
                                Tồn: {enriched.currentStock} {enriched.unit} | ROP: {enriched.reorderPoint} | Supplier: {enriched.supplierName} (Lead time: {enriched.leadTime} ngày)
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4.5 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full font-bold border text-[10px] uppercase ${
                              rec.suggestedAction === 'Tăng tồn kho' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              rec.suggestedAction === 'Giảm tồn kho' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              {rec.suggestedAction}
                            </span>
                          </td>
                          <td className="px-4 py-4.5 text-center font-extrabold text-slate-800 text-sm">
                            {rec.suggestedQty ? `+${rec.suggestedQty}` : "—"}
                          </td>
                          <td className="px-4 py-4.5 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${getPriorityClass(rec.priority)}`}>
                              {getPriorityText(rec.priority)}
                            </span>
                          </td>
                          <td className="px-4 py-4.5 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex justify-between w-24 text-[9px] font-bold text-slate-500 font-mono">
                                <span>{enriched?.forecast_confidence || 60}%</span>
                                <span>|</span>
                                <span>{rec.explainability_confidence || 90}%</span>
                              </div>
                              <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                                <div className="bg-blue-500 h-full" style={{ width: `${(enriched?.forecast_confidence || 60) / 2}%` }}></div>
                                <div className="bg-purple-500 h-full" style={{ width: `${(rec.explainability_confidence || 90) / 2}%` }}></div>
                              </div>
                              <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full uppercase mt-0.5 tracking-wider ${getConfidenceLevelClass(rec.explainability_confidence_level)}`}>
                                {rec.explainability_confidence_level || "Medium"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4.5 text-slate-600 leading-relaxed max-w-sm italic">
                            {rec.explainability || "Không có giải thích chi tiết"}
                          </td>
                          <td className="px-4 py-4.5 text-right">
                            {rec.suggestedAction === 'Tăng tồn kho' && (
                              <button
                                onClick={() => handleApplyRecommendation(rec)}
                                className="px-3 py-1.5 bg-[#0057cd] hover:bg-[#00419e] text-white font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all text-[11px]"
                              >
                                Nhập hàng
                                <ArrowRight size={12} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
