import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, X, Package, CheckCircle2, AlertTriangle, Loader2,
  ArrowRight, Building2, Calendar, Eye, FileText, Truck,
  ClipboardList, ShoppingCart, ArrowDownToLine, DollarSign,
  CreditCard, XCircle, SendHorizonal, Warehouse, ChevronRight,
  PackageCheck, PackageX, Scan, Camera, ClipboardCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CreatePOModal } from "../../components/CreatePOModal";
import { branchService } from "../../services/admin/branch.service";
import { supplierService } from "../../services/purchase/supplier.service";

import { BranchRequestsTab } from "./components/BranchRequestsTab";
import { PurchaseRequestsTab } from "./components/PurchaseRequestsTab";
import { IncomingOrdersTab } from "./components/IncomingOrdersTab";

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
  const [purchaseRequestsRefreshKey, setPurchaseRequestsRefreshKey] = useState(0);
  const [prefillData, setPrefillData] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
    branchService.getBranches().then(d => setBranches(d || [])).catch(() => { });
    supplierService.getSuppliers().then(d => setSuppliers(d || [])).catch(() => { });
  }, []);

  useEffect(() => {
    const openCreatePO = searchParams.get("openCreatePO");
    const prefillStr = searchParams.get("prefill");
    if (openCreatePO === "true") {
      if (prefillStr) {
        try {
          const decoded = JSON.parse(decodeURIComponent(prefillStr));
          setPrefillData(decoded);
        } catch (e) {
          console.error("Failed to parse prefill parameter", e);
        }
      }
      setShowCreatePOModal(true);
      
      // Clear query parameters
      setSearchParams(prev => {
        prev.delete("openCreatePO");
        prev.delete("prefill");
        return prev;
      }, { replace: true });
    }
  }, [searchParams]);

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
      {/* Messages */}
      <AnimatePresence>
        {msg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border ${msg.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
            {msg.type === "success" ? <CheckCircle2 size={20} className="text-green-600" /> : <AlertTriangle size={20} className="text-red-600" />}
            <span className="font-medium text-sm">{msg.text}</span>
            <button onClick={() => setMsg(null)} className="ml-2 hover:bg-black/5 p-1 rounded-full"><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6 pb-0 flex flex-col gap-6 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            Quản lý Kho Tổng & Yêu cầu
          </h1>
          <p className="text-slate-500 mt-1">Điều phối hàng hóa chi nhánh và quản lý đơn nhập hàng từ Nhà Cung Cấp.</p>
        </div>

        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm gap-1">
          {TABS.map(t => {
            const isActive = activeTab === t.key;
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl transition-all ${isActive ? colorMap[t.color] + " shadow-sm font-bold" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium"}`}>
                <div className={`p-2 rounded-full mb-2 ${isActive ? `bg-${t.color}-100` : "bg-slate-100"}`}>{t.icon}</div>
                <span className="text-sm">{t.label}</span>
                <span className="text-xs opacity-70 mt-1 max-w-[200px] text-center truncate">{t.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-hidden">
        {activeTab === "branch_requests" && (
          <BranchRequestsTab
            branches={branches}
            onMsg={setMsg}
            onCreatePO={(items) => {
              setPrefillData(items);
              setShowCreatePOModal(true);
            }}
          />
        )}
        {activeTab === "purchase_requests" && (
          <PurchaseRequestsTab
            suppliers={suppliers}
            refreshKey={purchaseRequestsRefreshKey}
            onMsg={setMsg}
            onOpenCreate={() => {
              setPrefillData([]);
              setShowCreatePOModal(true);
            }}
          />
        )}
        {activeTab === "incoming_orders" && (
          <IncomingOrdersTab
            suppliers={suppliers}
            onMsg={setMsg}
          />
        )}
      </div>

      <AnimatePresence>
        {showCreatePOModal && (
          <CreatePOModal
            prefillPrItems={prefillData}
            onClose={() => setShowCreatePOModal(false)}
            onSuccess={() => {
              setShowCreatePOModal(false);
              setPurchaseRequestsRefreshKey(key => key + 1);
              setMsg({ type: "success", text: "Tạo Đơn Nhập Hàng thành công!" });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default WarehouseInventoryHub;
