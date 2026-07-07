import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, X, Package, CheckCircle2, AlertTriangle,
  Loader2, ClipboardList, Building, Calendar, Eye, ArrowRight, FileText
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { purchaseRequisitionService } from "../../services/purchaseRequisition.service";
import { branchService } from "../../services/branch.service";
import api from "../../services/api";

// --- In-memory cache for instant back-navigation (resets on page refresh/new login) ---
const prCache: Record<string, { data: any[]; ts: number }> = {};
let lastSelectedTab: "SUBMITTED" | "CONSOLIDATED" = "SUBMITTED";

function getCachedPrList(tab: string): any[] | null {
  const entry = prCache[tab];
  if (!entry) return null;
  // Cache valid for 5 minutes
  if (Date.now() - entry.ts > 5 * 60 * 1000) {
    delete prCache[tab];
    return null;
  }
  return entry.data;
}

function setCachedPrList(tab: string, data: any[]) {
  prCache[tab] = { data, ts: Date.now() };
}

/**
 * Quản lý Kho tiếp nhận PR từ chi nhánh, chọn PR để tạo PO (Auto-routing).
 * PO được tạo tự động tách theo NCC và gửi thẳng cho Admin duyệt & thanh toán.
 */
export function PurchaseRequisition() {
  const navigate = useNavigate();
  const [prList, setPrList] = useState<any[]>(() => getCachedPrList(lastSelectedTab) || []);
  const [loading, setLoading] = useState(() => !getCachedPrList(lastSelectedTab));
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<"SUBMITTED" | "CONSOLIDATED">(lastSelectedTab);
  const [selectedPrs, setSelectedPrs] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [detailPr, setDetailPr] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedSourceBranch, setSelectedSourceBranch] = useState("CENTRAL_WH");

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const data = await branchService.getBranches();
        setBranches(data || []);
      } catch (e) {
        console.error("Failed to load branches", e);
      }
    };
    loadBranches();
  }, []);

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api.get(`/api/purchase-requisitions?status=${tab}`);
      setPrList(res.data);
      setCachedPrList(tab, res.data);
    } catch (err: any) {
      console.error('PR fetch error:', err);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    lastSelectedTab = tab;
    const cached = getCachedPrList(tab);
    if (cached) {
      // Show cached data instantly, refresh in background
      setPrList(cached);
      setLoading(false);
      fetchData(false); // silent background refresh
    } else {
      fetchData(true);
    }
    setSelectedPrs([]);
  }, [tab]);

  const toggleSelect = (id: string) => setSelectedPrs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const statusBadge = (s: string) => {
    const m: Record<string, string> = { SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200", CONSOLIDATED: "bg-amber-50 text-amber-700 border-amber-200" };
    const l: Record<string, string> = { SUBMITTED: "Mới gửi", CONSOLIDATED: "Đã tạo PO" };
    return <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-bold ${m[s] || "bg-slate-50 text-slate-500 border-slate-200"}`}>{l[s] || s}</span>;
  };

  const filtered = prList
    .filter(pr => (pr.prCode || "").toLowerCase().includes(searchQuery.toLowerCase()) || (pr.branchName || "").toLowerCase().includes(searchQuery.toLowerCase()));

  const tabs = [
    { key: "SUBMITTED" as const, label: "Mới nhận", count: 0, color: "blue" },
    { key: "CONSOLIDATED" as const, label: "Đã tạo PO — Chờ Admin duyệt", count: 0, color: "amber" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-100 text-amber-700"><ClipboardList size={20} /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tiếp Nhận Yêu Cầu Mua Hàng</h1>
            <p className="text-slate-500 text-sm mt-0.5">Nhận PR từ chi nhánh → Chọn & tạo Đơn đặt hàng (PO) → Admin thanh toán</p>
          </div>
        </div>
      </div>

      {/* Workflow */}
      <div className="mb-5 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
          <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg">1. Nhận PR</span>
          <ArrowRight size={14} className="text-slate-400" />
          <span className={`px-3 py-1.5 rounded-lg ${tab === "SUBMITTED" ? "bg-amber-500 text-white ring-2 ring-amber-300" : "bg-amber-100 text-amber-700"}`}>2. Gom nhóm & Lên đơn (Auto-routing)</span>
          <ArrowRight size={14} className="text-slate-400" />
          <span className={`px-3 py-1.5 rounded-lg ${tab === "CONSOLIDATED" ? "bg-emerald-500 text-white ring-2 ring-emerald-300" : "bg-emerald-100 text-emerald-700"}`}>3. Admin duyệt & Thanh toán</span>
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
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
          <span className="text-sm font-bold text-emerald-800">Đã chọn {selectedPrs.length} phiếu PR để lên đơn</span>
          <button onClick={() => {
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
            navigate("/warehouse/inventory/import/new", { state: { prefillPrItems } });
          }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm">
            <FileText size={14} /> Tiếp tục tạo Đơn Đặt Hàng (PO)
          </button>
        </motion.div>
      )}



      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 mt-2">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input type="text" placeholder="Tìm mã PR hoặc chi nhánh..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
        </div>

        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center py-16 gap-3"><Loader2 className="animate-spin text-amber-600" size={28} /><p className="text-slate-500 text-sm">Đang tải...</p></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3 text-slate-400"><ClipboardList size={36} /><p className="text-sm font-semibold">Không có phiếu PR nào ở trạng thái này.</p></div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50 border-b border-slate-200">
                <tr>
                  {tab === "SUBMITTED" && <th className="px-4 py-3 w-10"><input type="checkbox" className="rounded"
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
                    {tab === "SUBMITTED" && <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
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
              </div>

              {/* Footer Actions */}
              {detailPr.status === "SUBMITTED" && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Kho xuất hàng:</span>
                    <select
                      value={selectedSourceBranch}
                      onChange={(e) => setSelectedSourceBranch(e.target.value)}
                      className="text-xs p-2 border border-slate-200 rounded-lg bg-white font-semibold outline-none focus:border-blue-500 w-full sm:w-48 shadow-sm cursor-pointer"
                    >
                      <option value="CENTRAL_WH">Kho Tổng (CENTRAL_WH)</option>
                      {branches.map(b => (
                        <option key={b.branchCode} value={b.branchCode}>{b.name} ({b.branchCode})</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={async () => {
                      setActionLoading(true);
                      setMsg(null);
                      try {
                        const res = await api.post("/api/stock-transfers", {
                          prId: detailPr._id,
                          shippedBy: "Nguyễn Văn A",
                          fromBranchId: selectedSourceBranch
                        });
                        setMsg({ type: "success", text: res.data.message || "Đã tạo phiếu chuyển kho thành công!" });
                        setDetailPr(null);
                        fetchData();
                      } catch (err: any) {
                        const errorResponse = err?.response?.data;
                        setMsg({ type: "error", text: errorResponse?.message || err.message || "Đã xảy ra lỗi" });
                      } finally {
                        setActionLoading(false);
                      }
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-350 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm w-full sm:w-auto justify-center"
                  >
                    {actionLoading ? <Loader2 className="animate-spin" size={14} /> : <ArrowRight size={14} />}
                    Xác nhận chuyển kho
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
