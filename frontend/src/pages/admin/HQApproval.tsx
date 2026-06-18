import React, { useState, useEffect } from "react";
import {
  Search, X, CheckCircle2, XCircle, AlertTriangle, Loader2,
  ShieldCheck, Building, Calendar, Package, Eye, ArrowRight, GitMerge
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

/**
 * BƯỚC 2b — HQ (Headquarters) phê duyệt các PR đã được Quản lý Kho gom đơn.
 * Chỉ hiển thị PR ở trạng thái CONSOLIDATED (đã gom, chờ duyệt).
 */
export function HQApproval() {
  const [prList, setPrList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<"CONSOLIDATED" | "APPROVED" | "REJECTED">("CONSOLIDATED");
  const [selectedPrs, setSelectedPrs] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [detailPr, setDetailPr] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchase-requisitions?status=${tab}`);
      if (res.ok) setPrList(await res.json());
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); setSelectedPrs([]); }, [tab]);

  const handleAction = async (action: "APPROVE" | "REJECT") => {
    if (selectedPrs.length === 0) return;
    setActionLoading(true); setMsg(null);
    try {
      const res = await fetch("/api/purchase-requisitions/approve", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prIds: selectedPrs,
          action,
          rejectionReason: action === "REJECT" ? rejectReason : undefined,
        }),
      });
      const d = await res.json();
      setMsg({ type: res.ok ? "success" : "error", text: d.message || (res.ok ? "Thành công" : "Lỗi") });
      if (res.ok) { setSelectedPrs([]); setShowRejectModal(false); setRejectReason(""); fetchData(); }
    } catch { setMsg({ type: "error", text: "Lỗi kết nối" }); }
    finally { setActionLoading(false); }
  };

  const toggleSelect = (id: string) => setSelectedPrs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const statusBadge = (s: string) => {
    const styles: Record<string, string> = {
      CONSOLIDATED: "bg-amber-50 text-amber-700 border-amber-200",
      APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
      REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
    };
    const labels: Record<string, string> = { CONSOLIDATED: "Chờ duyệt", APPROVED: "Đã duyệt ✓", REJECTED: "Từ chối ✗" };
    return <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-bold ${styles[s] || "bg-slate-50 text-slate-500 border-slate-200"}`}>{labels[s] || s}</span>;
  };

  const filtered = prList.filter(pr =>
    (pr.prCode || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (pr.branchName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Tính tổng hợp sản phẩm khi chọn nhiều PR (consolidation summary)
  const consolidatedSummary = (() => {
    if (selectedPrs.length === 0) return [];
    const map = new Map<string, { name: string; total: number; unit: string; branches: string[] }>();
    for (const pr of prList.filter(p => selectedPrs.includes(p._id))) {
      for (const it of pr.items || []) {
        const key = it.medicineId;
        const existing = map.get(key);
        if (existing) {
          existing.total += it.requestedQuantity;
          if (!existing.branches.includes(pr.branchName)) existing.branches.push(pr.branchName);
        } else {
          map.set(key, { name: it.medicineName || key, total: it.requestedQuantity, unit: it.unit || "Hộp", branches: [pr.branchName] });
        }
      }
    }
    return Array.from(map.values());
  })();

  return (
    <div className="flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-100 text-violet-700"><ShieldCheck size={20} /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Phê Duyệt Yêu Cầu Mua Hàng</h1>
            <p className="text-slate-500 text-sm mt-0.5">Xem xét các PR đã được Quản lý Kho gom đơn và phê duyệt cho lên đơn đặt hàng</p>
          </div>
        </div>
      </div>

      {/* Workflow */}
      <div className="mb-5 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
          <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg opacity-50">Chi nhánh gửi PR</span>
          <ArrowRight size={14} className="text-slate-300" />
          <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg opacity-50">Kho đã gom đơn</span>
          <ArrowRight size={14} className="text-slate-400" />
          <span className="px-3 py-1.5 bg-violet-500 text-white rounded-lg ring-2 ring-violet-300">👉 Bạn phê duyệt</span>
          <ArrowRight size={14} className="text-slate-400" />
          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg opacity-50">Kho tạo PO</span>
        </div>
      </div>

      {msg && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className={`mb-4 p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
          {msg.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}{msg.text}
          <button onClick={() => setMsg(null)} className="ml-auto opacity-50 hover:opacity-100"><X size={14} /></button>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-5 gap-1">
        {([
          { key: "CONSOLIDATED" as const, label: "Chờ phê duyệt" },
          { key: "APPROVED" as const, label: "Đã duyệt" },
          { key: "REJECTED" as const, label: "Đã từ chối" },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all ${tab === t.key ? "border-violet-600 text-violet-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Action bar + Consolidation Summary */}
      {tab === "CONSOLIDATED" && selectedPrs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-4 bg-white border border-violet-200 rounded-xl shadow-sm overflow-hidden">
          {/* Summary header */}
          <div className="p-4 bg-violet-50 flex items-center justify-between">
            <div>
              <span className="text-sm font-bold text-violet-800">Đã chọn {selectedPrs.length} phiếu PR</span>
              {consolidatedSummary.length > 0 && (
                <span className="text-xs text-violet-600 ml-2">— Tổng hợp {consolidatedSummary.length} loại thuốc</span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleAction("APPROVE")} disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                <CheckCircle2 size={14} /> Phê duyệt
              </button>
              <button onClick={() => setShowRejectModal(true)} disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                <XCircle size={14} /> Từ chối
              </button>
            </div>
          </div>

          {/* Consolidated items preview */}
          {consolidatedSummary.length > 0 && (
            <div className="p-4 border-t border-violet-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <GitMerge size={12} /> Tổng hợp nhu cầu (đã gom từ nhiều chi nhánh)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {consolidatedSummary.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-sm">
                    <div>
                      <span className="font-semibold text-slate-800">{item.name}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">({item.branches.join(", ")})</span>
                    </div>
                    <span className="font-bold text-violet-700">×{item.total} {item.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input type="text" placeholder="Tìm mã PR hoặc chi nhánh..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center py-16 gap-3"><Loader2 className="animate-spin text-violet-600" size={28} /><p className="text-slate-500 text-sm">Đang tải...</p></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3 text-slate-400">
              <ShieldCheck size={36} />
              <p className="text-sm font-semibold">
                {tab === "CONSOLIDATED" ? "Không có PR nào đang chờ phê duyệt." : tab === "APPROVED" ? "Chưa có PR nào đã duyệt." : "Chưa có PR nào bị từ chối."}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50 border-b border-slate-200">
                <tr>
                  {tab === "CONSOLIDATED" && <th className="px-4 py-3 w-10">
                    <input type="checkbox" className="rounded"
                      checked={selectedPrs.length === filtered.length && filtered.length > 0}
                      onChange={e => setSelectedPrs(e.target.checked ? filtered.map(p => p._id) : [])} />
                  </th>}
                  <th className="px-4 py-3">Mã PR</th>
                  <th className="px-4 py-3">Ngày</th>
                  <th className="px-4 py-3">Chi nhánh</th>
                  <th className="px-4 py-3">Lý do</th>
                  <th className="px-4 py-3 text-center">SP</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(pr => (
                  <tr key={pr._id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setDetailPr(pr)}>
                    {tab === "CONSOLIDATED" && <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="rounded" checked={selectedPrs.includes(pr._id)} onChange={() => toggleSelect(pr._id)} />
                    </td>}
                    <td className="px-4 py-3 font-bold text-slate-900">{pr.prCode}</td>
                    <td className="px-4 py-3 text-slate-600"><Calendar size={13} className="inline mr-1 text-slate-400" />{new Date(pr.createdAt).toLocaleDateString("vi-VN")}</td>
                    <td className="px-4 py-3 font-medium text-slate-800"><Building size={13} className="inline mr-1 text-slate-400" />{pr.branchName}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[150px] truncate">{pr.reason || "—"}</td>
                    <td className="px-4 py-3 text-center font-bold">{pr.items?.length || 0}</td>
                    <td className="px-4 py-3 text-center">{statusBadge(pr.status)}</td>
                    <td className="px-4 py-3"><Eye size={16} className="text-slate-400 hover:text-violet-600" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailPr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDetailPr(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-auto">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-violet-50">
                <div><h3 className="font-black text-slate-900">{detailPr.prCode}</h3><p className="text-xs mt-0.5">{statusBadge(detailPr.status)}</p></div>
                <button onClick={() => setDetailPr(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div><span className="text-slate-500 font-bold text-xs block">Chi nhánh</span><span className="font-semibold text-slate-800">{detailPr.branchName}</span></div>
                  <div><span className="text-slate-500 font-bold text-xs block">Ngày gửi</span><span className="font-semibold text-slate-800">{new Date(detailPr.createdAt).toLocaleString("vi-VN")}</span></div>
                  <div className="col-span-2"><span className="text-slate-500 font-bold text-xs block">Lý do</span><span className="font-semibold text-slate-800">{detailPr.reason || "—"}</span></div>
                  {detailPr.consolidatedBy && <div><span className="text-slate-500 font-bold text-xs block">Người gom đơn</span><span className="font-semibold text-slate-800">{detailPr.consolidatedBy}</span></div>}
                  {detailPr.rejectionReason && <div className="col-span-2"><span className="text-rose-500 font-bold text-xs block">Lý do từ chối</span><span className="font-semibold text-rose-700">{detailPr.rejectionReason}</span></div>}
                </div>
                <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Package size={14} className="text-violet-600" />Sản phẩm yêu cầu</h4>
                <div className="space-y-2">
                  {detailPr.items?.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-800 text-sm">{it.medicineName || it.medicineId}</span>
                      <span className="font-bold text-violet-700 text-sm">×{it.requestedQuantity} {it.unit || "Hộp"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Reason Modal */}
      <AnimatePresence>
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowRejectModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
              <div className="p-5 border-b border-slate-100 bg-rose-50">
                <h3 className="font-black text-slate-900 flex items-center gap-2"><XCircle size={18} className="text-rose-600" /> Từ chối yêu cầu</h3>
                <p className="text-xs text-rose-600 font-bold mt-1">Sẽ từ chối {selectedPrs.length} phiếu PR đã chọn</p>
              </div>
              <div className="p-5 space-y-3">
                <label className="text-xs font-bold text-slate-500 block">LÝ DO TỪ CHỐI</label>
                <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Nhập lý do từ chối..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none" />
              </div>
              <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
                <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-sm">Hủy</button>
                <button onClick={() => handleAction("REJECT")} disabled={actionLoading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm flex items-center gap-1.5 disabled:opacity-50">
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}Xác nhận từ chối
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
