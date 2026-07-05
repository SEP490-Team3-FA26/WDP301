"use client";

import React from "react";
import { BaseDashboardLayout } from "./BaseDashboardLayout";
import { LayoutDashboard, ShoppingCart, Banknote, BarChart3, ClipboardList, Tag, CreditCard, Package, ArrowLeftRight } from "lucide-react";

interface BranchLayoutProps {
  children: React.ReactNode;
}

export function BranchLayout({ children }: BranchLayoutProps) {
  const branchNavItems = [
    { name: "Tổng quan Chi nhánh", href: "/branch", icon: <LayoutDashboard size={20} /> },
    { name: "Bán hàng (POS)", href: "/branch/sales", icon: <ShoppingCart size={20} /> },
    { name: "Kho hàng chi nhánh", href: "/branch/inventory", icon: <Package size={20} /> },
    { name: "Chuyển kho liên chi nhánh", href: "/branch/transfers", icon: <ArrowLeftRight size={20} /> },
    { name: "Yêu cầu nhập thuốc", href: "/branch/requisitions", icon: <ClipboardList size={20} /> },
    { name: "Bảng giá bán", href: "/branch/pricing", icon: <Tag size={20} /> },
    { name: "Tài chính", href: "/branch/finance", icon: <Banknote size={20} /> },
    { name: "Công nợ NCC", href: "/branch/supplier-credit", icon: <CreditCard size={20} /> },
    { name: "Báo cáo thống kê", href: "/branch/reports", icon: <BarChart3 size={20} /> },
  ];

  return (
    <BaseDashboardLayout navItems={branchNavItems} userRole="branch">
      {children}
    </BaseDashboardLayout>
  );
}
