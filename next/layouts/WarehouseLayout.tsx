"use client";

import React from "react";
import { BaseDashboardLayout } from "./BaseDashboardLayout";
import { LayoutDashboard, PackageSearch, Settings, Sparkles } from "lucide-react";

interface WarehouseLayoutProps {
  children: React.ReactNode;
}

export function WarehouseLayout({ children }: WarehouseLayoutProps) {
  const warehouseNavItems = [
    { name: "Tổng quan", href: "/warehouse", icon: <LayoutDashboard size={20} /> },
    { 
      name: "Kho thông minh", 
      icon: <PackageSearch size={20} />,
      subItems: [
        { name: "Tổng quan kho", href: "/warehouse/inventory" },
        { name: "Yêu cầu mua hàng (PR)", href: "/warehouse/inventory/requisitions" },
        { name: "Nhập / Xuất kho", href: "/warehouse/inventory/import" },
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
    { name: "AI Insights", href: "/warehouse/ai-insights", icon: <Sparkles size={20} /> },
  ];

  return (
    <BaseDashboardLayout navItems={warehouseNavItems} userRole="warehouse">
      {children}
    </BaseDashboardLayout>
  );
}
