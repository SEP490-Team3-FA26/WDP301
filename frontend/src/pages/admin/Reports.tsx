import React, { useState, useEffect, lazy, Suspense } from "react";
import { 
  Plus, BarChart3, FileText, LayoutDashboard, Package, 
  TrendingUp, ShoppingBag, Users, DollarSign, Activity, 
  AlertTriangle, Clock, RefreshCw, Building2, Sparkles
} from "lucide-react";
import { ReportHistoryTable } from "../../components/reports/ReportHistoryTable";
import { ReportCreateModal } from "../../components/reports/ReportCreateModal";
import { Tabs } from "../../components/ui/Tabs";
import { reportService } from "../../services/report/report.service";
import api from "../../services/core/api";

// Lazy loaded BI Dashboards
const SalesAnalyticsDashboard = lazy(() => 
  import("../../components/reports/SalesAnalyticsDashboard").then(m => ({ default: m.SalesAnalyticsDashboard }))
);
const InventoryPerformanceDashboard = lazy(() => 
  import("../../components/reports/InventoryPerformanceDashboard").then(m => ({ default: m.InventoryPerformanceDashboard }))
);
const SeasonalAnalysisDashboard = lazy(() => 
  import("../../components/reports/SeasonalAnalysisDashboard").then(m => ({ default: m.SeasonalAnalysisDashboard }))
);

interface KpiCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
}

function KpiCard({ title, value, description, icon, colorClass, bgClass }: KpiCardProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-slate-300 hover:shadow-md transition-all duration-200">
      <div className="space-y-1">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
        <p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p>
        {description && <p className="text-[11px] text-slate-400 font-medium">{description}</p>}
      </div>
      <div className={`p-4 rounded-xl shrink-0 ${bgClass} ${colorClass}`}>
        {icon}
      </div>
    </div>
  );
}

export function Reports() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "inventory" | "reports" | "trends">("overview");
  
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("all");
  
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Decode token to extract user info
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
  const isBranch = userDetails.role === 'branch';
  const isPharmacist = userDetails.role === 'pharmacist';

  // Load branches list for dropdown (Admins only)
  useEffect(() => {
    if (isAdmin) {
      fetchBranches();
    } else if (userDetails.branchId) {
      setSelectedBranch(userDetails.branchId);
    }
  }, [isAdmin, userDetails.branchId]);

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

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await reportService.getHistory(isAdmin ? undefined : (userDetails.branchId || undefined));
      setReports(data);
    } catch (error) {
      console.error("Lỗi khi lấy lịch sử báo cáo:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const data = await reportService.getDashboardSummary(selectedBranch);
      if (data && data.success) {
        setSummaryData(data.data);
      }
    } catch (error) {
      console.error("Lỗi khi lấy tóm tắt dashboard:", error);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [selectedBranch]);

  const handleReportCreated = (newReport: any) => {
    setReports((prev) => [newReport, ...prev]);
  };

  const getTabs = () => {
    const list = [
      { id: "overview", label: "Tổng quan Dashboard", icon: <LayoutDashboard size={18} /> }
    ];
    if (isAdmin || isBranch) {
      list.push(
        { id: "analytics", label: "Phân tích doanh thu (BI)", icon: <BarChart3 size={18} /> },
        { id: "inventory", label: "Hiệu suất kho hàng", icon: <Package size={18} /> },
        { id: "trends", label: "Xu hướng mùa & dịch bệnh (AI)", icon: <Sparkles size={18} /> }
      );
    }
    list.push(
      { id: "reports", label: "Lịch sử & Xuất báo cáo", icon: <FileText size={18} /> }
    );
    return list as any[];
  };

  return (
    <div className="space-y-6 flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Báo Cáo & Dashboard Hệ Thống</h1>
          <p className="text-slate-500 mt-1">Giám sát doanh thu, hiệu suất tồn kho và quản trị báo cáo định kỳ.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-[#0057cd] text-white font-bold rounded-xl hover:bg-[#00419e] transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={18} />
          Tạo báo cáo mới
        </button>
      </div>

      {/* Main Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 size={20} className="text-[#0057cd]" />
          <span className="font-bold text-slate-800">
            {isAdmin ? "Cơ sở giám sát" : `Cơ sở của bạn: ${selectedBranch}`}
          </span>
        </div>
        
        {isAdmin && (
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Chi nhánh:</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 bg-white rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0057cd]"
            >
              <option value="all">Tất cả chi nhánh</option>
              {branchesList.map(b => (
                <option key={b.branchCode} value={b.branchCode}>{b.name}</option>
              ))}
            </select>
            <button 
              onClick={fetchSummary}
              disabled={loadingSummary}
              className="p-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              title="Làm mới tổng hợp"
            >
              <RefreshCw size={18} className={loadingSummary ? "animate-spin" : ""} />
            </button>
          </div>
        )}
      </div>

      {/* Tabs Menu */}
      <Tabs<any>
        tabs={getTabs()}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab Contents */}
      
      {/* 1. Overview Dashboard */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {loadingSummary ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <RefreshCw size={36} className="animate-spin text-[#0057cd]" />
              <p className="text-sm font-bold text-slate-500">Đang đồng bộ số liệu tổng hợp...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Doanh thu thuần */}
              <KpiCard
                title="Doanh thu thuần (Net)"
                value={`${(summaryData?.revenue?.netRevenue || 0).toLocaleString('vi-VN')} đ`}
                description="Đã trừ hàng hủy, đổi & trả hàng"
                icon={<DollarSign size={24} />}
                colorClass="text-blue-600"
                bgClass="bg-blue-50"
              />

              {/* Số đơn hàng */}
              <KpiCard
                title="Số đơn hàng bán ra"
                value={`${summaryData?.revenue?.totalOrders || 0} đơn`}
                description="Đơn hàng hoàn thành trong kỳ"
                icon={<ShoppingBag size={24} />}
                colorClass="text-emerald-600"
                bgClass="bg-emerald-50"
              />

              {/* Đơn hàng trung bình */}
              <KpiCard
                title="Đơn hàng trung bình"
                value={`${(summaryData?.revenue?.avgOrder || 0).toLocaleString('vi-VN')} đ`}
                description="Giá trị trung bình trên một hóa đơn"
                icon={<TrendingUp size={24} />}
                colorClass="text-indigo-600"
                bgClass="bg-indigo-50"
              />

              {/* Lọc các tab tồn kho đối với vai trò quản trị/branch */}
              {(isAdmin || isBranch) && (
                <>
                  {/* Tổng số lượng tồn */}
                  <KpiCard
                    title="Tổng lượng tồn kho"
                    value={`${(summaryData?.inventory?.totalStock || 0).toLocaleString('vi-VN')} đv`}
                    description={`Tổng số sản phẩm dược lẻ (${summaryData?.inventory?.totalMedicines || 0} SKU)`}
                    icon={<Activity size={24} />}
                    colorClass="text-amber-600"
                    bgClass="bg-amber-50"
                  />

                  {/* Tổng giá trị tồn */}
                  <KpiCard
                    title="Tổng giá trị tồn kho"
                    value={`${(summaryData?.inventory?.totalValue || 0).toLocaleString('vi-VN')} đ`}
                    description="Ước tính giá trị vốn đang lưu kho"
                    icon={<Package size={24} />}
                    colorClass="text-teal-600"
                    bgClass="bg-teal-50"
                  />
                </>
              )}

              {/* Cảnh báo lô thuốc hết hạn / cận hạn */}
              <KpiCard
                title="Lô thuốc cần xử lý"
                value={`${summaryData?.inventory?.expiredCount || 0} hết hạn | ${summaryData?.inventory?.soonToExpireCount || 0} cận`}
                description="Cảnh báo lô hết hạn & cận 90 ngày"
                icon={<Clock size={24} />}
                colorClass="text-rose-600"
                bgClass="bg-rose-50"
              />

              {/* Cảnh báo Min Stock */}
              {(isAdmin || isBranch) && (
                <KpiCard
                  title="Dưới tồn kho tối thiểu"
                  value={`${summaryData?.inventory?.lowStockCount || 0} mặt hàng`}
                  description="Cần làm đề xuất bổ sung hàng gấp"
                  icon={<AlertTriangle size={24} />}
                  colorClass="text-amber-600"
                  bgClass="bg-amber-100/50"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. Sales BI Analytics (Lazy loaded) */}
      {activeTab === "analytics" && (isAdmin || isBranch) && (
        <Suspense fallback={
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <RefreshCw size={36} className="animate-spin text-[#0057cd]" />
            <p className="text-sm font-bold text-slate-500">Đang tải phân tích doanh thu...</p>
          </div>
        }>
          <SalesAnalyticsDashboard />
        </Suspense>
      )}

      {/* 3. Inventory Performance Dashboard (Lazy loaded) */}
      {activeTab === "inventory" && (isAdmin || isBranch) && (
        <Suspense fallback={
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <RefreshCw size={36} className="animate-spin text-[#0057cd]" />
            <p className="text-sm font-bold text-slate-500">Đang tải phân tích tồn kho...</p>
          </div>
        }>
          <InventoryPerformanceDashboard />
        </Suspense>
      )}

      {/* 3.5 Seasonal Analysis & Epidemic Trends (AI Lazy loaded) */}
      {activeTab === "trends" && (isAdmin || isBranch) && (
        <Suspense fallback={
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <RefreshCw size={36} className="animate-spin text-[#0057cd]" />
            <p className="text-sm font-bold text-slate-500">Đang tải phân tích xu hướng mùa vụ bằng AI...</p>
          </div>
        }>
          <SeasonalAnalysisDashboard />
        </Suspense>
      )}

      {/* 4. Reports Export History */}
      {activeTab === "reports" && (
        <ReportHistoryTable reports={reports} />
      )}

      {/* Create Modal */}
      <ReportCreateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleReportCreated}
        userDetails={userDetails}
      />
    </div>
  );
}
