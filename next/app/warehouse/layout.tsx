"use client";
import { WarehouseLayout } from "@/layouts/WarehouseLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["warehouse"]}>
      <WarehouseLayout>{children}</WarehouseLayout>
    </ProtectedRoute>
  );
}
