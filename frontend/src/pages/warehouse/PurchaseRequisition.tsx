import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, ChevronRight, X, Package, CheckCircle2, AlertTriangle,
  Loader2, ClipboardList, Building, GitMerge, Calendar, Eye, ArrowRight, FileText
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

/**
 * BƯỚC 2a — Quản lý Kho tiếp nhận PR từ chi nhánh, gom đơn rồi gửi lên HQ.
 * Sau khi HQ duyệt (APPROVED), Quản lý Kho tạo PO.
 */
export function PurchaseRequisition() {
  const navigate = useNavigate();
  const [prList, setPrList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<"SUBMITTED" | "CONSOLIDATED" | "APPROVED">("SUBMITTED");
  const [selectedPrs, setSelectedPrs] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [detailPr, setDetailPr] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchase-requisitions?status=${tab}`);
      if (res.ok) setPrList(await res.json());
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); setSelectedPrs([]); }, [tab]);

  // Gom đơn: SUBMITTED → CONSOLIDATED
  const handleConsolidate = async () => {
    if (selectedPrs.length === 0) return;
    setActionLoading(true); setMsg(null);
    try {
      const res = await fetch("/api/purchase-requisitions/consolidate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prIds: selectedPrs }),
      });
      const d = await res.json();
      setMsg({ type: res.ok ? "success" : "error", text: d.message || (res.ok ? "Gom đơn thành công" : "Lỗi") });
      if (res.ok) { setSelectedPrs([]); fetchData(); }
    } catch { setMsg({ type: "error", text: "Lỗi kết nối" }); } finally { setActionLoading(false); }
  };

  const toggleSelect = (id: string) => setSelectedPrs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const statusBadge = (s: string) => {
    const m: Record<string, string> = { SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200", CONSOLIDATED: "bg-amber-50 text-amber-700 border-amber-200", APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200", REJECTED: "bg-rose-50 text-rose-700 border-rose-200" };
    const l: Record<string, string> = { SUBMITTED: "Mới gửi", CONSOLIDATED: "Đã gom", APPROVED: "HQ đã duyệt", REJECTED: "Từ chối" };
    return <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-bold ${m[s] || "bg-slate-50 text-slate-500 border-slate-200"}`}>{l[s] || s}</span>;
  };

  const [showPrDropdown, setShowPrDropdown] = useState(false);

  const filtered = prList
    .filter(pr => {
      // Hide approved PRs that have already been converted to a PO
      if (tab === "APPROVED" && pr.linkedPoId) return false;
      return true;
    })
    .filter(pr => (pr.prCode || "").toLowerCase().includes(searchQuery.toLowerCase()) || (pr.branchName || "").toLowerCase().includes(searchQuery.toLowerCase()));

  const tabs = [
    { key: "SUBMITTED" as const, label: "Mới nhận", count: 0, color: "blue" },
    { key: "CONSOLIDATED" as const, label: "Đã gom — Chờ HQ duyệt", count: 0, color: "amber" },
    { key: "APPROVED" as const, label: "HQ đã duyệt — Sẵn sàng tạo PO", count: 0, color: "emerald" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-100 text-amber-700"><ClipboardList size={20} /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tiếp Nhận Yêu Cầu Mua Hàng</h1>
            <p className="text-slate-500 text-sm mt-0.5">Nhận PR từ chi nhánh → Gom đơn → Gửi HQ duyệt → Tạo PO</p>
          </div>
        </div>
      </div>

      {/* Workflow */}
      <div className="mb-5 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
          <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg">Chi nhánh gửi PR</span>
          <ArrowRight size={14} className="text-slate-400" />
          <span className={`px-3 py-1.5 rounded-lg ${tab === "SUBMITTED" ? "bg-amber-500 text-white ring-2 ring-amber-300" : "bg-amber-100 text-amber-700"}`}>Bạn gom đơn</span>
          <ArrowRight size={14} className="text-slate-400" />
          <span className={`px-3 py-1.5 rounded-lg ${tab === "CONSOLIDATED" ? "bg-violet-500 text-white ring-2 ring-violet-300" : "bg-violet-100 text-violet-700"}`}>HQ phê duyệt</span>
          <ArrowRight size={14} className="text-slate-400" />
          <span className={`px-3 py-1.5 rounded-lg ${tab === "APPROVED" ? "bg-emerald-500 text-white ring-2 ring-emerald-300" : "bg-emerald-100 text-emerald-700"}`}>Bạn tạo PO</span>
        </div>
      </div>

      {msg && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`mb-4 p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
          {msg.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}{msg.text}
          <button onClick={() => setMsg(null)} className="ml-auto opacity-50 hover:opacity-100"><X size={14} /></button>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-5 gap-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all ${tab === t.key ? `border-${t.color}-600 text-${t.color}-700` : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Action bar for SUBMITTED tab */}
      {tab === "SUBMITTED" && selectedPrs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <span className="text-sm font-bold text-amber-800">Đã chọn {selectedPrs.length} phiếu PR để gom đơn</span>
          <button onClick={handleConsolidate} disabled={actionLoading}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-50">
            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <GitMerge size={14} />}
            Gom đơn & Gửi HQ duyệt
          </button>
        </motion.div>
      )}

      {/* Action bar for APPROVED tab */}
      {tab === "APPROVED" && filtered.length > 0 && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between relative">
          <span className="text-sm font-bold text-emerald-800">Các PR đã được HQ duyệt — Sẵn sàng tạo Đơn Đặt Hàng (PO)</span>
          <div className="relative">
            <button 
              onClick={() => setShowPrDropdown(!showPrDropdown)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <FileText size={14} /> Tạo Đơn Đặt Hàng (PO)
            </button>
            
            <AnimatePresence>
              {showPrDropdown && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowPrDropdown(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-40 p-4 space-y-3 text-slate-800"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Chọn PR phê duyệt để tạo PO</span>
                      <button onClick={() => setShowPrDropdown(false)} className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {filtered.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">Không có PR nào chưa lập PO</p>
                      ) : (
                        filtered.map(pr => (
                          <div
                            key={pr._id}
                            onClick={() => toggleSelect(pr._id)}
                            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between ${
                              selectedPrs.includes(pr._id)
                                ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold"
                                : "bg-slate-50/50 border-slate-200 hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold block truncate text-slate-950">{pr.prCode}</span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(pr.createdAt).toLocaleDateString("vi-VN")}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                                {pr.branchName} | {pr.items?.length || 0} sản phẩm
                              </span>
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedPrs.includes(pr._id)}
                              onChange={() => {}} // toggled by div onClick
                              className="ml-3 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                            />
                          </div>
                        ))
                      )}
                    </div>
                    {filtered.length > 0 && (
                      <button
                        onClick={() => {
                          if (selectedPrs.length === 0) return;
                          const selectedPrObjects = filtered.filter(pr => selectedPrs.includes(pr._id));
                           const prefillPrItems = selectedPrObjects.flatMap(pr =>
                             (pr.items || []).map((item: any) => ({
                               medicineId: item.medicineId,
                               medicineName: item.medicineName,
                               requestedQuantity: item.requestedQuantity || item.quantity || 0,
                               unit: item.unit || "Hộp",
                               prId: pr._id,
                               prCode: pr.prCode,
                             }))
                           );
                          setShowPrDropdown(false);
                          navigate("/warehouse/inventory/import/new", { state: { prefillPrItems } });
                        }}
                        disabled={selectedPrs.length === 0}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-bold rounded-lg transition-all shadow-md cursor-pointer"
                      >
                        Xác nhận & Tạo PO ({selectedPrs.length})
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input type="text" placeholder="Tìm mã PR hoặc chi nhánh..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center py-16 gap-3"><Loader2 className="animate-spin text-amber-600" size={28} /><p className="text-slate-500 text-sm">Đang tải...</p></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3 text-slate-400"><ClipboardList size={36} /><p className="text-sm font-semibold">Không có phiếu PR nào ở trạng thái này.</p></div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50 border-b border-slate-200">
                <tr>
                  {(tab === "SUBMITTED" || tab === "APPROVED") && <th className="px-4 py-3 w-10"><input type="checkbox" className="rounded"
                    checked={selectedPrs.length === filtered.length && filtered.length > 0}
                    onChange={e => setSelectedPrs(e.target.checked ? filtered.map(p => p._id) : [])} /></th>}
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
                    {(tab === "SUBMITTED" || tab === "APPROVED") && <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="rounded" checked={selectedPrs.includes(pr._id)} onChange={() => toggleSelect(pr._id)} />
                    </td>}
                    <td className="px-4 py-3 font-bold text-slate-900">{pr.prCode}</td>
                    <td className="px-4 py-3 text-slate-600"><Calendar size={13} className="inline mr-1 text-slate-400" />{new Date(pr.createdAt).toLocaleDateString("vi-VN")}</td>
                    <td className="px-4 py-3 font-medium text-slate-800"><Building size={13} className="inline mr-1 text-slate-400" />{pr.branchName}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[150px] truncate">{pr.reason || "—"}</td>
                    <td className="px-4 py-3 text-center font-bold">{pr.items?.length || 0}</td>
                    <td className="px-4 py-3 text-center">{statusBadge(pr.status)}</td>
                    <td className="px-4 py-3"><Eye size={16} className="text-slate-400 hover:text-amber-600" /></td>
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
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-amber-50">
                <div><h3 className="font-black text-slate-900">{detailPr.prCode}</h3><p className="text-xs mt-0.5">{statusBadge(detailPr.status)}</p></div>
                <button onClick={() => setDetailPr(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div><span className="text-slate-500 font-bold text-xs block">Chi nhánh</span><span className="font-semibold text-slate-800">{detailPr.branchName}</span></div>
                  <div><span className="text-slate-500 font-bold text-xs block">Ngày gửi</span><span className="font-semibold text-slate-800">{new Date(detailPr.createdAt).toLocaleString("vi-VN")}</span></div>
                  <div className="col-span-2"><span className="text-slate-500 font-bold text-xs block">Lý do</span><span className="font-semibold text-slate-800">{detailPr.reason || "—"}</span></div>
                </div>
                <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Package size={14} className="text-amber-600" />Sản phẩm yêu cầu</h4>
                <div className="space-y-2">
                  {detailPr.items?.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-800 text-sm">{it.medicineName || it.medicineId}</span>
                      <span className="font-bold text-amber-700 text-sm">×{it.requestedQuantity} {it.unit || "Hộp"}</span>
                    </div>
                  ))}
                </div>
                {detailPr.status === "APPROVED" && !detailPr.linkedPoId && (
                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => {
                        const prefillPrItems = (detailPr.items || []).map((item: any) => ({
                          medicineId: item.medicineId,
                          medicineName: item.medicineName,
                          requestedQuantity: item.requestedQuantity || item.quantity || 0,
                          unit: item.unit || "Hộp",
                          prId: detailPr._id,
                          prCode: detailPr.prCode,
                        }));
                        setDetailPr(null);
                        navigate("/warehouse/inventory/import/new", { state: { prefillPrItems } });
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <FileText size={14} /> Tạo Đơn Đặt Hàng (PO)
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
