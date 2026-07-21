import { BaseDashboardLayout } from "./BaseDashboardLayout";
import { LayoutDashboard, ShoppingCart, BarChart3 } from "lucide-react";

export function PharmacistLayout() {
  const pharmacistNavItems = [
    { name: "Tổng quan Cá nhân", href: "/pharmacist", icon: <LayoutDashboard size={20} /> },
    { name: "Bán hàng (POS)", href: "/pharmacist/sales", icon: <ShoppingCart size={20} /> },
    { name: "Báo cáo thống kê", href: "/pharmacist/reports", icon: <BarChart3 size={20} /> },
  ];

  return <BaseDashboardLayout navItems={pharmacistNavItems} userRole="pharmacist" />;
}
