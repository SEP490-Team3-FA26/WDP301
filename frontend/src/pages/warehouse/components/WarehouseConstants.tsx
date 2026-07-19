import React from 'react';

export const PR_STATUS: Record<string, { label: string; cls: string }> = {
  SUBMITTED: { label: "Chờ xử lý", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  SHIPPING: { label: "Đang giao", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  COMPLETED: { label: "Hoàn thành ✓", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  OUT_OF_STOCK: { label: "Hết hàng ⚠", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  WAREHOUSE_SUBMITTED: { label: "Đã gửi Admin", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  CONSOLIDATED: { label: "Đã tạo PO", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  REJECTED: { label: "Từ chối ✗", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

export const PO_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING_APPROVAL: { label: "Chờ Admin duyệt", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  SHIPPING: { label: "Đang về", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  COMPLETED: { label: "Đã nhập kho ✓", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELLED: { label: "Đã hủy ✗", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

export function StatusBadge({ map, status }: { map: Record<string, { label: string; cls: string }>; status: string }) {
  const s = map[status] || { label: status, cls: "bg-slate-50 text-slate-500 border-slate-200" };
  return <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-bold ${s.cls}`}>{s.label}</span>;
}
