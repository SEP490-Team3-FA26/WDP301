import { BaseDashboardLayout } from "./BaseDashboardLayout";
import { LayoutDashboard, Settings, Building2, Banknote, BarChart3, Sparkles, PackageSearch, ShieldCheck, Tag } from "lucide-react";

export function AdminLayout() {
  const adminNavItems = [
    { name: "Tổng quan Admin", href: "/admin", icon: <LayoutDashboard size={20} /> },
    { name: "Quản lý chi nhánh", href: "/admin/branches", icon: <Building2 size={20} /> },
    { name: "Phê duyệt mua hàng", href: "/admin/approvals", icon: <ShieldCheck size={20} /> },
    { 
      name: "Kho tổng (Warehouse)", 
      icon: <PackageSearch size={20} />,
      subItems: [
        { name: "Tổng quan kho", href: "/admin/inventory" },
        { name: "Nhập / Xuất kho", href: "/admin/inventory/import" },
        { name: "Biên bản kiểm kê", href: "/admin/inventory/checks" },
        { name: "Lịch sử hủy thuốc", href: "/admin/inventory/dispose" },
      ]
    },
    { 
      name: "Quản lý dữ liệu (Master)", 
      icon: <Settings size={20} />,
      subItems: [
        { name: "Danh mục Dược phẩm", href: "/admin/master-data/products" },
        { name: "Hồ sơ Nhà cung cấp", href: "/admin/master-data/suppliers" },
      ]
    },
    { name: "Bảng giá chi nhánh", href: "/admin/pricing", icon: <Tag size={20} /> },
    { name: "Tài chính", href: "/admin/finance", icon: <Banknote size={20} /> },
    { name: "Báo cáo thống kê", href: "/admin/reports", icon: <BarChart3 size={20} /> },
    { name: "AI Insights", href: "/admin/ai-insights", icon: <Sparkles size={20} /> },
  ];

  return <BaseDashboardLayout navItems={adminNavItems} userRole="admin" />;
}
