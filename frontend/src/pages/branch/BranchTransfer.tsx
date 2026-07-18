import React, { useState, useEffect } from "react";
import { Search, Send, ArrowRightLeft, Trash2, Plus, AlertCircle, CheckCircle2, Loader2, Package } from "lucide-react";
import { branchService } from "../../services/admin/branch.service";
import { medicineService } from "../../services/inventory/medicine.service";

// Helper to decode JWT token to extract branchId and user info
function getBranchInfoFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return { branchId: null, fullName: "Quản lý Chi Nhánh" };
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    return {
      branchId: decoded.branchId || null,
      fullName: decoded.fullName || "Quản lý Chi Nhánh"
    };
  } catch (e) {
    console.error("Lỗi giải mã token:", e);
    return { branchId: null, fullName: "Quản lý Chi Nhánh" };
  }
}

export function BranchTransfer() {
  const { branchId: currentBranchId, fullName: currentUserName } = getBranchInfoFromToken();
  const activeBranchId = currentBranchId || "BR-001";

  const [branches, setBranches] = useState<any[]>([]);
  const [selectedToBranch, setSelectedToBranch] = useState<any>(null);
  
  const [inventory, setInventory] = useState<any[]>([]);
  const [loadingInv, setLoadingInv] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [cart, setCart] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load branches and current inventory
  useEffect(() => {
    const init = async () => {
      try {
        const [branchList, invList] = await Promise.all([
          branchService.getBranches(),
          medicineService.getBranchMedicines(activeBranchId, { limit: 500, branchStockOnly: true })
        ]);
        
        // Filter out current branch from target branches list
        setBranches((branchList || []).filter((b: any) => b.branchCode !== activeBranchId));
        setInventory(invList.data || []);
      } catch (e) {
        console.error("Lỗi tải thông tin:", e);
      } finally {
        setLoadingInv(false);
      }
    };
    init();
  }, [activeBranchId]);

  const handleAddToTransfer = (med: any) => {
    setMsg(null);
    const exists = cart.find(item => item.id === med.id);
    if (exists) {
      setMsg({ type: "error", text: `Thuốc "${med.name}" đã có trong danh sách chuyển.` });
      return;
    }
    if (med.stock <= 0) {
      setMsg({ type: "error", text: `Thuốc "${med.name}" đã hết hàng ở chi nhánh của bạn.` });
      return;
    }
    setCart(prev => [...prev, { ...med, transferQty: 1 }]);
  };

  const handleRemoveFromTransfer = (medId: string) => {
    setCart(prev => prev.filter(item => item.id !== medId));
  };

  const handleQtyChange = (medId: string, val: string) => {
    const qty = parseInt(val) || 0;
    setCart(prev => prev.map(item => {
      if (item.id === medId) {
        const finalQty = Math.max(1, Math.min(item.stock, qty));
        return { ...item, transferQty: finalQty };
      }
      return item;
    }));
  };

  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!selectedToBranch) {
      setMsg({ type: "error", text: "Vui lòng chọn chi nhánh nhận hàng." });
      return;
    }

    if (cart.length === 0) {
      setMsg({ type: "error", text: "Vui lòng chọn ít nhất 1 mặt hàng để chuyển." });
      return;
    }

    setActionLoading(true);

    try {
      const response = await fetch("/api/stock-transfers/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromBranchId: activeBranchId,
          toBranchId: selectedToBranch.branchCode,
          toBranchName: selectedToBranch.name,
          shippedBy: currentUserName,
          items: cart.map(item => ({
            medicineId: item.id,
            medicineName: item.name,
            quantity: item.transferQty,
            unit: item.unit || "Hộp"
          }))
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.message || "Giao dịch chuyển kho thất bại.");
      }

      setMsg({ type: "success", text: resData.message || "Tạo yêu cầu chuyển kho trực tiếp thành công!" });
      setCart([]);
      
      // Refresh current inventory
      setLoadingInv(true);
      const invList = await medicineService.getBranchMedicines(activeBranchId, { limit: 500, branchStockOnly: true });
      setInventory(invList.data || []);
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Đã xảy ra lỗi không xác định." });
    } finally {
      setActionLoading(false);
      setLoadingInv(false);
    }
  };

  const filteredInventory = inventory.filter(med => 
    med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    med.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4 h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-100 text-[#0057cd]">
            <ArrowRightLeft size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Chuyển Kho Liên Chi Nhánh</h1>
            <p className="text-slate-500 text-sm mt-0.5">Xuất chuyển thuốc trực tiếp từ chi nhánh của bạn ({activeBranchId}) sang các chi nhánh lân cận</p>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-2 border ${
          msg.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
        }`}>
          {msg.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="ml-auto text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Main Grid split: Cart on left, Inventory Selection on right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Create Transfer form */}
        <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-100/40 p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Send size={16} className="text-[#0057cd]" /> Phiếu Chuyển Kho
          </h2>

          <form onSubmit={handleSubmitTransfer} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Chi nhánh đích nhận hàng:</label>
              <select
                onChange={(e) => {
                  const bCode = e.target.value;
                  const bObj = branches.find(b => b.branchCode === bCode);
                  setSelectedToBranch(bObj || null);
                }}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-800 focus:ring-4 focus:ring-blue-500/10 focus:border-[#0057cd] outline-none shadow-sm cursor-pointer"
                defaultValue=""
              >
                <option value="" disabled>--- Chọn chi nhánh đích ---</option>
                {branches.map(b => (
                  <option key={b.branchCode} value={b.branchCode}>{b.name} ({b.branchCode})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Danh sách thuốc xuất kho ({cart.length}):</label>
              {cart.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <Package className="mx-auto text-slate-300 mb-2" size={32} />
                  <p className="text-xs text-slate-400 font-bold">Chưa chọn thuốc nào. Hãy chọn từ danh mục bên phải.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto border border-slate-150 rounded-xl bg-white shadow-inner p-2 space-y-1">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2 px-2 hover:bg-slate-50 rounded-lg transition-colors">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="text-xs font-bold text-slate-800 truncate">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">Tồn khả dụng: {item.stock} {item.unit || "Hộp"}</div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="1"
                            max={item.stock}
                            value={item.transferQty}
                            onChange={(e) => handleQtyChange(item.id, e.target.value)}
                            className="w-16 text-center border border-slate-200 rounded p-1 text-xs font-bold text-slate-800"
                          />
                          <span className="text-xs text-slate-500 font-bold">{item.unit || "Hộp"}</span>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => handleRemoveFromTransfer(item.id)}
                          className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={actionLoading || cart.length === 0}
              className="w-full py-3 bg-[#0057cd] hover:bg-[#00419e] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2 text-sm"
            >
              {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              Xác Nhận Chuyển Kho
            </button>
          </form>
        </div>

        {/* Right Side: Select products from Inventory */}
        <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-100/40 p-6 flex flex-col max-h-[70vh]">
          <h2 className="text-base font-bold text-slate-800 mb-3">Chọn hàng từ tồn kho</h2>
          
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Tìm thuốc để chuyển..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-[#0057cd] transition-all"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {loadingInv ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 className="animate-spin text-[#0057cd]" size={20} />
                <p className="text-xs text-slate-500 font-semibold">Đang tải tồn kho chi nhánh...</p>
              </div>
            ) : filteredInventory.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">Không tìm thấy sản phẩm.</div>
            ) : (
              filteredInventory.map(med => (
                <div
                  key={med.id}
                  className="flex items-center justify-between p-2.5 border border-slate-100 hover:border-blue-100 hover:bg-blue-50/20 rounded-xl transition-all"
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="text-xs font-bold text-slate-800 truncate">{med.name}</div>
                    <div className="flex gap-2 text-[10px] text-slate-500 font-semibold mt-1">
                      <span>Tồn: <strong className={med.stock <= 20 ? "text-rose-600" : "text-emerald-600"}>{med.stock}</strong></span>
                      <span>•</span>
                      <span>Đơn vị: {med.unit || "Hộp"}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleAddToTransfer(med)}
                    className="p-1.5 bg-blue-50 text-[#0057cd] hover:bg-[#0057cd] hover:text-white rounded-lg transition-colors"
                    title="Thêm vào danh sách chuyển"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
