"use client";
import { Profile } from "@/views/common/Profile";
import { ProtectedRoute } from "@/components/ProtectedRoute";
export default function Page() {
  return (
    <ProtectedRoute allowedRoles={["admin", "head_branch", "warehouse", "branch", "pharmacist", "user"]}>
      <Profile />
    </ProtectedRoute>
  );
}
