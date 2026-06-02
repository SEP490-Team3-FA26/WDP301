import { useState } from "react";
import { Search, AlertTriangle, ShieldAlert, Sparkles, Printer, XCircle, FileText, CheckCircle2, ChevronRight, Stethoscope, Building, UserSquare2, CreditCard, Banknote, QrCode, PlusCircle, Save, FileCheck, Info, Check, SearchIcon, ArrowLeft, RefreshCw, ShoppingCart, Plus, Minus, Tag, Phone } from "lucide-react";

export function Sales() {
  const [activeTab, setActiveTab] = useState("KÊ ĐƠN / PRESCRIPTION");
  
  const tabs = [
    "BÁN LẺ / RETAIL",
    "KÊ ĐƠN / PRESCRIPTION",
    "BÁN SỈ / WHOLESALE",
    "TRẢ HÀNG / RETURNS",
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Sales Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 pt-2 flex flex-col md:flex-row md:items-end justify-between overflow-x-auto">
        <div className="flex gap-8 whitespace-nowrap">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-[13px] font-bold tracking-wider border-b-2 transition-colors uppercase ${
                activeTab === tab
                  ? "border-[#0057cd] text-[#0057cd]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        {activeTab === "KÊ ĐƠN / PRESCRIPTION" && (
           <div className="flex items-center gap-6 pb-3">
             <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FileText size={16} />
                </div>
                <input 
                    type="text" 
                    defaultValue="RX-99281-HAN" 
                    className="pl-9 pr-4 py-1.5 bg-[#f2f3ff] border border-[#b1c5ff] text-[#0d6efd] rounded-full text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#0057cd] w-48 shadow-sm" 
                />
             </div>
             <div className="flex items-center gap-3 border-l border-slate-200 pl-6 text-right">
                <div className="hidden sm:block">
                   <div className="text-xs font-bold text-slate-900">Pharmacist: Tran Thi A</div>
                   <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Station #04</div>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#0057cd] text-xs font-bold border border-[#b1c5ff] shadow-sm">
                  TA
                </div>
             </div>
           </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden p-6 pb-0">
          {activeTab === "BÁN LẺ / RETAIL" && <RetailView />}
          {activeTab === "KÊ ĐƠN / PRESCRIPTION" && <PrescriptionView />}
          {activeTab === "BÁN SỈ / WHOLESALE" && <WholesaleView />}
          {activeTab === "TRẢ HÀNG / RETURNS" && <ReturnsView />}
      </div>
    </div>
  );
}

function PrescriptionView() {
  return (
    <div className="h-full flex flex-col xl:flex-row gap-6">
        {/* Left Side: Rx Details & List */}
        <div className="flex-1 overflow-auto flex flex-col gap-6 scrollbar-hide pb-6">
           
           {/* Section 1: Prescription Details */}
           <div className="bg-white rounded-[16px] border border-slate-200 p-6 shadow-sm">
             <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-[#f2f3ff] text-[#0057cd] rounded-xl border border-blue-50">
                      <FileText size={24} />
                   </div>
                   <div>
                     <h2 className="text-[18px] font-bold text-slate-900 tracking-tight">Thông tin đơn thuốc / Prescription Details</h2>
                   </div>
                </div>
                <div className="px-3 py-1 bg-amber-50 text-[#a63b00] border border-amber-200 rounded-full text-[11px] uppercase tracking-wider font-bold">
                  Dạng: Điện tử (e-RX)
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="border-l-2 border-slate-100 pl-4">
                  <div className="text-[11px] text-slate-500 font-bold mb-1.5 uppercase tracking-widest">Bệnh nhân / Patient</div>
                  <div className="font-bold text-[15px] text-slate-900 mb-0.5">Nguyễn Văn Nam</div>
                  <div className="text-[13px] text-slate-600">Nam, 42 tuổi | 0905 123 XXX</div>
               </div>
               <div className="border-l-2 border-slate-100 pl-4">
                  <div className="text-[11px] text-slate-500 font-bold mb-1.5 uppercase tracking-widest">Bác sĩ / Doctor</div>
                  <div className="font-bold text-[15px] text-slate-900 mb-0.5">Dr. Le Quang Vinh</div>
                  <div className="text-[13px] text-slate-600">Chuyên khoa: Nội tiết</div>
               </div>
               <div className="border-l-2 border-slate-100 pl-4">
                  <div className="text-[11px] text-slate-500 font-bold mb-1.5 uppercase tracking-widest">Bệnh viện / Hospital</div>
                  <div className="font-bold text-[15px] text-slate-900 mb-0.5">Da Nang Hospital</div>
                  <div className="text-[13px] text-slate-600">Mã BV: DN-4022</div>
               </div>
             </div>
           </div>

           {/* Banner Warning */}
           <div className="bg-[#ffdad6] border border-[#93000a] rounded-[16px] p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm text-[#ba1a1a]">
                  <ShieldAlert size={24} />
              </div>
              <div className="flex-1">
                 <h3 className="text-[#93000a] font-bold text-[15px] mb-1">
                   CHÚ Ý: Phát hiện tương tác thuốc nguy hiểm! / WARNING: Dangerous drug interaction detected!
                 </h3>
                 <p className="text-[#ba1a1a] text-[13px]">
                   Sử dụng đồng thời <span className="font-bold">Clopidogrel</span> và <span className="font-bold">Omeprazole</span> có thể làm giảm hiệu quả chống đông máu. Vui lòng kiểm tra lại với Bác sĩ.
                 </p>
              </div>
              <button className="px-5 py-2.5 bg-[#ba1a1a] hover:bg-[#93000a] text-white font-bold rounded-lg text-sm transition-colors whitespace-nowrap shadow-sm">
                 Xem chi tiết
              </button>
           </div>

           {/* Medication List */}
           <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[400px]">
              <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                 <h2 className="text-[18px] font-bold text-slate-900 tracking-tight">Danh mục thuốc / Medication List</h2>
                 <div className="flex gap-3">
                   <button className="px-4 py-2 border border-slate-200 text-slate-700 font-semibold rounded-lg text-sm hover:bg-slate-50 transition-colors flex items-center gap-2">
                     <CheckCircle2 size={16} /> Check Stock
                   </button>
                   <button className="px-4 py-2 border border-[#b1c5ff] text-[#0057cd] font-semibold rounded-lg text-sm hover:bg-[#f2f3ff] transition-colors flex items-center gap-2">
                     <FileText size={16} /> Add Substitute
                   </button>
                 </div>
              </div>
              <div className="overflow-x-auto border-t border-slate-200">
                 <table className="w-full text-sm text-left">
                    <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                       <tr>
                         <th className="px-6 py-4">Tên thuốc / Item Name</th>
                         <th className="px-6 py-4">Hoạt chất / Ingredient</th>
                         <th className="px-6 py-4">Liều dùng / Dosage</th>
                         <th className="px-4 py-4 text-center">SL / Qty</th>
                         <th className="px-4 py-4 text-center">ĐVT / Unit</th>
                         <th className="px-6 py-4 text-right">Thành tiền / Subtotal</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       <tr className="bg-white hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-5">
                             <div className="font-bold text-slate-900 text-[15px]">Plavix 75mg</div>
                             <div className="text-[11px] text-[#a63b00] font-bold mt-1 uppercase tracking-wider">Mã: DRUG-0012</div>
                          </td>
                          <td className="px-6 py-5 text-[#424655]">Clopidogrel</td>
                          <td className="px-6 py-5 text-[#424655] italic text-[13px]">1 tablet/day, after breakfast</td>
                          <td className="px-4 py-5 text-center font-bold text-slate-900 text-[16px]">28</td>
                          <td className="px-4 py-5 text-center text-[#424655]">Viên / Tabs</td>
                          <td className="px-6 py-5 text-right font-bold text-slate-900 text-[15px]">504,000₫</td>
                       </tr>
                       <tr className="bg-[#ffdad6]/20 hover:bg-[#ffdad6]/40 transition-colors">
                          <td className="px-6 py-5 relative">
                             <div className="font-bold text-[#ba1a1a] text-[15px] flex items-center gap-2">
                                Losec 20mg 
                                <div className="w-4 h-4 rounded-full bg-[#ba1a1a] text-white flex items-center justify-center font-bold text-[10px]">!</div>
                             </div>
                             <div className="text-[11px] text-[#93000a] font-bold mt-1 uppercase tracking-wider">Mã: DRUG-4402</div>
                          </td>
                          <td className="px-6 py-5 text-[#424655]">Omeprazole</td>
                          <td className="px-6 py-5 text-[#424655] italic text-[13px]">1 tablet/day, 30 min before food</td>
                          <td className="px-4 py-5 text-center font-bold text-slate-900 text-[16px]">14</td>
                          <td className="px-4 py-5 text-center text-[#424655]">Viên / Tabs</td>
                          <td className="px-6 py-5 text-right font-bold text-slate-900 text-[15px]">182,000₫</td>
                       </tr>
                       <tr className="bg-white hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-5">
                             <div className="font-bold text-slate-900 text-[15px]">Panadol Extra</div>
                             <div className="text-[11px] text-[#a63b00] font-bold mt-1 uppercase tracking-wider">Mã: DRUG-9910</div>
                          </td>
                          <td className="px-6 py-5 text-[#424655]">Paracetamol + Caffeine</td>
                          <td className="px-6 py-5 text-[#424655] italic text-[13px]">2 tablets/day, when in pain</td>
                          <td className="px-4 py-5 text-center font-bold text-slate-900 text-[16px]">10</td>
                          <td className="px-4 py-5 text-center text-[#424655]">Vỉ / Blister</td>
                          <td className="px-6 py-5 text-right font-bold text-slate-900 text-[15px]">120,000₫</td>
                       </tr>
                    </tbody>
                 </table>
              </div>
              
              {/* AI Prediction Footer */}
              <div className="p-5 m-6 mt-auto bg-[#f2f3ff] border border-[#b1c5ff] rounded-[12px] flex items-start sm:items-center gap-4 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-[#0057cd] blur-[60px] opacity-10 rounded-full translate-x-10 -translate-y-10"></div>
                 <div className="w-12 h-12 rounded-full bg-[#0057cd] flex items-center justify-center text-white shrink-0 shadow-[0_0_15px_rgba(0,87,205,0.3)]">
                    <Sparkles size={24} />
                 </div>
                 <div className="flex-1 relative z-10">
                    <h4 className="text-[14px] font-bold text-[#00419e] tracking-tight">AI Stock Prediction</h4>
                    <p className="text-[13px] text-[#0057cd] mt-0.5 font-medium leading-relaxed">"Plavix 75mg" current stock is 142. Based on prescription trends, consider restocking in 5 days.</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Right Side: Payment & Summary */}
        <div className="w-full xl:w-[400px] flex flex-col gap-6 overflow-y-auto scrollbar-hide pb-6 pl-1">
           
           {/* VIP Card */}
           <div className="bg-[#0057cd] rounded-[16px] p-6 shadow-md text-white relative overflow-hidden">
               {/* Pattern overlay */}
               <div className="absolute top-4 right-4 opacity-20">
                 <QrCode size={56} />
               </div>
               <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
               <div className="absolute top-10 right-10 w-32 h-32 bg-indigo-400/30 rounded-full blur-2xl"></div>
               
               <div className="flex items-center gap-2 text-[#b1c5ff] text-[11px] font-bold tracking-widest mb-4 uppercase relative z-10">
                  <div className="p-1 rounded-full bg-white/20">
                    <Sparkles size={14} className="text-white"/> 
                  </div>
                  VIP GOLD MEMBER
               </div>
               
               <h3 className="text-[24px] font-bold mb-6 tracking-tight relative z-10">Nguyễn Văn Nam</h3>
               
               <div className="flex justify-between items-end relative z-10">
                  <div>
                    <div className="text-[#b1c5ff] text-[11px] font-bold uppercase tracking-wider mb-1">Tích điểm / Points</div>
                    <div className="text-[28px] font-extrabold tracking-tight">14,250 <span className="text-[14px] font-semibold text-[#b1c5ff]">pts</span></div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#b1c5ff] text-[11px] font-bold uppercase tracking-wider mb-1">Discount Available</div>
                    <div className="text-[18px] font-bold text-emerald-300">-5% Order</div>
                  </div>
               </div>
           </div>

           {/* Summary Card */}
           <div className="bg-white rounded-[16px] border border-slate-200 p-6 shadow-sm">
             <h3 className="text-[12px] font-bold text-[#424655] uppercase tracking-widest mb-5 border-b border-slate-100 pb-3">Tổng cộng / Summary</h3>
             <div className="space-y-4 text-[14px]">
                <div className="flex justify-between items-center text-slate-600 font-medium">
                   <span>Tạm tính / Subtotal</span>
                   <span className="font-bold text-slate-900">806,000₫</span>
                </div>
                <div className="flex justify-between items-center font-medium">
                   <span className="text-slate-600">Giảm giá VIP (5%) / Discount</span>
                   <span className="font-bold text-[#ba1a1a]">-40,300₫</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 font-medium">
                   <span>Thuế VAT (8%) / Tax</span>
                   <span className="font-bold text-slate-900">61,256₫</span>
                </div>
             </div>
             
             <div className="mt-6 pt-5 border-t border-slate-200">
                <div className="flex items-end justify-between">
                   <div className="text-[12px] font-bold text-slate-900 uppercase tracking-widest leading-tight">Tổng tiền<br/>/ Total</div>
                   <div className="text-[32px] font-black text-[#0057cd] tracking-tighter">826,956₫</div>
                </div>
             </div>
             <div className="text-right text-[11px] text-[#424655] mt-1.5 uppercase font-bold tracking-wider">+23 points earned</div>
           </div>

           {/* Payment Card */}
           <div className="bg-white rounded-[16px] border border-slate-200 p-6 shadow-sm">
             <h3 className="text-[12px] font-bold text-[#424655] uppercase tracking-widest mb-4">Thanh toán / Payment</h3>
             <div className="grid grid-cols-3 gap-3 mb-5">
                <button className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-[12px] border-2 border-[#0057cd] bg-[#f2f3ff] text-[#0057cd] transition-colors relative">
                  <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#0057cd] rounded-full"></div>
                  <Banknote size={24} />
                  <span className="text-[13px] font-bold">Cash</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-[12px] border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors">
                  <CreditCard size={24} />
                  <span className="text-[13px] font-bold">Card</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-2 p-3.5 rounded-[12px] border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors">
                  <QrCode size={24} />
                  <span className="text-[13px] font-bold">QR Pay</span>
                </button>
             </div>

             <div>
                <label className="block text-[12px] font-bold text-slate-600 mb-2 uppercase tracking-wide">Ghi chú / Remarks</label>
                <textarea 
                  rows={2} 
                  placeholder="Special instructions for patient..."
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-[12px] text-[14px] text-slate-900 focus:ring-2 focus:ring-[#0057cd] outline-none resize-none font-medium placeholder:font-normal placeholder:text-slate-400"
                />
             </div>
           </div>

           {/* Actions */}
           <div className="flex flex-col gap-3 mt-auto">
             <button className="w-full bg-[#0057cd] hover:bg-[#00419e] text-white rounded-[16px] p-5 shadow-sm transition-colors flex flex-col items-center justify-center gap-1.5 group relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-3 font-black text-[18px] uppercase tracking-wide">
                  <Printer size={24} />
                  HOÀN TẤT & IN ĐƠN (F10)
                </div>
                <div className="text-[#b1c5ff] text-[12px] font-bold tracking-wide">Complete Transaction & Print Receipt</div>
             </button>
             <button className="w-full bg-white border border-[#ffdad6] hover:bg-[#ffdad6]/50 text-[#ba1a1a] rounded-[16px] p-4 shadow-sm transition-colors flex items-center justify-center gap-2 font-bold text-[15px]">
                <XCircle size={20} />
                Hủy đơn hàng / Cancel Order
             </button>
           </div>
        </div>
    </div>
  );
}
           
function WholesaleView() {
  return (
    <div className="h-full flex flex-col xl:flex-row gap-6">
        <div className="flex-1 overflow-auto flex flex-col gap-6 scrollbar-hide pb-6">
           {/* Section 1: Customer Info */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white rounded-[16px] border border-slate-200 p-6 shadow-sm flex flex-col justify-center">
                <h2 className="text-[14px] font-bold text-slate-900 tracking-tight mb-3">Tài khoản khách sỉ (Wholesale Customer Account)</h2>
                <input 
                  type="text" 
                  defaultValue="Ha Noi Pharma Group - HN-0992" 
                  className="w-full p-3 bg-white border border-slate-200 rounded-[12px] text-slate-900 focus:ring-2 focus:ring-[#0057cd] outline-none font-medium" 
                />
             </div>
             
             <div className="bg-[#f2f3ff] rounded-[16px] border border-[#b1c5ff] p-6 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-white rounded-[12px] text-[#0057cd] shadow-sm">
                   <Banknote size={28} />
                </div>
                <div>
                   <div className="text-[11px] text-[#0057cd] font-bold uppercase tracking-wider mb-1">HẠN MỨC CÒN LẠI (REMAINING CREDIT)</div>
                   <div className="text-[28px] font-black text-[#00419e] tracking-tight">150.000.000 VND</div>
                </div>
             </div>
           </div>

           {/* Wholesale Cart */}
           <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[400px]">
              <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                 <h2 className="text-[18px] font-bold text-slate-900 tracking-tight">Giỏ hàng bán sỉ (Wholesale Cart)</h2>
                 <button className="text-[#0057cd] font-bold text-sm hover:underline flex items-center gap-2">
                   <PlusCircle size={20} />
                   Thêm mặt hàng (Add Item)
                 </button>
              </div>
              <div className="overflow-x-auto border-t border-slate-200">
                 <table className="w-full text-sm text-left">
                    <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                       <tr>
                         <th className="px-6 py-4">SẢN PHẨM<br/>(PRODUCT)</th>
                         <th className="px-4 py-4 text-center">ĐƠN VỊ<br/>(UNIT)</th>
                         <th className="px-4 py-4 text-center">SỐ LƯỢNG<br/>(QTY)</th>
                         <th className="px-4 py-4 text-center">ĐƠN GIÁ<br/>(UNIT PRICE)</th>
                         <th className="px-6 py-4 text-right">THÀNH TIỀN<br/>(SUBTOTAL)</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       <tr className="bg-white hover:bg-slate-50/50 transition-colors border-l-4 border-rose-600">
                          <td className="px-6 py-5">
                             <div className="font-bold text-slate-900 text-[16px]">Panadol Extra</div>
                             <div className="font-bold text-slate-900 text-[16px] mb-2">(Case)</div>
                             <div className="inline-flex flex-col bg-[#e6fffa] text-emerald-800 text-[11px] font-bold px-2 py-1 rounded">
                               WHOLESALE<br/>PRICE - TIER 3 (-10%)
                             </div>
                          </td>
                          <td className="px-4 py-5 text-center text-[#424655] font-medium">Thùng<br/>(Case)</td>
                          <td className="px-4 py-5 text-center text-center font-bold">
                             <input type="text" defaultValue="50" className="w-20 text-center border border-slate-200 rounded p-1.5 font-bold" />
                          </td>
                          <td className="px-4 py-5 text-center">
                             <div className="text-slate-400 line-through text-[12px]">2.000.000</div>
                             <div className="font-black text-slate-900 text-[16px]">1.800.000</div>
                          </td>
                          <td className="px-6 py-5 text-right font-black text-[#0057cd] text-[18px]">90.000.000</td>
                       </tr>
                       <tr className="bg-white hover:bg-slate-50/50 transition-colors border-l-4 border-rose-600">
                          <td className="px-6 py-5">
                             <div className="font-bold text-slate-900 text-[16px]">Efferalgan 500mg</div>
                             <div className="font-bold text-slate-900 text-[16px] mb-2">(Case)</div>
                             <div className="inline-flex flex-col bg-[#e6fffa] text-emerald-800 text-[11px] font-bold px-2 py-1 rounded">
                               WHOLESALE<br/>PRICE - TIER 3 (-10%)
                             </div>
                          </td>
                          <td className="px-4 py-5 text-center text-[#424655] font-medium">Thùng<br/>(Case)</td>
                          <td className="px-4 py-5 text-center text-center font-bold">
                             <input type="text" defaultValue="25" className="w-20 text-center border border-slate-200 rounded p-1.5 font-bold" />
                          </td>
                          <td className="px-4 py-5 text-center">
                             <div className="text-slate-400 line-through text-[12px]">1.500.000</div>
                             <div className="font-black text-slate-900 text-[16px]">1.350.000</div>
                          </td>
                          <td className="px-6 py-5 text-right font-black text-[#0057cd] text-[18px]">33.750.000</td>
                       </tr>
                    </tbody>
                 </table>
              </div>
              <div className="p-4 text-center border-t border-slate-100">
                <button className="text-[#0057cd] font-bold text-sm hover:underline">
                  Xem thêm 12 mặt hàng phổ biến (View 12 more popular items)
                </button>
              </div>
           </div>

           {/* AI Stock Insight */}
           <div className="bg-white border border-slate-200 rounded-[16px] p-6 shadow-sm flex items-start sm:items-center gap-5 relative overflow-hidden">
             <div className="w-14 h-14 rounded-xl bg-[#e1e2ee] flex items-center justify-center text-[#0057cd] shrink-0">
               <Sparkles size={28} />
             </div>
             <div>
               <h3 className="text-[18px] font-bold text-slate-900 mb-1">Dự báo nhập hàng thông minh (AI Stock Insight)</h3>
               <p className="text-slate-600 text-[14px]">
                 Dựa trên xu hướng mua hàng của Ha Noi Pharma Group, chúng tôi khuyên bạn nên điều chỉnh số lượng đơn hàng cho các mặt hàng sau:
               </p>
             </div>
           </div>
        </div>

        {/* Right Side: Billing */}
        <div className="w-full xl:w-[400px] flex flex-col gap-6 overflow-y-auto scrollbar-hide pb-6 pl-1">
           {/* Summary Card */}
           <div className="bg-white rounded-[16px] border border-slate-200 p-6 shadow-sm">
             <h3 className="text-[18px] font-bold text-slate-900 mb-6">Chi tiết thanh toán (Billing Detail)</h3>
             <div className="space-y-6 text-[15px]">
                <div className="flex justify-between items-center text-slate-600">
                   <span className="max-w-[120px]">Tổng tiền hàng (Items Total)</span>
                   <span className="font-bold text-slate-900 text-[18px]">137.500.000</span>
                </div>
                <hr className="border-slate-100 border-dashed" />
                <div className="flex justify-between items-center text-slate-600">
                   <span className="max-w-[120px]">Chiết khấu sỉ (Wholesale Disc.)</span>
                   <span className="font-bold text-emerald-600 text-[18px]">-13.750.000</span>
                </div>
                <hr className="border-slate-100 border-dashed" />
                <div className="flex justify-between items-center text-slate-600">
                   <span className="max-w-[120px]">Thuế VAT 10% (Tax)</span>
                   <span className="font-bold text-slate-900 text-[18px]">12.375.000</span>
                </div>
                <hr className="border-slate-100 border-dashed" />
                <div className="flex justify-between items-center text-slate-600">
                   <span className="max-w-[120px]">Phí vận chuyển (Shipping)</span>
                   <span className="font-bold text-[#0057cd] text-[18px]">Miễn phí (Free)</span>
                </div>
             </div>
             
             <div className="mt-8 pt-6 border-t-[3px] border-slate-100">
                <div className="flex items-start justify-between">
                   <div className="text-[16px] font-bold text-slate-900 uppercase tracking-widest mt-2">TỔNG CỘNG (TOTAL)</div>
                   <div className="text-[14px] font-bold text-slate-500 mt-2">VNĐ</div>
                </div>
                <div className="text-[42px] font-black text-[#0057cd] tracking-tighter mt-1">136.125.000</div>
             </div>
           </div>

           {/* Actions */}
           <div className="flex flex-col gap-3 mt-auto">
             <button className="w-full bg-[#e1e2ee] hover:bg-[#d8d9e5] text-slate-900 rounded-[12px] p-4 shadow-sm transition-colors flex justify-center items-center gap-2 font-bold text-[16px]">
                <Save size={20} />
                Lưu báo giá (Save Quote)
             </button>
             <button className="w-full bg-[#0057cd] hover:bg-[#00419e] text-white rounded-[12px] p-5 shadow-sm transition-colors flex items-center justify-center gap-3 font-black text-[18px] uppercase tracking-wide">
                <CheckCircle2 size={24} />
                Xác nhận đơn sỉ (Confirm Order)
             </button>
             <button className="w-full bg-transparent hover:bg-rose-50 text-[#ba1a1a] rounded-[12px] p-4 transition-colors flex items-center justify-center gap-2 font-bold text-[15px]">
                <XCircle size={20} />
                Hủy đơn hàng (Cancel)
             </button>
           </div>
        </div>
    </div>
  );
}

function ReturnsView() {
  return (
    <div className="h-full flex flex-col xl:flex-row gap-6">
        {/* Left Side: Return Details */}
        <div className="flex-1 overflow-auto flex flex-col gap-6 scrollbar-hide pb-6">
           <div className="bg-white border border-slate-200 rounded-[16px] p-6 shadow-sm">
             <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3">
                   <FileText className="text-[#0057cd]" size={24} />
                   <h2 className="text-[18px] font-bold text-slate-900 tracking-tight">Tra cứu hóa đơn / Search Invoice</h2>
                 </div>
             </div>
             <div>
               <label className="block text-[14px] font-bold text-slate-900 mb-2">Mã hóa đơn gốc / Original Invoice ID</label>
               <div className="flex gap-4 flex-col sm:flex-row">
                 <input 
                    type="text" 
                    defaultValue="HD-20231024-0012" 
                    className="flex-1 p-3 bg-white border border-slate-200 rounded-[12px] text-slate-900 focus:ring-2 focus:ring-[#0057cd] outline-none font-medium text-[15px]" 
                 />
                 <button className="px-6 py-3 bg-[#0057cd] text-white font-bold rounded-[12px] flex items-center justify-center gap-2 shadow-sm whitespace-nowrap">
                   <Search size={20} /> Tra cứu / Lookup
                 </button>
               </div>
             </div>
           </div>

           <div className="bg-white border border-slate-200 rounded-[16px] p-6 shadow-sm flex-1 flex flex-col">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                 <div className="flex items-center gap-3">
                   <ArrowLeft className="text-[#0057cd]" size={24} />
                   <h2 className="text-[18px] font-bold text-slate-900 tracking-tight">Quản lý hoàn trả / Return Manager</h2>
                 </div>
                 <div className="flex gap-4">
                   <div className="bg-[#f2f3ff] px-4 py-2 rounded-xl text-sm border border-[#e1e2ee]">
                      <div className="text-[11px] text-slate-500 font-bold uppercase mb-0.5">Khách hàng:</div>
                      <div className="font-bold text-slate-900">Nguyễn Văn A</div>
                   </div>
                   <div className="bg-[#f2f3ff] px-4 py-2 rounded-xl text-sm border border-[#e1e2ee]">
                      <div className="text-[11px] text-slate-500 font-bold uppercase mb-0.5">Ngày mua:</div>
                      <div className="font-bold text-slate-900">24/10/2023</div>
                   </div>
                 </div>
             </div>

             <div className="overflow-x-auto border border-slate-200 rounded-xl flex-1">
                 <table className="w-full text-sm text-left">
                    <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                       <tr>
                         <th className="px-4 py-4 w-12 text-center">
                            <input type="checkbox" className="w-4 h-4 rounded text-[#0057cd] focus:ring-[#0057cd]" checked readOnly />
                         </th>
                         <th className="px-4 py-4">SẢN PHẨM /<br/>PRODUCT</th>
                         <th className="px-4 py-4 text-center">SL GỐC<br/>/ ORIG. QTY</th>
                         <th className="px-4 py-4 text-center">SL TRẢ /<br/>RET. QTY</th>
                         <th className="px-4 py-4 text-center">TÌNH TRẠNG /<br/>CONDITION</th>
                         <th className="px-4 py-4 text-right">ĐƠN GIÁ /<br/>UNIT PRICE</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       <tr className="bg-white">
                          <td className="px-4 py-5 text-center">
                             <input type="checkbox" className="w-4 h-4 rounded text-[#0057cd] focus:ring-[#0057cd]" checked readOnly />
                          </td>
                          <td className="px-4 py-5">
                             <div className="font-bold text-[#0057cd] text-[15px]">Augmentin 625mg</div>
                             <div className="text-[12px] text-slate-500 mt-1">Hộp 14 viên • Lô: EX2025</div>
                          </td>
                          <td className="px-4 py-5 text-center font-bold text-slate-900 text-[16px]">2</td>
                          <td className="px-4 py-5 text-center">
                             <input type="text" defaultValue="1" className="w-16 text-center border border-slate-200 shadow-inner rounded p-1.5 font-bold focus:border-[#0057cd] outline-none" />
                          </td>
                          <td className="px-4 py-5 text-center">
                             <select className="border border-slate-200 rounded p-1.5 text-sm bg-white focus:outline-none focus:border-[#0057cd]">
                               <option>Còn nguyên</option>
                             </select>
                          </td>
                          <td className="px-4 py-5 text-right font-black text-slate-900 text-[16px]">185.000đ</td>
                       </tr>
                       <tr className="bg-slate-50 opacity-60">
                          <td className="px-4 py-5 text-center">
                             <input type="checkbox" className="w-4 h-4 rounded text-[#0057cd] focus:ring-[#0057cd]" readOnly />
                          </td>
                          <td className="px-4 py-5">
                             <div className="font-bold text-slate-900 text-[15px]">Panadol Extra</div>
                             <div className="text-[12px] text-slate-500 mt-1">Vỉ 12 viên • Lô: PD2024</div>
                          </td>
                          <td className="px-4 py-5 text-center font-bold text-slate-900 text-[16px]">5</td>
                          <td className="px-4 py-5 text-center">
                             <input type="text" defaultValue="0" className="w-16 text-center border border-slate-200 rounded p-1.5 font-bold" disabled />
                          </td>
                          <td className="px-4 py-5 text-center">
                             <select className="border border-slate-200 rounded p-1.5 text-sm bg-white" disabled>
                               <option>Còn nguyên</option>
                             </select>
                          </td>
                          <td className="px-4 py-5 text-right font-black text-slate-900 text-[16px]">45.000đ</td>
                       </tr>
                       <tr className="bg-white">
                          <td className="px-4 py-5 text-center">
                             <input type="checkbox" className="w-4 h-4 rounded text-[#0057cd] focus:ring-[#0057cd]" checked readOnly />
                          </td>
                          <td className="px-4 py-5">
                             <div className="font-bold text-[#0057cd] text-[15px]">Strepsils Cool</div>
                             <div className="text-[12px] text-slate-500 mt-1">Hộp 24 viên • Lô: ST9982</div>
                          </td>
                          <td className="px-4 py-5 text-center font-bold text-slate-900 text-[16px]">1</td>
                          <td className="px-4 py-5 text-center">
                             <input type="text" defaultValue="1" className="w-16 text-center border border-slate-200 shadow-inner rounded p-1.5 font-bold focus:border-[#0057cd] outline-none" />
                          </td>
                          <td className="px-4 py-5 text-center">
                             <select className="border border-slate-200 rounded p-1.5 text-sm bg-[#ffdad6]/30 text-[#ba1a1a] font-medium focus:outline-none focus:border-[#0057cd]">
                               <option>Hộp móp méo</option>
                             </select>
                          </td>
                          <td className="px-4 py-5 text-right font-black text-slate-900 text-[16px]">35.000đ</td>
                       </tr>
                    </tbody>
                 </table>
             </div>
           </div>

           <div className="bg-[#f2f3ff] border border-[#b1c5ff] rounded-[16px] p-6 flex flex-col sm:flex-row gap-5">
             <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-[#0057cd] shrink-0 shadow-sm">
                <Sparkles size={24} />
             </div>
             <div>
                <h3 className="text-[16px] font-bold text-[#00419e] mb-2 flex items-center gap-2">
                  AI Phân tích hoàn trả / Return Insights
                </h3>
                <div className="text-[#0057cd] text-[14px] leading-relaxed space-y-1">
                   <p><span className="font-bold text-slate-800">Lý do dự đoán:</span> Khách hàng báo cáo tác dụng phụ nhẹ (chóng mặt). Đây là trường hợp hoàn trả <span className="text-[#ba1a1a] font-bold">ngoại lệ</span>.</p>
                   <p><span className="font-bold text-slate-800">Khuyến nghị:</span> Ưu tiên hoàn tiền qua <u>Voucher</u> để giữ chân khách hàng (LTV: Cao). Kiểm tra lại chất lượng lô hàng EX2025.</p>
                </div>
             </div>
           </div>

           <div className="mt-4">
              <h3 className="text-[13px] font-bold text-slate-600 uppercase tracking-widest mb-4">PHƯƠNG THỨC HOÀN TIỀN / REFUND METHOD</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="border-2 border-[#0057cd] rounded-[12px] p-4 flex items-center gap-4 bg-[#f2f3ff] cursor-pointer">
                    <div className="w-6 h-6 rounded-full border-4 border-[#0057cd] bg-white"></div>
                    <div className="flex-1">
                       <div className="font-bold text-[#00419e]">Tiền mặt / Cash Refund</div>
                       <div className="text-[13px] text-slate-600">Hoàn trả ngay lập tức bằng tiền mặt</div>
                    </div>
                    <Banknote className="text-[#0057cd] opacity-50" size={24} />
                 </div>
                 <div className="border border-slate-200 rounded-[12px] p-4 flex items-center gap-4 bg-white cursor-pointer hover:border-slate-300">
                    <div className="w-6 h-6 rounded-full border-2 border-slate-300 bg-white"></div>
                    <div className="flex-1">
                       <div className="font-bold text-slate-900">Voucher cửa hàng / Voucher</div>
                       <div className="text-[13px] text-slate-600">Tặng mã giảm giá cho lần mua sau</div>
                    </div>
                    <QrCode className="text-slate-400" size={24} />
                 </div>
              </div>
           </div>
        </div>

        {/* Right Side: Summary */}
        <div className="w-full xl:w-[400px] flex flex-col gap-6 overflow-y-auto scrollbar-hide pb-6 pl-1">
           <div className="bg-white rounded-[16px] border border-slate-200 p-6 shadow-sm border-t-4 border-t-[#0057cd]">
             <h3 className="text-[18px] font-bold text-slate-900 mb-6">Tổng kết hoàn trả / Refund Summary</h3>
             <div className="space-y-4 text-[14px]">
                <div className="flex justify-between items-center text-slate-600">
                   <span>Tạm tính / Subtotal:</span>
                   <span className="text-slate-900">220.000đ</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                   <span>Phí xử lý / Proc. Fee (5%):</span>
                   <span className="text-[#ba1a1a]">-11.000đ</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                   <span>Khấu trừ móp méo / Damage:</span>
                   <span className="text-[#ba1a1a]">-10.000đ</span>
                </div>
             </div>
             
             <div className="mt-6 pt-5 border-t border-slate-200">
                <div className="flex justify-between items-center">
                   <div className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">TỔNG HOÀN / TOTAL:</div>
                   <div className="text-[28px] font-black text-[#0057cd]">199.000đ</div>
                </div>
             </div>
             
             <div className="mt-8 bg-[#f8fafc] border border-slate-200 rounded-[12px] p-4">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-2">GHI CHÚ HOÀN TRẢ / NOTE</label>
                <textarea 
                  rows={4} 
                  placeholder="Nhập lý do chi tiết..."
                  className="w-full p-3 bg-white border border-slate-200 rounded-[8px] text-[13px] text-slate-900 outline-none resize-none"
                />
             </div>

             <div className="mt-6 flex flex-col gap-3">
               <button className="w-full bg-[#0057cd] hover:bg-[#00419e] text-white rounded-[12px] p-4 shadow-sm transition-colors flex items-center justify-center gap-2 font-bold text-[16px]">
                  <CheckCircle2 size={20} />
                  Xác nhận hoàn trả / Confirm
               </button>
               <button className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-[12px] p-4 transition-colors flex items-center justify-center gap-2 font-bold text-[15px]">
                  <XCircle size={20} />
                  Hủy lệnh / Cancel
               </button>
             </div>
           </div>

           <div className="bg-[#e6fffa] rounded-[16px] border border-emerald-200 p-6 overflow-hidden relative">
              <div className="absolute -top-10 -right-10 opacity-10">
                 <RefreshCw size={120} className="text-emerald-600" />
              </div>
              <h4 className="text-[13px] font-bold text-emerald-800 uppercase tracking-widest mb-2 flex items-center gap-2 relative z-10">
                 <Info size={16} /> MẸO XỬ LÝ HOÀN TRẢ
              </h4>
              <p className="text-emerald-900 text-[14px] leading-relaxed relative z-10">
                 Kiểm tra tem niêm phong kỹ lưỡng trước khi nhập lại kho (In-stock).
              </p>
           </div>
        </div>
    </div>
  );
}

function RetailView() {
  return (
    <div className="h-full flex flex-col xl:flex-row gap-6">
        {/* Left Side: Cart & Scan */}
        <div className="flex-1 overflow-auto flex flex-col gap-6 scrollbar-hide pb-6">
           <div className="flex gap-4">
             <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <SearchIcon size={18} />
                </div>
                <input 
                  type="text" 
                  placeholder="Tìm kiếm theo tên thuốc, hoạt chất, triệu chứng / Search by name..."
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-[12px] text-slate-900 focus:ring-2 focus:ring-[#0057cd] outline-none font-medium shadow-sm transition-all" 
                />
             </div>
             <button className="px-6 py-3 bg-[#0d6efd] text-white font-bold rounded-[12px] flex items-center gap-2 shadow-sm shrink-0 whitespace-nowrap">
                <QrCode size={18} />
                QUÉT ĐƠN THUỐC / SCAN RX
             </button>
           </div>
           
           {/* Banner Warning */}
           <div className="bg-[#ffdad6] border border-[#93000a] rounded-[12px] p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                 <h3 className="text-[#93000a] font-bold text-[15px] mb-1 flex items-center gap-2 uppercase tracking-wide">
                   <AlertTriangle size={18} /> CẢNH BÁO TƯƠNG TÁC THUỐC / DRUG INTERACTION DETECTED
                 </h3>
                 <p className="text-[#ba1a1a] text-[13px] ml-6">
                   Ciprofloxacin + Warfarin: Tăng nguy cơ chảy máu nghiêm trọng. / High risk of severe bleeding.
                 </p>
              </div>
              <button className="px-5 py-2.5 bg-[#ba1a1a] hover:bg-[#93000a] text-white font-bold rounded-lg text-sm transition-colors whitespace-nowrap shadow-sm">
                 XEM CHI TIẾT
              </button>
           </div>

           <div className="bg-white rounded-[16px] border border-slate-200 flex-1 flex flex-col shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-[16px]">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                     <ShoppingCart size={20} className="text-[#0057cd]" />
                     Giỏ hàng / Shopping Cart
                  </div>
                  <div className="px-3 py-1 bg-[#d8e3fb] text-[#00419e] font-bold text-[11px] rounded-full uppercase tracking-wider">
                     04 SẢN PHẨM
                  </div>
              </div>
              
              <div className="flex-1 overflow-x-auto min-h-[250px]">
                 <table className="w-full text-sm text-left">
                    <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                       <tr>
                         <th className="px-6 py-4">TÊN THUỐC / MEDICINE</th>
                         <th className="px-4 py-4">HOẠT CHẤT / INGREDIENTS</th>
                         <th className="px-4 py-4 text-center">SỐ LƯỢNG / QTY</th>
                         <th className="px-4 py-4 text-center">ĐƠN VỊ / UNIT</th>
                         <th className="px-6 py-4 text-right">THÀNH TIỀN / TOTAL</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-5">
                             <div className="font-bold text-slate-900 text-[15px]">Augmentin 625mg</div>
                             <div className="text-[11px] text-slate-500 mt-0.5">Hộp 14 viên / Box 14 tabs</div>
                          </td>
                          <td className="px-4 py-5 text-slate-600 text-[13px] leading-relaxed">
                            Amoxicillin<br/>+<br/>Clavulanic Acid
                          </td>
                          <td className="px-4 py-5 text-center">
                            <div className="flex items-center justify-center gap-3">
                               <button className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"><Minus size={14}/></button>
                               <span className="font-bold text-[16px] text-slate-900">02</span>
                               <button className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"><Plus size={14}/></button>
                            </div>
                          </td>
                          <td className="px-4 py-5 text-center text-slate-600">Hộp / Box</td>
                          <td className="px-6 py-5 text-right font-bold text-[#0057cd] text-[16px]">320,000₫</td>
                       </tr>
                       <tr className="bg-[#ffdad6]/20 relative">
                          <td className="px-6 py-5">
                             <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-[#ba1a1a] rounded-r"></div>
                             <div className="font-bold text-slate-900 text-[15px] flex items-center gap-1.5">
                                <AlertTriangle size={14} className="text-[#ba1a1a]"/> Warfarin 5mg
                             </div>
                          </td>
                          <td className="px-4 py-5 text-slate-600 text-[13px]">Warfarin Sodium</td>
                          <td className="px-4 py-5 text-center">
                            <div className="flex items-center justify-center gap-3">
                               <button className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50"><Minus size={14}/></button>
                               <span className="font-bold text-[16px] text-slate-900">01</span>
                               <button className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50"><Plus size={14}/></button>
                            </div>
                          </td>
                          <td className="px-4 py-5 text-center text-slate-600">Vỉ / Blister</td>
                          <td className="px-6 py-5 text-right font-bold text-[#0057cd] text-[16px]">85,000₫</td>
                       </tr>
                    </tbody>
                 </table>
              </div>
              <div className="border-t border-slate-100 p-4">
                 <button className="w-full py-4 border-2 border-dashed border-[#b1c5ff] bg-[#f2f3ff] text-[#0057cd] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#d8e3fb] transition-colors">
                    <Plus size={20} />
                    Thêm thuốc nhanh / Quick Add 
                    <span className="ml-2 font-normal italic text-[12px] opacity-70 border-l border-[#0057cd]/30 pl-2">Hệ thống kiểm tra an toàn thời gian thực... / Real-time safety check active</span>
                 </button>
              </div>
           </div>

           <div className="bg-[#f2f3ff] border border-[#d8e3fb] rounded-[16px] p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[#0057cd] font-bold text-[14px] uppercase tracking-widest mb-4">
                 <Sparkles size={18} /> GỢI Ý TỪ AI / AI PREDICTIVE ORDERING
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="bg-white p-4 rounded-[12px] border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#e6f0ff] text-[#0057cd] flex items-center justify-center shrink-0"><Plus size={20}/></div>
                    <div>
                       <div className="font-bold text-slate-900 text-[14px]">Vitamin C 1000mg</div>
                       <button className="text-[#0057cd] font-bold text-[12px] mt-1 hover:underline uppercase">+ THÊM VÀO ĐƠN</button>
                    </div>
                 </div>
                 <div className="bg-white p-4 rounded-[12px] border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#f0f9ff] text-sky-600 flex items-center justify-center shrink-0"><Plus size={20}/></div>
                    <div>
                       <div className="font-bold text-slate-900 text-[14px]">Khẩu trang N95</div>
                       <button className="text-[#0057cd] font-bold text-[12px] mt-1 hover:underline uppercase">+ THÊM VÀO ĐƠN</button>
                    </div>
                 </div>
                 <div className="bg-[#0057cd] p-4 rounded-[12px] text-white shadow-sm flex flex-col justify-center">
                    <div className="font-bold text-[11px] text-[#b1c5ff] uppercase tracking-wider mb-1">PHÒNG DỊCH</div>
                    <div className="text-[12px] font-medium leading-tight italic">Nhu cầu khẩu trang đang tăng 25% tại khu vực này.</div>
                 </div>
              </div>
           </div>
        </div>

        {/* Right Side: Payment & Tools */}
        <div className="w-full xl:w-[380px] flex flex-col gap-6 overflow-y-auto scrollbar-hide pb-6 pl-1">
           <div className="bg-white border text-center border-slate-200 rounded-[16px] p-5 shadow-sm">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">KHÁCH HÀNG / CUSTOMER</h3>
               <button className="text-[#0057cd] text-[12px] font-bold underline">Thay đổi</button>
             </div>
             <div className="bg-[#f8fafc] rounded-xl p-4 flex items-center gap-4 border border-slate-100">
                <div className="w-12 h-12 rounded-full bg-[#d8e3fb] text-[#00419e] font-black text-lg flex items-center justify-center shrink-0 ring-4 ring-white shadow-sm">NH</div>
                <div className="text-left flex-1 min-w-0">
                   <div className="font-bold text-[16px] text-slate-900 truncate">Nguyễn Hoàng Nam</div>
                   <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">SILVER MEMBER • VIP</div>
                </div>
             </div>
             <div className="flex divide-x divide-slate-100 mt-4 pt-4 border-t border-slate-100">
                <div className="flex-1">
                   <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">ĐIỂM / POINTS</div>
                   <div className="text-[18px] font-bold text-[#0057cd] mt-1">1,250 pts</div>
                </div>
                <div className="flex-1">
                   <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">HẠNG THẺ</div>
                   <div className="text-[16px] font-bold text-amber-600 mt-1">Vàng / Gold</div>
                </div>
             </div>
           </div>

           <div className="bg-white border border-slate-200 rounded-[16px] p-6 shadow-sm">
             <h3 className="text-[12px] font-bold text-slate-500 uppercase tracking-widest mb-3">KHUYẾN MÃI / PROMOTION</h3>
             <div className="flex gap-2 mb-6">
                <input type="text" placeholder="Nhập mã ưu đãi..." className="flex-1 p-2.5 bg-[#f8fafc] border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0057cd] transition-colors" />
                <button className="bg-slate-600 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition-colors">Áp dụng</button>
             </div>

             <div className="space-y-4 text-[14px]">
                <div className="flex justify-between items-center text-slate-600">
                   <span>Tạm tính / Subtotal (4 SP)</span>
                   <span className="text-slate-900 font-medium">550,000đ</span>
                </div>
                <div className="flex justify-between items-center text-[#ba1a1a]">
                   <span>Giảm giá / Discount</span>
                   <span className="font-bold">-50,000đ</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                   <span>Thuế VAT (8%)</span>
                   <span className="text-slate-900 font-medium">18,400đ</span>
                </div>
             </div>
             
             <div className="mt-6 pt-5 border-t border-slate-200 flex items-end justify-between">
                <div className="text-[14px] font-black text-slate-900 uppercase tracking-widest pb-1">TỔNG CỘNG / TOTAL</div>
                <div className="text-right">
                   <div className="text-[36px] font-black text-[#0057cd] leading-none tracking-tighter">518,400đ</div>
                   <div className="text-[10px] font-bold text-slate-400 italic mt-1">+23 points earned</div>
                </div>
             </div>
           </div>

           <div className="flex flex-col gap-2 mt-auto">
             <div className="mb-2">
                <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">HÌNH THỨC THANH TOÁN / PAYMENT</h3>
                <div className="grid grid-cols-2 gap-2">
                   <button className="flex items-center justify-center gap-2 p-3 border-2 border-[#0057cd] rounded-xl text-[#0057cd] font-bold text-sm bg-[#f0f6ff]">
                      <Banknote size={18}/> Tiền mặt
                   </button>
                   <button className="flex items-center justify-center gap-2 p-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-700 py-3 font-medium text-sm transition-colors">
                      <QrCode size={18}/> VNPay/QR
                   </button>
                   <button className="flex items-center justify-center gap-2 p-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-700 py-3 font-medium text-sm transition-colors">
                      <CreditCard size={18}/> Thẻ / Card
                   </button>
                   <button className="flex items-center justify-center gap-2 p-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-700 py-3 font-medium text-sm transition-colors">
                      <Building size={18}/> C.Khoản
                   </button>
                </div>
             </div>
             <button className="w-full bg-[#e1e2ee] hover:bg-[#d8d9e5] text-slate-700 rounded-xl p-4 shadow-sm transition-colors font-bold text-[15px] mt-2">
                TẠM GIỮ ĐƠN / HOLD ORDER
             </button>
             <button className="w-full bg-[#0057cd] hover:bg-[#00419e] text-white rounded-xl p-5 shadow-sm transition-colors flex items-center justify-center gap-2 font-black text-[16px] uppercase tracking-wide">
                <Printer size={20}/>
                XÁC NHẬN & IN HÓA ĐƠN
             </button>
           </div>
        </div>
    </div>
  );
}
