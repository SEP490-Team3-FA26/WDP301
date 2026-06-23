import { useState } from "react";
import { AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";
import RetailView from "./components/RetailView";
import PrescriptionView from "./components/PrescriptionView";
import WholesaleView from "./components/WholesaleView";
import ReturnsView from "./components/ReturnsView";

export function Sales() {
  const [activeTab, setActiveTab] = useState("KÊ ĐƠN / PRESCRIPTION");
  const [toasts, setToasts] = useState<{ id: string; message: string; type: "success" | "error" | "warning" }[]>([]);

  const showToast = (message: string, type: "success" | "error" | "warning" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const tabs = [
    "BÁN LẺ / RETAIL",
    "KÊ ĐƠN / PRESCRIPTION",
    "BÁN SỈ / WHOLESALE",
    "TRÀ HÀNG / RETURNS",
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans relative">
      {/* Sales Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-xs font-bold tracking-wide transition-all uppercase whitespace-nowrap ${activeTab === tab
                ? "bg-white text-[#0057cd] shadow-sm font-black"
                : "text-slate-500 hover:text-slate-800"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        {activeTab === "BÁN LẺ / RETAIL" && <RetailView showToast={showToast} />}
        {activeTab === "KÊ ĐƠN / PRESCRIPTION" && <PrescriptionView showToast={showToast} />}
        {activeTab === "BÁN SỈ / WHOLESALE" && <WholesaleView />}
        {activeTab === "TRÀ HÀNG / RETURNS" && <ReturnsView />}
      </div>

      {/* Custom Toast Container */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4.5 py-3.5 rounded-2xl shadow-xl border text-xs font-bold tracking-wide uppercase transition-all duration-300 animate-slide-in-right ${toast.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-200 shadow-rose-100/50"
                : toast.type === "warning"
                  ? "bg-amber-50 text-amber-800 border-amber-200 shadow-amber-100/50"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-100/50"
              }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === "error" ? (
                <XCircle className="text-rose-500 shrink-0" size={16} />
              ) : toast.type === "warning" ? (
                <AlertTriangle className="text-amber-500 shrink-0" size={16} />
              ) : (
                <CheckCircle2 className="text-emerald-500 shrink-0" size={16} />
              )}
              <span className="normal-case">{toast.message}</span>
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-slate-400 hover:text-slate-700 font-bold ml-1.5 focus:outline-none pointer-events-auto cursor-pointer"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
