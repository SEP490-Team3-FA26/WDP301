import React, { useState, useEffect } from "react";
import {
  Search, X, CheckCircle2, XCircle, AlertTriangle, Loader2,
  ShieldCheck, Calendar, Package, Eye, ArrowRight, DollarSign, Building2, CreditCard
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { purchaseRequisitionService } from "../../services/purchaseRequisition.service";
import { goodsReceiptService } from "../../services/goodsReceipt.service";

/**
 * Admin phê duyệt & thanh toán các Đơn Đặt Hàng (PO) đã được tự động tách theo NCC.
 * Admin duyệt xong → PO chuyển sang SHIPPING → Kho chờ nhận hàng.
 */
export function HQApproval() {
  const [poList, setPoList] = useState<any[]>([]);
  const [urgentPrs, setUrgentPrs] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<"URGENT" | "PENDING_APPROVAL" | "SHIPPING" | "RECEIVING" | "CANCELLED" | "GRN_APPROVAL">("URGENT");
  const [selectedPos, setSelectedPos] = useState<string[]>([]);
  const [selectedPrs, setSelectedPrs] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [detailPo, setDetailPo] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const [inspectionList, setInspectionList] = useState<any[]>([]);
  const [selectedInspections, setSelectedInspections] = useState<string[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const [resPo, resSuppliers, resPr, resInspections] = await Promise.all([
        fetch(`/api/purchase-orders?status=${tab === "URGENT" ? "PENDING_APPROVAL" : tab}`, { signal: controller.signal }),
        fetch(`/api/suppliers`, { signal: controller.signal }),
        fetch(`/api/purchase-requisitions?status=URGENT_PENDING`, { signal: controller.signal }),
        tab === "GRN_APPROVAL" ? goodsReceiptService.getInspectionRecords().catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
      ]);
      clearTimeout(timeoutId);

      if (resSuppliers.ok) setSuppliers(await resSuppliers.json());

      if (resPr.ok) {
        const data = await resPr.json();
        setUrgentPrs(data || []);
        // Nếu không có đơn hỏa tốc nào và đang ở tab URGENT, tự chuyển về PENDING_APPROVAL
        if ((!data || data.length === 0) && tab === "URGENT") {
          setTab("PENDING_APPROVAL");
        }
      }

      if (resPo.ok) {
        let data = await resPo.json();
        if (data && data.value) data = data.value;
        if (!Array.isArray(data)) data = [];
        setPoList(data);
      }

      if (tab === "GRN_APPROVAL" && resInspections && resInspections.data) {
        setInspectionList(resInspections.data);
      } else {
        setInspectionList([]);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setMsg({ type: "error", text: "Tải dữ liệu quá lâu (timeout). Vui lòng thử lại." });
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); setSelectedPos([]); setSelectedPrs([]); }, [tab]);

  const handleAction = async (action: "APPROVE" | "REJECT", paymentType?: "PAID" | "CREDIT", poId?: string) => {
    const targetPos = poId ? [poId] : selectedPos;
    if (targetPos.length === 0) return;
    setActionLoading(true); setMsg(null);
    try {
      let successCount = 0;
      let errorCount = 0;
      let lastErrorMessage = "";

      for (const currentPoId of targetPos) {
        try {
          const res = await fetch("/api/purchase-orders/approve-pay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              poId: currentPoId,
              action,
              rejectionReason: action === "REJECT" ? rejectReason : undefined,
              paymentType: action === "APPROVE" ? paymentType : undefined,
            }),
          });
          if (res.ok) {
            successCount++;
          } else {
            errorCount++;
            const errData = await res.json();
            lastErrorMessage = errData.message || "Lỗi xử lý đơn.";
          }
        } catch (e: any) {
          errorCount++;
          lastErrorMessage = e.message || "Lỗi kết nối.";
        }
      }

      if (errorCount === 0) {
        setMsg({ type: "success", text: `Thành công xử lý ${successCount} đơn hàng.` });
        setSelectedPos([]); setShowRejectModal(false); setRejectReason(""); fetchData();
      } else {
        setMsg({
          type: "error",
          text: `Có ${errorCount} đơn hàng bị lỗi trong quá trình xử lý.${lastErrorMessage ? " Chi tiết: " + lastErrorMessage : ""}`,
        });
        fetchData();
      }
    } catch {
      setMsg({ type: "error", text: "Lỗi kết nối" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessUrgent = async (action: "CREATE_EMERGENCY_TRANSFER" | "CREATE_URGENT_PO") => {
    if (selectedPrs.length === 0) return;
    setActionLoading(true); setMsg(null);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const prId of selectedPrs) {
        try {
          const res = await fetch("/api/purchase-requisitions/process-urgent", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prId, action }),
          });
          if (res.ok) successCount++;
          else errorCount++;
        } catch { errorCount++; }
      }

      if (errorCount === 0) {
        setMsg({ type: "success", text: `Đã xử lý hỏa tốc thành công ${successCount} yêu cầu.` });
        setSelectedPrs([]); fetchData();
      } else {
        setMsg({ type: "error", text: `Có ${errorCount} yêu cầu bị lỗi trong quá trình xử lý.` });
        fetchData();
      }
    } catch { setMsg({ type: "error", text: "Lỗi kết nối" }); }
    finally { setActionLoading(false); }
  };

  const handleApproveGRN = async (recordId: string) => {
    setActionLoading(true);
    setMsg(null);
    try {
      await goodsReceiptService.approveGoodsReceipt(recordId, "Admin HQ");
      setMsg({ type: "success", text: "Đã duyệt Nhập Kho và cập nhật tồn kho thành công!" });
      fetchData();
    } catch (e: any) {
      setMsg({ type: "error", text: e.response?.data?.message || e.message || "Lỗi duyệt GRN" });
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelectPo = (id: string) => setSelectedPos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectPr = (id: string) => setSelectedPrs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const statusBadge = (s: string) => {
    const styles: Record<string, string> = {
      PENDING_APPROVAL: "bg-amber-50 text-amber-700 border-amber-200",
      SHIPPING: "bg-emerald-50 text-emerald-700 border-emerald-200",
      RECEIVING: "bg-blue-50 text-blue-700 border-blue-200",
      CANCELLED: "bg-rose-50 text-rose-700 border-rose-200",
      RETURNED: "bg-rose-50 text-rose-700 border-rose-200",
      COMPLETED: "bg-indigo-50 text-indigo-700 border-indigo-200",
    };
    const labels: Record<string, string> = { PENDING_APPROVAL: "Chờ thanh toán", SHIPPING: "Đã thanh toán ✓", RECEIVING: "Đang nhập kho", CANCELLED: "Đã hủy ✗", RETURNED: "Hàng trả lại", COMPLETED: "Hoàn thành" };
    return <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-bold ${styles[s] || "bg-slate-50 text-slate-500 border-slate-200"}`}>{labels[s] || s}</span>;
  };

  const getSupplierName = (id: string) => {
    const s = suppliers.find(sup => sup._id === id);
    return s ? s.name : id?.slice(-6) || "N/A";
  };

  const filteredPos = poList.filter(po =>
    (po._id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    getSupplierName(po.supplierId).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (po.linkedPrCodes && po.linkedPrCodes.some((code: string) => code.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const filteredPrs = urgentPrs.filter(pr =>
    (pr.prCode || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (pr.branchName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-100 text-violet-700"><ShieldCheck size={20} /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Phê Duyệt & Thanh Toán Đơn Hàng</h1>
            <p className="text-slate-500 text-sm mt-0.5">Admin duyệt và thanh toán các Đơn đặt hàng (PO) đã được hệ thống tự động tách theo Nhà cung cấp</p>
          </div>
        </div>
      </div>

      {/* Workflow */}
      <div className="mb-5 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
          <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg opacity-50">1. Kho gom PR</span>
          <ArrowRight size={14} className="text-slate-300" />
          <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg opacity-50">2. Hệ thống tạo PO</span>
          <ArrowRight size={14} className="text-slate-400" />
          <span className="px-3 py-1.5 bg-violet-500 text-white rounded-lg ring-2 ring-violet-300">3. Admin Thanh Toán</span>
          <ArrowRight size={14} className="text-slate-400" />
          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg opacity-50">4. Kho Nhận Hàng</span>
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
          ...(urgentPrs.length > 0 ? [{ key: "URGENT" as const, label: `🔥 Yêu cầu Hỏa tốc (${urgentPrs.length})` }] : []),
          { key: "PENDING_APPROVAL" as const, label: "Chờ thanh toán PO" },
          { key: "SHIPPING" as const, label: "PO Đang giao" },
          { key: "RECEIVING" as const, label: "Kho đang nhận" },
          { key: "CANCELLED" as const, label: "Đã hủy" },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all ${
              tab === t.key 
                ? t.key === "URGENT" ? "border-rose-600 text-rose-700 bg-rose-50" : "border-violet-600 text-violet-700" 
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Action bar for PRs */}
      {tab === "URGENT" && selectedPrs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-4 bg-rose-50 border border-rose-200 rounded-xl shadow-sm overflow-hidden p-4 flex items-center justify-between">
            <span className="text-sm font-bold text-rose-800">Đã chọn {selectedPrs.length} Yêu cầu khẩn cấp</span>
            <div className="flex gap-2">
              <button onClick={() => handleProcessUrgent("CREATE_EMERGENCY_TRANSFER")} disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Package size={14} />} Xuất Kho Khẩn
              </button>
              <button onClick={() => handleProcessUrgent("CREATE_URGENT_PO")} disabled={actionLoading}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />} Đặt Giao Tận Nơi
              </button>
            </div>
        </motion.div>
      )}

      {/* Action bar */}
      {tab === "PENDING_APPROVAL" && selectedPos.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-4 bg-white border border-violet-200 rounded-xl shadow-sm overflow-hidden p-4 flex items-center justify-between">
            <span className="text-sm font-bold text-violet-800">Đã chọn {selectedPos.length} Đơn đặt hàng (PO)</span>
            <div className="flex gap-2">
              <button onClick={() => handleAction("APPROVE", "PAID")} disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <DollarSign size={14} />} Thanh toán ngay (PAID)
              </button>
              <button onClick={() => handleAction("APPROVE", "CREDIT")} disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />} Duyệt mua nợ (CREDIT)
              </button>
              <button onClick={() => setShowRejectModal(true)} disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                <XCircle size={14} /> Hủy Đơn
              </button>
            </div>
        </motion.div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 min-h-0 mt-2">
        <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input type="text" placeholder="Tìm mã PO hoặc Nhà Cung Cấp..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
        </div>

        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center py-16 gap-3"><Loader2 className="animate-spin text-violet-600" size={28} /><p className="text-slate-500 text-sm">Đang tải...</p></div>
          ) : (tab === "URGENT" ? filteredPrs.length === 0 : tab === "GRN_APPROVAL" ? inspectionList.filter((i: any) => i.status === 'WAITING').length === 0 : filteredPos.length === 0) ? (
            <div className="flex flex-col items-center py-16 gap-3 text-slate-400">
              <ShieldCheck size={36} />
              <p className="text-sm font-semibold">
                {tab === "PENDING_APPROVAL" 
                  ? "Không có PO nào đang chờ phê duyệt." 
                  : tab === "URGENT" 
                    ? "Không có yêu cầu hỏa tốc nào." 
                    : tab === "GRN_APPROVAL"
                      ? "Không có phiên kiểm hàng nào chờ duyệt."
                      : "Không có dữ liệu."}
              </p>
            </div>
          ) : tab === "URGENT" ? (
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" className="rounded"
                      checked={selectedPrs.length === filteredPrs.length && filteredPrs.length > 0}
                      onChange={e => setSelectedPrs(e.target.checked ? filteredPrs.map(p => p._id) : [])} />
                  </th>
                  <th className="px-4 py-3">Mã PR</th>
                  <th className="px-4 py-3">Ngày gửi</th>
                  <th className="px-4 py-3">Chi nhánh</th>
                  <th className="px-4 py-3">Lý do khẩn</th>
                  <th className="px-4 py-3 text-center">SP</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPrs.map(pr => (
                  <tr key={pr._id} className="hover:bg-slate-50 transition-colors cursor-pointer bg-rose-50/30">
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="rounded" checked={selectedPrs.includes(pr._id)} onChange={() => toggleSelectPr(pr._id)} />
                    </td>
                    <td className="px-4 py-3 font-bold text-rose-700">{pr.prCode}</td>
                    <td className="px-4 py-3 text-slate-600"><Calendar size={13} className="inline mr-1 text-slate-400" />{new Date(pr.createdAt).toLocaleDateString("vi-VN")}</td>
                    <td className="px-4 py-3 font-medium text-slate-800"><Building2 size={13} className="inline mr-1 text-slate-400" />{pr.branchName}</td>
                    <td className="px-4 py-3 text-slate-800 font-semibold">{pr.reason}</td>
                    <td className="px-4 py-3 text-center font-bold">{pr.items?.length || 0}</td>
                    <td className="px-4 py-3"><span className="inline-flex px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-bold uppercase">HỎA TỐC</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab !== "GRN_APPROVAL" ? (
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50 border-b border-slate-200">
                <tr>
                  {tab === "PENDING_APPROVAL" && <th className="px-4 py-3 w-10">
                    <input type="checkbox" className="rounded"
                      checked={selectedPos.length === filteredPos.length && filteredPos.length > 0}
                      onChange={e => setSelectedPos(e.target.checked ? filteredPos.map(p => p._id) : [])} />
                  </th>}
                  <th className="px-4 py-3">Mã PO</th>
                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3">Nhà Cung Cấp</th>
                  <th className="px-4 py-3 text-center">SP</th>
                  <th className="px-4 py-3 text-right">Tổng Tiền</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPos.map(po => (
                  <tr key={po._id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setDetailPo(po)}>
                    {tab === "PENDING_APPROVAL" && <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="rounded" checked={selectedPos.includes(po._id)} onChange={() => toggleSelectPo(po._id)} />
                    </td>}
                    <td className="px-4 py-3 font-bold text-slate-900 font-mono text-xs">PO-{po._id.slice(-6).toUpperCase()}</td>
                    <td className="px-4 py-3 text-slate-600"><Calendar size={13} className="inline mr-1 text-slate-400" />{new Date(po.createdAt).toLocaleDateString("vi-VN")}</td>
                    <td className="px-4 py-3 font-medium text-slate-800"><Building2 size={13} className="inline mr-1 text-slate-400" />{getSupplierName(po.supplierId)}</td>
                    <td className="px-4 py-3 text-center font-bold">{po.items?.length || 0}</td>
                    <td className="px-4 py-3 text-right font-black text-violet-700">{po.totalAmount?.toLocaleString("vi-VN")}đ</td>
                    <td className="px-4 py-3 text-center">{statusBadge(po.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2 items-center">
                        {tab === "PENDING_APPROVAL" && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); handleAction("APPROVE", "PAID", po._id); }} disabled={actionLoading} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-50" title="Thanh toán ngay">
                              <DollarSign size={16} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleAction("APPROVE", "CREDIT", po._id); }} disabled={actionLoading} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50" title="Duyệt mua nợ">
                              <CreditCard size={16} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setSelectedPos([po._id]); setShowRejectModal(true); }} disabled={actionLoading} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded disabled:opacity-50" title="Từ chối">
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setDetailPo(po); }} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded" title="Xem chi tiết">
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === "GRN_APPROVAL" ? (
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Mã Phiên KIỂM</th>
                  <th className="px-4 py-3">Mã GRN</th>
                  <th className="px-4 py-3">Ngày gửi</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inspectionList.filter(i => i.status === 'WAITING').map((inspection: any) => (
                  <tr key={inspection._id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-bold text-slate-900 font-mono text-xs">{inspection._id.slice(-6).toUpperCase()}</td>
                    <td className="px-4 py-3 font-bold text-slate-600 font-mono text-xs">{inspection.grnId.slice(-6).toUpperCase()}</td>
                    <td className="px-4 py-3 text-slate-600"><Calendar size={13} className="inline mr-1 text-slate-400" />{new Date(inspection.createdAt).toLocaleDateString("vi-VN")}</td>
                    <td className="px-4 py-3 text-center"><span className="inline-flex px-2 py-1 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">CHỜ DUYỆT HQ</span></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={(e) => { e.stopPropagation(); handleApproveGRN(inspection._id); }} disabled={actionLoading}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs flex items-center gap-1.5 disabled:opacity-50 ml-auto">
                        {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Duyệt & Nhập Kho
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {detailPo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDetailPo(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-10/12 max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-violet-50 shrink-0">
                <div><h3 className="font-black text-slate-900 font-mono">PO-{detailPo._id.slice(-6).toUpperCase()}</h3><p className="text-xs mt-0.5">{statusBadge(detailPo.status)}</p></div>
                <button onClick={() => setDetailPo(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="col-span-2"><span className="text-slate-500 font-bold text-xs block">Nhà Cung Cấp</span><span className="font-semibold text-slate-800">{getSupplierName(detailPo.supplierId)}</span></div>
                  <div><span className="text-slate-500 font-bold text-xs block">Ngày tạo</span><span className="font-semibold text-slate-800">{new Date(detailPo.createdAt).toLocaleString("vi-VN")}</span></div>
                  <div><span className="text-slate-500 font-bold text-xs block">Tổng tiền</span><span className="font-black text-violet-700 text-base">{detailPo.totalAmount?.toLocaleString("vi-VN")}đ</span></div>
                  {detailPo.linkedPrCodes && detailPo.linkedPrCodes.length > 0 && (
                    <div className="col-span-2"><span className="text-slate-500 font-bold text-xs block">Mã PR tham chiếu</span><span className="font-semibold text-slate-800">{detailPo.linkedPrCodes.join(', ')}</span></div>
                  )}
                </div>
                <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Package size={14} className="text-violet-600" />Sản phẩm ({detailPo.items?.length || 0})</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {detailPo.items?.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-800 text-sm block">{it.medicineName || "ID: " + it.medicineId}</span>
                        <span className="text-xs text-slate-400">Đơn giá: {it.unitPrice?.toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-violet-700 text-sm block">×{it.quantity}</span>
                        <span className="text-xs font-bold text-slate-600">{(it.quantity * it.unitPrice)?.toLocaleString('vi-VN')}đ</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {detailPo.status === "PENDING_APPROVAL" && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                  <button onClick={() => { setDetailPo(null); setSelectedPos([detailPo._id]); setShowRejectModal(true); }} disabled={actionLoading} className="px-4 py-2 text-rose-600 font-bold hover:bg-rose-50 rounded-xl text-sm border border-transparent hover:border-rose-200">Từ chối (Hủy)</button>
                  <button onClick={() => { handleAction("APPROVE", "CREDIT", detailPo._id); setDetailPo(null); }} disabled={actionLoading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm flex items-center gap-1.5"><CreditCard size={16} /> Duyệt mua nợ</button>
                  <button onClick={() => { handleAction("APPROVE", "PAID", detailPo._id); setDetailPo(null); }} disabled={actionLoading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center gap-1.5"><DollarSign size={16} /> Thanh toán ngay</button>
                </div>
              )}
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
                <h3 className="font-black text-slate-900 flex items-center gap-2"><XCircle size={18} className="text-rose-600" /> Hủy Đơn Hàng</h3>
                <p className="text-xs text-rose-600 font-bold mt-1">Sẽ hủy bỏ {selectedPos.length} Đơn đặt hàng đã chọn</p>
              </div>
              <div className="p-5 space-y-3">
                <label className="text-xs font-bold text-slate-500 block">LÝ DO HỦY ĐƠN</label>
                <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Nhập lý do hủy..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none" />
              </div>
              <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
                <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-sm">Quay lại</button>
                <button onClick={() => handleAction("REJECT")} disabled={actionLoading}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm flex items-center gap-1.5 disabled:opacity-50">
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}Xác nhận Hủy Đơn
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
