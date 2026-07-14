import { useState, useEffect, useRef } from "react";
import {
  Search, RotateCcw, ArrowLeftRight, CheckCircle2, XCircle, AlertTriangle, Printer,
  Plus, Minus, Trash2, User, Phone, Calendar, DollarSign, X, RefreshCw, FileText, ChevronRight
} from "lucide-react";
import { orderService } from "../../../services/sales/order.service";
import { medicineService } from "../../../services/inventory/medicine.service";
function getBranchInfoFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return { branchId: null, fullName: null };
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
      branchId: decoded.branchId,
      fullName: decoded.fullName
    };
  } catch (err) {
    return { branchId: null, fullName: null };
  }
}

interface ReturnsViewProps {
  showToast: (message: string, type?: "success" | "error" | "warning") => void;
}

export default function ReturnsView({ showToast }: ReturnsViewProps) {
  // --- States for Orders List & Filters ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL"); // "ALL" | "RETAIL" | "PRESCRIPTION" | "WHOLESALE"
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // --- Right Panel Detail Tabs ---
  const [activeSubTab, setActiveSubTab] = useState<"DETAILS" | "RETURN" | "EXCHANGE">("DETAILS");

  // --- Process Return Form States ---
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [returnReasons, setReturnReasons] = useState<Record<string, string>>({});
  const [returnRemarks, setReturnRemarks] = useState("");
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // --- Process Exchange Form States ---
  const [exchangeCart, setExchangeCart] = useState<any[]>([]);
  const [medicineSearchQuery, setMedicineSearchQuery] = useState("");
  const [medicineSearchResults, setMedicineSearchResults] = useState<any[]>([]);
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  const [isSubmittingExchange, setIsSubmittingExchange] = useState(false);

  // --- Invoice & Printing Modal States ---
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [invoiceType, setInvoiceType] = useState<"RETURN" | "EXCHANGE">("RETURN");

  // --- Fetch Sales Orders ---
  const fetchSalesOrders = async () => {
    setLoadingOrders(true);
    try {
      const typeParam = selectedType === "ALL" ? undefined : selectedType;
      const data = await orderService.listSalesOrders(searchQuery || undefined, typeParam);
      setSalesOrders(data || []);
    } catch (err: any) {
      showToast(err.message || "Lỗi khi lấy danh sách đơn bán hàng", "error");
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch orders with debounce on search query or immediately on type change
  useEffect(() => {
    const delay = setTimeout(() => {
      fetchSalesOrders();
    }, 300);
    return () => clearTimeout(delay);
  }, [searchQuery, selectedType]);

  // Reset forms when selected order changes
  useEffect(() => {
    if (selectedOrder) {
      const initialQuantities: Record<string, number> = {};
      const initialReasons: Record<string, string> = {};
      selectedOrder.items.forEach((item: any) => {
        initialQuantities[item.medicineId] = 0;
        initialReasons[item.medicineId] = "CHANGE_OF_MIND";
      });
      setReturnQuantities(initialQuantities);
      setReturnReasons(initialReasons);
      setReturnRemarks("");
      setExchangeCart([]);
      setMedicineSearchQuery("");
      setMedicineSearchResults([]);
      setActiveSubTab("DETAILS");
    }
  }, [selectedOrder]);

  // --- Medicine Search for Exchange ---
  useEffect(() => {
    if (medicineSearchQuery.trim().length === 0) {
      setMedicineSearchResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      setLoadingMedicines(true);
      try {
        const { branchId } = getBranchInfoFromToken();
        const data = await medicineService.getMedicines({ limit: 10, search: medicineSearchQuery, branchId: branchId || undefined });
        setMedicineSearchResults(data.data || []);
      } catch (err) {
        console.error("Lỗi khi tìm kiếm thuốc đổi:", err);
      } finally {
        setLoadingMedicines(false);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [medicineSearchQuery]);

  // --- Actions ---
  const handleSelectOrder = (order: any) => {
    setSelectedOrder(order);
  };

  const handleQtyChange = (medicineId: string, value: number, max: number) => {
    const safeValue = Math.max(0, Math.min(max, value));
    setReturnQuantities(prev => ({ ...prev, [medicineId]: safeValue }));
  };

  const handleReasonChange = (medicineId: string, reason: string) => {
    setReturnReasons(prev => ({ ...prev, [medicineId]: reason }));
  };

  const addToExchangeCart = (med: any) => {
    const medId = med.id || med._id;
    const existing = exchangeCart.find(it => (it.id || it._id) === medId);
    if (existing) {
      if (existing.quantity >= med.stock) {
        showToast("Đã vượt quá số lượng tồn kho khả dụng để đổi!", "warning");
        return;
      }
      setExchangeCart(exchangeCart.map(it => (it.id || it._id) === medId ? { ...it, quantity: it.quantity + 1 } : it));
    } else {
      if (med.stock <= 0) {
        showToast("Thuốc này đã hết hàng khả dụng trong kho!", "error");
        return;
      }
      setExchangeCart([...exchangeCart, { ...med, id: medId, quantity: 1 }]);
    }
    setMedicineSearchQuery("");
    setMedicineSearchResults([]);
  };

  const updateExchangeCartQty = (id: string, change: number, maxStock: number) => {
    const item = exchangeCart.find(it => (it.id || it._id) === id);
    if (!item) return;
    const newQty = item.quantity + change;
    if (newQty <= 0) {
      setExchangeCart(exchangeCart.filter(it => (it.id || it._id) !== id));
    } else {
      if (newQty > maxStock) {
        showToast("Số lượng vượt quá tồn kho khả dụng!", "warning");
        return;
      }
      setExchangeCart(exchangeCart.map(it => (it.id || it._id) === id ? { ...it, quantity: newQty } : it));
    }
  };

  const removeFromExchangeCart = (id: string) => {
    setExchangeCart(exchangeCart.filter(it => (it.id || it._id) !== id));
  };

  // --- Financial Calculations for exchange ---
  const totalReturnedValue = selectedOrder
    ? selectedOrder.items.reduce((sum: number, item: any) => {
        const qty = returnQuantities[item.medicineId] || 0;
        return sum + qty * (item.price || 0);
      }, 0)
    : 0;

  const totalExchangeValue = exchangeCart.reduce((sum, item) => sum + item.quantity * (item.price || 50000), 0);
  const netDifference = totalExchangeValue - totalReturnedValue;

  // --- Submit Return ---
  const handleSubmitReturn = async () => {
    if (!selectedOrder) return;
    
    const itemsToReturn = Object.entries(returnQuantities)
      .filter(([_, qty]) => (qty as number) > 0)
      .map(([medId, qty]) => ({
        medicineId: medId,
        quantity: qty as number,
        reason: returnReasons[medId] || "CHANGE_OF_MIND"
      }));

    if (itemsToReturn.length === 0) {
      showToast("Vui lòng chọn ít nhất một sản phẩm với số lượng lớn hơn 0 để trả!", "warning");
      return;
    }

    setIsSubmittingReturn(true);
    try {
      const payload = {
        salesOrderId: selectedOrder._id,
        items: itemsToReturn,
        soldBy: selectedOrder.soldBy || "Dược sĩ"
      };

      const result = await orderService.processReturn(payload);
      if (result.success) {
        showToast("Xử lý trả hàng thành công!", "success");
        setInvoiceData(result.data);
        setInvoiceType("RETURN");
        setShowInvoiceModal(true);
        // Refresh orders & clear selected
        await fetchSalesOrders();
        setSelectedOrder(null);
      }
    } catch (err: any) {
      showToast(err.message || "Lỗi khi xử lý trả hàng", "error");
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // --- Submit Exchange ---
  const handleSubmitExchange = async () => {
    if (!selectedOrder) return;

    const returnedItems = Object.entries(returnQuantities)
      .filter(([_, qty]) => (qty as number) > 0)
      .map(([medId, qty]) => ({
        medicineId: medId,
        quantity: qty as number,
        reason: returnReasons[medId] || "CHANGE_OF_MIND"
      }));

    if (returnedItems.length === 0) {
      showToast("Vui lòng chọn ít nhất một sản phẩm trả để thực hiện đổi hàng!", "warning");
      return;
    }

    if (exchangeCart.length === 0) {
      showToast("Vui lòng thêm ít nhất một sản phẩm thay thế để thực hiện đổi hàng!", "warning");
      return;
    }

    setIsSubmittingExchange(true);
    try {
      const payload = {
        salesOrderId: selectedOrder._id,
        returnedItems,
        newItems: exchangeCart.map(it => ({
          medicineId: it.id || it._id,
          quantity: it.quantity
        })),
        soldBy: selectedOrder.soldBy || "Dược sĩ"
      };

      const result = await orderService.processExchange(payload);
      if (result.success) {
        showToast("Xử lý đổi hàng thành công!", "success");
        setInvoiceData(result.data);
        setInvoiceType("EXCHANGE");
        setShowInvoiceModal(true);
        // Refresh orders & clear selected
        await fetchSalesOrders();
        setSelectedOrder(null);
      }
    } catch (err: any) {
      showToast(err.message || "Lỗi khi xử lý đổi hàng", "error");
    } finally {
      setIsSubmittingExchange(false);
    }
  };

  return (
    <div className="h-full flex flex-col xl:flex-row gap-6 relative">
      {/* ========================================================
       * LEFT COLUMN: SALES ORDERS HISTORY
       * ======================================================== */}
      <div className="w-full xl:w-[420px] flex flex-col bg-white border border-slate-200 rounded-3xl p-6 shadow-sm shrink-0 h-full overflow-hidden">
        <h3 className="text-md font-black text-slate-900 mb-4 uppercase tracking-wide flex items-center gap-2">
          <RotateCcw className="text-[#0057cd]" size={18} /> Lịch sử hóa đơn bán hàng
        </h3>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Tìm theo ID hóa đơn, SĐT hoặc Tên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0057cd] transition-all"
          />
        </div>

        {/* Sales Type Filters */}
        <div className="grid grid-cols-4 bg-slate-100 p-1 rounded-xl gap-1 mb-4">
          {[
            { key: "ALL", label: "Tất cả" },
            { key: "RETAIL", label: "Bán lẻ" },
            { key: "PRESCRIPTION", label: "Kê đơn" },
            { key: "WHOLESALE", label: "Bán sỉ" }
          ].map((type) => (
            <button
              key={type.key}
              onClick={() => setSelectedType(type.key)}
              className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${
                selectedType === type.key
                  ? "bg-white text-[#0057cd] shadow-sm font-black"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
          {loadingOrders ? (
            <div className="h-40 flex items-center justify-center text-slate-400 text-xs font-bold gap-2">
              <RefreshCw className="animate-spin" size={16} /> Đang tải hóa đơn...
            </div>
          ) : salesOrders.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl p-4">
              <FileText className="text-slate-300 mb-2" size={32} />
              <p className="text-xs font-bold">Không tìm thấy hóa đơn nào</p>
              <p className="text-[10px] text-slate-400 mt-1">Thử thay đổi từ khóa hoặc bộ lọc</p>
            </div>
          ) : (
            salesOrders.map((order) => {
              const hasReturns = order.returns && order.returns.length > 0;
              const hasExchanges = order.exchanges && order.exchanges.length > 0;
              return (
                <div
                  key={order._id}
                  onClick={() => handleSelectOrder(order)}
                  className={`p-4 border rounded-2xl cursor-pointer transition-all hover:bg-slate-50 relative ${
                    selectedOrder?._id === order._id
                      ? "border-[#0057cd] bg-blue-50/20 shadow-sm"
                      : "border-slate-100 bg-white"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] font-black text-slate-900 font-mono tracking-wider">
                      #{order._id.substring(order._id.length - 8).toUpperCase()}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        order.type === "RETAIL"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : order.type === "PRESCRIPTION"
                          ? "bg-blue-50 text-blue-700 border border-blue-100"
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}
                    >
                      {order.type}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-slate-400" />
                      <span className="font-bold">{order.patientName || "Khách lẻ vãng lai"}</span>
                    </div>
                    {order.patientPhone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} className="text-slate-400" />
                        <span className="font-semibold">{order.patientPhone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-slate-400" />
                      <span>{new Date(order.createdAt).toLocaleString("vi-VN")}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-100 pt-2.5">
                    <span className="text-[10px] text-slate-400 font-bold">Tổng tiền:</span>
                    <span className="text-xs font-black text-[#0057cd]">
                      {order.totalAmount.toLocaleString()}₫
                    </span>
                  </div>

                  {/* Return/Exchange Badge indicators */}
                  {(hasReturns || hasExchanges) && (
                    <div className="absolute top-2 right-24 flex gap-1">
                      {hasReturns && (
                        <span className="bg-rose-50 border border-rose-100 text-rose-700 font-black uppercase tracking-wider text-[8px] px-1.5 py-0.5 rounded">
                          Đã Trả
                        </span>
                      )}
                      {hasExchanges && (
                        <span className="bg-purple-50 border border-purple-100 text-purple-700 font-black uppercase tracking-wider text-[8px] px-1.5 py-0.5 rounded">
                          Đã Đổi
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================
       * RIGHT COLUMN: DETAILS, RETURN & EXCHANGE PANELS
       * ======================================================== */}
      <div className="flex-1 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col h-full overflow-hidden">
        {!selectedOrder ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/30">
            <div className="p-4 bg-blue-50 text-[#0057cd] rounded-full mb-4 animate-pulse">
              <ArrowLeftRight size={32} />
            </div>
            <h3 className="text-md font-black text-slate-800 uppercase tracking-wide">
              Xử lý đổi trả hàng & xem chi tiết
            </h3>
            <p className="text-slate-500 text-xs max-w-sm mt-2 font-medium">
              Vui lòng chọn một hóa đơn bán hàng bên cột trái để tiến hành xem chi tiết, hoàn trả sản phẩm lỗi hoặc đổi sang sản phẩm mới.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header info */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-black text-slate-900 font-mono">
                    HÓA ĐƠN #{selectedOrder._id.toUpperCase()}
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      selectedOrder.type === "RETAIL"
                        ? "bg-emerald-100 text-emerald-800"
                        : selectedOrder.type === "PRESCRIPTION"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {selectedOrder.type}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  Khách hàng: <span className="font-bold text-slate-700">{selectedOrder.patientName || "Khách lẻ vãng lai"}</span>
                  {selectedOrder.patientPhone && ` - SĐT: ${selectedOrder.patientPhone}`}
                </p>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Sub-tab navigation */}
            <div className="px-6 border-b border-slate-100 flex gap-4 shrink-0 bg-white">
              {[
                { key: "DETAILS", label: "Chi tiết & Lịch sử" },
                { key: "RETURN", label: "Hoàn trả hàng" },
                { key: "EXCHANGE", label: "Đổi hàng mới" }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveSubTab(tab.key as any)}
                  className={`py-3.5 border-b-2 text-xs font-black uppercase tracking-wider transition-all ${
                    activeSubTab === tab.key
                      ? "border-[#0057cd] text-[#0057cd]"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENTS */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {/* ========================================================
               * 1. TAB: DETAILS & HISTORY
               * ======================================================== */}
              {activeSubTab === "DETAILS" && (
                <div className="space-y-6">
                  {/* Summary row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ngày mua</p>
                      <p className="text-xs font-black text-slate-800 mt-1">
                        {new Date(selectedOrder.createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hình thức</p>
                      <p className="text-xs font-black text-[#0057cd] mt-1 uppercase">
                        {selectedOrder.paymentMethod}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nhân viên bán</p>
                      <p className="text-xs font-black text-slate-800 mt-1">
                        {selectedOrder.soldBy || "Dược sĩ"}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng giá trị</p>
                      <p className="text-xs font-black text-emerald-600 mt-1">
                        {selectedOrder.totalAmount.toLocaleString()}₫
                      </p>
                    </div>
                  </div>

                  {/* Items list */}
                  <div>
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Danh sách sản phẩm đã mua</h5>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider border-b border-slate-200">
                            <th className="p-4">Tên thuốc</th>
                            <th className="p-4 text-center">Đơn giá</th>
                            <th className="p-4 text-center">Số lượng</th>
                            <th className="p-4 text-center">Đã trả</th>
                            <th className="p-4 text-right">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {selectedOrder.items.map((item: any) => (
                            <tr key={item.medicineId} className="hover:bg-slate-50/50">
                              <td className="p-4 font-bold text-slate-800">
                                <div>{item.name}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                  Lô: {item.batches?.map((b: any) => `${b.batchNo} (${b.quantity} ${item.unit})`).join(", ") || "N/A"}
                                </div>
                              </td>
                              <td className="p-4 text-center font-semibold text-slate-600">{item.price.toLocaleString()}₫</td>
                              <td className="p-4 text-center font-bold text-slate-700">
                                {item.quantity} <span className="text-[10px] text-slate-400">{item.unit}</span>
                              </td>
                              <td className="p-4 text-center font-bold text-rose-600">
                                {item.returnedQuantity || 0}
                              </td>
                              <td className="p-4 text-right font-black text-slate-900">
                                {(item.price * item.quantity).toLocaleString()}₫
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Return Logs History */}
                  {(selectedOrder.returns?.length > 0 || selectedOrder.exchanges?.length > 0) && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Lịch sử giao dịch đổi trả</h5>
                      <div className="space-y-3">
                        {/* Return Entries */}
                        {selectedOrder.returns?.map((ret: any, index: number) => (
                          <div key={index} className="p-4 bg-rose-50/20 border border-rose-100 rounded-2xl flex flex-col gap-2">
                            <div className="flex justify-between items-center text-xs font-bold text-rose-800">
                              <span className="flex items-center gap-1.5 uppercase tracking-wide">
                                <RotateCcw size={14} /> Giao dịch Trả hàng #{index + 1}
                              </span>
                              <span>{new Date(ret.returnedAt).toLocaleString("vi-VN")}</span>
                            </div>
                            <div className="text-[11px] text-slate-600">
                              Người xử lý: <span className="font-semibold text-slate-800">{ret.soldBy}</span>
                            </div>
                            <div className="space-y-1 mt-1 pl-3 border-l border-rose-200">
                              {ret.items.map((it: any, itIdx: number) => (
                                <div key={itIdx} className="text-xs text-slate-700 flex justify-between font-medium">
                                  <span>
                                    {it.name} <span className="text-[10px] text-slate-400">({it.quantity} {it.unit})</span>
                                  </span>
                                  <span className="text-rose-600 font-bold">
                                    Lý do: {it.reason === "CHANGE_OF_MIND" ? "Thay đổi ý định (Hoàn kho)" : "Hàng hỏng/Lỗi (Hủy)"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {/* Exchange Entries */}
                        {selectedOrder.exchanges?.map((exch: any, index: number) => (
                          <div key={index} className="p-4 bg-purple-50/20 border border-purple-100 rounded-2xl flex flex-col gap-2.5">
                            <div className="flex justify-between items-center text-xs font-bold text-purple-800">
                              <span className="flex items-center gap-1.5 uppercase tracking-wide">
                                <ArrowLeftRight size={14} /> Giao dịch Đổi hàng #{index + 1}
                              </span>
                              <span>{new Date(exch.exchangedAt).toLocaleString("vi-VN")}</span>
                            </div>
                            <div className="text-[11px] text-slate-600">
                              Người xử lý: <span className="font-semibold text-slate-800">{exch.soldBy}</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                              {/* Returned side */}
                              <div className="pl-3 border-l border-rose-200">
                                <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider mb-1">Hàng trả lại</div>
                                <div className="space-y-1">
                                  {exch.returnedItems.map((it: any, itIdx: number) => (
                                    <div key={itIdx} className="text-xs text-slate-700 font-medium">
                                      {it.name} <span className="text-[10px] text-rose-600">({it.quantity} {it.unit})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {/* Exchange side */}
                              <div className="pl-3 border-l border-emerald-200">
                                <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">Hàng lấy mới</div>
                                <div className="space-y-1">
                                  {exch.newItems.map((it: any, itIdx: number) => (
                                    <div key={itIdx} className="text-xs text-slate-700 font-medium">
                                      {it.name} <span className="text-[10px] text-emerald-600">({it.quantity} {it.unit})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================
               * 2. TAB: PROCESS RETURN
               * ======================================================== */}
              {activeSubTab === "RETURN" && (
                <div className="space-y-6">
                  <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl text-xs text-slate-700 leading-relaxed font-semibold">
                    <p className="flex items-center gap-1.5 text-[#0057cd] font-black uppercase mb-1">
                      <AlertTriangle size={14} /> Quy trình hoàn trả thuốc:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 font-medium mt-1.5 text-slate-600">
                      <li>Nhập số lượng cần trả của từng thuốc ở danh sách dưới.</li>
                      <li>Chọn lý do tương ứng: <span className="font-bold text-slate-800">"Thay đổi ý định"</span> (Hệ thống sẽ hoàn lại số lượng vào các lô tương ứng) hoặc <span className="font-bold text-slate-800">"Hàng hỏng / Hủy"</span> (Hệ thống sẽ ghi nhận hủy và không hoàn kho).</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    {selectedOrder.items.map((item: any) => {
                      const maxReturnable = item.quantity - (item.returnedQuantity || 0);
                      const currentVal = returnQuantities[item.medicineId] || 0;

                      return (
                        <div
                          key={item.medicineId}
                          className={`p-4 border rounded-2xl flex flex-col gap-3 transition-all ${
                            currentVal > 0 ? "border-[#0057cd] bg-blue-50/10" : "border-slate-100 bg-white"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h6 className="text-xs font-black text-slate-800">{item.name}</h6>
                              <div className="text-[10px] text-slate-400 mt-1 font-bold">
                                Đã mua: {item.quantity} {item.unit} | Đã trả trước đó: {item.returnedQuantity || 0} {item.unit}
                              </div>
                            </div>
                            <span className="text-xs font-black text-slate-900 font-mono">
                              Đơn giá: {item.price.toLocaleString()}₫
                            </span>
                          </div>

                          {maxReturnable === 0 ? (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 py-1.5 px-3 rounded-lg text-center uppercase">
                              Đã trả hết số lượng đã mua
                            </span>
                          ) : (
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                              {/* Counter adjust */}
                              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleQtyChange(item.medicineId, currentVal - 1, maxReturnable)}
                                  className="p-2 bg-slate-50 text-slate-600 hover:bg-slate-100 focus:outline-none"
                                >
                                  <Minus size={14} />
                                </button>
                                <input
                                  type="number"
                                  value={currentVal}
                                  onChange={(e) => handleQtyChange(item.medicineId, parseInt(e.target.value) || 0, maxReturnable)}
                                  className="w-12 text-center text-xs font-black focus:outline-none border-x border-slate-200 py-1.5"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleQtyChange(item.medicineId, currentVal + 1, maxReturnable)}
                                  className="p-2 bg-slate-50 text-slate-600 hover:bg-slate-100 focus:outline-none"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>

                              {/* Reasons selection */}
                              {currentVal > 0 && (
                                <select
                                  value={returnReasons[item.medicineId] || "CHANGE_OF_MIND"}
                                  onChange={(e) => handleReasonChange(item.medicineId, e.target.value)}
                                  className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0057cd]"
                                >
                                  <option value="CHANGE_OF_MIND">Lý do: Thay đổi ý định (Hoàn kho)</option>
                                  <option value="DAMAGED_PRODUCT">Lý do: Hàng hỏng/Lỗi (Hủy kho)</option>
                                  <option value="EXPIRED_PRODUCT">Lý do: Hết hạn sử dụng (Hủy kho)</option>
                                  <option value="OTHER">Lý do: Khác</option>
                                </select>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Submission box */}
                  <div className="border-t border-slate-100 pt-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng tiền trả lại khách</p>
                      <p className="text-lg font-black text-rose-600 mt-1">
                        {totalReturnedValue.toLocaleString()}₫
                      </p>
                    </div>

                    <button
                      onClick={handleSubmitReturn}
                      disabled={totalReturnedValue === 0 || isSubmittingReturn}
                      className="bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl py-3 px-6 text-xs font-black uppercase tracking-wide flex items-center gap-2 shadow-sm transition-all"
                    >
                      {isSubmittingReturn ? (
                        <RefreshCw className="animate-spin" size={14} />
                      ) : (
                        <RotateCcw size={14} />
                      )}
                      XÁC NHẬN TRẢ HÀNG
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================
               * 3. TAB: PROCESS EXCHANGE
               * ======================================================== */}
              {activeSubTab === "EXCHANGE" && (
                <div className="space-y-6">
                  {/* Step 1: Returned Items selection */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Bước 1: Chọn sản phẩm trả lại</h5>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item: any) => {
                        const maxReturnable = item.quantity - (item.returnedQuantity || 0);
                        const currentVal = returnQuantities[item.medicineId] || 0;

                        return (
                          <div
                            key={item.medicineId}
                            className={`p-3 border rounded-xl flex flex-col gap-2.5 transition-all ${
                              currentVal > 0 ? "border-[#0057cd] bg-blue-50/5" : "border-slate-100 bg-white"
                            }`}
                          >
                            <div className="flex justify-between items-center text-xs font-bold">
                              <span className="text-slate-800 font-black">{item.name}</span>
                              <span className="text-slate-500 font-mono">
                                Có thể trả: {maxReturnable} {item.unit}
                              </span>
                            </div>

                            {maxReturnable > 0 && (
                              <div className="flex items-center gap-3">
                                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleQtyChange(item.medicineId, currentVal - 1, maxReturnable)}
                                    className="px-2 py-1 bg-slate-50 text-slate-600 hover:bg-slate-100"
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <input
                                    type="number"
                                    value={currentVal}
                                    onChange={(e) => handleQtyChange(item.medicineId, parseInt(e.target.value) || 0, maxReturnable)}
                                    className="w-10 text-center text-xs font-bold border-x border-slate-200 py-1 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleQtyChange(item.medicineId, currentVal + 1, maxReturnable)}
                                    className="px-2 py-1 bg-slate-50 text-slate-600 hover:bg-slate-100"
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>

                                {currentVal > 0 && (
                                  <select
                                    value={returnReasons[item.medicineId] || "CHANGE_OF_MIND"}
                                    onChange={(e) => handleReasonChange(item.medicineId, e.target.value)}
                                    className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 text-[11px] font-bold text-slate-600 focus:outline-none"
                                  >
                                    <option value="CHANGE_OF_MIND">Lý do: Thay đổi ý định (Hoàn kho)</option>
                                    <option value="DAMAGED_PRODUCT">Lý do: Hàng lỗi (Hủy kho)</option>
                                    <option value="EXPIRED_PRODUCT">Lý do: Cận HSD (Hủy kho)</option>
                                    <option value="OTHER">Lý do: Khác</option>
                                  </select>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: Search and add replacement medicines */}
                  <div className="space-y-3 pt-3 border-t border-slate-100 relative">
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Bước 2: Chọn sản phẩm đổi lấy mới</h5>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type="text"
                        placeholder="Tìm thuốc thay thế..."
                        value={medicineSearchQuery}
                        onChange={(e) => setMedicineSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold placeholder-slate-400 focus:outline-none focus:border-[#0057cd]"
                      />

                      {/* Search dropdown */}
                      {medicineSearchQuery && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 mt-1 max-h-56 overflow-y-auto custom-scrollbar">
                          {loadingMedicines ? (
                            <div className="p-4 text-center text-xs font-bold text-slate-400 gap-1.5 flex items-center justify-center">
                              <RefreshCw className="animate-spin" size={12} /> Đang tìm kiếm...
                            </div>
                          ) : medicineSearchResults.length === 0 ? (
                            <div className="p-4 text-center text-xs font-bold text-slate-400">
                              Không tìm thấy thuốc nào
                            </div>
                          ) : (
                            medicineSearchResults.map((med) => (
                              <div
                                key={med.id || med._id}
                                onClick={() => addToExchangeCart(med)}
                                className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0"
                              >
                                <div>
                                  <div className="text-xs font-black text-slate-800">{med.name}</div>
                                  <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                                    Tồn kho: {med.stock} {med.unit} | Giá sỉ/lẻ: {med.price.toLocaleString()}₫
                                  </div>
                                </div>
                                <button className="p-1.5 bg-blue-50 hover:bg-blue-100 text-[#0057cd] rounded-lg text-[10px] font-black uppercase">
                                  Chọn
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Exchange Cart list */}
                    {exchangeCart.length > 0 && (
                      <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/30">
                        <div className="divide-y divide-slate-100 bg-white">
                          {exchangeCart.map((item) => (
                            <div key={item.id || item._id} className="p-3 flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-bold text-slate-800 block truncate">{item.name}</span>
                                <span className="text-[10px] text-slate-400 font-bold font-mono">
                                  {item.price.toLocaleString()}₫/{item.unit}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                                  <button
                                    type="button"
                                    onClick={() => updateExchangeCartQty(item.id || item._id, -1, item.stock)}
                                    className="px-1.5 py-0.5 text-slate-500 hover:bg-slate-50"
                                  >
                                    <Minus size={10} />
                                  </button>
                                  <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                                  <button
                                    type="button"
                                    onClick={() => updateExchangeCartQty(item.id || item._id, 1, item.stock)}
                                    className="px-1.5 py-0.5 text-slate-500 hover:bg-slate-50"
                                  >
                                    <Plus size={10} />
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => removeFromExchangeCart(item.id || item._id)}
                                  className="text-slate-400 hover:text-rose-600 transition-all p-1"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Calculations & Submission */}
                  <div className="border-t border-slate-100 pt-5 space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-xs font-bold">
                      <div className="flex justify-between text-slate-500">
                        <span>Giá trị hàng trả lại:</span>
                        <span>-{totalReturnedValue.toLocaleString()}₫</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Giá trị hàng lấy mới:</span>
                        <span>+{totalExchangeValue.toLocaleString()}₫</span>
                      </div>
                      <div className="flex justify-between text-sm font-black border-t border-slate-200 pt-2 text-slate-900">
                        <span>Chênh lệch thanh toán:</span>
                        {netDifference > 0 ? (
                          <span className="text-[#0057cd]">Thu thêm khách: {netDifference.toLocaleString()}₫</span>
                        ) : netDifference < 0 ? (
                          <span className="text-rose-600">Hoàn tiền khách: {Math.abs(netDifference).toLocaleString()}₫</span>
                        ) : (
                          <span className="text-slate-600">Bằng giá (Chênh lệch: 0đ)</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleSubmitExchange}
                      disabled={totalReturnedValue === 0 || exchangeCart.length === 0 || isSubmittingExchange}
                      className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl py-4 shadow-sm transition-all flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wide"
                    >
                      {isSubmittingExchange ? (
                        <RefreshCw className="animate-spin" size={14} />
                      ) : (
                        <ArrowLeftRight size={14} />
                      )}
                      XÁC NHẬN ĐỔI HÀNG
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
       * 📄 INVOICE SUCCESS MODAL WITH PROFESSIONAL PRINT OPTION
       * ======================================================== */}
      {showInvoiceModal && invoiceData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col transform transition-all duration-300">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-900 text-md flex items-center gap-2 uppercase tracking-wide">
                <CheckCircle2 className="text-emerald-500" />
                {invoiceType === "RETURN" ? "GIAO DỊCH TRẢ HÀNG THÀNH CÔNG!" : "GIAO DỊCH ĐỔI HÀNG THÀNH CÔNG!"}
              </h3>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="text-slate-400 hover:text-slate-700 transition-all"
              >
                <XCircle size={22} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[70vh] scrollbar-hide">
              {/* Warnings if active */}
              {invoiceData.warnings && invoiceData.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">
                  <div className="font-bold text-xs flex items-center gap-1.5 uppercase mb-1">
                    <AlertTriangle size={14} /> Cảnh báo hạn dùng:
                  </div>
                  <ul className="list-disc pl-5 text-xs space-y-1 font-semibold">
                    {invoiceData.warnings.map((w: string, idx: number) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* PRINTABLE RECEIPT TEMPLATE */}
              <div
                id="print-receipt"
                className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 shadow-inner font-mono text-[12px] text-slate-800 flex flex-col gap-4"
              >
                <div className="text-center border-b border-slate-200 pb-3">
                  <div className="font-bold text-[14px] text-slate-900 uppercase">HỆ THỐNG NHÀ THUỐC WDP</div>
                  <div className="text-[10px] text-slate-500 mt-1">Đường 3/2, Quận Hải Châu, Đà Nẵng</div>
                  <div className="text-[10px] text-slate-500">SĐT: 0236 123 456</div>
                  <div className="font-bold text-slate-800 mt-3 text-xs uppercase">
                    {invoiceType === "RETURN" ? "BIÊN LAI TRẢ HÀNG" : "BIÊN LAI ĐỔI HÀNG"}
                  </div>
                </div>

                <div className="flex flex-col gap-1 border-b border-slate-200 pb-3">
                  <div className="flex justify-between">
                    <span>Mã hóa đơn:</span>
                    <span className="font-bold">#{invoiceData._id.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ngày thực hiện:</span>
                    <span>{new Date().toLocaleString("vi-VN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Khách hàng:</span>
                    <span>{invoiceData.patientName || "Khách vãng lai"}</span>
                  </div>
                  {invoiceData.patientPhone && (
                    <div className="flex justify-between">
                      <span>Số điện thoại:</span>
                      <span>{invoiceData.patientPhone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Nhân viên:</span>
                    <span className="font-bold">{invoiceData.soldBy || "Dược sĩ"}</span>
                  </div>
                </div>

                {/* Show Items depending on RETURN or EXCHANGE */}
                {invoiceType === "RETURN" ? (
                  <div>
                    <div className="font-bold border-b border-slate-200 pb-1 mb-2 uppercase text-[11px]">Sản phẩm hoàn trả</div>
                    <div className="space-y-2">
                      {invoiceData.returns?.[invoiceData.returns.length - 1]?.items.map((it: any) => (
                        <div key={it.medicineId} className="flex justify-between font-medium">
                          <span>
                            {it.name} ({it.quantity} {it.unit})
                          </span>
                          <span className="font-bold">{(it.price * it.quantity).toLocaleString()}₫</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="font-bold border-b border-slate-200 pb-1 mb-2 uppercase text-[11px] text-rose-700">Sản phẩm trả lại</div>
                      <div className="space-y-2">
                        {invoiceData.exchanges?.[invoiceData.exchanges.length - 1]?.returnedItems.map((it: any) => (
                          <div key={it.medicineId} className="flex justify-between font-medium">
                            <span>{it.name} ({it.quantity} {it.unit})</span>
                            <span className="font-bold">{(it.price * it.quantity).toLocaleString()}₫</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="font-bold border-b border-slate-200 pb-1 mb-2 uppercase text-[11px] text-emerald-700">Sản phẩm lấy mới</div>
                      <div className="space-y-2">
                        {invoiceData.exchanges?.[invoiceData.exchanges.length - 1]?.newItems.map((it: any) => (
                          <div key={it.medicineId} className="flex justify-between font-medium">
                            <span>{it.name} ({it.quantity} {it.unit})</span>
                            <span className="font-bold">{(it.price * it.quantity).toLocaleString()}₫</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-3 flex flex-col gap-1.5">
                  {invoiceType === "RETURN" ? (
                    <div className="flex justify-between font-black text-slate-900 text-xs border-t border-slate-200 pt-2">
                      <span>HOÀN TIỀN CHO KHÁCH:</span>
                      <span className="text-[#0057cd]">
                        {invoiceData.returns?.[invoiceData.returns.length - 1]?.items.reduce(
                          (acc: number, it: any) => acc + it.price * it.quantity, 0
                        ).toLocaleString()}₫
                      </span>
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const exchangeEntry = invoiceData.exchanges?.[invoiceData.exchanges.length - 1];
                        const retTotal = exchangeEntry?.returnedItems.reduce((acc: number, it: any) => acc + it.price * it.quantity, 0) || 0;
                        const newTotal = exchangeEntry?.totalNewItemsAmount || 0;
                        const diff = newTotal - retTotal;

                        return (
                          <>
                            <div className="flex justify-between text-slate-600">
                              <span>Giá trị hàng trả:</span>
                              <span>-{retTotal.toLocaleString()}₫</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>Giá trị hàng đổi:</span>
                              <span>+{newTotal.toLocaleString()}₫</span>
                            </div>
                            <div className="flex justify-between font-black text-slate-900 text-xs border-t border-slate-200 pt-2">
                              <span>
                                {diff > 0 ? "THU THÊM KHÁCH:" : diff < 0 ? "HOÀN LẠI KHÁCH:" : "CHÊNH LỆCH THANH TOÁN:"}
                              </span>
                              <span className={diff > 0 ? "text-[#0057cd]" : diff < 0 ? "text-rose-600" : "text-slate-600"}>
                                {Math.abs(diff).toLocaleString()}₫
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-slate-100 flex gap-3 bg-slate-50">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-[#0057cd] hover:bg-[#00419e] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow"
              >
                <Printer size={18} /> In biên lai đổi trả
              </button>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl"
              >
                Đóng / Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT RECEIPT STYLE */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-receipt, #print-receipt * {
            visibility: visible !important;
          }
          #print-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
