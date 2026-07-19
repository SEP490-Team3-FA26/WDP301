import React, { useState, useEffect } from "react";
import { Plus, BarChart3, FileText, TrendingUp } from "lucide-react";
import { SalesAnalyticsDashboard } from "../../components/reports/SalesAnalyticsDashboard";
import { ProfitAnalyticsDashboard } from "../../components/reports/ProfitAnalyticsDashboard";
import { ReportHistoryTable } from "../../components/reports/ReportHistoryTable";
import { ReportCreateModal } from "../../components/reports/ReportCreateModal";
import { Tabs } from "../../components/ui/Tabs";

export function Reports() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"analytics" | "reports" | "profit">("analytics");
  
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
      const { reportService } = await import("../../services/report/report.service");
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
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-[#0057cd] text-white font-bold rounded-xl hover:bg-[#00419e] transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={18} />
          Tạo báo cáo mới
        </button>
      </div>

      {/* Tabs Menu (Admin only) */}
      {isAdmin && (
        <Tabs<"analytics" | "reports" | "profit">
          tabs={[
            { id: "analytics", label: "Phân tích bán hàng (BI)", icon: <BarChart3 size={18} /> },
            { id: "profit", label: "Phân tích Lợi nhuận (BI)", icon: <TrendingUp size={18} /> },
            { id: "reports", label: "Lịch sử & Xuất báo cáo", icon: <FileText size={18} /> }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      )}

      {/* Analytics Dashboard */}
      {activeTab === "analytics" && isAdmin && <SalesAnalyticsDashboard />}

      {/* Profit Dashboard */}
      {activeTab === "profit" && isAdmin && <ProfitAnalyticsDashboard />}

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
