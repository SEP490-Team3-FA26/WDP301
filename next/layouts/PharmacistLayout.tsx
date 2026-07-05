"use client";

import React from "react";
import { BaseDashboardLayout } from "./BaseDashboardLayout";
import { LayoutDashboard, ShoppingCart } from "lucide-react";

interface PharmacistLayoutProps {
  children: React.ReactNode;
}

export function PharmacistLayout({ children }: PharmacistLayoutProps) {
  const pharmacistNavItems = [
    { name: "Tổng quan Cá nhân", href: "/pharmacist", icon: <LayoutDashboard size={20} /> },
    { name: "Bán hàng (POS)", href: "/pharmacist/sales", icon: <ShoppingCart size={20} /> },
  ];

  return (
    <BaseDashboardLayout navItems={pharmacistNavItems} userRole="pharmacist">
      {children}
    </BaseDashboardLayout>
  );
}
