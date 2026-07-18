import { ReactNode, useState, useEffect } from "react";
import {
  Users,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Activity,
  Package,
  Building2,
  AlertTriangle,
  ChevronRight,
  Clock,
  RotateCcw,
  ShoppingCart,
  ScanBarcode,
  History,
  ArrowRightLeft,
  Search,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import { Link } from "react-router-dom";
import { medicineService } from "../../services/medicine.service";
import { useSocket } from "../../hooks/useSocket";

export function DashboardHome() {
  const [role, setRole] = useState("admin");
  const [stats, setStats] = useState<any>(null);
  const [lowStockList, setLowStockList] = useState<any[]>([]);
  const [expiringList, setExpiringList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { isConnected, onEvent, offEvent } = useSocket();

  useEffect(() => {
    setRole(localStorage.getItem("userRole") || "admin");
  }, []);

  const fetchRealData = async () => {
    if (role === "warehouse" || role === "admin" || role === "head_branch" || role === "branch") {
      setLoading(true);
      try {
        const [statsData, lowStockData, expiringData] = await Promise.all([
          medicineService.getMedicineStats().catch(() => null),
          medicineService.getLowStockReport().catch(() => []),
          medicineService.getExpirationReport().catch(() => []),
        ]);
        setStats(statsData);
        setLowStockList(lowStockData || []);
        setExpiringList(expiringData || []);
      } catch (error) {
        console.error("Error fetching dashboard real data:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchRealData();
  }, [role]);

  // Real-time update for Dashboard
  useEffect(() => {
    const handleDashboardUpdate = (data: any) => {
      console.log('Dashboard updated event received:', data);
      fetchRealData(); // Re-fetch to update stats
    };

    onEvent('broadcast.dashboard_updated', handleDashboardUpdate);

    return () => {
      offEvent('broadcast.dashboard_updated', handleDashboardUpdate);
    };
  }, [onEvent, offEvent, role]);

  const getDashboardData = () => {
    switch (role) {
      case "pharmacist":
        return {
          title: "Bàn thu ngân & Bán hàng (POS)",
          subtitle: "Chào mừng bạn. Hãy kiểm tra các đơn hàng và ca làm việc hiện tại.",
          stats: [
            { title: "Doanh thu ca hiện tại", value: "8,500,000đ", icon: <ShoppingCart size={20} />, trend: "+2.5M so với ca trước", trendUp: true },
            { title: "Đơn hàng đã bán", value: "32", icon: <Package size={20} />, trend: "2 hoàn trả", trendUp: false },
          ],
          actions: [
            { id: "UC-01", name: "Bán lẻ (Tạo đơn mới)", icon: <ShoppingCart size={24} />, color: "bg-blue-50 text-blue-600 border-blue-200" },
            { id: "UC-04", name: "Quét đơn thuốc điện tử", icon: <ScanBarcode size={24} />, color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
            { id: "UC-08", name: "Xử lý đổi / trả hàng", icon: <RotateCcw size={24} />, color: "bg-rose-50 text-rose-600 border-rose-200" },
            { id: "UC-44", name: "Tra cứu thẻ thành viên", icon: <Users size={24} />, color: "bg-indigo-50 text-indigo-600 border-indigo-200" },
          ]
        };
      case "branch":
        return {
          title: "Quản lý Chi nhánh Cơ sở",
          subtitle: "Theo dõi tình hình kinh doanh, doanh số và tồn kho tại chi nhánh của bạn.",
          stats: [
            { title: "Doanh thu Chi nhánh (Ngày)", value: "45,210,000đ", icon: <DollarSign size={20} />, trend: "+12% so với hôm qua", trendUp: true },
            { title: "Thuốc xuất kho chờ", value: "14", icon: <Package size={20} />, trend: "Cần xử lý gấp", trendUp: false },
          ],
          actions: [
            { id: "UC-25", name: "Dashboard Doanh thu", icon: <Activity size={24} />, color: "bg-blue-50 text-blue-600 border-blue-200" },
            { id: "UC-18", name: "Kiểm kê kho chi nhánh", icon: <Search size={24} />, color: "bg-amber-50 text-amber-600 border-amber-200" },
            { id: "UC-21", name: "Tạo phiếu chuyển kho", icon: <ArrowRightLeft size={24} />, color: "bg-indigo-50 text-indigo-600 border-indigo-200" },
            { id: "UC-51", name: "Báo cáo nhân viên", icon: <Users size={24} />, color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
          ]
        };
      case "warehouse":
        return {
          title: "Quản trị Kho vận (Logistics)",
          subtitle: "Theo dõi quy trình xuất nhập tồn, điều chuyển nội bộ và cảnh báo HSD.",
          stats: stats ? [
            { title: "Tổng loại thuốc", value: String(stats.totalMedicines), icon: <Package size={20} />, trend: "Dược phẩm hoạt động", trendUp: true },
            { title: "Tổng tồn kho", value: `${stats.totalStock.toLocaleString('vi-VN')} đv`, icon: <Activity size={20} />, trend: "Tổng số lượng tồn", trendUp: true },
            { title: "Cần bổ sung hàng", value: `${stats.lowStockCount} sắp hết | ${stats.outOfStockCount} hết`, icon: <AlertTriangle size={20} />, trend: "Dưới mức tối thiểu", trendUp: false },
            { title: "Hạn sử dụng lô", value: `${stats.soonToExpireCount} cận | ${stats.expiredCount} hết hạn`, icon: <Clock size={20} />, trend: "Lô cần xử lý", trendUp: false },
          ] : [
            { title: "Tổng loại thuốc", value: "...", icon: <Package size={20} />, trend: "Đang tải...", trendUp: true },
            { title: "Tổng tồn kho", value: "...", icon: <Activity size={20} />, trend: "Đang tải...", trendUp: true },
            { title: "Cần bổ sung hàng", value: "...", icon: <AlertTriangle size={20} />, trend: "Đang tải...", trendUp: false },
            { title: "Hạn sử dụng lô", value: "...", icon: <Clock size={20} />, trend: "Đang tải...", trendUp: false },
          ],
          actions: [
            { id: "UC-13", name: "Tạo Phiếu Nhập kho", icon: <Package size={24} />, color: "bg-blue-50 text-blue-600 border-blue-200", link: "/warehouse/inventory/import" },
            { id: "UC-17", name: "Xuất kho nội bộ", icon: <ArrowRightLeft size={24} />, color: "bg-amber-50 text-amber-600 border-amber-200", link: "/warehouse/inventory/export" },
            { id: "UC-23", name: "Lot Tracking / Truy xuất", icon: <History size={24} />, color: "bg-indigo-50 text-indigo-600 border-indigo-200", link: "/warehouse/lot-tracking" },
            { id: "UC-38", name: "Cảnh báo Min Stock (AI)", icon: <Sparkles size={24} />, color: "bg-rose-50 text-rose-600 border-rose-200", link: "/warehouse/ai-forecast" },
          ]
        };
      case "head_branch":
      case "admin":
      default:
        return {
          title: "Điều hành Hệ thống & Tổng Chi nhánh",
          subtitle: "Giám sát hệ thống, quản trị chuỗi cơ sở, phân tích hạ tầng và bảo mật dữ liệu.",
          stats: [
            { title: "Doanh thu Toàn Chuỗi (Tháng)", value: "3,450,210,000đ", icon: <DollarSign size={20} />, trend: "+20% so với tháng trước", trendUp: true },
            { title: "Nhân sự đang hoạt động", value: "48 / 50", icon: <Users size={20} />, trend: "2 off-shift", trendUp: true },
            { title: "Phát hiện bất thường bảo mật", value: "0", icon: <ShieldCheck size={20} />, trend: "Hệ thống ổn định", trendUp: true },
          ],
          actions: [
            { id: "UC-58", name: "Quản lý Role & Phân quyền", icon: <ShieldCheck size={24} />, color: "bg-slate-100 text-slate-700 border-slate-300", link: "#" },
            { id: "UC-26", name: "So sánh hiệu suất chuỗi", icon: <Building2 size={24} />, color: "bg-blue-50 text-blue-600 border-blue-200", link: "#" },
            { id: "UC-28", name: "Đồng bộ DM Toàn chuỗi", icon: <RotateCcw size={24} />, color: "bg-indigo-50 text-indigo-600 border-indigo-200", link: "/admin/price-management" },
            { id: "UC-34", name: "Dự báo Nhu cầu (AI)", icon: <Sparkles size={24} />, color: "bg-emerald-50 text-emerald-600 border-emerald-200", link: "/admin/ai-forecast" },
            { id: "UC-48", name: "Cấu hình Global Price", icon: <DollarSign size={24} />, color: "bg-amber-50 text-amber-600 border-amber-200" },
            { id: "UC-59", name: "Audit Logs Toàn hệ thống", icon: <History size={24} />, color: "bg-slate-100 text-slate-700 border-slate-300" },
          ]
        };
    }
  };

  const data = getDashboardData();

  const issues = [
    { id: 1, type: "low_stock", item: "Paracetamol 500mg", branch: "CN1 (Q.1)", current: 20, min: 50, time: "2 giờ trước" },
    { id: 2, type: "expiring", item: "Amoxicillin 250mg", branch: "CN1 (Q.1)", expiryDate: "10/11/2026", time: "Hệ thống AI" },
    { id: 3, type: "low_stock", item: "Vitamin C 1000mg", branch: "CN1 (Q.1)", current: 5, min: 20, time: "5 giờ trước" },
    { id: 4, type: "expiring", item: "Panadol Extra", branch: "CN2 (Q.2)", expiryDate: "15/12/2026", time: "Hệ thống AI" },
  ];

  const displayLowStock = lowStockList.length > 0
    ? lowStockList.slice(0, 10).map((item, index) => ({
      id: item.id || String(index),
      item: item.name,
      branch: "Kho trung tâm",
      current: item.stock,
      min: item.minStock,
      status: item.stock === 0 ? "Hết hàng" : "Sắp hết",
      badgeClass: item.stock === 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"
    }))
    : issues.filter(i => i.type === 'low_stock').map(i => ({ ...i, badgeClass: "bg-amber-50 text-amber-700 border-amber-200", status: "Sắp hết" }));

  const displayExpiring = expiringList.length > 0
    ? expiringList.slice(0, 10).map((item, index) => ({
      id: item.id || String(index),
      item: item.medicineName,
      branch: `Lô: ${item.batchNo} (${item.unit})`,
      expiryDate: item.expDate,
      time: item.status === 'EXPIRED' ? 'Đã hết hạn' : 'Hệ thống AI',
      badgeText: item.status === 'EXPIRED' ? 'Hết hạn' : 'Gần hết hạn',
      badgeClass: item.status === 'EXPIRED' ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"
    }))
    : issues.filter(i => i.type === 'expiring').map(i => ({ ...i, badgeText: 'Gần hết hạn', badgeClass: "bg-rose-50 text-rose-700 border-rose-200" }));

  return (
    <div className="space-y-8 pb-10 p-6 lg:p-8 bg-[#faf8ff]">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{data.title}</h1>
        <p className="text-slate-500 mt-1">{data.subtitle}</p>
      </div>

      {/* Quick Actions (Mapping UCs) */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Các chức năng khả dụng (Role-based)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.actions.map((action, i) => (
            <Link
              key={i}
              to={action.link || "#"}
              className={`flex flex-col p-5 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-lg bg-white border-slate-200 group`}
            >
              <div className={`p-3 rounded-xl mb-4 w-fit ${action.color} transition-colors`}>
                {action.icon}
              </div>
              <div className="text-xs font-black text-slate-400 mb-1">{action.id}</div>
              <div className="text-sm font-bold text-slate-800 leading-tight group-hover:text-[#0057cd] transition-colors">{action.name}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {data.stats.map((stat, i) => (
          <StatCard
            key={i}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            trend={stat.trend}
            trendUp={stat.trendUp}
          />
        ))}

        {role === "admin" || role === "head_branch" ? (
          <>
            <StatCard
              title="Tổng số Chi nhánh"
              value="8"
              icon={<Building2 size={20} />}
              trend="Đang hoạt động: 8"
              trendUp={true}
            />
            <StatCard
              title="AI Cảnh báo cần xử lý"
              value="12"
              icon={<AlertTriangle size={20} />}
              trend="+3 cảnh báo mới hôm nay"
              trendUp={false}
            />
          </>
        ) : null}
      </div>

      {(role !== "pharmacist") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <RotateCcw size={18} className="text-amber-500" />
                Cảnh Báo Tồn Kho (UC-38)
              </h3>
              <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg border border-amber-200">
                {lowStockList.length > 0 ? lowStockList.length : issues.filter(i => i.type === 'low_stock').length} mục
              </span>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {displayLowStock.map(alert => (
                <div key={alert.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-xl shrink-0 mt-0.5">
                    <RotateCcw size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{alert.item}</h4>
                        <div className="text-xs text-slate-500 font-medium mt-0.5"><Building2 size={10} className="inline mr-1" />{alert.branch}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${alert.badgeClass}`}>
                        {alert.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
                      <span className="font-medium bg-white border border-slate-200 px-2.5 py-1 rounded-md">Hiện tại: <span className="text-amber-600 font-bold">{alert.current}</span> / Min: {alert.min}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px]">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Clock size={18} className="text-rose-500" />
                AI Cảnh Báo Hết Hạn (UC-32)
              </h3>
              <span className="px-2.5 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200">
                {expiringList.length > 0 ? expiringList.length : issues.filter(i => i.type === 'expiring').length} mục
              </span>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {displayExpiring.map(alert => (
                <div key={alert.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4">
                  <div className="p-2 bg-rose-100 text-rose-600 rounded-xl shrink-0 mt-0.5">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{alert.item}</h4>
                        <div className="text-xs text-slate-500 font-medium mt-0.5"><Building2 size={10} className="inline mr-1" />{alert.branch}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${alert.badgeClass}`}>
                        {alert.badgeText}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-600">
                      <span className="font-medium bg-white border border-slate-200 px-2.5 py-1 rounded-md">Ngày hết hạn: <span className="text-rose-600 font-bold">{alert.expiryDate}</span></span>
                      <span className="text-slate-400 italic flex items-center gap-1"><Sparkles size={12} /> {alert.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  trend,
  trendUp
}: {
  key?: any;
  title: string;
  value: string;
  icon: ReactNode;
  trend: string;
  trendUp: boolean;
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{title}</h3>
        <div className={`p-2 rounded-xl bg-slate-50 text-slate-600`}>{icon}</div>
      </div>
      <div className="text-3xl font-black text-slate-900 mb-2 tracking-tight">{value}</div>
      <div className={`text-xs flex items-center gap-1.5 font-bold ${trendUp ? "text-emerald-700 bg-emerald-50 border border-emerald-100 self-start px-2 py-1 rounded-md" : "text-rose-700 bg-rose-50 border border-rose-100 self-start px-2 py-1 rounded-md"}`}>
        {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {trend}
      </div>
    </div>
  );
}
