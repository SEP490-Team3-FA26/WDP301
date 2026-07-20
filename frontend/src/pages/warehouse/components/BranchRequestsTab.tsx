import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, X, Package, Loader2, Building2, Calendar, Eye, Truck, ClipboardList, ShoppingCart, PackageX } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StatusBadge, PR_STATUS } from "./WarehouseConstants";
import { useSocket } from "../../../hooks/useSocket";
import { purchaseRequisitionService } from "../../../services/purchase/purchaseRequisition.service";
import { stockTransferService } from "../../../services/inventory/stockTransfer.service";

export function BranchRequestsTab({
  branches,
  onMsg,
  onCreatePO,
}: {
  branches: any[];
  onMsg: (m: { type: "success" | "error"; text: string } | null) => void;
  onCreatePO: (items: any[]) => void;
}) {
  const [prList, setPrList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "SUBMITTED";
  const setStatusFilter = (status: string) => {
    setSearchParams(prev => {
      prev.set("status", status);
      return prev;
    });
  };
  const [detailPr, setDetailPr] = useState<any>(null);
  const [selectedPrs, setSelectedPrs] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [fromBranchId, setFromBranchId] = useState("CENTRAL_WH");
  const [outOfStockPrId, setOutOfStockPrId] = useState<string | null>(null);

  const STATUS_TABS = [
    { key: "SUBMITTED", label: "Chờ xử lý", color: "blue" },
    { key: "SHIPPING", label: "Đang giao", color: "indigo" },
    { key: "COMPLETED", label: "Hoàn thành", color: "emerald" },
    { key: "OUT_OF_STOCK", label: "Hết hàng", color: "orange" },
    { key: "REJECTED", label: "Từ chối", color: "rose" },
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await purchaseRequisitionService.getPurchaseRequisitions();
      setPrList(Array.isArray(data?.data || data) ? (data.data || data) : []);
    } catch (e: any) {
      console.error(e);
      setPrList([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); setSelectedPrs([]); }, []);

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

  const filtered = prList.filter(pr =>
    pr.status === statusFilter &&
    ((pr.prCode || "").toLowerCase().includes(search.toLowerCase()) ||
    (pr.branchName || "").toLowerCase().includes(search.toLowerCase()))
  );

  // Xuất kho: tạo stock transfer SHIPPING
  const handleShip = async (prId: string) => {
    setActionLoading(true);
    try {
      await stockTransferService.createStockTransfer(prId, fromBranchId, "Thủ Kho");
      onMsg({ type: "success", text: "Đã xuất kho & chuyển hàng thành công!" });
      setDetailPr(null);
      fetchData();
    } catch (e: any) {
      onMsg({ type: "error", text: e.response?.data?.message || e.message || "Lỗi xuất kho" });
    } finally { setActionLoading(false); }
  };

  // Báo hết hàng
  const handleOutOfStock = async (prId: string) => {
    setActionLoading(true);
    try {
      await purchaseRequisitionService.updatePurchaseRequisitionStatus(prId, "OUT_OF_STOCK");
      onMsg({ type: "success", text: "Đã báo hết hàng. Thủ kho có thể tạo yêu cầu mua hàng từ tab bên cạnh." });
      setDetailPr(null);
      setOutOfStockPrId(null);
      fetchData();
    } catch (e: any) {
      onMsg({ type: "error", text: e.response?.data?.message || e.message || "Không thể cập nhật trạng thái" });
    } finally { setActionLoading(false); }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 shrink-0 border-b border-slate-200 pb-0">
        {STATUS_TABS.map(t => {
          const count = prList.filter(pr => pr.status === t.key).length;
          return (
            <button key={t.key} onClick={() => setStatusFilter(t.key)}
              className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 ${statusFilter === t.key
                ? `bg-white border border-slate-200 border-b-white text-${t.color}-700 -mb-px`
                : "text-slate-500 hover:text-slate-700"
                }`}>
              {t.label}
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${statusFilter === t.key ? `bg-${t.color}-100` : 'bg-slate-100 text-slate-400'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm mã PR hoặc chi nhánh..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        {statusFilter === "SUBMITTED" && selectedPrs.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
            <span className="text-xs font-bold text-blue-700">Đã chọn {selectedPrs.length}</span>
            <button
              onClick={() => {
                const items = prList.filter(p => selectedPrs.includes(p._id)).flatMap(p =>
                  (p.items || []).map((it: any) => ({ ...it, prId: p._id, prCode: p.prCode }))
                );
                onCreatePO(items);
              }}
              className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg flex items-center gap-1">
              <ShoppingCart size={12} /> Tạo PO mua hàng
            </button>
          </motion.div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Loader2 className="animate-spin text-blue-500" size={28} />
            <p className="text-slate-500 text-sm">Đang tải...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-slate-400">
            <ClipboardList size={36} />
            <p className="text-sm font-semibold">Không có yêu cầu nào ở trạng thái này.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 border-b border-slate-200">
              <tr>
                {statusFilter === "SUBMITTED" && (
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" className="rounded"
                      checked={selectedPrs.length === filtered.length && filtered.length > 0}
                      onChange={e => setSelectedPrs(e.target.checked ? filtered.map(p => p._id) : [])} />
                  </th>
                )}
                <th className="px-4 py-3">Mã PR</th>
                <th className="px-4 py-3">Ngày</th>
                <th className="px-4 py-3">Chi nhánh</th>
                <th className="px-4 py-3">Lý do</th>
                <th className="px-4 py-3 text-center">SP</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(pr => (
                <tr key={pr._id} className="hover:bg-slate-50 transition-colors">
                  {statusFilter === "SUBMITTED" && (
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
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <Building2 size={12} className="inline mr-1 text-slate-400" />
                    {pr.branchName}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-[140px] truncate">{pr.reason || "—"}</td>
                  <td className="px-4 py-3 text-center font-bold">{pr.items?.length || 0}</td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge map={PR_STATUS} status={pr.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5 items-center">
                      {pr.status === "SUBMITTED" && (
                        <>
                          <button
                            onClick={() => { setDetailPr(pr); setFromBranchId("CENTRAL_WH"); }}
                            title="Xuất kho → Giao hàng"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Truck size={15} />
                          </button>
                          <button
                            onClick={() => setOutOfStockPrId(pr._id)}
                            title="Báo hết hàng"
                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg"
                          >
                            <PackageX size={15} />
                          </button>
                        </>
                      )}
                      <button onClick={() => setDetailPr(pr)} title="Xem chi tiết"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
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

      {/* Out of stock confirm */}
      <AnimatePresence>
        {outOfStockPrId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setOutOfStockPrId(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
              <div className="p-5 border-b border-slate-100 bg-orange-50">
                <h3 className="font-black text-slate-900 flex items-center gap-2">
                  <PackageX size={18} className="text-orange-600" /> Báo Hết Hàng
                </h3>
                <p className="text-xs text-orange-700 mt-1">Kho không đủ hàng để xử lý yêu cầu này.</p>
              </div>
              <div className="p-5 text-sm text-slate-600">
                Xác nhận báo <strong>HẾT HÀNG</strong> cho yêu cầu này? Sau đó bạn có thể tạo <strong>Yêu cầu Mua hàng</strong> ở tab bên cạnh để gửi Admin phê duyệt nhập thêm hàng.
              </div>
              <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
                <button onClick={() => setOutOfStockPrId(null)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-sm">Hủy</button>
                <button onClick={() => handleOutOfStock(outOfStockPrId!)} disabled={actionLoading}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-sm flex items-center gap-1.5">
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <PackageX size={14} />} Xác nhận Hết hàng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail / Ship Modal */}
      <AnimatePresence>
        {detailPr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDetailPr(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-10/12 max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-blue-50 shrink-0">
                <div>
                  <h3 className="font-black text-slate-900 font-mono">{detailPr.prCode}</h3>
                  <p className="text-xs mt-0.5"><StatusBadge map={PR_STATUS} status={detailPr.status} /></p>
                </div>
                <button onClick={() => setDetailPr(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div><span className="text-slate-500 font-bold text-xs block">Chi nhánh</span><span className="font-semibold text-slate-800">{detailPr.branchName}</span></div>
                  <div><span className="text-slate-500 font-bold text-xs block">Ngày gửi</span><span className="font-semibold text-slate-800">{new Date(detailPr.createdAt).toLocaleString("vi-VN")}</span></div>
                  <div className="col-span-2"><span className="text-slate-500 font-bold text-xs block">Lý do</span><span className="font-semibold text-slate-800">{detailPr.reason || "—"}</span></div>
                </div>
                <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Package size={14} className="text-blue-600" />Sản phẩm yêu cầu ({detailPr.items?.length || 0})</h4>
                <div className="space-y-2">
                  {detailPr.items?.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-800 text-sm">{it.medicineName || it.medicineId}</span>
                      <span className="font-bold text-blue-700 text-sm">×{it.requestedQuantity} {it.unit || "Hộp"}</span>
                    </div>
                  ))}
                </div>
              </div>
              {detailPr.status === "SUBMITTED" && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Kho xuất:</span>
                    <select value={fromBranchId} onChange={e => setFromBranchId(e.target.value)}
                      className="flex-1 text-xs p-2 border border-slate-200 rounded-lg bg-white font-semibold outline-none focus:border-blue-500 shadow-sm">
                      <option value="CENTRAL_WH">Kho Tổng (CENTRAL_WH)</option>
                      {branches.map(b => (
                        <option key={b.branchCode} value={b.branchCode}>{b.name} ({b.branchCode})</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setDetailPr(null); setOutOfStockPrId(detailPr._id); }} disabled={actionLoading}
                      className="px-4 py-2 text-orange-600 font-bold hover:bg-orange-50 rounded-xl text-sm border border-transparent hover:border-orange-200 flex items-center gap-1.5">
                      <PackageX size={14} /> Báo hết hàng
                    </button>
                    <button onClick={() => handleShip(detailPr._id)} disabled={actionLoading}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm flex items-center gap-1.5">
                      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
                      Xuất kho & Giao hàng
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
