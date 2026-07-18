import React, { useState, useEffect } from "react";
import { Plus, Search, CheckCircle, Clock, AlertTriangle, ChevronRight, X, Trash2, ShieldAlert, FileText, ArrowRightLeft, User, MessageSquare } from "lucide-react";
import { inventoryCheckService, InventoryCheckItem } from "../../services/inventory/inventoryCheck.service";
import { medicineService } from "../../services/inventory/medicine.service";

export function InventoryCheck() {
  const [checks, setChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState<any[]>([]);
  
  // Creation States
  const [isCreating, setIsCreating] = useState(false);
  const [notes, setNotes] = useState("");
  const [performedBy, setPerformedBy] = useState("Thủ kho");
  const [itemsList, setItemsList] = useState<InventoryCheckItem[]>([]);
  
  // Adding single item states
  const [selectedMedId, setSelectedMedId] = useState("");
  const [selectedBatchNo, setSelectedBatchNo] = useState("");
  const [actualStockInput, setActualStockInput] = useState("");
  const [reasonInput, setReasonInput] = useState("");
  const [selectedMedicineObj, setSelectedMedicineObj] = useState<any>(null);
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [systemStock, setSystemStock] = useState<number>(0);

  // Detail States
  const [selectedCheck, setSelectedCheck] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const fetchChecks = async () => {
    setLoading(true);
    try {
      const data = await inventoryCheckService.getChecks();
      setChecks(data || []);
    } catch (error) {
      console.error("Failed to load inventory checks:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicinesList = async () => {
    try {
      const result = await medicineService.getMedicinesDropdown();
      setMedicines(result || []);
    } catch (err) {
      console.error("Failed to load medicines:", err);
    }
  };

  useEffect(() => {
    fetchChecks();
    fetchMedicinesList();
  }, []);

  // When medicine changes, update available batches and reset selection
  useEffect(() => {
    if (!selectedMedId) {
      setSelectedMedicineObj(null);
      setAvailableBatches([]);
      setSelectedBatchNo("");
      setSystemStock(0);
      return;
    }
    const med = medicines.find(m => m.id === selectedMedId || m._id === selectedMedId);
    setSelectedMedicineObj(med);
    if (med && med.batches) {
      setAvailableBatches(med.batches);
      if (med.batches.length > 0) {
        setSelectedBatchNo(med.batches[0].batchNo);
        setSystemStock(med.batches[0].stock);
      } else {
        setSelectedBatchNo("");
        setSystemStock(0);
      }
    } else {
      setAvailableBatches([]);
      setSelectedBatchNo("");
      setSystemStock(0);
    }
  }, [selectedMedId, medicines]);

  // When batch selection changes, update system stock
  const handleBatchChange = (batchNo: string) => {
    setSelectedBatchNo(batchNo);
    if (selectedMedicineObj && selectedMedicineObj.batches) {
      const batchObj = selectedMedicineObj.batches.find((b: any) => b.batchNo === batchNo);
      setSystemStock(batchObj ? batchObj.stock : 0);
    }
  };

  const handleAddItem = () => {
    if (!selectedMedId || !selectedBatchNo || !actualStockInput) {
      alert("Vui lòng điền đầy đủ thông tin thuốc, số lô và số lượng kiểm thực tế!");
      return;
    }

    const actual = parseInt(actualStockInput);
    if (isNaN(actual) || actual < 0) {
      alert("Số lượng kiểm thực tế phải lớn hơn hoặc bằng 0!");
      return;
    }

    // Check duplicate
    if (itemsList.some(item => item.medicineId === selectedMedId && item.batchNo === selectedBatchNo)) {
      alert("Lô thuốc này đã có trong danh sách kiểm kê!");
      return;
    }

    const newItem: InventoryCheckItem = {
      medicineId: selectedMedId,
      medicineName: selectedMedicineObj.name,
      batchNo: selectedBatchNo,
      systemStock: systemStock,
      actualStock: actual,
      difference: actual - systemStock,
      reason: reasonInput || "Kiểm kê định kỳ"
    };

    setItemsList(prev => [...prev, newItem]);
    
    // Reset inputs
    setSelectedMedId("");
    setSelectedBatchNo("");
    setActualStockInput("");
    setReasonInput("");
  };

  const handleRemoveItem = (index: number) => {
    setItemsList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitCheck = async (status: 'DRAFT' | 'COMPLETED') => {
    if (itemsList.length === 0) {
      alert("Vui lòng thêm ít nhất 1 mặt hàng cần kiểm kê!");
      return;
    }

    try {
      const payload = {
        status,
        performedBy,
        notes,
        items: itemsList.map(item => ({
          medicineId: item.medicineId,
          batchNo: item.batchNo,
          actualStock: item.actualStock,
          reason: item.reason
        }))
      };

      await inventoryCheckService.createCheck(payload);
      alert(status === 'COMPLETED' ? "Biên bản kiểm kê đã hoàn thành và điều chỉnh kho thành công!" : "Lưu biên bản nháp thành công!");
      setIsCreating(false);
      setItemsList([]);
      setNotes("");
      fetchChecks();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || "Lỗi khi xử lý biên bản kiểm kê!");
    }
  };

  const handleCompleteDraft = async (checkId: string) => {
    setCompletingId(checkId);
    try {
      await inventoryCheckService.completeCheck(checkId);
      alert("Hoàn thành biên bản và tự động cập nhật số lượng tồn kho thành công!");
      setDetailOpen(false);
      fetchChecks();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || "Lỗi khi chốt biên bản kiểm kê!");
    } finally {
      setCompletingId(null);
    }
  };

  const handleOpenDetail = async (check: any) => {
    try {
      const fullCheck = await inventoryCheckService.getCheckById(check.id || check._id);
      setSelectedCheck(fullCheck);
      setDetailOpen(true);
    } catch (err) {
      console.error("Failed to load details", err);
      // Fallback
      setSelectedCheck(check);
      setDetailOpen(true);
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full bg-[#faf8ff] px-6 pt-4 pb-3 lg:px-8 overflow-hidden">
      <div className="flex flex-row justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Biên Bản Kiểm Kê Kho</h1>
          <p className="text-xs text-slate-500 mt-0.5">Quản lý đối chiếu kho thực tế và tự động điều chỉnh số lượng tồn</p>
        </div>
        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-[#0057cd] text-white font-bold rounded-xl hover:bg-[#00419e] transition-colors shadow-sm flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            Lập Biên Bản Mới
          </button>
        )}
      </div>

      {isCreating ? (
        /* Create Checking View */
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden flex flex-col animate-in fade-in duration-300">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
            <h3 className="font-extrabold text-slate-800 text-sm">Lập Biên Bản Kiểm Kê & Điều Chỉnh Kho</h3>
            <button 
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Hủy bỏ
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {/* Header info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Người thực hiện</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User size={14} />
                  </span>
                  <input
                    type="text"
                    value={performedBy}
                    onChange={(e) => setPerformedBy(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0057cd] focus:bg-white transition-all font-semibold text-slate-800"
                  />
                </div>
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-600">Ghi chú kiểm kê</label>
                <div className="relative">
                  <span className="absolute top-2.5 left-3 text-slate-400">
                    <MessageSquare size={14} />
                  </span>
                  <input
                    type="text"
                    placeholder="Ví dụ: Kiểm kho định kỳ cuối tháng, bù lệch..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0057cd] focus:bg-white transition-all font-semibold text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Add Item Panel */}
            <div className="bg-[#faf8ff] border border-slate-200/50 rounded-2xl p-4 space-y-4">
              <h4 className="text-xs font-bold text-[#0057cd] flex items-center gap-1.5 uppercase tracking-wider">
                <Plus size={14} /> Thêm Thuốc & Lô Cần Kiểm Kê
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Chọn dược phẩm</label>
                  <select
                    value={selectedMedId}
                    onChange={(e) => setSelectedMedId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0057cd] transition-all font-semibold text-slate-800 cursor-pointer"
                  >
                    <option value="">-- Chọn dược phẩm --</option>
                    {medicines.map(m => (
                      <option key={m.id || m._id} value={m.id || m._id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Số lô hàng</label>
                  <select
                    value={selectedBatchNo}
                    onChange={(e) => handleBatchChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0057cd] transition-all font-semibold text-slate-800 cursor-pointer"
                    disabled={availableBatches.length === 0}
                  >
                    <option value="">-- Chọn lô --</option>
                    {availableBatches.map(b => (
                      <option key={b.batchNo} value={b.batchNo}>{b.batchNo} (Tồn: {b.stock})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Số lượng kiểm thực tế</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder={`Hệ thống: ${systemStock}`}
                      value={actualStockInput}
                      onChange={(e) => setActualStockInput(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0057cd] transition-all font-semibold text-slate-800"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-extrabold uppercase">
                      {selectedMedicineObj?.unit || 'đơn vị'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Lý do chênh lệch (nếu có)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ví dụ: Đổ vỡ, hỏng hóc..."
                      value={reasonInput}
                      onChange={(e) => setReasonInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0057cd] transition-all font-semibold text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="px-4 bg-[#0057cd] hover:bg-[#00419e] text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center"
                    >
                      Thêm
                    </button>
                  </div>
                </div>
              </div>

              {selectedMedId && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 flex items-center justify-between text-xs text-[#0057cd]">
                  <span className="font-bold">Hệ thống đang ghi nhận: {systemStock} {selectedMedicineObj?.unit || 'đơn vị'} cho lô {selectedBatchNo}</span>
                  {actualStockInput && (
                    <span className={`font-black uppercase text-xs ${parseInt(actualStockInput) - systemStock < 0 ? 'text-rose-600' : parseInt(actualStockInput) - systemStock > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                      Chênh lệch: {parseInt(actualStockInput) - systemStock > 0 ? '+' : ''}{parseInt(actualStockInput) - systemStock}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Checking list table */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Danh sách mặt hàng kiểm kê ({itemsList.length})</label>
              <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left border-collapse bg-white">
                  <thead className="text-[10px] text-slate-400 uppercase bg-slate-50 border-b border-slate-100 font-extrabold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Thuốc / Dược phẩm</th>
                      <th className="px-4 py-3">Lô kiểm</th>
                      <th className="px-4 py-3 text-center">Tồn hệ thống</th>
                      <th className="px-4 py-3 text-center">Thực tế kiểm</th>
                      <th className="px-4 py-3 text-center">Lệch</th>
                      <th className="px-4 py-3">Lý do điều chỉnh</th>
                      <th className="px-4 py-3 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itemsList.map((item, idx) => (
                      <tr key={`${item.medicineId}-${item.batchNo}`} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{item.medicineName}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-600">{item.batchNo}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-600">{item.systemStock}</td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800">{item.actualStock}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold
                            ${(item.difference || 0) < 0 
                              ? 'bg-rose-50 text-rose-700' 
                              : (item.difference || 0) > 0 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : 'bg-slate-50 text-slate-500'
                            }
                          `}>
                            {(item.difference || 0) > 0 ? '+' : ''}{item.difference}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium text-xs">{item.reason}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {itemsList.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-400 font-semibold">Chưa có thuốc nào trong danh sách đối chiếu.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">
            <button
              onClick={() => handleSubmitCheck('DRAFT')}
              className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors shadow-sm text-xs"
            >
              Lưu Bản Nháp (DRAFT)
            </button>
            <button
              onClick={() => handleSubmitCheck('COMPLETED')}
              className="px-5 py-2.5 bg-[#0057cd] hover:bg-[#00419e] text-white font-bold rounded-xl transition-colors shadow-sm text-xs"
            >
              Hoàn Thành & Cập Nhật Kho
            </button>
          </div>
        </div>
      ) : (
        /* List Protocols View */
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/30">
          <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white flex justify-between items-center shrink-0">
            <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">Lịch sử biên bản kiểm kê điều chỉnh kho</h3>
          </div>

          <div className="overflow-x-auto overflow-y-auto relative flex-1 min-h-0 custom-scrollbar">
            {loading ? (
              <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center gap-3 z-10">
                <Loader2 className="animate-spin text-[#0057cd]" size={32} />
                <p className="text-sm font-semibold text-slate-500">Đang tải lịch sử kiểm kê...</p>
              </div>
            ) : null}

            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-[10px] text-slate-400 uppercase bg-slate-50/60 border-b border-slate-100/80 tracking-wider font-extrabold sticky top-0 z-10 backdrop-blur-sm">
                <tr>
                  <th scope="col" className="px-6 py-4">Mã Biên Bản</th>
                  <th scope="col" className="px-6 py-4">Trạng Thái</th>
                  <th scope="col" className="px-6 py-4 text-center">Số Mặt Hàng</th>
                  <th scope="col" className="px-6 py-4">Người Kiểm</th>
                  <th scope="col" className="px-6 py-4">Ngày Tạo</th>
                  <th scope="col" className="px-6 py-4">Ghi Chú</th>
                  <th scope="col" className="px-6 py-4 text-right">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && checks.map((c: any) => (
                  <tr key={c.id || c._id} className="group bg-white hover:bg-slate-50/50 transition-all duration-150">
                    <td className="px-6 py-4 font-mono font-bold text-[#0057cd] text-xs">
                      {c.checkCode}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase shadow-sm inline-flex items-center gap-1
                        ${c.status === 'COMPLETED' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                        }
                      `}>
                        {c.status === 'COMPLETED' ? <CheckCircle size={10} /> : <Clock size={10} />}
                        {c.status === 'COMPLETED' ? 'Đã Điều Chỉnh' : 'Bản Nháp'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-700 text-xs">
                      {c.items?.length || 0}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700 text-xs">
                      {c.performedBy}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium text-xs">
                      {new Date(c.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium text-xs max-w-xs truncate" title={c.notes}>
                      {c.notes || '---'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(c)}
                        className="text-slate-400 group-hover:text-[#0057cd] hover:bg-blue-50 p-1.5 rounded-lg border border-transparent hover:border-blue-100 transition-all flex items-center justify-center ml-auto"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && checks.length === 0 && (
              <div className="text-center py-20 bg-white">
                <FileText className="mx-auto text-slate-300 mb-2" size={40} />
                <p className="text-slate-500 font-bold">Chưa có biên bản kiểm kê nào được lập.</p>
                <button 
                  onClick={() => setIsCreating(true)} 
                  className="mt-3 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#0057cd] text-xs font-bold rounded-xl transition-all"
                >
                  Bắt đầu kiểm kho ngay
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail & Action Modal */}
      {detailOpen && selectedCheck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>Chi Tiết Biên Bản: {selectedCheck.checkCode}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border
                    ${selectedCheck.status === 'COMPLETED' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                    }
                  `}>
                    {selectedCheck.status === 'COMPLETED' ? 'Đã Điều Chỉnh' : 'Bản Nháp'}
                  </span>
                </h2>
              </div>
              <button 
                onClick={() => setDetailOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-200/50 rounded-2xl p-4 text-xs font-medium">
                <div>
                  <span className="text-slate-400 block mb-0.5">Người kiểm kê:</span>
                  <span className="font-bold text-slate-800">{selectedCheck.performedBy}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Ngày lập biên bản:</span>
                  <span className="font-bold text-slate-800">{new Date(selectedCheck.createdAt).toLocaleString("vi-VN")}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block mb-0.5">Ghi chú:</span>
                  <span className="font-bold text-slate-800">{selectedCheck.notes || 'Không có ghi chú'}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">Danh sách dược phẩm đối chiếu</h3>
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left border-collapse bg-white">
                    <thead className="text-[10px] text-slate-400 uppercase bg-slate-50 border-b border-slate-100 font-extrabold tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Tên Thuốc & Mã</th>
                        <th className="px-4 py-3">Số Lô</th>
                        <th className="px-4 py-3 text-center">Tồn Hệ Thống</th>
                        <th className="px-4 py-3 text-center">Thực Tế Kiểm</th>
                        <th className="px-4 py-3 text-center">Chênh Lệch</th>
                        <th className="px-4 py-3">Lý Do Biên Bản</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedCheck.items?.map((item: any, idx: number) => {
                        const system = item.systemStock || 0;
                        const actual = item.actualStock || 0;
                        const diff = item.difference !== undefined ? item.difference : (actual - system);
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-800">{item.medicineName || item.medicineId}</div>
                              <div className="text-[9px] text-slate-400 font-mono mt-0.5">{item.medicineId}</div>
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-600">{item.batchNo}</td>
                            <td className="px-4 py-3 text-center font-bold text-slate-600">{system}</td>
                            <td className="px-4 py-3 text-center font-bold text-slate-800">{actual}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-black
                                ${diff < 0 
                                  ? 'bg-rose-50 text-rose-700' 
                                  : diff > 0 
                                  ? 'bg-emerald-50 text-emerald-700' 
                                  : 'bg-slate-50 text-slate-500'
                                }
                              `}>
                                {diff > 0 ? '+' : ''}{diff}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 font-medium text-xs">{item.reason || '---'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedCheck.status === 'DRAFT' && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
                  <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-bold text-amber-800 text-sm">Biên bản này đang là bản nháp (DRAFT)</h4>
                    <p className="text-xs text-amber-700 mt-1">
                      Số lượng tồn kho trên hệ thống chưa được điều chỉnh. Vui lòng bấm "Hoàn Thành & Chốt Biên Bản" để chốt điều chỉnh số lượng tồn thực tế của các lô thuốc và ghi nhận biến động kho.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">
              <button 
                onClick={() => setDetailOpen(false)}
                className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-xs"
              >
                Đóng
              </button>
              {selectedCheck.status === 'DRAFT' && (
                <button 
                  onClick={() => handleCompleteDraft(selectedCheck.id || selectedCheck._id)}
                  disabled={completingId !== null}
                  className="px-5 py-2.5 bg-[#0057cd] hover:bg-[#00419e] disabled:bg-slate-400 text-white font-bold rounded-xl transition-colors shadow-sm text-xs flex items-center gap-1.5"
                >
                  {completingId !== null && <Loader2 className="animate-spin" size={13} />}
                  {completingId ? "Đang xử lý..." : "Hoàn Thành & Chốt Biên Bản"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Add a dummy Loader2 component if not imported
function Loader2({ className, size }: { className?: string; size?: number }) {
  return (
    <svg 
      className={`animate-spin ${className}`} 
      style={{ width: size, height: size }}
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}
