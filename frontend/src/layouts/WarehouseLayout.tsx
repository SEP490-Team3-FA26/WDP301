import { BaseDashboardLayout } from "./BaseDashboardLayout";
import { LayoutDashboard, PackageSearch, Settings, Sparkles, ShieldCheck, Link2 } from "lucide-react";

export function WarehouseLayout() {
  const warehouseNavItems = [
    { name: "Tổng quan", href: "/warehouse", icon: <LayoutDashboard size={20} /> },
    { 
      name: "Kho thông minh", 
      icon: <PackageSearch size={20} />,
      subItems: [
        { name: "Tổng quan kho", href: "/warehouse/inventory" },
        { name: "Quản trị Nhập / Xuất", href: "/warehouse/inventory/import" },
        { name: "Biên bản kiểm kê", href: "/warehouse/inventory/checks" },
        { name: "Lịch sử hủy thuốc", href: "/warehouse/inventory/dispose" },
      ]
    },
    { 
      name: "Quản lý dữ liệu (Master)", 
      icon: <Settings size={20} />,
      subItems: [
        { name: "Danh mục Dược phẩm", href: "/warehouse/master-data/products" },
        { name: "Hồ sơ Nhà cung cấp", href: "/warehouse/master-data/suppliers" },
      ]
    },
    { name: "Nhật ký hệ thống", href: "/warehouse/audit-logs", icon: <ShieldCheck size={20} /> },
    { name: "Chuỗi cung ứng (Real-time)", href: "/warehouse/supply-chain", icon: <Link2 size={20} /> },
    { name: "AI Insights", href: "/warehouse/ai-insights", icon: <Sparkles size={20} /> },
  ];

  return <BaseDashboardLayout navItems={warehouseNavItems} userRole="warehouse" />;
}
