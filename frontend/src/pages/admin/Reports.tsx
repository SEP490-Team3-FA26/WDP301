import React, { useState, useEffect } from "react";
import { Plus, BarChart3, FileText, TrendingUp } from "lucide-react";
import { SalesAnalyticsDashboard } from "../../components/reports/SalesAnalyticsDashboard";
import { ReportHistoryTable } from "../../components/reports/ReportHistoryTable";
import { ReportCreateModal } from "../../components/reports/ReportCreateModal";

import { InventoryPerformanceDashboard } from "../../components/reports/InventoryPerformanceDashboard";
import { Link } from "react-router-dom";
import { Truck } from "lucide-react";

export function Reports() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"analytics" | "performance" | "reports">("analytics");
  
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Decode token to extract user info
  const token = localStorage.getItem("token") || "";
  let userDetails = { branchId: null, fullName: "Quản lý Chi Nhánh", role: "branch" };
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

  // Force normal branches to Reports List tab
  useEffect(() => {
    if (!isAdmin) {
      setActiveTab("reports");
    }
  }, [isAdmin]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { reportService } = await import("../../services/report.service");
      const data = await reportService.getHistory();
      setReports(data);
    } catch (error) {
      console.error("Lỗi khi lấy lịch sử báo cáo:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleReportCreated = (newReport: any) => {
    setReports((prev) => [newReport, ...prev]);
  };

  return (
    <div className="space-y-6 flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Báo Cáo Hệ Thống</h1>
          <p className="text-slate-500 mt-1">Quản lý, xuất và phân tích các báo cáo bán hàng định kỳ.</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link 
              to="/admin/supplier-credit"
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
            >
              <Truck size={18} className="text-amber-600" />
              Công nợ NCC
            </Link>
          )}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-[#0057cd] text-white font-bold rounded-xl hover:bg-[#00419e] transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
          >
            <Plus size={18} />
            Tạo báo cáo mới
          </button>
        </div>
      </div>

      {/* Tabs Menu (Admin only) */}
      {isAdmin && (
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-5 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "analytics"
                ? "border-[#0057cd] text-[#0057cd]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BarChart3 size={18} />
            Phân tích bán hàng (BI)
          </button>
          <button
            onClick={() => setActiveTab("performance")}
            className={`px-5 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "performance"
                ? "border-[#0057cd] text-[#0057cd]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <TrendingUp size={18} />
            Hiệu suất Sản phẩm
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-5 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "reports"
                ? "border-[#0057cd] text-[#0057cd]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText size={18} />
            Lịch sử & Xuất báo cáo
          </button>
        </div>
      )}

      {/* Analytics Dashboard */}
      {activeTab === "analytics" && isAdmin && <SalesAnalyticsDashboard />}
      
      {/* Performance Dashboard */}
      {activeTab === "performance" && isAdmin && <InventoryPerformanceDashboard />}

      {/* Reports History List */}
      {(activeTab === "reports" || !isAdmin) && <ReportHistoryTable reports={reports} />}

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
