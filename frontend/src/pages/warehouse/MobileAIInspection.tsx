import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Camera, PackageCheck, ScanLine, X, CheckCircle2,
  AlertTriangle, Loader2, Save, RefreshCw, SendHorizonal, ArrowLeft
} from "lucide-react";
import { motion } from "motion/react";
import { goodsReceiptService } from "../../services/purchase/goodsReceipt.service";

export function MobileAIInspection() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const grnId = searchParams.get("grnId");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const [inspectionRecord, setInspectionRecord] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [actualQty, setActualQty] = useState<number | "">("");

  // Simulated AI Scanner state
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (!grnId) {
      setMsg({ type: "error", text: "Thiếu tham số GRN ID" });
      return;
    }
    handleStartInspection();
  }, [grnId]);

  const handleStartInspection = async () => {
    setLoading(true);
    try {
      // Gọi API mở phiên kiểm đếm AI
      const data = await goodsReceiptService.createInspectionRecord(grnId!, "Mobile User");
      setInspectionRecord(data.data);
    } catch (err: any) {
      setMsg({ type: "error", text: err.response?.data?.message || err.message || "Không thể khởi tạo phiên kiểm đếm" });
    } finally {
      setLoading(false);
    }
  };

  const handleScanAI = (item: any) => {
    setIsScanning(true);
    setSelectedItem(item);
    
    // Simulate AI scanning delay
    setTimeout(() => {
      setIsScanning(false);
      setActualQty(item.aiCountedQty); // AI đề xuất số đếm
    }, 1500);
  };

  const handleVerify = async () => {
    if (!selectedItem || actualQty === "") return;
    setLoading(true);
    try {
      const data = await goodsReceiptService.verifyInspectionItem(
        inspectionRecord._id,
        selectedItem._id,
        Number(actualQty)
      );
      setInspectionRecord(data.data);
      setSelectedItem(null);
      setActualQty("");
      setMsg({ type: "success", text: "Đã cập nhật số lượng thực tế" });
    } catch (err: any) {
      setMsg({ type: "error", text: err.response?.data?.message || err.message || "Lỗi xác nhận" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async () => {
    setLoading(true);
    try {
      await goodsReceiptService.submitInspectionReport(inspectionRecord._id, "Mobile AI Inspection completed");
      setMsg({ type: "success", text: "Đã gửi báo cáo kiểm đếm lên HQ chờ duyệt!" });
      setTimeout(() => {
        navigate("/warehouse/inventory/import?tab=incoming_orders");
      }, 2000);
    } catch (err: any) {
      setMsg({ type: "error", text: err.response?.data?.message || err.message || "Lỗi gửi báo cáo" });
      setLoading(false);
    }
  };

  if (!grnId) return <div className="p-4">Loading...</div>;

  const isAllVerified = inspectionRecord?.items?.every((it: any) => it.actualQty > 0 || it.label === 'MATCH');

  return (
    <div className="flex flex-col h-full bg-[#f8f8ff] overflow-y-auto">
      {/* Mobile Header */}
      <div className="bg-slate-900 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-800 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <ScanLine size={18} className="text-emerald-400" /> AI Kiểm Đếm
            </h1>
            <p className="text-xs text-slate-400">Thiết bị quét tự động - Kho Tổng</p>
          </div>
        </div>
      </div>

      <div className="p-4 flex-1">
        {msg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className={`p-3 rounded-xl text-sm font-bold flex items-center gap-2 mb-4 ${
              msg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}>
            {msg.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {msg.text}
            <button onClick={() => setMsg(null)} className="ml-auto opacity-50 hover:opacity-100"><X size={14} /></button>
          </motion.div>
        )}

        {loading && !inspectionRecord && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-emerald-500 mb-2" size={32} />
            <p className="text-sm font-bold text-slate-500">Đang khởi tạo phiên kiểm đếm...</p>
          </div>
        )}

        {inspectionRecord && (
          <>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Phiên kiểm đếm</span>
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                  {inspectionRecord.status}
                </span>
              </div>
              <p className="font-mono text-sm font-bold text-slate-800">{inspectionRecord._id}</p>
            </div>

            <h3 className="font-bold text-slate-700 text-sm mb-3">Danh sách cần quét ({inspectionRecord.items.length})</h3>
            
            <div className="space-y-3">
              {inspectionRecord.items.map((item: any) => (
                <div key={item._id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-sm text-slate-800 leading-tight pr-2">{item.medicineName}</h4>
                    {item.actualQty > 0 ? (
                      <span className="shrink-0 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-xs font-bold">Đã chốt</span>
                    ) : (
                      <span className="shrink-0 bg-rose-100 text-rose-700 px-2 py-1 rounded-lg text-xs font-bold">Chưa quét</span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="block text-slate-400 mb-0.5">Dự kiến</span>
                      <span className="font-bold text-slate-700">{item.expectedQty} hộp</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="block text-slate-400 mb-0.5">Thực tế</span>
                      <span className={`font-bold ${item.actualQty > 0 ? (item.actualQty === item.expectedQty ? "text-emerald-600" : "text-rose-600") : "text-slate-400"}`}>
                        {item.actualQty > 0 ? `${item.actualQty} hộp` : "—"}
                      </span>
                    </div>
                  </div>

                  {item.actualQty === 0 && (
                    <button onClick={() => handleScanAI(item)}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                      <Camera size={16} /> Quét AI & Nhập số lượng
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 mb-8">
              <button 
                onClick={handleSubmitReport}
                disabled={!isAllVerified || loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <SendHorizonal size={18} />}
                Nộp kết quả kiểm đếm
              </button>
              {!isAllVerified && <p className="text-center text-xs text-slate-500 mt-2">Vui lòng quét toàn bộ sản phẩm để nộp kết quả</p>}
            </div>
          </>
        )}
      </div>

      {/* AI Scanner Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          {/* Mock Camera View */}
          <div className="relative flex-1 bg-slate-900 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none" />
            
            {isScanning ? (
              <div className="text-center">
                <div className="relative w-48 h-48 mx-auto mb-4 border-2 border-emerald-500 rounded-2xl overflow-hidden">
                  <motion.div 
                    animate={{ y: ["0%", "100%", "0%"] }} 
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="absolute inset-x-0 h-1 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,1)]" 
                  />
                  <img src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ad?w=400&q=80" className="w-full h-full object-cover opacity-50" alt="Medicine" />
                </div>
                <h3 className="text-emerald-400 font-bold animate-pulse flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> AI đang nhận diện & đếm...
                </h3>
              </div>
            ) : (
              <div className="w-full p-4 absolute bottom-0 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] pb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 text-lg">Kết quả phân tích AI</h3>
                  <button onClick={() => setSelectedItem(null)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X size={18} /></button>
                </div>
                
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-black text-xl">
                    {selectedItem.aiCountedQty}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500">AI Đề Xuất</p>
                    <p className="text-sm font-semibold text-emerald-700">Độ tin cậy: 98.5%</p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Xác nhận số lượng thực tế</label>
                  <input type="number" value={actualQty} onChange={(e) => setActualQty(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  
                  {actualQty !== "" && Number(actualQty) !== selectedItem.expectedQty && (
                    <div className="mt-2 p-2 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Lệch {Math.abs(Number(actualQty) - selectedItem.expectedQty)} so với dự kiến ({selectedItem.expectedQty})
                    </div>
                  )}
                </div>

                <button onClick={handleVerify} disabled={loading || actualQty === ""}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Chốt Số Lượng
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
