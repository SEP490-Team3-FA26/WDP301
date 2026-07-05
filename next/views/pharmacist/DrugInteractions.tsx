"use client";

import { useState } from "react";
import Link from 'next/link';
import { Plus, Trash2, Search, ShieldAlert, ShieldCheck, AlertTriangle, Info, Bot, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { medicineService } from "../../services/medicine.service";

interface InteractionResult {
  has_interactions: boolean;
  severity: "Cao" | "Trung bình" | "Thấp" | "An toàn";
  interactions: Array<{
    drug_a: string;
    drug_b: string;
    description: string;
    recommendation: string;
  }>;
  general_advice: string;
}

export function DrugInteractions() {
  const [medicines, setMedicines] = useState<string[]>(["", ""]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InteractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addMedicineField = () => {
    setMedicines([...medicines, ""]);
  };

  const removeMedicineField = (index: number) => {
    const newMedicines = [...medicines];
    newMedicines.splice(index, 1);
    setMedicines(newMedicines);
  };

  const updateMedicine = (index: number, value: string) => {
    const newMedicines = [...medicines];
    newMedicines[index] = value;
    setMedicines(newMedicines);
  };

  const checkInteractions = async () => {
    const validMedicines = medicines.filter(m => m.trim().length > 0);
    
    if (validMedicines.length < 2) {
      setError("Vui lòng nhập ít nhất 2 loại thuốc để kiểm tra tương tác.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await medicineService.checkInteraction(validMedicines);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi không xác định.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-[#0d6efd] font-semibold transition-colors">
            <ArrowLeft size={18} />
            Về Trang Chủ
          </Link>
        </div>
      </div>
      
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="text-[#0d6efd]" />
              Kiểm tra Tương tác Thuốc (AI)
            </h1>
            <p className="text-slate-500 mt-1">Phát hiện sớm các rủi ro, chống chỉ định trong toa thuốc bằng Llama 3</p>
          </div>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Input Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 font-semibold text-slate-800">
            Nhập danh sách thuốc trong toa
          </div>
          <div className="p-6 space-y-4">
            <AnimatePresence>
              {medicines.map((med, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={`med-input-${idx}`} 
                  className="flex gap-2 items-center"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm shrink-0">
                    {idx + 1}
                  </div>
                  <input
                    type="text"
                    value={med}
                    onChange={(e) => updateMedicine(idx, e.target.value)}
                    placeholder="Nhập tên thuốc (VD: Paracetamol, Aspirin...)"
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd] transition-all"
                  />
                  <button 
                    onClick={() => removeMedicineField(idx)}
                    disabled={medicines.length <= 2}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={18} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            <button 
              onClick={addMedicineField}
              className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 font-medium hover:bg-slate-50 hover:text-slate-700 hover:border-slate-400 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Thêm loại thuốc khác
            </button>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex gap-2 items-start">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <button 
                onClick={checkInteractions}
                disabled={loading}
                className="w-full bg-[#0057cd] hover:bg-[#004bb1] text-white py-3 rounded-lg font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    AI Đang phân tích...
                  </>
                ) : (
                  <>
                    <Bot size={20} />
                    Phân tích Tương tác
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: AI Results */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 flex flex-col h-full">
          {!result && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 space-y-4 min-h-[300px]">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-300">
                <ShieldAlert size={32} />
              </div>
              <div>
                <p className="font-medium text-slate-500">Chưa có dữ liệu</p>
                <p className="text-sm">Nhập danh sách thuốc và bấm "Phân tích" để xem kết quả.</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 space-y-4 min-h-[300px]">
              <Bot size={48} className="text-[#0057cd] animate-pulse" />
              <p className="font-medium text-slate-600 animate-pulse">Llama 3 đang tra cứu hàng ngàn tài liệu y khoa...</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-6 h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Header Badge */}
              <div className={`p-4 rounded-xl flex items-center gap-4 ${
                result.has_interactions 
                  ? "bg-red-50 border border-red-200 text-red-800"
                  : "bg-emerald-50 border border-emerald-200 text-emerald-800"
              }`}>
                {result.has_interactions ? <ShieldAlert size={32} className="text-red-500" /> : <ShieldCheck size={32} className="text-emerald-500" />}
                <div>
                  <h3 className="font-bold text-lg">
                    {result.has_interactions ? "Cảnh báo Tương tác!" : "An toàn"}
                  </h3>
                  <p className="text-sm opacity-90">
                    Mức độ nghiêm trọng: <span className="font-bold">{result.severity}</span>
                  </p>
                </div>
              </div>

              {/* General Advice */}
              {result.general_advice && (
                <div className="p-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 shadow-sm flex gap-3">
                  <Info className="text-blue-500 shrink-0" size={20} />
                  <p>{result.general_advice}</p>
                </div>
              )}

              {/* Detailed Interactions List */}
              {result.has_interactions && result.interactions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <Search size={18} className="text-slate-500" />
                    Chi tiết tương tác phát hiện được
                  </h4>
                  
                  <div className="space-y-3">
                    {result.interactions.map((interaction, idx) => (
                      <div key={idx} className="bg-white border-l-4 border-orange-400 rounded-r-xl p-4 shadow-sm text-sm space-y-2">
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-bold">{interaction.drug_a}</span>
                          <span className="text-slate-400">⚡</span>
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-bold">{interaction.drug_b}</span>
                        </div>
                        <p className="text-slate-600"><span className="font-semibold">Hậu quả:</span> {interaction.description}</p>
                        <p className="text-[#0057cd]"><span className="font-semibold">Lời khuyên:</span> {interaction.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
