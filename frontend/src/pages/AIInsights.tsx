import React, { useState } from "react";
import { 
  Sparkles, 
  Send, 
  TrendingUp, 
  AlertTriangle, 
  Package, 
  Lightbulb, 
  BarChart2, 
  RefreshCw,
  Building2
} from "lucide-react";

export function AIInsights() {
  const [prompt, setPrompt] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const mockInsights = [
    {
      id: 1,
      type: "warning",
      title: "Dự báo cạn kiệt thuốc hạ sốt",
      desc: "Dựa trên xu hướng thời tiết chuyển mùa và lịch sử bán hàng năm ngoái, nhu cầu Paracetamol và Ibuprofen dự kiến tăng 45% trong 2 tuần tới. Tồn kho tại CN1 (Q.1) và CN3 (ĐN) hiện tại không đủ đáp ứng.",
      action: "Khuyến nghị: Lên đơn nhập thêm 500 hộp Paracetamol 500mg phân bổ đều cho 2 chi nhánh trên.",
      icon: <AlertTriangle size={20} className="text-amber-500" />
    },
    {
      id: 2,
      type: "opportunity",
      title: "Cơ hội tăng biên lợi nhuận Thực phẩm chức năng",
      desc: "Sản phẩm Vitamin C 1000mg và Kẽm đang có doanh số tốt vào cuối tuần, đặc biệt tại CN2 (Thảo Điền). Tuy nhiên biên lợi nhuận đang thấp do nhập nhỏ lẻ.",
      action: "Khuyến nghị: Đàm phán trực tiếp với Eco Pharma để nhập số lượng lớn (trên 1000 hộp) nhằm hưởng chiết khấu 15%.",
      icon: <TrendingUp size={20} className="text-emerald-500" />
    },
    {
      id: 3,
      type: "optimize",
      title: "Tối ưu hóa nhân sự ca tối",
      desc: "Phân tích lượng khách hàng từ 19:00 - 22:00 tại CN4 (Hà Nội) cho thấy lưu lượng giảm 30% so với 3 tháng trước, trong khi vẫn duy trì 4 nhân viên trực.",
      action: "Khuyến nghị: Giảm 1 nhân sự ca tối tại CN4 và chuyển sang ca sáng (07:00 - 11:00) đang có hiện tượng quá tải giờ cao điểm.",
      icon: <Building2 size={20} className="text-blue-500" />
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
           <Sparkles size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Insights & Phân Tích Dữ Liệu</h1>
          <p className="text-slate-500 mt-1">Trợ lý AI phân tích dữ liệu kho và doanh thu để đưa ra gợi ý tối ưu.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
         {/* Main Chat/Search Area */}
         <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
               {/* Welcome message */}
               <div className="flex gap-4 max-w-3xl">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex justify-center items-center shrink-0">
                     <Sparkles size={16} className="text-white" />
                  </div>
                  <div>
                     <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm text-slate-700 leading-relaxed text-sm">
                        <p className="font-semibold text-slate-900 mb-2">Xin chào! Dưới đây là tóm tắt nhanh về hệ thống hôm nay:</p>
                        <ul className="space-y-2 list-none p-0">
                           <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">•</span> Doanh thu toàn chuỗi tăng 12.5% so với tuần trước.</li>
                           <li className="flex items-start gap-2"><span className="text-rose-500 mt-0.5">•</span> Có 12 cảnh báo tồn kho cần xử lý ở CN1 và CN2.</li>
                           <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">•</span> Đã tự động tạo và gửi báo cáo tồn kho định kỳ tính đến 6:00 sáng nay.</li>
                        </ul>
                        <p className="mt-4 text-slate-500">Bạn muốn tôi phân tích chuyên sâu về vấn đề gì?</p>
                     </div>
                  </div>
               </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-100">
               <div className="flex items-center gap-2 max-w-4xl mx-auto mb-3">
                  <span className="text-xs font-semibold text-slate-500">Gợi ý:</span>
                  <button className="px-3 py-1.5 bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-700 text-xs font-medium rounded-lg border border-slate-200 hover:border-purple-200 transition-colors">Dự báo nhu cầu tuần tới</button>
                  <button className="px-3 py-1.5 bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-700 text-xs font-medium rounded-lg border border-slate-200 hover:border-purple-200 transition-colors hidden sm:block">Phân tích thuốc sắp hạn</button>
                  <button className="px-3 py-1.5 bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-700 text-xs font-medium rounded-lg border border-slate-200 hover:border-purple-200 transition-colors hidden sm:block">Đánh giá doanh thu CN1 vs CN2</button>
               </div>
               <div className="relative max-w-4xl mx-auto flex items-end gap-2">
                  <div className="relative flex-1 bg-white border-2 border-slate-200 rounded-xl overflow-hidden focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-100 transition-all">
                     <textarea 
                        placeholder="Hỏi AI về dữ liệu doanh thu, cảnh báo tồn kho hoặc dự báo..."
                        className="w-full pl-4 pr-12 py-3.5 bg-transparent text-sm resize-none outline-none max-h-32 min-h-[52px]"
                        rows={1}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                     />
                     <button className="absolute right-2 bottom-2 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <Send size={16} />
                     </button>
                  </div>
               </div>
            </div>
         </div>

         {/* Sidebar Insights */}
         <div className="lg:w-[400px] flex flex-col gap-4 overflow-y-auto pr-1">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-2 sticky top-0 bg-[#faf8ff] pb-2 z-10">
               <Lightbulb size={20} className="text-amber-500" /> Điểm nhấn thông minh (Smart Insights)
            </h3>
            
            {mockInsights.map(insight => (
               <div key={insight.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3 mb-3">
                     <div className={`p-2 rounded-xl shrink-0 ${
                        insight.type === 'warning' ? 'bg-amber-50' : 
                        insight.type === 'opportunity' ? 'bg-emerald-50' : 'bg-blue-50'
                     }`}>
                        {insight.icon}
                     </div>
                     <h4 className="font-bold text-slate-900 leading-tight">{insight.title}</h4>
                  </div>
                  <p className="text-sm text-slate-600 mb-3 leading-relaxed">{insight.desc}</p>
                  <div className={`text-xs font-semibold p-3 rounded-xl border ${
                     insight.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-800' : 
                     insight.type === 'opportunity' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-blue-50 border-blue-100 text-blue-800'
                  }`}>
                     {insight.action}
                  </div>
                  <div className="mt-4 flex gap-2">
                     <button className="flex-1 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors">Bỏ qua</button>
                     <button className={`flex-1 py-2 text-white text-xs font-bold rounded-lg transition-colors ${
                        insight.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : 
                        insight.type === 'opportunity' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                     }`}>
                        Áp dụng ngay
                     </button>
                  </div>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}
