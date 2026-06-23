"use client";

import { Suspense } from "react";
import { CustomerShop } from "@/views/customer/CustomerShop";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm font-semibold text-slate-500 uppercase tracking-widest animate-pulse">Đang tải cửa hàng...</div>}>
      <CustomerShop />
    </Suspense>
  );
}
