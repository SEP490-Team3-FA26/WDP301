"use client";

import { Suspense } from "react";
import { ResetPassword } from "@/views/auth/ResetPassword";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-semibold text-slate-500 uppercase tracking-widest animate-pulse">Đang tải...</div>}>
      <ResetPassword />
    </Suspense>
  );
}
