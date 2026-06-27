import React, { useState, useEffect } from "react";
import { XCircle, Check, ShoppingCart, Info, Activity, ShieldAlert } from "lucide-react";

export interface MedicineDetailModalProps {
  medicine: any | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (med: any, quantity: number) => void;
  addedItems: { [key: string]: boolean };
}

export function MedicineDetailModal({ medicine, isOpen, onClose, onAddToCart, addedItems }: MedicineDetailModalProps) {
  const [modalQuantity, setModalQuantity] = useState<number>(1);

  // Reset quantity when modal opens with a new medicine
  useEffect(() => {
    if (isOpen && medicine) {
      setModalQuantity(1);
    }
  }, [isOpen, medicine]);

  if (!isOpen || !medicine) return null;

  const med = medicine;
  const medId = med.id || med._id;
  const isRx = med.drug_classification === "PRESCRIPTION_ANTIBIOTIC";
  const isOutOfStock = med.stock <= 0;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[32px] border border-slate-100 shadow-2xl w-full max-w-3.5xl overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-50 flex items-start justify-between bg-slate-50/50">
          <div className="flex flex-col gap-1.5 text-left">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                isRx ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-blue-50 text-blue-700 border-blue-100"
              }`}>
                {isRx ? "Thuốc kê đơn (Rx)" : "Không kê đơn"}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                SKU: {med.sku || med.barcode || medId.toString().substring(0, 8).toUpperCase()}
              </span>
            </div>
            <h3 className="text-lg md:text-xl font-black text-slate-800 leading-tight">
              {med.name}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-450 hover:text-slate-650 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
          >
            <XCircle size={22} />
          </button>
        </div>

        {/* Modal Body Columns */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 max-h-[75vh] custom-scrollbar">
          
          {/* Left visual column */}
          <div className="md:col-span-5 flex flex-col gap-6">
            <div className="w-full aspect-square bg-slate-50 rounded-2xl flex items-center justify-center p-6 border border-slate-100 relative group overflow-hidden">
              <img 
                src={med.image || "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500&auto=format&fit=crop&q=60"}
                alt={med.name}
                className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col gap-4 text-left">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase">Đơn giá</span>
                <span className="text-xl font-black text-blue-600">
                  {med.price.toLocaleString()}₫ <span className="text-xs font-semibold text-slate-400">/ {med.unit || "Viên"}</span>
                </span>
              </div>
              
              <div className="flex items-center justify-between border-t border-slate-200/50 pt-4">
                <span className="text-[10px] font-black text-slate-400 uppercase">Số lượng mua</span>
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-inner">
                  <button 
                    onClick={() => setModalQuantity(q => Math.max(1, q - 1))}
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
                    disabled={isOutOfStock}
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-black text-slate-700 text-xs">{modalQuantity}</span>
                  <button 
                    onClick={() => setModalQuantity(q => Math.min(med.stock, q + 1))}
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
                    disabled={isOutOfStock || modalQuantity >= med.stock}
                  >
                    +
                  </button>
                </div>
              </div>

              <button 
                onClick={() => onAddToCart(med, modalQuantity)}
                disabled={isOutOfStock}
                className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
                  isOutOfStock 
                    ? "bg-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none" 
                    : addedItems[medId] 
                      ? "bg-emerald-500 text-white" 
                      : "bg-blue-600 hover:bg-blue-700 text-white active:scale-95 cursor-pointer shadow-blue-100"
                }`}
              >
                {isOutOfStock ? "Tạm hết hàng" : addedItems[medId] ? <><Check size={14} /> Đã thêm!</> : <><ShoppingCart size={14} /> Thêm vào giỏ</>}
              </button>
            </div>
          </div>

          {/* Right content column */}
          <div className="md:col-span-7 flex flex-col gap-5 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-1">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider">Hoạt chất chính</span>
                <span className="font-extrabold text-slate-800 text-xs leading-snug">{med.active_ingredient || "N/A"}</span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-1">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider">Nhóm điều trị</span>
                <span className="font-extrabold text-slate-800 text-xs leading-snug">{med.category || "N/A"}</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-4 mt-2">
              <div className="border-b border-slate-100 pb-3.5">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Info size={14} className="text-blue-600" /> Công dụng thuốc
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">{med.cong_dung || "Chưa cập nhật mô tả chi tiết."}</p>
              </div>
              <div className="border-b border-slate-100 pb-3.5">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Activity size={14} className="text-blue-600" /> Hướng dẫn sử dụng
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">{med.cach_dung || "Tham khảo ý kiến bác sĩ trước khi sử dụng."}</p>
              </div>
              <div className="pb-2">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-blue-600" /> Tác dụng phụ cần lưu ý
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">{med.tac_dung_phu || "Chưa ghi nhận tác dụng phụ đáng kể."}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
