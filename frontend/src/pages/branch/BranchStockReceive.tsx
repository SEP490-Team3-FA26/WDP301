import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  PackageCheck, Truck, ClipboardCheck, ArrowRight, Calendar, User, CheckCircle2,
  X, AlertTriangle, Loader2, Eye, ClipboardList
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { stockTransferService } from "../../services/inventory/stockTransfer.service";

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

  const handleConfirmReceipt = async (transferId: string) => {
    setActionLoading(transferId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await stockTransferService.confirmStockTransferReceipt(transferId, currentUser.fullName);
      setSuccessMsg("Xác nhận nhận hàng và cập nhật tồn kho chi nhánh thành công!");
      if (detailTransfer && detailTransfer._id === transferId) {
        setDetailTransfer({
          ...detailTransfer,
          status: "DELIVERED",
          receivedBy: currentUser.fullName,
          receivedAt: new Date(),
        });
      }
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
            Khi hàng đến nơi, vui lòng bấm <b>"Xác nhận nhận hàng"</b>. Thuốc sẽ tự động được thêm vào số lượng tồn kho của chi nhánh bạn và hoàn tất phiếu yêu cầu gốc.
          </p>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <ClipboardCheck size={16} className="text-emerald-600" />
            Danh sách phiếu chuyển kho
          </h2>
        </div>
        <div className="overflow-x-auto">
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
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50 border-b border-slate-200">
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
                {transfers.map((tf) => (
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
                            onClick={() => handleConfirmReceipt(tf._id)}
                            disabled={actionLoading === tf._id}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                          >
                            {actionLoading === tf._id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            Nhận hàng
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
                    onClick={() => handleConfirmReceipt(detailTransfer._id)}
                    disabled={actionLoading === detailTransfer._id}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-extrabold text-sm rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    {actionLoading === detailTransfer._id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={16} />
                    )}
                    Xác nhận đã nhận hàng
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
