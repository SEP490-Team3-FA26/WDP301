"use client";

import { Suspense } from "react";
import { Login } from "@/views/auth/Login";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-semibold text-slate-500 uppercase tracking-widest animate-pulse">Đang tải...</div>}>
      <Login />
    </Suspense>
  );
}
