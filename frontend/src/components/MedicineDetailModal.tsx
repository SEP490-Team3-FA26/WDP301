import React, { useState, useEffect } from "react";
import { X, Loader2, Check, ShoppingCart } from "lucide-react";

export interface MedicineDetailModalProps {
  medicine: any | null;
  isOpen: boolean;
  onClose: () => void;
  fetchingDetails?: boolean;
  // Cho phía customer
  onAddToCart?: (med: any, quantity: number) => void;
  addedItems?: { [key: string]: boolean };
}

export function MedicineDetailModal({ 
  medicine, 
  isOpen, 
  onClose, 
  fetchingDetails = false,
  onAddToCart,
  addedItems = {} 
}: MedicineDetailModalProps) {
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
  const isRx = med.drug_classification === 'PRESCRIPTION_ANTIBIOTIC';
  const isOutOfStock = med.stock <= 0;
  
  // Xác định mode hiển thị (có nút add to cart hay không)
  const isCustomerMode = !!onAddToCart;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <h2 className="text-lg font-bold text-slate-900">Chi Tiết Thông Tin Dược Phẩm</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {fetchingDetails ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-[#0057cd]" size={32} />
              <p className="text-slate-500 font-medium">Đang tải dữ liệu y khoa...</p>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                {med.image && (
                  <div className="w-32 h-32 rounded-xl border border-slate-200 overflow-hidden flex-shrink-0 p-2 bg-white shadow-sm flex items-center justify-center">
                    <img src={med.image} alt={med.name} className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{med.name}</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2.5 py-1 bg-blue-50 text-[#0057cd] text-xs font-bold rounded-md border border-blue-100">
                      {med.category || 'Chưa phân loại'}
                    </span>
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-md border ${isRx ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-slate-100 text-slate-700 border-slate-200"}`}>
                      {isRx ? 'Kê đơn / Kháng sinh' : 'Không kê đơn'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-500">Mã SKU:</span>
                      <span className="font-semibold text-slate-900">{med.sku || med.barcode || medId?.toString()?.substring(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-500">Hạn sử dụng:</span>
                      <span className="font-semibold text-slate-900">{med.expiry_date || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-500">Tồn kho:</span>
                      <span className="font-semibold text-slate-900">{med.stock} {med.unit || 'Hộp'}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-500">Quy cách:</span>
                      <span className="font-semibold text-slate-900 max-w-[150px] truncate" title={med.thong_tin_chi_tiet?.['Quy cách']}>
                        {med.thong_tin_chi_tiet?.['Quy cách'] || med.unit || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col max-h-[250px]">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-3 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-[#0057cd]"></div> Thành phần chính
                  </h4>
                  <div className="overflow-y-auto pr-2 custom-scrollbar">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {med.thong_tin_chi_tiet?.['Thành phần'] || med.active_ingredient || 'Không có thông tin'}
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-50/50 rounded-xl p-5 border border-emerald-100 shadow-sm flex flex-col max-h-[250px]">
                  <h4 className="font-bold text-emerald-900 flex items-center gap-2 mb-3 shrink-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Công dụng
                  </h4>
                  <div className="overflow-y-auto pr-2 custom-scrollbar">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {med.cong_dung || 'Không có thông tin'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50/50 rounded-xl p-5 border border-amber-100 shadow-sm flex flex-col max-h-[250px]">
                <h4 className="font-bold text-amber-900 flex items-center gap-2 mb-3 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div> Liều dùng & Cách dùng
                </h4>
                <div className="overflow-y-auto pr-2 custom-scrollbar">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {med.cach_dung || 'Theo chỉ định của bác sĩ'}
                  </p>
                </div>
              </div>

              <div className="bg-rose-50/50 rounded-xl p-5 border border-rose-100 shadow-sm flex flex-col max-h-[300px]">
                <h4 className="font-bold text-rose-900 flex items-center gap-2 mb-3 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div> Lưu ý & Chống chỉ định
                </h4>
                <div className="overflow-y-auto pr-2 custom-scrollbar">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {med.luu_y || med.tac_dung_phu || 'Không có thông tin'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-end items-center gap-4">
          {isCustomerMode && !fetchingDetails && (
            <div className="flex items-center gap-6 mr-auto">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase">Đơn giá</span>
                <span className="text-lg font-black text-blue-600 leading-none mt-1">
                  {med.price?.toLocaleString()}₫ <span className="text-xs font-semibold text-slate-400">/ {med.unit || "Hộp"}</span>
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-inner h-10">
                <button 
                  onClick={() => setModalQuantity(q => Math.max(1, q - 1))}
                  className="w-8 h-full rounded-lg flex items-center justify-center font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
                  disabled={isOutOfStock}
                >
                  -
                </button>
                <span className="w-8 text-center font-black text-slate-700 text-sm">{modalQuantity}</span>
                <button 
                  onClick={() => setModalQuantity(q => Math.min(med.stock, q + 1))}
                  className="w-8 h-full rounded-lg flex items-center justify-center font-bold text-slate-500 hover:bg-slate-100 transition-all cursor-pointer"
                  disabled={isOutOfStock || modalQuantity >= med.stock}
                >
                  +
                </button>
              </div>

              <button 
                onClick={() => onAddToCart(med, modalQuantity)}
                disabled={isOutOfStock}
                className={`h-10 px-6 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
                  isOutOfStock 
                    ? "bg-slate-200 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none" 
                    : addedItems[medId] 
                      ? "bg-emerald-500 text-white" 
                      : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-blue-100"
                }`}
              >
                {isOutOfStock ? "Tạm hết hàng" : addedItems[medId] ? <><Check size={14} /> Đã thêm!</> : <><ShoppingCart size={14} /> Thêm vào giỏ</>}
              </button>
            </div>
          )}
          
          <button
            onClick={onClose}
            className="px-6 h-10 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm ml-auto"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
