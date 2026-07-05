"use client";
import { BranchLayout } from "@/layouts/BranchLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["branch"]}>
      <BranchLayout>{children}</BranchLayout>
    </ProtectedRoute>
  );
}
