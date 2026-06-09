import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, Filter, ArrowDownToLine, ArrowUpFromLine, Trash2, 
  Calendar, FileText, Plus, ChevronRight, X, Package, 
  Building, CheckCircle2, DollarSign, ListFilter, ClipboardCheck, 
  AlertTriangle, Loader2 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface InventoryHistoryProps {
  type: "import" | "export" | "dispose";
}

export function InventoryHistory({ type }: InventoryHistoryProps) {
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState<"grn" | "po">("grn");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  
  // Data lists
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [goodsReceiptNotes, setGoodsReceiptNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState("");

  // Receipt Modal state
  const [selectedPoForReceipt, setSelectedPoForReceipt] = useState<any | null>(null);

  // Modal details view
  const [selectedGrnDetails, setSelectedGrnDetails] = useState<any | null>(null);
  const [selectedPoDetails, setSelectedPoDetails] = useState<any | null>(null);

  useEffect(() => {
    // Fetch base lists to resolve IDs
    Promise.all([
      fetch('/api/suppliers').then(r => r.json()).catch(() => []),
      fetch('/api/medicines?limit=2000').then(r => r.json()).then(d => d.data || d).catch(() => [])
    ]).then(([sData, mData]) => {
      setSuppliers(sData);
      setMedicines(mData);
    });
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (type === "import") {
        const [poRes, grnRes] = await Promise.all([
          fetch('/api/purchase-orders'),
          fetch('/api/goods-receipts')
        ]);
        if (poRes.ok && grnRes.ok) {
          const poData = await poRes.json();
          const grnData = await grnRes.json();
          setPurchaseOrders(poData);
          setGoodsReceiptNotes(grnData);
        } else {
          setError("Không thể tải danh sách dữ liệu nhập kho.");
        }
      }
    } catch (err) {
      setError("Lỗi kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [type, activeSubTab]);

  const title = type === "import" ? "Nhập kho & Đặt hàng" : type === "export" ? "Lịch sử xuất kho" : "Lịch sử xuất hủy";
  const desc = type === "import" ? "Quản lý đơn đặt hàng (PO) và phiếu xác nhận nhập kho (GRN)" : type === "export" ? "Quản lý các phiếu xuất kho, luân chuyển" : "Quản lý các phiếu hủy thuốc hỏng, hết hạn";
  const btnLabel = type === "import" ? "Tạo đơn nhập hàng (PO)" : type === "export" ? "Tạo phiếu xuất" : "Tạo phiếu hủy";
  
  const Icon = type === "import" ? ArrowDownToLine : type === "export" ? ArrowUpFromLine : Trash2;
  const theme = type === "import" ? "blue" : type === "export" ? "emerald" : "rose";
  const themeClasses = {
    blue: "bg-[#0057cd] hover:bg-[#00419e] text-white",
    emerald: "bg-emerald-600 hover:bg-emerald-700 text-white",
    rose: "bg-rose-600 hover:bg-rose-700 text-white",
    blueLight: "text-[#0057cd] bg-[#f2f3ff]",
    emeraldLight: "text-emerald-700 bg-emerald-100",
    roseLight: "text-rose-700 bg-rose-100",
  };

  const handleCreate = () => {
    if (type === "import") {
      navigate("new");
    }
  };

  // Helper to map supplier name
  const getSupplierName = (id: string) => {
    const s = suppliers.find(sup => sup._id === id);
    return s ? s.name : `Nhà cung cấp (${id.substring(0, 6)})`;
  };

  // Helper to map medicine name
  const getMedicineName = (id: string) => {
    const m = medicines.find(med => med.id === id || med._id === id);
    return m ? m.name : `Thuốc (${id.substring(0, 6)})`;
  };

  return (
    <div className="flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${themeClasses[`${theme}Light`]}`}>
                <Icon size={20} />
             </div>
             <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          </div>
          <p className="text-slate-500 mt-2 ml-13">{desc}</p>
        </div>
        {type === "import" && (
          <button 
            onClick={handleCreate}
            className={`px-5 py-2.5 font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors ${themeClasses[theme]}`}
          >
            <Plus size={18} />
            {btnLabel}
          </button>
        )}
      </div>

      {type === "import" && (
        <div className="flex border-b border-slate-200 mb-6 gap-2">
          <button
            onClick={() => setActiveSubTab("grn")}
            className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeSubTab === "grn"
                ? "border-[#0057cd] text-[#0057cd]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <ClipboardCheck size={16} />
            Phiếu Nhập Kho (GRN)
          </button>
          <button
            onClick={() => setActiveSubTab("po")}
            className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeSubTab === "po"
                ? "border-[#0057cd] text-[#0057cd]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileText size={16} />
            Đơn Đặt Hàng (PO)
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã hoặc nhà cung cấp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-[#0057cd]" size={32} />
              <p className="text-slate-500 text-sm font-semibold">Đang tải dữ liệu từ máy chủ...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-rose-600">
              <AlertTriangle size={32} />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          ) : type !== "import" ? (
            <div className="px-6 py-12 text-center text-slate-500">
              Màn hình xuất kho và hủy chưa được tích hợp API.
            </div>
          ) : activeSubTab === "grn" ? (
            // GRN LIST TABLE
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Mã Phiếu GRN</th>
                  <th className="px-6 py-4">Ngày Nhận</th>
                  <th className="px-6 py-4">Mã Đơn Hàng PO</th>
                  <th className="px-6 py-4">Thủ Kho Nhận</th>
                  <th className="px-6 py-4 text-center">Số Khoản Mục</th>
                  <th className="px-6 py-4 text-right">Tổng Tiền</th>
                  <th className="px-6 py-4 text-center">Trạng Thái</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {goodsReceiptNotes
                  .filter(r => r._id.toLowerCase().includes(searchQuery.toLowerCase()) || r.poId.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((r: any) => (
                    <tr 
                      key={r._id} 
                      onClick={() => setSelectedGrnDetails(r)}
                      className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-4 font-bold text-slate-900">GRN-{r._id.substring(18).toUpperCase()}</td>
                      <td className="px-6 py-4 flex items-center gap-2 text-slate-600 mt-1.5">
                         <Calendar size={14} className="text-slate-400" />
                         {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-6 py-4 text-slate-800 font-semibold">PO-{r.poId.substring(18).toUpperCase()}</td>
                      <td className="px-6 py-4 text-slate-800">{r.receivedBy}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-700">{r.items?.length || 0}</td>
                      <td className="px-6 py-4 text-right font-bold text-[#0057cd]">{r.totalAmount?.toLocaleString("vi-VN")}đ</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex px-2.5 py-1 rounded-full border text-[11px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 group-hover:text-[#0057cd] transition-colors p-1">
                          <ChevronRight size={18} />
                        </button>
                      </td>
                    </tr>
                ))}
                {goodsReceiptNotes.length === 0 && (
                  <tr>
                     <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                        Chưa có phiếu nhập kho nào.
                     </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            // PO LIST TABLE
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Mã Đơn Hàng PO</th>
                  <th className="px-6 py-4">Ngày Tạo</th>
                  <th className="px-6 py-4">Nhà Cung Cấp</th>
                  <th className="px-6 py-4 text-center">Số Loại Thuốc</th>
                  <th className="px-6 py-4 text-right">Tổng Tiền</th>
                  <th className="px-6 py-4 text-center">Trạng Thái</th>
                  <th className="px-6 py-4">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseOrders
                  .filter(r => r._id.toLowerCase().includes(searchQuery.toLowerCase()) || getSupplierName(r.supplierId).toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((r: any) => (
                    <tr key={r._id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4 font-bold text-slate-900">PO-{r._id.substring(18).toUpperCase()}</td>
                      <td className="px-6 py-4 flex items-center gap-2 text-slate-600 mt-1.5">
                         <Calendar size={14} className="text-slate-400" />
                         {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-6 py-4 text-slate-800 font-medium">{getSupplierName(r.supplierId)}</td>
                      <td className="px-6 py-4 text-center font-bold text-slate-700">{r.items?.length || 0}</td>
                      <td className="px-6 py-4 text-right font-bold text-[#0057cd]">{r.totalAmount?.toLocaleString("vi-VN")}đ</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-bold ${
                          r.status === "COMPLETED" 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : r.status === "PENDING"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {r.status === "PENDING" ? (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPoForReceipt(r);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all"
                          >
                            Nhận hàng
                          </button>
                        ) : (
                          <button 
                            onClick={() => setSelectedPoDetails(r)}
                            className="text-[#0057cd] text-xs font-bold hover:underline"
                          >
                            Xem chi tiết
                          </button>
                        )}
                      </td>
                    </tr>
                ))}
                {purchaseOrders.length === 0 && (
                  <tr>
                     <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        Chưa có đơn đặt hàng (PO) nào.
                     </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* RENDER GOODS RECEIPT NOTE (GRN) CREATION MODAL */}
      <AnimatePresence>
        {selectedPoForReceipt && (
          <GoodsReceiptModal
            po={selectedPoForReceipt}
            getMedicineName={getMedicineName}
            onClose={() => setSelectedPoForReceipt(null)}
            onSuccess={() => {
              setSelectedPoForReceipt(null);
              fetchData();
            }}
          />
        )}
      </AnimatePresence>

      {/* GRN DETAILS MODAL */}
      <AnimatePresence>
        {selectedGrnDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedGrnDetails(null)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#f2f3ff]">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Chi tiết Phiếu Nhập Kho</h3>
                  <p className="text-xs text-[#0057cd] font-bold mt-1">Mã GRN: GRN-{selectedGrnDetails._id.toUpperCase()}</p>
                </div>
                <button onClick={() => setSelectedGrnDetails(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 font-bold block text-xs uppercase">Đơn đặt hàng liên kết:</span>
                    <span className="font-bold text-slate-800">PO-{selectedGrnDetails.poId.substring(18).toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-xs uppercase">Người nhận hàng:</span>
                    <span className="font-semibold text-slate-800">{selectedGrnDetails.receivedBy}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-xs uppercase">Ngày nhập kho:</span>
                    <span className="font-semibold text-slate-800">{new Date(selectedGrnDetails.createdAt).toLocaleString("vi-VN")}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-xs uppercase">Tổng tiền thanh toán:</span>
                    <span className="font-black text-[#0057cd]">{selectedGrnDetails.totalAmount?.toLocaleString("vi-VN")}đ</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2">
                    <Package size={16} className="text-[#0057cd]" />
                    Danh sách sản phẩm thực nhận:
                  </h4>
                  <table className="w-full text-xs text-left border border-slate-100 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 text-slate-600 font-bold">
                      <tr>
                        <th className="p-3">Tên thuốc</th>
                        <th className="p-3">Số Lô (Batch)</th>
                        <th className="p-3">Hạn sử dụng</th>
                        <th className="p-3 text-right">Số lượng nhận</th>
                        <th className="p-3 text-right">Đơn giá</th>
                        <th className="p-3 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedGrnDetails.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-800">{getMedicineName(item.medicineId)}</td>
                          <td className="p-3"><span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold border border-amber-200 rounded">{item.batchNo}</span></td>
                          <td className="p-3 font-medium text-slate-600">{new Date(item.expDate).toLocaleDateString("vi-VN")}</td>
                          <td className="p-3 text-right font-bold text-slate-800">{item.quantity}</td>
                          <td className="p-3 text-right text-slate-600">{item.unitPrice?.toLocaleString("vi-VN")}đ</td>
                          <td className="p-3 text-right font-bold text-[#0057cd]">{(item.quantity * item.unitPrice)?.toLocaleString("vi-VN")}đ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PO DETAILS MODAL */}
      <AnimatePresence>
        {selectedPoDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedPoDetails(null)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-[#f2f3ff]">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Chi tiết Đơn đặt hàng PO</h3>
                  <p className="text-xs text-[#0057cd] font-bold mt-1">Mã PO: PO-{selectedPoDetails._id.toUpperCase()}</p>
                </div>
                <button onClick={() => setSelectedPoDetails(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-500 font-bold block text-xs uppercase">Nhà cung cấp:</span>
                    <span className="font-bold text-slate-800">{getSupplierName(selectedPoDetails.supplierId)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-xs uppercase">Người tạo đơn:</span>
                    <span className="font-semibold text-slate-800">{selectedPoDetails.createdBy || "Hệ thống"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-xs uppercase">Ngày lập đơn:</span>
                    <span className="font-semibold text-slate-800">{new Date(selectedPoDetails.createdAt).toLocaleString("vi-VN")}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-xs uppercase">Trạng thái:</span>
                    <span className="font-black text-emerald-700 uppercase">{selectedPoDetails.status}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2">
                    <Package size={16} className="text-[#0057cd]" />
                    Sản phẩm trong đơn:
                  </h4>
                  <table className="w-full text-xs text-left border border-slate-100 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 text-slate-600 font-bold">
                      <tr>
                        <th className="p-3">Tên thuốc</th>
                        <th className="p-3 text-right">Số lượng đặt</th>
                        <th className="p-3 text-right">Đơn giá đặt</th>
                        <th className="p-3 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPoDetails.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-800">{getMedicineName(item.medicineId)}</td>
                          <td className="p-3 text-right font-bold text-slate-800">{item.quantity}</td>
                          <td className="p-3 text-right text-slate-600">{item.unitPrice?.toLocaleString("vi-VN")}đ</td>
                          <td className="p-3 text-right font-bold text-[#0057cd]">{(item.quantity * item.unitPrice)?.toLocaleString("vi-VN")}đ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// FULL GOODS RECEIPT INPUT FORM IN MODAL
function GoodsReceiptModal({ po, getMedicineName, onClose, onSuccess }: { po: any; getMedicineName: (id: string) => string; onClose: () => void; onSuccess: () => void }) {
  const [itemsData, setItemsData] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form with PO items
  useEffect(() => {
    if (po && po.items) {
      setItemsData(
        po.items.map((it: any) => ({
          medicineId: it.medicineId,
          batchNo: "",
          expDate: "",
          quantity: it.quantity, // Pre-fill with order quantity
          maxQuantity: it.quantity, // Save original to validate
          unitPrice: it.unitPrice
        }))
      );
    }
  }, [po]);

  const handleItemFieldChange = (index: number, field: string, value: any) => {
    const updated = [...itemsData];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setItemsData(updated);
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    
    // Validate inputs
    for (let i = 0; i < itemsData.length; i++) {
      const it = itemsData[i];
      if (!it.batchNo.trim()) {
        setErrorMessage(`Vui lòng điền số lô cho thuốc "${getMedicineName(it.medicineId)}".`);
        return;
      }
      if (!it.expDate) {
        setErrorMessage(`Vui lòng chọn hạn sử dụng cho thuốc "${getMedicineName(it.medicineId)}".`);
        return;
      }
      if (new Date(it.expDate) <= new Date()) {
        setErrorMessage(`Hạn sử dụng của thuốc "${getMedicineName(it.medicineId)}" phải lớn hơn ngày hiện tại.`);
        return;
      }
      if (it.quantity <= 0) {
        setErrorMessage(`Số lượng thực nhận của thuốc "${getMedicineName(it.medicineId)}" phải lớn hơn 0.`);
        return;
      }
      if (it.quantity > it.maxQuantity) {
        setErrorMessage(`Số lượng thực nhận cho thuốc "${getMedicineName(it.medicineId)}" (${it.quantity}) vượt quá số lượng đặt hàng (${it.maxQuantity})!`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/goods-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poId: po._id,
          receivedBy: "Thủ kho chính",
          items: itemsData.map(it => ({
            medicineId: it.medicineId,
            batchNo: it.batchNo,
            expDate: new Date(it.expDate).toISOString(),
            quantity: Number(it.quantity),
            unitPrice: it.unitPrice
          }))
        })
      });

      const resData = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        setErrorMessage(resData.message || "Tạo phiếu nhập kho thất bại. Lỗi từ máy chủ.");
      }
    } catch (e) {
      setErrorMessage("Lỗi kết nối mạng, vui lòng thử lại.");
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
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Xác Nhận Nhận Hàng & Nhập Kho</h2>
              <p className="text-xs font-bold text-emerald-800">Từ đơn đặt hàng: PO-{po._id.substring(18).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto bg-slate-50/50 space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Nhập số lô, hạn sử dụng và số lượng thực nhận từ nhà cung cấp cho mỗi sản phẩm:
          </p>

          <div className="space-y-4">
            {itemsData.map((item, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-1">
                  <label className="text-xs font-bold text-slate-500 block mb-1">TÊN SẢN PHẨM</label>
                  <span className="font-bold text-slate-800 text-sm leading-tight block">{getMedicineName(item.medicineId)}</span>
                  <span className="text-[11px] text-[#0057cd] font-bold block mt-1">Đơn giá: {item.unitPrice?.toLocaleString("vi-VN")}đ</span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">SỐ LÔ (BATCH NO)*</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: LOT-2026A"
                    value={item.batchNo}
                    onChange={(e) => handleItemFieldChange(idx, "batchNo", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">HẠN SỬ DỤNG*</label>
                  <input
                    type="date"
                    required
                    value={item.expDate}
                    onChange={(e) => handleItemFieldChange(idx, "expDate", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-500 block">THỰC NHẬN*</label>
                    <span className="text-[10px] font-bold text-slate-400">Đơn đặt: {item.maxQuantity}</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={item.maxQuantity}
                    required
                    value={item.quantity}
                    onChange={(e) => handleItemFieldChange(idx, "quantity", Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            ))}
          </div>

          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-bold flex items-start gap-2"
            >
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-3">
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Đang lưu kho...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Xác nhận nhận hàng & Nhập kho
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
