"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface ProtectedRouteProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { token, userRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!token) {
        router.replace("/auth/login");
      } else if (userRole && !allowedRoles.includes(userRole)) {
        // Redirect other roles to their respective dashboards
        switch (userRole) {
          case "admin":
          case "head_branch":
            router.replace("/admin");
            break;
          case "warehouse":
            router.replace("/warehouse");
            break;
          case "branch":
            router.replace("/branch");
            break;
          case "pharmacist":
            router.replace("/pharmacist");
            break;
          case "user":
            router.replace("/customer/shop");
            break;
          default:
            router.replace("/auth/login");
            break;
        }
      }
    }
  }, [token, userRole, loading, allowedRoles, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Đang xác thực thông tin...</p>
        </div>
      </div>
    );
  }

  if (!token || (userRole && !allowedRoles.includes(userRole))) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Đang chuyển hướng...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
