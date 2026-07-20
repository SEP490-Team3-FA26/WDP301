import React, { useState, useEffect } from "react";
import { Search, X, Package, Loader2, Calendar, Eye, ShoppingCart, SendHorizonal } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StatusBadge, PR_STATUS } from "./WarehouseConstants";
import { purchaseRequisitionService } from "../../../services/purchase/purchaseRequisition.service";

export function PurchaseRequestsTab({
  suppliers,
  onMsg,
  onOpenCreate,
}: {
  suppliers: any[];
  onMsg: (m: { type: "success" | "error"; text: string } | null) => void;
  onOpenCreate: () => void;
}) {
  const [prList, setPrList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("WAREHOUSE_SUBMITTED");
  const [selectedPrs, setSelectedPrs] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [detailPr, setDetailPr] = useState<any>(null);

  const STATUS_TABS = [
    { key: "WAREHOUSE_SUBMITTED", label: "Chờ Admin duyệt" },
    { key: "CONSOLIDATED", label: "Đã tạo PO" },
    { key: "DRAFT", label: "Bản nháp" },
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await purchaseRequisitionService.getPurchaseRequisitions(statusFilter);
      setPrList(Array.isArray(data?.data || data) ? (data.data || data) : []);
    } catch (err) {
      console.error(err);
      setPrList([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [statusFilter]);

  const filtered = prList.filter(pr =>
    (pr.prCode || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSendToAdmin = async (prIds: string[]) => {
    setActionLoading(true);
    try {
      for (const id of prIds) {
        await purchaseRequisitionService.updatePurchaseRequisitionStatus(id, "WAREHOUSE_SUBMITTED", { warehouseSubmittedBy: "Thủ Kho" });
      }
      onMsg({ type: "success", text: `Đã gửi ${prIds.length} yêu cầu lên Admin phê duyệt!` });
      setSelectedPrs([]);
      fetchData();
    } catch {
      onMsg({ type: "error", text: "Lỗi khi gửi yêu cầu lên Admin." });
    } finally { setActionLoading(false); }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex gap-1 shrink-0 border-b border-slate-200">
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => setStatusFilter(t.key)}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-all ${statusFilter === t.key
              ? "bg-white border border-slate-200 border-b-white text-violet-700 -mb-px"
              : "text-slate-500 hover:text-slate-700"
              }`}>{t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm mã PR..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
        </div>
        <button onClick={onOpenCreate}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm">
          <ShoppingCart size={15} /> Tạo Đơn Nhập Hàng (PO)
        </button>
        {selectedPrs.length > 0 && statusFilter === "DRAFT" && (
          <button onClick={() => handleSendToAdmin(selectedPrs)} disabled={actionLoading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm">
            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <SendHorizonal size={14} />}
            Gửi {selectedPrs.length} yêu cầu lên Admin
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Loader2 className="animate-spin text-violet-500" size={28} />
            <p className="text-slate-500 text-sm">Đang tải...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-slate-400">
            <ShoppingCart size={36} />
            <p className="text-sm font-semibold">Không có yêu cầu mua hàng nào.</p>
            <button onClick={onOpenCreate}
              className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl mt-1 flex items-center gap-2">
              <ShoppingCart size={14} /> Tạo Đơn Nhập Hàng mới
            </button>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 border-b border-slate-200">
              <tr>
                {statusFilter === "DRAFT" && (
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" className="rounded"
                      checked={selectedPrs.length === filtered.length && filtered.length > 0}
                      onChange={e => setSelectedPrs(e.target.checked ? filtered.map((p: any) => p._id) : [])} />
                  </th>
                )}
                <th className="px-4 py-3">Mã PR</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3">Lý do</th>
                <th className="px-4 py-3 text-center">SP</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((pr: any) => (
                <tr key={pr._id} className="hover:bg-slate-50 transition-colors">
                  {statusFilter === "DRAFT" && (
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded"
                        checked={selectedPrs.includes(pr._id)}
                        onChange={() => setSelectedPrs(prev => prev.includes(pr._id)
                          ? prev.filter(x => x !== pr._id) : [...prev, pr._id])} />
                    </td>
                  )}
                  <td className="px-4 py-3 font-bold text-slate-900 font-mono text-xs">{pr.prCode}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <Calendar size={12} className="inline mr-1 text-slate-400" />
                    {new Date(pr.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{pr.reason || "—"}</td>
                  <td className="px-4 py-3 text-center font-bold">{pr.items?.length || 0}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge map={PR_STATUS} status={pr.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      {pr.status === "DRAFT" && (
                        <button onClick={() => handleSendToAdmin([pr._id])} disabled={actionLoading}
                          title="Gửi lên Admin"
                          className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg">
                          <SendHorizonal size={15} />
                        </button>
                      )}
                      <button onClick={() => setDetailPr(pr)} title="Xem chi tiết"
                        className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg">
                        <Eye size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {detailPr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDetailPr(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-10/12 max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-violet-50 shrink-0">
                <div>
                  <h3 className="font-black text-slate-900 font-mono">{detailPr.prCode}</h3>
                  <p className="text-xs mt-0.5"><StatusBadge map={PR_STATUS} status={detailPr.status} /></p>
                </div>
                <button onClick={() => setDetailPr(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-3 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="col-span-2"><span className="text-slate-500 font-bold text-xs block">Lý do</span><span className="font-semibold text-slate-800">{detailPr.reason || "—"}</span></div>
                  <div><span className="text-slate-500 font-bold text-xs block">Ngày tạo</span><span className="font-semibold text-slate-800">{new Date(detailPr.createdAt).toLocaleString("vi-VN")}</span></div>
                </div>
                <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Package size={14} className="text-violet-600" />Sản phẩm ({detailPr.items?.length || 0})</h4>
                <div className="space-y-2">
                  {detailPr.items?.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-800 text-sm">{it.medicineName || it.medicineId}</span>
                      <span className="font-bold text-violet-700 text-sm">×{it.requestedQuantity} {it.unit || "Hộp"}</span>
                    </div>
                  ))}
                </div>
              </div>
              {detailPr.status === "DRAFT" && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">
                  <button onClick={() => { handleSendToAdmin([detailPr._id]); setDetailPr(null); }} disabled={actionLoading}
                    className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-sm flex items-center gap-1.5">
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <SendHorizonal size={14} />}
                    Gửi lên Admin duyệt
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
