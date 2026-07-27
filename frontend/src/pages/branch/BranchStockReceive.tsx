import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  PackageCheck, Truck, ClipboardCheck, ArrowRight, Calendar, User, CheckCircle2,
  X, AlertTriangle, Loader2, Eye, ClipboardList
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { stockTransferService } from "../../services/inventory/stockTransfer.service";
import { useSocket } from "../../hooks/useSocket";

function getBranchUserFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return { branchId: null, fullName: "Quản lý Chi Nhánh" };

  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) throw new Error("JWT không có payload");

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const jsonPayload = decodeURIComponent(
      window.atob(paddedBase64)
        .split("")
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join("")
    );
    const payload = JSON.parse(jsonPayload);

    return {
      branchId: payload.branchId || null,
      fullName: payload.fullName || "Quản lý Chi Nhánh",
    };
  } catch (error) {
    console.error("Không thể đọc thông tin chi nhánh từ token:", error);
    return { branchId: null, fullName: "Quản lý Chi Nhánh" };
  }
}

export function BranchStockReceive() {
  const currentUser = useMemo(() => getBranchUserFromToken(), []);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailTransfer, setDetailTransfer] = useState<any>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inspectionTransfer, setInspectionTransfer] = useState<any>(null);
  const [inspectionQuantities, setInspectionQuantities] = useState<Record<string, string>>({});
  const [inspectionNote, setInspectionNote] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { onEvent, offEvent, isConnected } = useSocket();

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      if (!currentUser.branchId) {
        throw new Error("Tài khoản chưa được gán chi nhánh. Vui lòng đăng nhập lại hoặc liên hệ quản trị viên.");
      }

      const data = await stockTransferService.getStockTransfers(undefined, currentUser.branchId);
      setTransfers(data);
    } catch (err: any) {
      console.error("Lỗi khi tải danh sách phiếu chuyển kho:", err);
      setTransfers([]);
      setErrorMsg(err.response?.data?.message || err.message || "Không thể tải danh sách phiếu chuyển kho");
    } finally {
      setLoading(false);
    }
  }, [currentUser.branchId]);

  useEffect(() => {
    void fetchTransfers();
  }, [fetchTransfers]);

  useEffect(() => {
    const handleInventoryUpdate = (data: any) => {
      if (["TRANSFER_SHIPPED", "TRANSFER_DELIVERED", "STOCK_TRANSFER_CREATED", "STOCK_TRANSFER_RECEIVED"].includes(data?.event)) {
        void fetchTransfers();
      }
    };

    onEvent("inventory_updated", handleInventoryUpdate);
    return () => offEvent("inventory_updated", handleInventoryUpdate);
  }, [fetchTransfers, offEvent, onEvent]);

  const totalPages = Math.max(1, Math.ceil(transfers.length / pageSize));
  const paginatedTransfers = transfers.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const getInspectionKey = (item: any) => `${item.medicineId}:${item.batchNo}`;

  const openInspection = (transfer: any) => {
    const quantities = Object.fromEntries(
      (transfer.items || []).map((item: any) => [getInspectionKey(item), String(item.quantity || 0)])
    );
    setInspectionTransfer(transfer);
    setInspectionQuantities(quantities);
    setInspectionNote("");
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleConfirmReceipt = async (transfer: any) => {
    const transferId = transfer._id;
    const inspectionItems = (transfer.items || []).map((item: any) => ({
      medicineId: item.medicineId,
      batchNo: item.batchNo,
      actualQuantity: Number(inspectionQuantities[getInspectionKey(item)] ?? item.quantity),
    }));
    const invalidItem = inspectionItems.find((item: any, index: number) => {
      const shippedQuantity = Number(transfer.items[index]?.quantity || 0);
      return !Number.isFinite(item.actualQuantity) || item.actualQuantity < 0 || item.actualQuantity > shippedQuantity;
    });

    if (invalidItem) {
      setErrorMsg("Số lượng thực nhận phải nằm trong khoảng 0 đến số lượng đã chuyển.");
      return;
    }

    setActionLoading(transferId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await stockTransferService.confirmStockTransferReceipt(transferId, currentUser.fullName, inspectionItems, inspectionNote.trim());
      setSuccessMsg("Kiểm hàng xong và cập nhật tồn kho chi nhánh thành công!");
      if (detailTransfer && detailTransfer._id === transferId) {
        setDetailTransfer({
          ...detailTransfer,
          status: "DELIVERED",
          receivedBy: currentUser.fullName,
          receivedAt: new Date(),
        });
      }
      setInspectionTransfer(null);
      await fetchTransfers();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || "Đã xảy ra lỗi");
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (s: string) => {
    const styles: Record<string, string> = {
      SHIPPING: "bg-amber-50 text-amber-700 border-amber-200",
      DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200",
      CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
    };
    const labels: Record<string, string> = {
      SHIPPING: "Đang vận chuyển 🚚",
      DELIVERED: "Đã nhập kho chi nhánh ✓",
      CANCELLED: "Đã hủy ✗",
    };
    return (
      <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-bold ${styles[s] || "bg-slate-50 text-slate-500 border-slate-200"}`}>
        {labels[s] || s}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-700">
              <PackageCheck size={20} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Nhập Thuốc Chi Nhánh</h1>
          </div>
          <p className="text-slate-500 mt-2 ml-13">
            Xác nhận các kiện hàng chuyển đến {currentUser.branchId || "chi nhánh của bạn"}
          </p>
        </div>
      </div>

      {successMsg && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold flex items-center gap-2">
          <CheckCircle2 size={16} />
          {successMsg}
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">
            <X size={14} />
          </button>
        </motion.div>
      )}

      {errorMsg && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold flex items-center gap-2">
          <AlertTriangle size={16} />
          {errorMsg}
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-rose-400 hover:text-rose-600">
            <X size={14} />
          </button>
        </motion.div>
      )}

      {/* Pipeline workflow indicator */}
      <div className="mb-6 p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Truck className="text-amber-500 shrink-0 animate-pulse" size={24} />
        <div>
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Thông tin chuyển kho</h4>
          <p className="text-xs text-slate-500 mt-1">
            Khi hàng đến nơi, vui lòng bấm <b>"Kiểm hàng"</b>, xác nhận số lượng thực nhận rồi mới nhập kho chi nhánh.
          </p>
        </div>
        <span className={`ml-auto shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border ${isConnected ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-slate-400"}`} />
          {isConnected ? "Realtime" : "Offline"}
        </span>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <ClipboardCheck size={16} className="text-emerald-600" />
            Danh sách phiếu chuyển kho
          </h2>
        </div>
        <div className="overflow-auto flex-1 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="animate-spin text-emerald-600" size={28} />
              <p className="text-slate-500 text-sm">Đang tải danh sách...</p>
            </div>
          ) : transfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Truck size={40} />
              <p className="text-sm font-semibold">Hiện chưa có phiếu chuyển kho nào gửi tới chi nhánh của bạn.</p>
            </div>
          ) : (
            <table className="w-full min-w-[920px] text-sm text-left">
              <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3">Mã phiếu chuyển</th>
                  <th className="px-5 py-3">Mã yêu cầu PR</th>
                  <th className="px-5 py-3">Người gửi (Kho tổng)</th>
                  <th className="px-5 py-3">Ngày gửi</th>
                  <th className="px-5 py-3 text-center">Trạng thái</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTransfers.map((tf) => (
                  <tr key={tf._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{tf.transferCode}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-600">{tf.prCode}</td>
                    <td className="px-5 py-3.5 text-slate-600 flex items-center gap-1.5">
                      <User size={14} className="text-slate-400" />
                      {tf.shippedBy || "Thủ kho"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        {new Date(tf.shippedAt || tf.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">{statusBadge(tf.status)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setDetailTransfer(tf)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </button>
                        {tf.status === "SHIPPING" && (
                          <button
                            onClick={() => openInspection(tf)}
                            disabled={actionLoading === tf._id}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                          >
                            {actionLoading === tf._id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            Kiểm hàng
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && transfers.length > 0 && (
          <div className="shrink-0 px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-500">
              Hiển thị {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, transfers.length)} / {transfers.length} phiếu
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
              >
                Trước
              </button>
              <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-black text-slate-700">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailTransfer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDetailTransfer(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col border border-slate-100"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-emerald-50">
                <div>
                  <h3 className="font-black text-slate-900 text-base">{detailTransfer.transferCode}</h3>
                  <p className="text-xs text-emerald-700 font-bold mt-1">
                    {statusBadge(detailTransfer.status)}
                  </p>
                </div>
                <button
                  onClick={() => setDetailTransfer(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-150"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 font-bold block">Yêu cầu gốc</span>
                    <span className="font-extrabold text-slate-800">{detailTransfer.prCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Chi nhánh nhận</span>
                    <span className="font-extrabold text-slate-800">{detailTransfer.toBranchName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Người gửi (Kho tổng)</span>
                    <span className="font-bold text-slate-700">{detailTransfer.shippedBy || "Kho tổng"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">Ngày gửi</span>
                    <span className="font-bold text-slate-700">
                      {new Date(detailTransfer.shippedAt || detailTransfer.createdAt).toLocaleString("vi-VN")}
                    </span>
                  </div>
                  {detailTransfer.status === "DELIVERED" && (
                    <>
                      <div className="col-span-2 border-t border-slate-200/60 pt-2 mt-1">
                        <span className="text-slate-400 font-bold block">Xác nhận nhận bởi</span>
                        <span className="font-black text-emerald-700 flex items-center gap-1.5 mt-0.5">
                          <CheckCircle2 size={13} />
                          {detailTransfer.receivedBy} ({new Date(detailTransfer.receivedAt).toLocaleString("vi-VN")})
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                  <ClipboardList size={14} className="text-emerald-600" />
                  Danh sách thuốc trong đợt chuyển
                </h4>
                <div className="space-y-2">
                  {detailTransfer.items?.map((it: any, i: number) => (
                    <div key={i} className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-extrabold text-slate-800 text-sm block">
                          {it.medicineName || it.medicineId}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase mt-0.5 block">
                          Lô hàng: <span className="text-slate-800">{it.batchNo}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm shrink-0 self-end sm:self-center">
                        <span className="text-slate-400 font-bold uppercase text-[10px]">SL chuyển:</span>
                        <span className="font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          {it.quantity} {it.unit || "Hộp"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              {detailTransfer.status === "SHIPPING" && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 shrink-0">
                  <button
                    onClick={() => openInspection(detailTransfer)}
                    disabled={actionLoading === detailTransfer._id}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-extrabold text-sm rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    {actionLoading === detailTransfer._id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    Kiểm hàng và nhận kho
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {inspectionTransfer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setInspectionTransfer(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-hidden flex flex-col border border-slate-100"
            >
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-emerald-50">
                <div>
                  <h3 className="font-black text-slate-900 text-base">Kiểm hàng phiếu {inspectionTransfer.transferCode}</h3>
                  <p className="text-xs text-emerald-700 font-bold mt-1">Nhập số lượng thực nhận trước khi cộng vào tồn kho chi nhánh</p>
                </div>
                <button
                  onClick={() => setInspectionTransfer(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-white/70"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-3 flex-1">
                {(inspectionTransfer.items || []).map((item: any) => {
                  const key = getInspectionKey(item);
                  const actualQty = Number(inspectionQuantities[key] || 0);
                  const discrepancy = actualQty - Number(item.quantity || 0);

                  return (
                    <div key={key} className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-[1fr_150px_150px] gap-3 md:items-center">
                      <div>
                        <span className="font-extrabold text-slate-800 text-sm block">{item.medicineName || item.medicineId}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase mt-1 block">
                          Lô hàng: <span className="text-slate-800">{item.batchNo}</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">SL chuyển</span>
                        <div className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-black text-slate-700">
                          {item.quantity} {item.unit || "Hộp"}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Thực nhận</span>
                        <input
                          type="number"
                          min={0}
                          max={item.quantity}
                          value={inspectionQuantities[key] ?? ""}
                          onChange={(event) => setInspectionQuantities((prev) => ({ ...prev, [key]: event.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-black text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        {discrepancy !== 0 && Number.isFinite(discrepancy) && (
                          <p className="mt-1 text-[10px] font-bold text-amber-600">
                            Chênh lệch {discrepancy > 0 ? "+" : ""}{discrepancy}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Ghi chú kiểm hàng</label>
                  <textarea
                    value={inspectionNote}
                    onChange={(event) => setInspectionNote(event.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ví dụ: thiếu 1 hộp do kiện hàng rách..."
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 shrink-0">
                <button
                  onClick={() => setInspectionTransfer(null)}
                  className="px-4 py-3 bg-white border border-slate-200 text-slate-600 font-extrabold text-sm rounded-xl hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleConfirmReceipt(inspectionTransfer)}
                  disabled={actionLoading === inspectionTransfer._id}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-extrabold text-sm rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  {actionLoading === inspectionTransfer._id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  Hoàn tất kiểm hàng và nhập kho
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
