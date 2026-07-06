import React, { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface PoTableProps {
  purchaseOrders: any[];
  searchQuery: string;
  getSupplierName: (id: string) => string;
  onSelectReceipt: (po: any) => void;
  onSelectReject: (po: any) => void;
  onSelectDetails: (po: any) => void;
}

export function PoTable({
  purchaseOrders,
  searchQuery,
  getSupplierName,
  onSelectReceipt,
  onSelectReject,
  onSelectDetails,
}: PoTableProps) {
  const [page, setPage] = useState(1);
  const limit = 10;

  // Reset to page 1 when search query changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const filteredOrders = purchaseOrders.filter(
    (r) =>
      r._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getSupplierName(r.supplierId)
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredOrders.length / limit);
  const currentOrders = filteredOrders.slice((page - 1) * limit, page * limit);

  return (
    <div className="flex flex-col h-full relative">
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm text-left">
          <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Mã Đơn Hàng PO</th>
              <th className="px-6 py-4">Ngày Tạo</th>
              <th className="px-6 py-4">Nhà Cung Cấp</th>
              <th className="px-6 py-4 text-center">Số Loại Thuốc</th>
              <th className="px-6 py-4 text-right">Tổng Tiền</th>
              <th className="px-6 py-4 text-center">Trạng Thái</th>
              <th className="px-6 py-4">Hành Động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentOrders.map((r: any) => (
              <tr key={r._id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4 font-bold text-slate-900">
                  PO-{r._id.substring(18).toUpperCase()}
                </td>
                <td className="px-6 py-4 flex items-center gap-2 text-slate-600 mt-1.5">
                  <Calendar size={14} className="text-slate-400" />
                  {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                </td>
                <td className="px-6 py-4 text-slate-800 font-medium">
                  {getSupplierName(r.supplierId)}
                </td>
                <td className="px-6 py-4 text-center font-bold text-slate-700">
                  {r.items?.length || 0}
                </td>
                <td className="px-6 py-4 text-right font-bold text-[#0057cd]">
                  {r.totalAmount?.toLocaleString("vi-VN")}đ
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-bold ${
                      r.status === "COMPLETED"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : r.status === "SHIPPING"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : r.status === "PENDING_APPROVAL"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : r.status === "PARTIAL_RECEIVED"
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : r.status === "RETURNED"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-slate-50 text-slate-500 border-slate-200"
                    }`}
                  >
                    {r.status === "PARTIAL_RECEIVED"
                      ? "Giao thiếu"
                      : r.status === "SHIPPING"
                      ? "Đang giao"
                      : r.status === "PENDING_APPROVAL"
                      ? "Chờ duyệt"
                      : r.status === "COMPLETED"
                      ? "Hoàn thành"
                      : r.status === "RETURNED"
                      ? "Trả hàng"
                      : r.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {r.status === "SHIPPING" || r.status === "PARTIAL_RECEIVED" ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectReceipt(r);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all"
                      >
                        {r.status === "PARTIAL_RECEIVED" ? "Nhận tiếp" : "Nhận hàng"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectReject(r);
                        }}
                        className="bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-all border border-rose-200"
                      >
                        Từ chối
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onSelectDetails(r)}
                      className="text-[#0057cd] text-xs font-bold hover:underline"
                    >
                      Xem chi tiết
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {currentOrders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  Chưa có đơn đặt hàng (PO) nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 0 && (
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white mt-auto">
          <span className="text-sm text-slate-500">
            Hiển thị <span className="font-semibold text-slate-800">{(page - 1) * limit + 1}</span>
            –<span className="font-semibold text-slate-800">{Math.min(page * limit, filteredOrders.length)}</span> /{" "}
            <span className="font-semibold text-slate-800">{filteredOrders.length}</span> đơn hàng
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-bold text-slate-700 px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
