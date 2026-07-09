import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, X, Package, CheckCircle2, AlertTriangle, Loader2,
  ArrowRight, Building2, Calendar, Eye, FileText, Truck,
  ClipboardList, ShoppingCart, ArrowDownToLine, DollarSign,
  CreditCard, XCircle, SendHorizonal, Warehouse, ChevronRight,
  PackageCheck, PackageX
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CreatePOModal } from "../../components/CreatePOModal";
import { branchService } from "../../services/branch.service";
import { purchaseOrderService } from "../../services/purchaseOrder.service";
import { goodsReceiptService } from "../../services/goodsReceipt.service";
import { supplierService } from "../../services/supplier.service";
import { useSocket } from "../../hooks/useSocket";

// ─────────────────────────────────────────
// STATUS HELPERS
// ─────────────────────────────────────────
const PR_STATUS: Record<string, { label: string; cls: string }> = {
  SUBMITTED: { label: "Chờ xử lý", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  SHIPPING: { label: "Đang giao", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  COMPLETED: { label: "Hoàn thành ✓", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  OUT_OF_STOCK: { label: "Hết hàng ⚠", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  WAREHOUSE_SUBMITTED: { label: "Đã gửi Admin", cls: "bg-violet-50 text-violet-700 border-violet-200" },
  CONSOLIDATED: { label: "Đã tạo PO", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  REJECTED: { label: "Từ chối ✗", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

const PO_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING_APPROVAL: { label: "Chờ Admin duyệt", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  SHIPPING: { label: "Đang về", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  COMPLETED: { label: "Đã nhập kho ✓", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELLED: { label: "Đã hủy ✗", cls: "bg-rose-50 text-rose-700 border-rose-200" },
};

function StatusBadge({ map, status }: { map: Record<string, { label: string; cls: string }>; status: string }) {
  const s = map[status] || { label: status, cls: "bg-slate-50 text-slate-500 border-slate-200" };
  return <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-bold ${s.cls}`}>{s.label}</span>;
}

// ─────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────
type HubTab = "branch_requests" | "purchase_requests" | "incoming_orders";

export function WarehouseInventoryHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as HubTab) || "branch_requests";
  const setActiveTab = (tab: HubTab) => {
    setSearchParams(prev => {
      prev.set("tab", tab);
      return prev;
    });
  };
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [prefillData, setPrefillData] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
    branchService.getBranches().then(d => setBranches(d || [])).catch(() => { });
    supplierService.getSuppliers().then(d => setSuppliers(d || [])).catch(() => { });
  }, []);

  const TABS = [
    {
      key: "branch_requests" as HubTab,
      label: "Yêu cầu từ Chi nhánh",
      icon: <ClipboardList size={16} />,
      desc: "Xem & xử lý các yêu cầu cấp hàng từ chi nhánh",
      color: "blue",
    },
    {
      key: "purchase_requests" as HubTab,
      label: "Yêu cầu Mua hàng",
      icon: <ShoppingCart size={16} />,
      desc: "Tạo & gửi yêu cầu nhập hàng mới từ NCC lên Admin",
      color: "violet",
    },
    {
      key: "incoming_orders" as HubTab,
      label: "Đơn hàng đang về",
      icon: <ArrowDownToLine size={16} />,
      desc: "Theo dõi & nhận hàng từ Nhà cung cấp (PO đã Admin duyệt)",
      color: "emerald",
    },
  ];

  const colorMap: Record<string, string> = {
    blue: "border-blue-600 text-blue-700 bg-blue-50",
    violet: "border-violet-600 text-violet-700 bg-violet-50",
    emerald: "border-emerald-600 text-emerald-700 bg-emerald-50",
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f8ff] overflow-hidden">
      {/* ── Header ── */}
      <div className="px-6 pt-6 pb-0 bg-white border-b border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-100 text-blue-700">
            <Warehouse size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Quản trị Nhập / Xuất Kho</h1>
            <p className="text-slate-500 text-sm mt-0.5">Trung tâm điều phối toàn bộ luồng hàng hóa của Kho</p>
          </div>
        </div>

        {/* Workflow bar */}
        <div className="mb-4 flex items-center gap-2 flex-wrap text-xs font-bold">
          <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg">1. Chi nhánh yêu cầu</span>
          <ArrowRight size={13} className="text-slate-300" />
          <span className="px-3 py-1.5 bg-blue-500 text-white rounded-lg ring-2 ring-blue-200">2. Kho xét duyệt & xuất</span>
          <ArrowRight size={13} className="text-slate-300" />
          <span className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg">3. Kho gửi PR lên Admin</span>
          <ArrowRight size={13} className="text-slate-300" />
          <span className="px-3 py-1.5 bg-violet-100 text-violet-700 rounded-lg">4. Admin duyệt PO</span>
          <ArrowRight size={13} className="text-slate-300" />
          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg">5. Nhập hàng về Kho</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-0">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-all ${activeTab === t.key
                ? `${colorMap[t.color]} border-current`
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Message ── */}
      {msg && (
        <div className="mx-6 mt-4 shrink-0">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className={`p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${msg.type === "success"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}>
            {msg.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {msg.text}
            <button onClick={() => setMsg(null)} className="ml-auto opacity-50 hover:opacity-100"><X size={14} /></button>
          </motion.div>
        </div>
      )}

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-hidden p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {activeTab === "branch_requests" && (
              <BranchRequestsTab
                branches={branches}
                onMsg={setMsg}
                onCreatePO={(items) => { setPrefillData(items); setShowCreatePOModal(true); }}
              />
            )}
            {activeTab === "purchase_requests" && (
              <PurchaseRequestsTab
                suppliers={suppliers}
                onMsg={setMsg}
                onOpenCreate={() => { setPrefillData([]); setShowCreatePOModal(true); }}
              />
            )}
            {activeTab === "incoming_orders" && (
              <IncomingOrdersTab suppliers={suppliers} onMsg={setMsg} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {showCreatePOModal && (
        <CreatePOModal
          prefillPrItems={prefillData}
          onClose={() => setShowCreatePOModal(false)}
          onSuccess={() => {
            setMsg({ type: "success", text: "Tạo đơn nhập hàng (PO) thành công! Đã gửi lên Admin duyệt." });
            setShowCreatePOModal(false);
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 1: Yêu cầu từ Chi nhánh (Branch → Warehouse)
// ═══════════════════════════════════════════════════════════════
function BranchRequestsTab({
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
      const res = await fetch(`/api/purchase-requisitions`);
      if (res.ok) {
        const data = await res.json();
        setPrList(Array.isArray(data) ? data : []);
      }
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
      const res = await fetch("/api/stock-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prId, fromBranchId, shippedBy: "Thủ Kho" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Lỗi xuất kho");
      onMsg({ type: "success", text: "Đã xuất kho & chuyển hàng thành công!" });
      setDetailPr(null);
      fetchData();
    } catch (e: any) {
      onMsg({ type: "error", text: e.message });
    } finally { setActionLoading(false); }
  };

  // Báo hết hàng
  const handleOutOfStock = async (prId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/purchase-requisitions/${prId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "OUT_OF_STOCK" }),
      });
      if (!res.ok) throw new Error("Không thể cập nhật trạng thái");
      onMsg({ type: "success", text: "Đã báo hết hàng. Thủ kho có thể tạo yêu cầu mua hàng từ tab bên cạnh." });
      setDetailPr(null);
      setOutOfStockPrId(null);
      fetchData();
    } catch (e: any) {
      onMsg({ type: "error", text: e.message });
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

// ═══════════════════════════════════════════════════════════════
// TAB 2: Yêu cầu Mua hàng (Warehouse → Admin)
// ═══════════════════════════════════════════════════════════════
function PurchaseRequestsTab({
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
      const res = await fetch(`/api/purchase-requisitions?status=${statusFilter}`);
      if (res.ok) setPrList(Array.isArray(await res.json() || []) ? await (await fetch(`/api/purchase-requisitions?status=${statusFilter}`)).json() : []);
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
        await fetch(`/api/purchase-requisitions/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "WAREHOUSE_SUBMITTED", warehouseSubmittedBy: "Thủ Kho" }),
        });
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

// ═══════════════════════════════════════════════════════════════
// TAB 3: Đơn hàng đang về (PO từ NCC)
// ═══════════════════════════════════════════════════════════════
function IncomingOrdersTab({
  suppliers,
  onMsg,
}: {
  suppliers: any[];
  onMsg: (m: { type: "success" | "error"; text: string } | null) => void;
}) {
  const [poList, setPoList] = useState<any[]>([]);
  const [grnList, setGrnList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subTab, setSubTab] = useState<"po" | "grn">("po");
  const [selectedPo, setSelectedPo] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [poRes, grnRes] = await Promise.all([
        purchaseOrderService.getPurchaseOrders().catch(() => []),
        goodsReceiptService.getGoodsReceipts().catch(() => []),
      ]);
      setPoList(Array.isArray(poRes) ? poRes : []);
      setGrnList(Array.isArray(grnRes) ? grnRes : []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const getSupplierName = (id: string) => suppliers.find(s => s._id === id)?.name || id?.slice(-6) || "N/A";

  const filteredPo = poList.filter(po =>
    (po._id || "").toLowerCase().includes(search.toLowerCase()) ||
    getSupplierName(po.supplierId).toLowerCase().includes(search.toLowerCase())
  );
  const filteredGrn = grnList.filter(grn =>
    (grn.grnCode || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleReceive = async (poId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receivedBy: "Thủ Kho" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Không thể nhận hàng");
      onMsg({ type: "success", text: "Đã xác nhận nhận hàng và nhập kho thành công!" });
      setSelectedPo(null);
      fetchData();
    } catch (e: any) {
      onMsg({ type: "error", text: e.message });
    } finally { setActionLoading(false); }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex gap-1 shrink-0 border-b border-slate-200">
        {[
          { key: "po", label: "PO Đang về / Chờ nhận" },
          { key: "grn", label: "Phiếu nhập kho (GRN)" },
        ].map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key as any)}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-all ${subTab === t.key
              ? "bg-white border border-slate-200 border-b-white text-emerald-700 -mb-px"
              : "text-slate-500 hover:text-slate-700"
              }`}>{t.label}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm shrink-0">
        <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={subTab === "po" ? "Tìm mã PO hoặc NCC..." : "Tìm mã GRN..."}
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Loader2 className="animate-spin text-emerald-500" size={28} />
          </div>
        ) : subTab === "po" ? (
          filteredPo.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3 text-slate-400">
              <Truck size={36} /><p className="text-sm font-semibold">Không có PO nào đang về.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Mã PO</th>
                  <th className="px-4 py-3">Ngày</th>
                  <th className="px-4 py-3">Nhà Cung Cấp</th>
                  <th className="px-4 py-3 text-center">SP</th>
                  <th className="px-4 py-3 text-right">Tổng tiền</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPo.map(po => (
                  <tr key={po._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 font-mono text-xs">PO-{po._id.slice(-6).toUpperCase()}</td>
                    <td className="px-4 py-3 text-slate-600"><Calendar size={12} className="inline mr-1 text-slate-400" />{new Date(po.createdAt).toLocaleDateString("vi-VN")}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{getSupplierName(po.supplierId)}</td>
                    <td className="px-4 py-3 text-center font-bold">{po.items?.length || 0}</td>
                    <td className="px-4 py-3 text-right font-black text-emerald-700">{po.totalAmount?.toLocaleString("vi-VN")}đ</td>
                    <td className="px-4 py-3 text-center"><StatusBadge map={PO_STATUS} status={po.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        {po.status === "SHIPPING" && (
                          <button onClick={() => setSelectedPo(po)} title="Nhập kho"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                            <PackageCheck size={15} />
                          </button>
                        )}
                        <button onClick={() => setSelectedPo(po)} title="Xem chi tiết"
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          filteredGrn.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3 text-slate-400">
              <ArrowDownToLine size={36} /><p className="text-sm font-semibold">Chưa có phiếu nhập kho nào.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Mã GRN</th>
                  <th className="px-4 py-3">Ngày nhập</th>
                  <th className="px-4 py-3">Nhà Cung Cấp</th>
                  <th className="px-4 py-3 text-center">SP</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGrn.map((grn: any) => (
                  <tr key={grn._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 font-mono text-xs">{grn.grnCode}</td>
                    <td className="px-4 py-3 text-slate-600"><Calendar size={12} className="inline mr-1 text-slate-400" />{new Date(grn.createdAt).toLocaleDateString("vi-VN")}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{getSupplierName(grn.supplierId)}</td>
                    <td className="px-4 py-3 text-center font-bold">{grn.items?.length || 0}</td>
                    <td className="px-4 py-3 text-center"><span className="inline-flex px-2.5 py-1 rounded-full border text-[11px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">Đã nhập kho ✓</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* Receive PO Modal */}
      <AnimatePresence>
        {selectedPo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedPo(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-10/12 max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-emerald-50 shrink-0">
                <div>
                  <h3 className="font-black text-slate-900 font-mono">PO-{selectedPo._id.slice(-6).toUpperCase()}</h3>
                  <p className="text-xs mt-0.5"><StatusBadge map={PO_STATUS} status={selectedPo.status} /></p>
                </div>
                <button onClick={() => setSelectedPo(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"><X size={18} /></button>
              </div>
              <div className="p-5 space-y-3 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div><span className="text-slate-500 font-bold text-xs block">Nhà Cung Cấp</span><span className="font-semibold text-slate-800">{getSupplierName(selectedPo.supplierId)}</span></div>
                  <div><span className="text-slate-500 font-bold text-xs block">Tổng tiền</span><span className="font-black text-emerald-700 text-base">{selectedPo.totalAmount?.toLocaleString("vi-VN")}đ</span></div>
                </div>
                <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Package size={14} className="text-emerald-600" />Danh sách hàng ({selectedPo.items?.length || 0})</h4>
                <div className="space-y-2">
                  {selectedPo.items?.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-800 text-sm">{it.medicineName || it.medicineId}</span>
                      <div className="text-right">
                        <span className="font-bold text-emerald-700 text-sm block">×{it.quantity}</span>
                        <span className="text-xs text-slate-400">{it.unitPrice?.toLocaleString("vi-VN")}đ/đv</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {selectedPo.status === "SHIPPING" && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">
                  <button onClick={() => handleReceive(selectedPo._id)} disabled={actionLoading}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center gap-1.5">
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />}
                    Xác nhận Nhập kho
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
