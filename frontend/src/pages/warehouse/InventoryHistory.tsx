import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Search, Filter, ArrowDownToLine, ArrowUpFromLine, Trash2,
  Calendar, FileText, Plus, ChevronRight, X, Package,
  Building, CheckCircle2, DollarSign, ListFilter, ClipboardCheck,
  AlertTriangle, Loader2, Image
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supplierService } from "../../services/purchase/supplier.service";
import { medicineService } from "../../services/inventory/medicine.service";
import { purchaseOrderService } from "../../services/purchase/purchaseOrder.service";
import { goodsReceiptService } from "../../services/purchase/goodsReceipt.service";
import api from "../../services/core/api";

interface InventoryHistoryProps {
  type: "import" | "export" | "dispose";
}

export function InventoryHistory({ type }: InventoryHistoryProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = location.pathname.includes('/admin');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSubTab = (searchParams.get("tab") as "grn" | "po") || "grn";
  const setActiveSubTabHandler = (tab: "grn" | "po") => setSearchParams({ tab });
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

  // Reject Delivery Modal state
  const [selectedPoForReject, setSelectedPoForReject] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  // Modal details view
  const [selectedGrnDetails, setSelectedGrnDetails] = useState<any | null>(null);
  const [selectedPoDetails, setSelectedPoDetails] = useState<any | null>(null);

  // UC-19 ERP states
  const [editGrnItems, setEditGrnItems] = useState<any[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [discrepancyReason, setDiscrepancyReason] = useState("");
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);
  const [selectedInspectionRecord, setSelectedInspectionRecord] = useState<any | null>(null);
  const [selectedMedicineNameForRecord, setSelectedMedicineNameForRecord] = useState("");
  const [recordLoading, setRecordLoading] = useState(false);

  const handleViewInspectionRecord = async (grnId: string, itemId: string, medName: string) => {
    setRecordLoading(true);
    setSelectedMedicineNameForRecord(medName);
    try {
      const res = await api.get(`/api/goods-receipts/${grnId}/items/${itemId}/inspection`);
      const body = res.data;
      if (body.success && body.data) {
        setSelectedInspectionRecord(body.data);
      } else {
        alert("Không tìm thấy dữ liệu ảnh đếm AI của dòng sản phẩm này.");
      }
    } catch (e) {
      alert("Lỗi khi tải dữ liệu ảnh đếm AI từ máy chủ.");
    } finally {
      setRecordLoading(false);
    }
  };

  useEffect(() => {
    setShowOnlyDifferences(false);
    if (selectedGrnDetails && (selectedGrnDetails.status === "DRAFT" || selectedGrnDetails.status === "INSPECTING")) {
      setEditGrnItems(
        selectedGrnDetails.items.map((it: any) => ({
          medicineId: it.medicineId,
          batchNo: it.batchNo || "",
          expDate: it.expDate ? it.expDate.substring(0, 10) : "",
          quantity: it.quantity,
          unitPrice: it.unitPrice
        }))
      );
    } else {
      setEditGrnItems([]);
    }
  }, [selectedGrnDetails]);

  useEffect(() => {
    // Fetch base lists to resolve IDs
    Promise.all([
      supplierService.getSuppliers().catch(() => []),
      medicineService.getMedicinesDropdown().catch(() => [])
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
          purchaseOrderService.getPurchaseOrders(),
          goodsReceiptService.getGoodsReceipts()
        ]);
        setPurchaseOrders(poRes);
        setGoodsReceiptNotes(grnRes);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Không thể tải danh sách dữ liệu nhập kho.");
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
  const themeClasses: Record<string, string> = {
    blue: "bg-[#0057cd] hover:bg-[#00419e] text-white",
    emerald: "bg-emerald-600 hover:bg-emerald-700 text-white",
    rose: "bg-rose-600 hover:bg-rose-700 text-white",
    blueLight: "text-[#0057cd] bg-[#f2f3ff]",
    emeraldLight: "text-emerald-700 bg-emerald-100",
    roseLight: "text-rose-700 bg-rose-100",
  };

  const getGrnStatusBadgeClass = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "INSPECTING":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "PENDING_APPROVAL":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "COMPLETED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-500 border-slate-200";
    }
  };

  const getGrnStatusLabel = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "Nháp";
      case "INSPECTING":
        return "Đang kiểm";
      case "PENDING_APPROVAL":
        return "Chờ duyệt";
      case "COMPLETED":
        return "Hoàn thành";
      case "CANCELLED":
        return "Đã hủy";
      default:
        return status;
    }
  };

  const handleCreate = () => {
    if (type === "import") {
      const basePath = location.pathname.endsWith("/") ? location.pathname : `${location.pathname}/`;
      navigate(`${basePath}new`);
    }
  };

  const handleRejectDelivery = async () => {
    if (!selectedPoForReject) return;
    setRejectLoading(true);
    setError(null);
    try {
      await api.post("/api/purchase-orders/reject-delivery", {
        poId: selectedPoForReject._id,
        reason: rejectReason,
      });
      setSelectedPoForReject(null);
      setRejectReason("");
      fetchData();
    } catch (err: any) {
      const errorResponse = err?.response?.data;
      setError(errorResponse?.message || err.message || "Từ chối nhận hàng thất bại.");
    } finally {
      setRejectLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedGrnDetails) return;
    setEditLoading(true);
    try {
      // Validate
      for (const it of editGrnItems) {
        if (!it.batchNo || !it.batchNo.trim()) {
          alert(`Số lô cho thuốc "${getMedicineName(it.medicineId)}" không được trống.`);
          setEditLoading(false);
          return;
        }
        if (!it.expDate) {
          alert(`Hạn sử dụng cho thuốc "${getMedicineName(it.medicineId)}" không được trống.`);
          setEditLoading(false);
          return;
        }
        if (it.quantity <= 0) {
          alert(`Số lượng dự kiến cho thuốc "${getMedicineName(it.medicineId)}" phải lớn hơn 0.`);
          setEditLoading(false);
          return;
        }
      }
      
      const payload = {
        items: editGrnItems.map(it => ({
          medicineId: it.medicineId,
          batchNo: it.batchNo,
          expDate: new Date(it.expDate).toISOString(),
          quantity: it.quantity
        }))
      };
      
      await goodsReceiptService.updateGoodsReceipt(selectedGrnDetails._id, payload);
      alert("Cập nhật tài liệu tiếp nhận thành công.");
      setSelectedGrnDetails(null);
      fetchData();
    } catch (err: any) {
      alert("Lỗi khi cập nhật tài liệu tiếp nhận: " + (err.response?.data?.message || err.message));
    } finally {
      setEditLoading(false);
    }
  };

  const handleApproveGRN = async () => {
    if (!selectedGrnDetails) return;
    
    // Check discrepancy
    let hasDiscrepancy = false;
    for (const item of selectedGrnDetails.items) {
      if (item.actualQty !== item.quantity) {
        hasDiscrepancy = true;
        break;
      }
    }
    if (hasDiscrepancy && !discrepancyReason.trim()) {
      alert("Phát hiện chênh lệch số lượng kiểm nhận. Vui lòng điền lý do chênh lệch trước khi phê duyệt.");
      return;
    }
    
    setApprovalLoading(true);
    try {
      await goodsReceiptService.approveGoodsReceipt(selectedGrnDetails._id, discrepancyReason);
      alert("Phê duyệt nhập kho thành công. Tồn kho đã được cập nhật.");
      setSelectedGrnDetails(null);
      setDiscrepancyReason("");
      fetchData();
    } catch (err: any) {
      alert("Lỗi khi phê duyệt: " + (err.response?.data?.message || err.message));
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleRejectGRN = async (action: "reinspect" | "cancel") => {
    if (!selectedGrnDetails) return;
    const rejectReasonPrompt = prompt("Vui lòng nhập lý do từ chối/yêu cầu hành động này:");
    if (rejectReasonPrompt === null) return; // cancelled prompt
    if (!rejectReasonPrompt.trim()) {
      alert("Lý do không được để trống.");
      return;
    }
    
    setApprovalLoading(true);
    try {
      await goodsReceiptService.rejectGoodsReceipt(selectedGrnDetails._id, action, rejectReasonPrompt);
      alert(action === "reinspect" ? "Đã yêu cầu kiểm đếm lại." : "Đã hủy phiếu tiếp nhận.");
      setSelectedGrnDetails(null);
      fetchData();
    } catch (err: any) {
      alert("Lỗi khi thực hiện từ chối: " + (err.response?.data?.message || err.message));
    } finally {
      setApprovalLoading(false);
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
            onClick={() => setActiveSubTabHandler("grn")}
            className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${activeSubTab === "grn"
                ? "border-[#0057cd] text-[#0057cd]"
                : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
          >
            <ClipboardCheck size={16} />
            Phiếu Nhập Kho (GRN)
          </button>
          <button
            onClick={() => setActiveSubTabHandler("po")}
            className={`px-4 py-2.5 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${activeSubTab === "po"
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
                        <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-bold ${getGrnStatusBadgeClass(r.status)}`}>
                          {getGrnStatusLabel(r.status)}
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
                        <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-bold ${r.status === "COMPLETED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : r.status === "SHIPPING"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : r.status === "RECEIVING"
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : r.status === "PENDING_APPROVAL"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : r.status === "PARTIAL_RECEIVED"
                                    ? "bg-orange-50 text-orange-700 border-orange-200"
                                    : r.status === "RETURNED"
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : "bg-slate-50 text-slate-500 border-slate-200"
                          }`}>
                          {r.status === "PARTIAL_RECEIVED" ? "Giao thiếu" : r.status === "SHIPPING" ? "Đang giao" : r.status === "RECEIVING" ? "Đang kiểm" : r.status === "PENDING_APPROVAL" ? "Chờ duyệt" : r.status === "COMPLETED" ? "Hoàn thành" : r.status === "RETURNED" ? "Trả hàng" : r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {(r.status === "SHIPPING" || r.status === "PARTIAL_RECEIVED") ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPoForReceipt(r);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                            >
                              <ClipboardCheck size={14} />
                              Mở phiên tiếp nhận hàng
                            </button>
                          </div>
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

      {/* REJECT DELIVERY MODAL */}
      <AnimatePresence>
        {selectedPoForReject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !rejectLoading && setSelectedPoForReject(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-rose-50">
                <div>
                  <h3 className="font-black text-rose-700 flex items-center gap-2">
                    <AlertTriangle size={18} />
                    Từ Chối Nhận Hàng
                  </h3>
                  <p className="text-xs text-rose-600 font-medium mt-1">PO-{selectedPoForReject._id.substring(18).toUpperCase()}</p>
                </div>
                <button
                  onClick={() => !rejectLoading && setSelectedPoForReject(null)}
                  className="p-1.5 text-rose-400 hover:text-rose-600 rounded-full hover:bg-rose-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Lý do từ chối</label>
                  <textarea
                    rows={3}
                    placeholder="Nhập lý do từ chối nhận lô hàng này..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedPoForReject(null)}
                  disabled={rejectLoading}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all text-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={handleRejectDelivery}
                  disabled={rejectLoading || !rejectReason.trim()}
                  className="px-5 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 rounded-xl transition-all shadow-sm flex items-center gap-2 text-sm"
                >
                  {rejectLoading && <Loader2 size={16} className="animate-spin" />}
                  Xác nhận từ chối
                </button>
              </div>
            </motion.div>
          </div>
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
                <div className="grid grid-cols-3 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200 font-medium">
                  <div>
                    <span className="text-slate-500 font-bold block text-xs uppercase mb-0.5">Đơn đặt hàng liên kết:</span>
                    <span className="font-bold text-slate-800">PO-{selectedGrnDetails.poId.substring(18).toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-xs uppercase mb-0.5">Người nhận hàng:</span>
                    <span className="font-semibold text-slate-800">{selectedGrnDetails.receivedBy}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-xs uppercase mb-0.5">Trạng thái phiếu:</span>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase ${getGrnStatusBadgeClass(selectedGrnDetails.status)}`}>
                      {getGrnStatusLabel(selectedGrnDetails.status)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-xs uppercase mb-0.5">
                      {selectedGrnDetails.status === "COMPLETED" ? "Ngày nhập kho:" : "Ngày lập phiếu:"}
                    </span>
                    <span className="font-semibold text-slate-800">{new Date(selectedGrnDetails.createdAt).toLocaleString("vi-VN")}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-xs uppercase mb-0.5">Tổng tiền thanh toán:</span>
                    <span className="font-black text-[#0057cd]">{selectedGrnDetails.totalAmount?.toLocaleString("vi-VN")}đ</span>
                  </div>
                </div>

                {selectedGrnDetails.discrepancyReason && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-xs">
                    <span className="font-bold">Lý do chênh lệch (Quản lý phê duyệt):</span> {selectedGrnDetails.discrepancyReason}
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                      <Package size={16} className="text-[#0057cd]" />
                      Danh sách sản phẩm thực nhận:
                    </h4>
                    {(selectedGrnDetails.status === "PENDING_APPROVAL" || selectedGrnDetails.status === "COMPLETED") && (
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-all select-none">
                        <input
                          type="checkbox"
                          checked={showOnlyDifferences}
                          onChange={(e) => setShowOnlyDifferences(e.target.checked)}
                          className="rounded text-[#0057cd] focus:ring-[#0057cd] w-3.5 h-3.5"
                        />
                        Chỉ hiển thị dòng hàng chênh lệch
                      </label>
                    )}
                  </div>
                  <table className="w-full text-xs text-left border border-slate-100 rounded-lg overflow-hidden animate-fade-in">
                    <thead className="bg-slate-100 text-slate-600 font-bold">
                      <tr>
                        <th className="p-3">Tên thuốc</th>
                        <th className="p-3">Số Lô (Batch)</th>
                        <th className="p-3">Hạn sử dụng</th>
                        {selectedGrnDetails.status === "PENDING_APPROVAL" || selectedGrnDetails.status === "COMPLETED" || selectedGrnDetails.status === "CANCELLED" ? (
                          <>
                            <th className="p-3 text-right">Số lượng yêu cầu</th>
                            <th className="p-3 text-right">Số lượng thực nhận</th>
                          </>
                        ) : (
                          <th className="p-3 text-right">Số lượng dự kiến</th>
                        )}
                        <th className="p-3 text-right">Đơn giá</th>
                        <th className="p-3 text-right">Thành tiền</th>
                        {(selectedGrnDetails.status === "PENDING_APPROVAL" || selectedGrnDetails.status === "COMPLETED" || selectedGrnDetails.status === "CANCELLED") && (
                          <th className="p-3 text-center">Bằng chứng AI</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedGrnDetails.status === "DRAFT" || selectedGrnDetails.status === "INSPECTING") ? (
                        editGrnItems.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-semibold text-slate-800">{getMedicineName(item.medicineId)}</td>
                            <td className="p-3">
                              <input
                                type="text"
                                value={item.batchNo}
                                onChange={(e) => {
                                  const updated = [...editGrnItems];
                                  updated[idx].batchNo = e.target.value;
                                  setEditGrnItems(updated);
                                }}
                                className="px-2 py-1 border border-slate-200 rounded w-28 bg-slate-50 text-xs focus:outline-none focus:ring-1 focus:ring-[#0057cd] focus:bg-white font-semibold"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="date"
                                value={item.expDate}
                                onChange={(e) => {
                                  const updated = [...editGrnItems];
                                  updated[idx].expDate = e.target.value;
                                  setEditGrnItems(updated);
                                }}
                                className="px-2 py-1 border border-slate-200 rounded text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-[#0057cd] focus:bg-white font-semibold"
                              />
                            </td>
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const updated = [...editGrnItems];
                                  updated[idx].quantity = Number(e.target.value);
                                  setEditGrnItems(updated);
                                }}
                                className="px-2 py-1 border border-slate-200 rounded w-16 text-right bg-slate-50 text-xs focus:outline-none focus:ring-1 focus:ring-[#0057cd] focus:bg-white font-bold"
                              />
                            </td>
                            <td className="p-3 text-right text-slate-600">{item.unitPrice?.toLocaleString("vi-VN")}đ</td>
                            <td className="p-3 text-right font-bold text-[#0057cd]">{(item.quantity * item.unitPrice)?.toLocaleString("vi-VN")}đ</td>
                          </tr>
                        ))
                      ) : (
                        selectedGrnDetails.items?.filter((item: any) => {
                          if (!showOnlyDifferences) return true;
                          const expectedQty = item.quantity;
                          const actualQty = item.actualQty;
                          return actualQty !== undefined && actualQty !== null && actualQty !== expectedQty;
                        }).map((item: any, idx: number) => {
                          const isMismatched = (selectedGrnDetails.status === "PENDING_APPROVAL" || selectedGrnDetails.status === "COMPLETED") && item.actualQty !== undefined && item.actualQty !== null && item.actualQty !== item.quantity;
                          return (
                            <tr key={idx} className={`hover:bg-slate-50 ${isMismatched ? "bg-amber-50/40 hover:bg-amber-50/60" : ""}`}>
                              <td className="p-3 font-semibold text-slate-800">{getMedicineName(item.medicineId)}</td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold border border-amber-200 rounded">
                                  {item.batchNo}
                                </span>
                              </td>
                              <td className="p-3 font-medium text-slate-600">{new Date(item.expDate).toLocaleDateString("vi-VN")}</td>
                              {selectedGrnDetails.status === "PENDING_APPROVAL" || selectedGrnDetails.status === "COMPLETED" || selectedGrnDetails.status === "CANCELLED" ? (
                                <>
                                  <td className="p-3 text-right text-slate-600">{item.quantity}</td>
                                  <td className={`p-3 text-right font-black ${isMismatched ? "text-amber-700 bg-amber-100/50" : "text-emerald-700"}`}>
                                    {item.actualQty ?? "-"}
                                  </td>
                                </>
                              ) : (
                                <td className="p-3 text-right font-bold text-slate-800">{item.quantity}</td>
                              )}
                              <td className="p-3 text-right text-slate-600">{item.unitPrice?.toLocaleString("vi-VN")}đ</td>
                              <td className="p-3 text-right font-bold text-[#0057cd]">{(item.quantity * item.unitPrice)?.toLocaleString("vi-VN")}đ</td>
                              {(selectedGrnDetails.status === "PENDING_APPROVAL" || selectedGrnDetails.status === "COMPLETED" || selectedGrnDetails.status === "CANCELLED") && (
                                <td className="p-3 text-center">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewInspectionRecord(selectedGrnDetails._id, item._id, getMedicineName(item.medicineId));
                                    }}
                                    className="text-[11px] font-black text-[#0057cd] hover:text-[#00419e] hover:underline bg-[#f2f3ff] px-2.5 py-1 rounded-md border border-[#e2e5ff] transition-all"
                                  >
                                    Xem ảnh
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {selectedGrnDetails.status === "PENDING_APPROVAL" && (
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Lý do chênh lệch (Bắt buộc nếu có chênh lệch giữa số lượng yêu cầu và thực nhận):
                    </label>
                    <textarea
                      value={discrepancyReason}
                      onChange={(e) => setDiscrepancyReason(e.target.value)}
                      placeholder="Nhập lý do chênh lệch (Ví dụ: Nhà cung cấp giao thiếu, hàng bị vỡ/hỏng...)"
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0057cd] text-xs font-semibold placeholder:font-normal"
                    />
                  </div>
                )}
              </div>

              {/* MODAL FOOTER */}
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                <div className="text-xs text-slate-500 font-semibold">
                  {(selectedGrnDetails.status === "DRAFT" || selectedGrnDetails.status === "INSPECTING") && "💡 Đang kiểm đếm lô hàng. Quản lý có thể sửa lô/hạn dùng/số lượng."}
                  {selectedGrnDetails.status === "PENDING_APPROVAL" && "🔔 Chờ duyệt. Hãy rà soát chênh lệch số lượng trước khi Approve."}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedGrnDetails(null)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all text-sm"
                  >
                    Đóng
                  </button>

                  {(selectedGrnDetails.status === "DRAFT" || selectedGrnDetails.status === "INSPECTING") && (
                    <button
                      onClick={handleSaveDraft}
                      disabled={editLoading}
                      className="px-5 py-2 font-bold text-white bg-[#0057cd] hover:bg-[#00419e] disabled:bg-slate-300 rounded-xl transition-all shadow-sm flex items-center gap-2 text-sm"
                    >
                      {editLoading && <Loader2 size={16} className="animate-spin" />}
                      Lưu thay đổi
                    </button>
                  )}

                  {selectedGrnDetails.status === "PENDING_APPROVAL" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRejectGRN("reinspect")}
                        disabled={approvalLoading}
                        className="px-4 py-2 font-bold text-amber-700 bg-amber-100 hover:bg-amber-250 rounded-xl transition-all text-sm"
                      >
                        Yêu cầu kiểm lại
                      </button>
                      <button
                        onClick={() => handleRejectGRN("cancel")}
                        disabled={approvalLoading}
                        className="px-4 py-2 font-bold text-rose-700 bg-rose-100 hover:bg-rose-250 rounded-xl transition-all text-sm"
                      >
                        Từ chối/Hủy phiên
                      </button>
                      <button
                        onClick={handleApproveGRN}
                        disabled={approvalLoading}
                        className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 rounded-xl transition-all shadow-sm flex items-center gap-2 text-sm"
                      >
                        {approvalLoading && <Loader2 size={16} className="animate-spin" />}
                        Phê duyệt nhập kho
                      </button>
                    </div>
                  )}
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
                    <span className="font-black text-[#0057cd] uppercase">
                      {selectedPoDetails.status === "SHIPPING"
                        ? "Đang giao"
                        : selectedPoDetails.status === "RECEIVING"
                          ? "Đang kiểm"
                          : selectedPoDetails.status === "PARTIAL_RECEIVED"
                            ? "Giao thiếu"
                            : selectedPoDetails.status === "COMPLETED"
                              ? "Hoàn thành"
                              : selectedPoDetails.status}
                    </span>
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

        {/* Inspection Record Modal */}
        {selectedInspectionRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedInspectionRecord(null)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <Image size={18} className="text-[#0057cd]" />
                  <span>Bằng chứng kiểm đếm AI - {selectedMedicineNameForRecord}</span>
                </div>
                <button
                  onClick={() => setSelectedInspectionRecord(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center min-h-[300px]">
                    <img
                      src={
                        selectedInspectionRecord.evidenceImage
                          ? selectedInspectionRecord.evidenceImage.startsWith("http")
                            ? selectedInspectionRecord.evidenceImage
                            : "http://localhost:8000" + selectedInspectionRecord.evidenceImage
                          : ""
                      }
                      className="max-w-full max-h-[40vh] object-contain animate-fade-in"
                      alt="AI Verification Evidence"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 text-center italic">
                    Hình ảnh chụp thực tế từ camera thiết bị di động của thủ kho
                  </p>
                </div>
                <div className="space-y-4 text-xs">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h5 className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">Thông số đối soát AI</h5>
                    <div className="grid grid-cols-2 gap-y-2">
                      <span className="text-slate-500 font-bold">Số lượng đặt:</span>
                      <span className="font-bold text-slate-800 text-right">{selectedInspectionRecord.expectedQty} hộp</span>

                      <span className="text-slate-500 font-bold">AI đếm:</span>
                      <span className="font-black text-[#0057cd] text-right">{selectedInspectionRecord.aiCount} hộp</span>

                      <span className="text-slate-500 font-bold">Thủ kho xác nhận:</span>
                      <span className="font-black text-emerald-700 text-right">{selectedInspectionRecord.actualQty ?? "Chưa xác nhận"} hộp</span>

                      <span className="text-slate-500 font-bold">Chênh lệch:</span>
                      <span className={`font-black text-right ${selectedInspectionRecord.actualQty !== null && selectedInspectionRecord.actualQty !== selectedInspectionRecord.expectedQty ? "text-amber-600" : "text-emerald-600"}`}>
                        {selectedInspectionRecord.actualQty !== null 
                          ? `${selectedInspectionRecord.actualQty - selectedInspectionRecord.expectedQty} hộp` 
                          : "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h5 className="font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">Thông tin Audit Log</h5>
                    <div className="grid grid-cols-2 gap-y-2">
                      <span className="text-slate-500 font-bold">Thủ kho thực hiện:</span>
                      <span className="font-semibold text-slate-800 text-right">{selectedInspectionRecord.verifiedBy || "Chưa xác nhận"}</span>

                      <span className="text-slate-500 font-bold">Thời gian kiểm:</span>
                      <span className="font-semibold text-slate-800 text-right">
                        {selectedInspectionRecord.verifiedAt 
                          ? new Date(selectedInspectionRecord.verifiedAt).toLocaleString("vi-VN") 
                          : new Date(selectedInspectionRecord.createdAt).toLocaleString("vi-VN")}
                      </span>

                      <span className="text-slate-500 font-bold">Phiên bản Model:</span>
                      <span className="font-bold text-[#0057cd] text-right">Roboflow RF-v4.1</span>
                    </div>
                  </div>
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
  const [warnings, setWarnings] = useState<string[]>([]);

  // Initialize form with PO items
  useEffect(() => {
    if (po && po.items) {
      setItemsData(
        po.items.map((it: any) => ({
          medicineId: it.medicineId,
          batchNo: "",
          expDate: "",
          quantity: (it.quantity - (it.receivedQuantity || 0)) || it.quantity,
          maxQuantity: (it.quantity - (it.receivedQuantity || 0)) || it.quantity,
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
        setErrorMessage(`Số lượng dự kiến nhận của thuốc "${getMedicineName(it.medicineId)}" phải lớn hơn 0.`);
        return;
      }
      if (it.quantity > it.maxQuantity) {
        setErrorMessage(`Số lượng dự kiến nhận cho thuốc "${getMedicineName(it.medicineId)}" (${it.quantity}) vượt quá số lượng đặt hàng (${it.maxQuantity})!`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const resData = await goodsReceiptService.createGoodsReceipt({
        poId: po._id,
        receivedBy: "Thủ kho chính",
        items: itemsData.map(it => ({
          medicineId: it.medicineId,
          batchNo: it.batchNo,
          expiryDate: new Date(it.expDate).toISOString(),
          quantityReceived: Number(it.quantity),
          // Backend compatibility fields
          expDate: new Date(it.expDate).toISOString(),
          quantity: Number(it.quantity),
          unitPrice: it.unitPrice
        } as any))
      });
      if (resData.warnings && resData.warnings.length > 0) {
        setWarnings(resData.warnings);
        setTimeout(() => onSuccess(), 3000);
      } else {
        onSuccess();
      }
    } catch (e: any) {
      const errMsg = e.response?.data?.message || "Tạo phiếu nhập kho thất bại. Lỗi từ máy chủ.";
      setErrorMessage(errMsg);
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
              <h2 className="text-lg font-black text-slate-900">Mở Phiên Tiếp Nhận Hàng (Receiving Session)</h2>
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
            Nhập thông tin lô hàng và hạn dùng dự kiến để khởi tạo phiên tiếp nhận cho thủ kho kiểm đếm:
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
                    <label className="text-xs font-bold text-slate-500 block">DỰ KIẾN NHẬN*</label>
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

          {warnings.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold space-y-2">
              <div className="flex items-center gap-2 text-amber-700 font-black"><AlertTriangle size={18} /> CẢNH BÁO HÀNG CẬN DATE</div>
              {warnings.map((w, i) => <p key={i} className="text-xs leading-relaxed">{w}</p>)}
              <p className="text-xs text-amber-600 mt-2">Phiên tiếp nhận đã được khởi tạo thành công. Tự động đóng sau 3 giây...</p>
            </motion.div>
          )}

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
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Đang tạo phiên...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                 Bắt đầu kiểm hàng
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
