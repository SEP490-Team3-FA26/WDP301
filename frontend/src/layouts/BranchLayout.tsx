import { BaseDashboardLayout } from "./BaseDashboardLayout";
import { LayoutDashboard, ShoppingCart, Banknote, BarChart3 } from "lucide-react";

export function BranchLayout() {
  const branchNavItems = [
    { name: "Tổng quan Chi nhánh", href: "/branch", icon: <LayoutDashboard size={20} /> },
    { name: "Bán hàng (POS)", href: "/branch/sales", icon: <ShoppingCart size={20} /> },
    { name: "Tài chính", href: "/branch/finance", icon: <Banknote size={20} /> },
    { name: "Báo cáo thống kê", href: "/branch/reports", icon: <BarChart3 size={20} /> },
  ];

  return <BaseDashboardLayout navItems={branchNavItems} userRole="branch" />;
}
