import React, { useState, useEffect } from "react";
import { Search, X, Package, Loader2, Calendar, Eye, Truck, ArrowDownToLine, PackageCheck, Scan, Camera, ClipboardCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StatusBadge, PO_STATUS } from "./WarehouseConstants";
import { purchaseOrderService } from "../../../services/purchase/purchaseOrder.service";
import { goodsReceiptService } from "../../../services/purchase/goodsReceipt.service";

export function IncomingOrdersTab({
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

  const [inspectionData, setInspectionData] = useState<Record<string, { batchNo: string, expDate: string, actualQty: number | string }>>({});
  const [aiScanning, setAiScanning] = useState<string | null>(null);

  useEffect(() => {
    if (selectedPo && selectedPo.items) {
      const initData: Record<string, any> = {};
      selectedPo.items.forEach((it: any) => {
        initData[it.medicineId || it.id] = {
          batchNo: "",
          expDate: "",
          actualQty: "" // Empty so they have to input
        };
      });
      setInspectionData(initData);
    }
  }, [selectedPo]);

  const handleReceiveAndInspect = async (poId: string) => {
    setActionLoading(true);
    try {
      if (!selectedPo) return;
      
      const items = selectedPo.items.map((it: any) => {
        const mId = it.medicineId || it.id;
        const data = inspectionData[mId];
        if (!data?.batchNo || !data?.expDate || data?.actualQty === "") {
          throw new Error(`Vui lòng điền đầy đủ Lô, HSD và Số lượng thực tế cho sản phẩm ${it.medicineName || mId}.`);
        }
        return {
          medicineId: mId,
          expectedQty: it.quantity,
          unitPrice: it.unitPrice,
          batchNo: data.batchNo,
          expDate: new Date(data.expDate).toISOString(),
          actualQty: Number(data.actualQty)
        };
      });

      // 1. Create GRN
      const grnRes = await goodsReceiptService.createGoodsReceipt({
        poId,
        receivedBy: "Thủ Kho",
        items
      });
      const grnId = grnRes.data._id;

      // 2. Create Inspection Record
      const recordRes = await goodsReceiptService.createInspectionRecord(grnId, "Thủ Kho");
      const recordId = recordRes.data._id;

      // 3. Verify items
      for (const it of items) {
         await goodsReceiptService.verifyInspectionItem(recordId, it.medicineId, it.actualQty);
      }

      // 4. Submit
      await goodsReceiptService.submitInspectionReport(recordId, "Hoàn tất kiểm đếm thủ công");

      onMsg({ type: "success", text: "Đã tạo GRN và gửi báo cáo kiểm đếm thành công!" });
      setSelectedPo(null);
      fetchData();
    } catch (e: any) {
      onMsg({ type: "error", text: e.response?.data?.message || e.message || "Lỗi tạo GRN" });
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
                          <button onClick={() => setSelectedPo(po)} title="Nhập kho & Kiểm đếm"
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
                  <th className="px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGrn.map((grn: any) => (
                  <tr key={grn._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 font-mono text-xs">{grn._id?.slice(-6).toUpperCase() || grn.grnCode}</td>
                    <td className="px-4 py-3 text-slate-600"><Calendar size={12} className="inline mr-1 text-slate-400" />{new Date(grn.createdAt).toLocaleDateString("vi-VN")}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{getSupplierName(grn.supplierId)}</td>
                    <td className="px-4 py-3 text-center font-bold">{grn.items?.length || 0}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-bold ${
                        grn.status === 'INSPECTING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        grn.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {grn.status === 'INSPECTING' ? 'Chờ kiểm đếm' : grn.status === 'COMPLETED' ? 'Đã nhập kho ✓' : grn.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {grn.status === 'INSPECTING' && (
                        <button onClick={() => window.location.href = `/warehouse/inspection?grnId=${grn._id}`}
                          className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg font-bold text-xs border border-blue-200">
                          Mở kiểm đếm AI
                        </button>
                      )}
                    </td>
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
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div><span className="text-slate-500 font-bold text-xs block">Nhà Cung Cấp</span><span className="font-semibold text-slate-800">{getSupplierName(selectedPo.supplierId)}</span></div>
                  <div><span className="text-slate-500 font-bold text-xs block">Tổng tiền</span><span className="font-black text-emerald-700 text-base">{selectedPo.totalAmount?.toLocaleString("vi-VN")}đ</span></div>
                </div>
                <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Package size={14} className="text-emerald-600" />Sản phẩm kiểm đếm ({selectedPo.items?.length || 0})</h4>
                <div className="space-y-3">
                  {selectedPo.items?.map((it: any) => {
                    const mId = it.medicineId || it.id;
                    const isScanning = aiScanning === mId;
                    return (
                      <div key={mId} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-slate-900 text-sm">{it.medicineName || mId}</span>
                            <span className="text-xs text-slate-500 block">Số lượng chứng từ: <span className="font-bold text-emerald-700">{it.quantity}</span></span>
                          </div>
                          {isScanning ? (
                            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold flex items-center gap-1 animate-pulse"><Scan size={12} /> Đang quét...</span>
                          ) : (
                            <button onClick={() => {
                              setAiScanning(mId);
                              setTimeout(() => {
                                setInspectionData(prev => ({
                                  ...prev,
                                  [mId]: { ...prev[mId], actualQty: it.quantity } // Giả lập AI đếm đúng số lượng
                                }));
                                setAiScanning(null);
                              }, 1500);
                            }} className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-bold border border-blue-200 flex items-center gap-1 transition-colors">
                              <Camera size={12} /> Quét AI
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 mb-1 block">SỐ LÔ (BATCH NO.)</label>
                            <input type="text" value={inspectionData[mId]?.batchNo || ""}
                              onChange={e => setInspectionData(prev => ({ ...prev, [mId]: { ...prev[mId], batchNo: e.target.value } }))}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500" placeholder="VD: B001" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 mb-1 block">HẠN SỬ DỤNG</label>
                            <input type="date" value={inspectionData[mId]?.expDate || ""}
                              onChange={e => setInspectionData(prev => ({ ...prev, [mId]: { ...prev[mId], expDate: e.target.value } }))}
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 mb-1 block">THỰC TẾ (ACTUAL QTY)</label>
                            <input type="number" min={0} value={inspectionData[mId]?.actualQty ?? ""}
                              onChange={e => setInspectionData(prev => ({ ...prev, [mId]: { ...prev[mId], actualQty: e.target.value } }))}
                              className="w-full px-2 py-1.5 bg-white border border-emerald-300 rounded text-xs font-black text-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-center" placeholder="Nhập số lượng..." />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {selectedPo.status === "SHIPPING" && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">
                  <button onClick={() => handleReceiveAndInspect(selectedPo._id)} disabled={actionLoading}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-colors">
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <ClipboardCheck size={16} />}
                    Hoàn tất Nhập Kho & Gửi Báo Cáo
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
