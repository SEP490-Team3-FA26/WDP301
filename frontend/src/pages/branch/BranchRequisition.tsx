import React, { useState, useEffect } from "react";
import {
  Plus, X, CheckCircle2, AlertTriangle, Loader2, ClipboardList,
  Calendar, Package, Trash2, Send, FileText, ChevronRight, Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { purchaseRequisitionService } from "../../services/purchaseRequisition.service";
import { medicineService } from "../../services/medicine.service";

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

// ==================== CREATE PR MODAL ====================
function CreatePRModal({ medicines, onClose, onSuccess }: { medicines: any[]; onClose: () => void; onSuccess: (msg: string) => void }) {
  const [branchName, setBranchName] = useState("Chi nhánh Quận 1");
  const [reason, setReason] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [items, setItems] = useState<{ medicineId: string; quantity: number }[]>([]);
  const [selMed, setSelMed] = useState("");
  const [selQty, setSelQty] = useState(20);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const addItem = () => {
    if (!selMed) return;
    if (selQty <= 0) {
      setErr("Số lượng phải lớn hơn 0");
      return;
    }
    const idx = items.findIndex(i => i.medicineId === selMed);
    if (idx >= 0) {
      const u = [...items];
      u[idx].quantity += selQty;
      setItems(u);
    } else {
      setItems([...items, { medicineId: selMed, quantity: selQty }]);
    }
    setSelMed("");
    setSelQty(20);
    setErr(null);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const getMedDetails = (id: string) => medicines.find(m => m.id === id || m._id === id);
  const getMedName = (id: string) => getMedDetails(id)?.name || id.slice(-8);

  const handleSubmit = async () => {
    if (items.length === 0) {
      setErr("Vui lòng thêm ít nhất 1 sản phẩm vào danh sách");
      return;
    }
    if (!reason.trim()) {
      setErr("Vui lòng nhập lý do yêu cầu");
      return;
    }
    setIsSubmitting(true);
    setErr(null);
    try {
      const res = await fetch("/api/purchase-requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchName,
          reason,
          isUrgent,
          items: items.map(i => ({ medicineId: i.medicineId, requestedQuantity: i.quantity })),
        }),
      });
      const resData = await res.json();
      onSuccess(resData.message || "Gửi yêu cầu thành công!");
    } catch (e: any) {
      setErr(e.response?.data?.message || "Lỗi tạo yêu cầu");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100"
      >
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-sm">
              <Send size={20} />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-lg">Tạo Yêu Cầu Nhập Thuốc Mới</h2>
              <p className="text-xs font-semibold text-blue-700">Bước 1 — Gửi Purchase Requisition (PR) lên Trụ sở</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Cột trái: Thông tin & Thêm thuốc */}
            <div className="md:col-span-5 space-y-5">
              {/* Form Thông tin chung */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60 space-y-3.5 shadow-sm">
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                  <ClipboardList size={14} className="text-blue-600" />
                  1. Thông tin chung
                </h3>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">CHI NHÁNH YÊU CẦU</label>
                  <select
                    value={branchName}
                    onChange={e => setBranchName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-sm"
                  >
                    <option>Chi nhánh Quận 1</option>
                    <option>Chi nhánh Quận 7</option>
                    <option>Chi nhánh Thủ Đức</option>
                    <option>Chi nhánh Bình Thạnh</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">LÝ DO YÊU CẦU *</label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="VD: Mùa dịch cúm, cần bổ sung gấp kho dự phòng chi nhánh..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="isUrgent"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                  />
                  <label htmlFor="isUrgent" className="text-sm font-bold text-rose-700 cursor-pointer">
                    Đánh dấu là Yêu Cầu Hỏa Tốc
                  </label>
                </div>
              </div>

              {/* Form Thêm thuốc */}
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/60 space-y-4 shadow-sm">
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                  <Package size={14} className="text-blue-600" />
                  2. Chọn thuốc cần thêm
                </h3>

                {/* Dropdown chọn thuốc */}
                <div className="w-full min-w-0">
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">CHỌN THUỐC</label>
                  <div className="w-full min-w-0">
                    <select
                      value={selMed}
                      onChange={e => {
                        setSelMed(e.target.value);
                        setErr(null);
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-sm truncate"
                    >
                      <option value="">-- Click để chọn thuốc --</option>
                      {medicines.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.stock <= 50 ? "⚠️ (Sắp hết)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Thông tin nhanh về thuốc đang chọn */}
                  {selMed && (
                    <div className="mt-2 text-xs font-semibold text-slate-500 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 flex justify-between items-center">
                      <span>Tồn kho hiện tại:</span>
                      <span
                        className={`font-bold ${(getMedDetails(selMed)?.stock ?? 0) <= 50 ? "text-amber-600" : "text-slate-700"
                          }`}
                      >
                        {getMedDetails(selMed)?.stock ?? 0} {getMedDetails(selMed)?.unit || "Hộp"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Số lượng */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">SỐ LƯỢNG YÊU CẦU</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelQty(prev => Math.max(1, prev - 1))}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-all font-bold shadow-sm"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={selQty}
                      onChange={e => setSelQty(Math.max(1, Number(e.target.value)))}
                      className="flex-1 min-w-0 w-0 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setSelQty(prev => prev + 1)}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-all font-bold shadow-sm"
                    >
                      +
                    </button>
                  </div>

                  {/* Phím tắt chọn nhanh số lượng */}
                  <div className="flex gap-1.5 mt-2">
                    {[50, 100, 200, 500].map(q => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setSelQty(q)}
                        className={`flex-1 py-1 text-[11px] font-bold rounded border transition-all ${selQty === q
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  disabled={!selMed}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 shadow-md disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <Plus size={16} /> Thêm vào danh sách
                </button>
              </div>
            </div>

            {/* Cột phải: Danh sách thuốc đã thêm */}
            <div className="md:col-span-7 flex flex-col h-full min-h-[350px]">
              <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col h-full bg-slate-50/30 flex-1">
                {/* Tiêu đề danh sách */}
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardList size={14} className="text-blue-600" />
                    Danh sách thuốc yêu cầu
                  </span>
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold rounded-full shadow-sm">
                    {items.length} thuốc
                  </span>
                </div>

                {/* Danh sách items */}
                <div className="p-4 flex-1 overflow-y-auto max-h-[380px] min-h-[260px] space-y-2">
                  <AnimatePresence initial={false}>
                    {items.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12 gap-3">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center border border-dashed border-slate-300">
                          <Package size={26} className="text-slate-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-slate-600">Chưa chọn thuốc nào</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-[250px] leading-relaxed">
                            Chọn thuốc và nhập số lượng ở cột bên trái, sau đó bấm nút "Thêm vào danh sách".
                          </p>
                        </div>
                      </div>
                    ) : (
                      items.map((it, i) => {
                        const med = getMedDetails(it.medicineId);
                        return (
                          <motion.div
                            key={it.medicineId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 hover:border-blue-200 transition-all shadow-sm"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                              {med?.image ? (
                                <div className="w-10 h-10 rounded-lg border border-slate-100 overflow-hidden flex-shrink-0 p-1 bg-white">
                                  <img src={med.image} alt={med.name} className="w-full h-full object-contain" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400">
                                  <Package size={18} />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-bold text-slate-800 block truncate" title={med?.name}>
                                  {getMedName(it.medicineId)}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-500 block mt-0.5">
                                  Kho: <span className="text-slate-700 font-bold">{med?.stock ?? 0}</span> | Đơn vị: {med?.unit || "Hộp"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-bold uppercase">SL:</span>
                                <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 rounded-lg border border-blue-100">
                                  {it.quantity}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeItem(i)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </AnimatePresence>
                </div>

                {/* Summary ở cuối danh sách */}
                {items.length > 0 && (
                  <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs font-bold text-slate-700 shrink-0">
                    <span>TỔNG SỐ LƯỢNG YÊU CẦU:</span>
                    <span className="text-sm text-blue-700 font-black">
                      {items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {err && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle size={15} />
              {err}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4.5 py-2 text-slate-600 font-bold hover:bg-slate-100 active:bg-slate-200 rounded-xl text-sm transition-all"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || items.length === 0}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 text-sm disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg disabled:shadow-none"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu nhập thuốc"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

