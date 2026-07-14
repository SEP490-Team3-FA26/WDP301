import React, { useState, useEffect } from "react";
import {
  Plus, X, CheckCircle2, AlertTriangle, Loader2, ClipboardList,
  Calendar, Package, Trash2, Send, FileText, ChevronRight, Eye, Search, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { purchaseRequisitionService } from "../../services/purchase/purchaseRequisition.service";
import { medicineService } from "../../services/inventory/medicine.service";
import { CreatePRModal } from "../../components/CreatePRModal";
import { useSocket } from "../../hooks/useSocket";

/**
 * BƯỚC 1 — Quản lý Chi nhánh tạo PR (Yêu cầu mua hàng) gửi lên Trụ sở.
 * Chi nhánh KHÔNG có quyền mua trực tiếp từ NCC.
 */
export function BranchRequisition() {
  const [prList, setPrList] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [detailPr, setDetailPr] = useState<any>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const [prRes, medRes] = await Promise.all([
        fetch("/api/purchase-requisitions", { signal: controller.signal }).then(r => r.json()).catch(() => []),
        fetch("/api/medicines?limit=500", { signal: controller.signal }).then(r => r.json()).then(d => d.data || d).catch(() => []),
      ]);

      clearTimeout(timeoutId);
      setPrList(prRes);
      setMedicines(medRes);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.error('Fetch timed out after 20s');
      }
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  //===============================================
  // SOCKET.IO
  //===============================================
  // Real-time listener for PR updates
  const { onEvent, offEvent } = useSocket();
  useEffect(() => {
    const handlePrUpdated = () => {
      fetchData();
    };
    onEvent('pr_updated', handlePrUpdated);
    return () => {
      offEvent('pr_updated', handlePrUpdated);
    };
  }, []);


  //===============================================

  const statusBadge = (s: string) => {
    const styles: Record<string, string> = {
      SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
      CONSOLIDATED: "bg-amber-50 text-amber-700 border-amber-200",
      APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
      REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
    };
    const labels: Record<string, string> = {
      SUBMITTED: "Đã gửi — Chờ xử lý",
      CONSOLIDATED: "Đang gom đơn",
      APPROVED: "Đã được duyệt ✓",
      REJECTED: "Bị từ chối ✗",
    };
    return <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-bold ${styles[s] || "bg-slate-50 text-slate-500 border-slate-200"}`}>{labels[s] || s}</span>;
  };

  return (
    <div className="flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-100 text-blue-700"><Send size={20} /></div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Yêu Cầu Nhập Thuốc</h1>
          </div>
          <p className="text-slate-500 mt-2 ml-13">Tạo yêu cầu mua hàng (PR) gửi lên Trụ sở khi chi nhánh cần bổ sung thuốc</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 font-bold rounded-xl shadow-sm flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white transition-colors">
          <Plus size={18} /> Tạo yêu cầu mới
        </button>
      </div>

      {successMsg && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold flex items-center gap-2">
          <CheckCircle2 size={16} />{successMsg}
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-emerald-400 hover:text-emerald-600"><X size={14} /></button>
        </motion.div>
      )}

      {/* Workflow explainer */}
      <div className="mb-6 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quy trình xử lý yêu cầu</p>
        <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
          <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg">1. Bạn tạo PR</span>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg">2. Kho tạo Đơn hàng</span>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="px-3 py-1.5 bg-violet-100 text-violet-700 rounded-lg">3. Admin thanh toán</span>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg">4. Kho nhận hàng</span>
        </div>
      </div>

      {/* PR list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2"><FileText size={16} className="text-blue-600" />Các yêu cầu đã gửi</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3"><Loader2 className="animate-spin text-blue-600" size={28} /><p className="text-slate-500 text-sm">Đang tải...</p></div>
          ) : prList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <ClipboardList size={40} />
              <p className="text-sm font-semibold">Chưa có yêu cầu nào. Nhấn "Tạo yêu cầu mới" để bắt đầu.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Mã PR</th>
                  <th className="px-5 py-3">Ngày gửi</th>
                  <th className="px-5 py-3">Lý do</th>
                  <th className="px-5 py-3 text-center">Số SP</th>
                  <th className="px-5 py-3 text-center">Trạng thái</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prList.map(pr => (
                  <tr key={pr._id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setDetailPr(pr)}>
                    <td className="px-5 py-3.5 font-bold text-slate-900">{pr.prCode}</td>
                    <td className="px-5 py-3.5 text-slate-600 flex items-center gap-1.5"><Calendar size={14} className="text-slate-400" />{new Date(pr.createdAt).toLocaleDateString("vi-VN")}</td>
                    <td className="px-5 py-3.5 text-slate-600 max-w-[200px] truncate">{pr.reason || "—"}</td>
                    <td className="px-5 py-3.5 text-center font-bold">{pr.items?.length || 0}</td>
                    <td className="px-5 py-3.5 text-center">{statusBadge(pr.status)}</td>
                    <td className="px-5 py-3.5"><Eye size={16} className="text-slate-400 hover:text-blue-600" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && <CreatePRModal medicines={medicines} onClose={() => setShowCreate(false)} onSuccess={(msg: string) => { setShowCreate(false); setSuccessMsg(msg); fetchData(); }} />}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailPr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDetailPr(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-auto">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-blue-50">
                <div><h3 className="font-black text-slate-900">{detailPr.prCode}</h3><p className="text-xs text-blue-700 font-bold mt-0.5">{statusBadge(detailPr.status)}</p></div>
                <button onClick={() => setDetailPr(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div><span className="text-slate-500 font-bold text-xs block">Chi nhánh</span><span className="font-semibold text-slate-800">{detailPr.branchName}</span></div>
                  <div><span className="text-slate-500 font-bold text-xs block">Ngày tạo</span><span className="font-semibold text-slate-800">{new Date(detailPr.createdAt).toLocaleString("vi-VN")}</span></div>
                  <div className="col-span-2"><span className="text-slate-500 font-bold text-xs block">Lý do</span><span className="font-semibold text-slate-800">{detailPr.reason || "—"}</span></div>
                  {detailPr.rejectionReason && <div className="col-span-2"><span className="text-rose-500 font-bold text-xs block">Lý do từ chối</span><span className="font-semibold text-rose-700">{detailPr.rejectionReason}</span></div>}
                </div>
                <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Package size={14} className="text-blue-600" />Sản phẩm yêu cầu</h4>
                <div className="space-y-2">
                  {detailPr.items?.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-800 text-sm">{it.medicineName || it.medicineId}</span>
                      <span className="font-bold text-blue-700 text-sm">×{it.requestedQuantity} {it.unit || "Hộp"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

