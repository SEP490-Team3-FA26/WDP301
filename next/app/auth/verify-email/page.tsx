"use client";

import { Suspense } from "react";
import { VerifyEmail } from "@/views/auth/VerifyEmail";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-semibold text-slate-500 uppercase tracking-widest animate-pulse">Đang tải...</div>}>
      <VerifyEmail />
    </Suspense>
  );
}
