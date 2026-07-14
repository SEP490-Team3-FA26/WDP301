"use client";
import { PharmacistLayout } from "@/layouts/PharmacistLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["pharmacist"]}>
      <PharmacistLayout>{children}</PharmacistLayout>
    </ProtectedRoute>
  );
}
