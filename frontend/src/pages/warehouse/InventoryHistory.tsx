import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, ArrowDownToLine, ArrowUpFromLine, Trash2, Calendar, FileText, Plus, ChevronRight, X, Package, Building, CheckCircle2, DollarSign } from "lucide-react";

interface InventoryHistoryProps {
  type: "import" | "export" | "dispose";
}

export function InventoryHistory({ type }: InventoryHistoryProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const title = type === "import" ? "Lịch sử nhập kho" : type === "export" ? "Lịch sử xuất kho" : "Lịch sử xuất hủy";
  const desc = type === "import" ? "Quản lý các phiếu nhập hàng từ nhà cung cấp" : type === "export" ? "Quản lý các phiếu xuất kho, luân chuyển" : "Quản lý các phiếu hủy thuốc hỏng, hết hạn";
  const btnLabel = type === "import" ? "Tạo đơn nhập hàng" : type === "export" ? "Tạo phiếu xuất" : "Tạo phiếu hủy";
  
  const Icon = type === "import" ? ArrowDownToLine : type === "export" ? ArrowUpFromLine : Trash2;
  const theme = type === "import" ? "blue" : type === "export" ? "emerald" : "rose";
  const themeClasses = {
    blue: "bg-[#0057cd] hover:bg-[#00419e] text-white",
    emerald: "bg-emerald-600 hover:bg-emerald-700 text-white",
    rose: "bg-rose-600 hover:bg-rose-700 text-white",
    blueLight: "text-[#0057cd] bg-[#f2f3ff]",
    emeraldLight: "text-emerald-700 bg-emerald-100",
    roseLight: "text-rose-700 bg-rose-100",
  };

  const mockData = {
    import: [
      { id: "PN-20231024-01", date: "24/10/2023", supplier: "Công ty Dược phẩm TW1", items: 12, total: "15,400,000", status: "Hoàn thành" },
      { id: "PN-20231022-03", date: "22/10/2023", supplier: "DHG Pharma", items: 5, total: "4,200,000", status: "Hoàn thành" },
      { id: "PN-20231020-01", date: "20/10/2023", supplier: "Eco Pharma", items: 23, total: "32,150,000", status: "Đang xử lý" },
    ],
    export: [
      { id: "PX-20231024-02", date: "24/10/2023", destination: "Chi nhánh Quận 1", items: 4, reason: "Phân bổ tồn kho", status: "Đã xuất" },
      { id: "PX-20231021-01", date: "21/10/2023", destination: "Nội bộ", items: 1, reason: "Tiêu hao phòng khám", status: "Đã xuất" },
    ],
    dispose: [
      { id: "PH-20231023-01", date: "23/10/2023", approver: "Nguyễn Văn A", items: 2, totalLoss: "450,000", reason: "Hết hạn sử dụng", status: "Đã hủy" },
    ]
  };

  const records = mockData[type];

  const handleCreate = () => {
    if (type === "import") {
      navigate("new");
    } else {
      setIsModalOpen(true);
    }
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
        <button 
          onClick={handleCreate}
          className={`px-5 py-2.5 font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors ${themeClasses[theme]}`}
        >
          <Plus size={18} />
          {btnLabel}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm phiếu..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
            />
          </div>
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg flex items-center gap-2 hover:bg-slate-50 transition-colors text-sm font-medium w-full sm:w-auto justify-center">
            <Filter size={16} />
            Bộ lọc
          </button>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Mã phiếu</th>
                <th className="px-6 py-4">Ngày tạo</th>
                {type === "import" && <th className="px-6 py-4">Nhà cung cấp</th>}
                {type === "export" && <th className="px-6 py-4">Nơi nhận</th>}
                {type === "export" && <th className="px-6 py-4">Lý do</th>}
                {type === "dispose" && <th className="px-6 py-4">Lý do hủy</th>}
                {type === "dispose" && <th className="px-6 py-4">Người duyệt</th>}
                <th className="px-6 py-4 text-center">Số khoản mục</th>
                {type === "import" && <th className="px-6 py-4 text-right">Tổng tiền</th>}
                {type === "dispose" && <th className="px-6 py-4 text-right">Thiệt hại</th>}
                <th className="px-6 py-4 text-center">Trạng thái</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r: any) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                  <td className="px-6 py-4 font-bold text-slate-900">{r.id}</td>
                  <td className="px-6 py-4 flex items-center gap-2 text-slate-600">
                     <Calendar size={14} className="text-slate-400" />
                     {r.date}
                  </td>
                  {type === "import" && <td className="px-6 py-4 text-slate-800">{r.supplier}</td>}
                  {type === "export" && <td className="px-6 py-4 text-slate-800">{r.destination}</td>}
                  {type === "export" && <td className="px-6 py-4 text-slate-600 italic">{r.reason}</td>}
                  {type === "dispose" && <td className="px-6 py-4 text-slate-600 italic">{r.reason}</td>}
                  {type === "dispose" && <td className="px-6 py-4 text-slate-800">{r.approver}</td>}
                  
                  <td className="px-6 py-4 text-center font-bold text-slate-700">{r.items}</td>
                  
                  {type === "import" && <td className="px-6 py-4 text-right font-bold text-[#0057cd]">{r.total}đ</td>}
                  {type === "dispose" && <td className="px-6 py-4 text-right font-bold text-rose-600">{r.totalLoss}đ</td>}
                  
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-bold ${
                      r.status.includes("Hoàn thành") || r.status.includes("Đã xuất") || r.status.includes("Đã hủy") 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-400 group-hover:text-[#0057cd] transition-colors p-1">
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                   <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                      Chưa có dữ liệu {title.toLowerCase()}.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <InventoryModal 
          type={type} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
}

function InventoryModal({ type, onClose }: { type: "import" | "export" | "dispose", onClose: () => void }) {
  const Icon = type === "import" ? ArrowDownToLine : type === "export" ? ArrowUpFromLine : Trash2;
  const title = type === "import" ? "Phiếu Nhập Kho" : type === "export" ? "Phiếu Xuất Kho Khác" : "Phiếu Xuất Hủy";
  const subtitle = type === "import" ? "Nhập thêm thuốc cũ hoặc nhập thuốc mới từ nhà cung cấp" : type === "export" ? "Xuất chuyển kho hoặc xuất nội bộ" : "Hủy thuốc do hết hạn, hư hỏng";
  
  const themeStyles = {
    import: {
      iconBg: "bg-[#e6f0ff]",
      iconColor: "text-[#0057cd]",
      btnBg: "bg-[#0057cd]",
      btnHover: "hover:bg-[#00419e]",
      btnText: "text-white"
    },
    export: {
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-700",
      btnBg: "bg-emerald-600",
      btnHover: "hover:bg-emerald-700",
      btnText: "text-white"
    },
    dispose: {
      iconBg: "bg-rose-100",
      iconColor: "text-rose-600",
      btnBg: "bg-rose-600",
      btnHover: "hover:bg-rose-700",
      btnText: "text-white"
    }
  };

  const currentTheme = themeStyles[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
       <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${currentTheme.iconBg} ${currentTheme.iconColor}`}>
                <Icon size={24} />
              </div>
              <div>
                 <h2 className="text-xl font-black text-slate-900 tracking-tight">{title}</h2>
                 <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{subtitle}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
              <X size={24} />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto bg-slate-50/50">
             {type === "import" && <ImportForm />}
             {type === "export" && <ExportForm />}
             {type === "dispose" && <DisposeForm />}
          </div>
          
          <div className="px-6 py-5 border-t border-slate-100 bg-white flex items-center justify-end gap-3">
             <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors">
               Hủy bỏ
             </button>
             <button className={`px-6 py-2.5 ${currentTheme.btnBg} ${currentTheme.btnText} ${currentTheme.btnHover} font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2`}>
               <CheckCircle2 size={18} />
               Xác nhận & Lưu
             </button>
          </div>
       </div>
    </div>
  );
}

function ImportForm() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="space-y-1.5 md:col-span-2">
        <label className="text-sm font-bold text-slate-700">Tên thuốc / Mã thuốc</label>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3.5 text-slate-400" />
          <input type="text" placeholder="Tìm kiếm thuốc trong hệ thống..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] focus:bg-white transition-all shadow-sm" />
        </div>
      </div>
      <div className="space-y-1.5 flex flex-col">
          <label className="text-sm font-bold text-slate-700">Số lượng & Đơn vị</label>
          <div className="flex gap-2">
            <input type="number" defaultValue="0" className="w-1/2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] focus:bg-white transition-all" />
            <select className="w-1/2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] focus:bg-white transition-all">
                <option>Hộp</option>
                <option>Vỉ</option>
            </select>
          </div>
      </div>
      <div className="space-y-1.5 border-l-4 border-[#0057cd] pl-4 flex flex-col justify-end pb-1">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">TỔNG TIỀN (Total)</div>
        <div className="text-2xl font-black text-[#0057cd]">0đ</div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700">Số lô (Batch Number)</label>
        <input type="text" placeholder="Ví dụ: LOT-2024A" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] focus:bg-white transition-all" />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700">Hạn sử dụng</label>
        <div className="relative">
          <Calendar size={18} className="absolute left-3 top-3.5 text-slate-400" />
          <input type="date" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] focus:bg-white transition-all" />
        </div>
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <label className="text-sm font-bold text-slate-700">Nhà cung cấp</label>
        <div className="relative">
          <Building size={18} className="absolute left-3 top-3.5 text-slate-400" />
          <select className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] focus:bg-white transition-all appearance-none cursor-pointer">
            <option>Công ty Dược phẩm TW1</option>
            <option>Dược Hậu Giang (DHG)</option>
            <option>Eco Pharma</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function ExportForm() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="space-y-1.5 md:col-span-2">
        <label className="text-sm font-bold text-slate-700">Lý do xuất</label>
        <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all">
          <option>Chuyển kho chi nhánh</option>
          <option>Xuất sử dụng nội bộ</option>
          <option>Xuất trả nhà cung cấp</option>
        </select>
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <label className="text-sm font-bold text-slate-700">Tên thuốc / Mã thuốc</label>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3.5 text-slate-400" />
          <input type="text" placeholder="Tìm kiếm thuốc trong kho..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-sm" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700">Số lượng xuất</label>
        <div className="relative">
          <Package size={18} className="absolute left-3 top-3.5 text-slate-400" />
          <input type="number" defaultValue="0" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-bold text-slate-700">Đơn vị tính</label>
        <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all">
          <option>Hộp (Box)</option>
        </select>
      </div>
      <div className="space-y-1.5 md:col-span-2">
        <label className="text-sm font-bold text-slate-700">Ghi chú thêm (Optional)</label>
        <div className="relative">
          <FileText size={18} className="absolute left-3 top-3.5 text-slate-400" />
          <input type="text" placeholder="Nhập ghi chú cho phiếu xuất..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all" />
        </div>
      </div>
    </div>
  );
}

function DisposeForm() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-sm font-bold text-slate-700">Lý do hủy</label>
          <select className="w-full px-4 py-3 bg-[#fff0f0] border border-rose-200 rounded-xl text-sm font-medium text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all">
            <option>Hết hạn sử dụng (Expired)</option>
            <option>Hư hỏng vật lý (Damaged)</option>
            <option>Khách hàng trả lại (Returned - Unusable)</option>
          </select>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-sm font-bold text-slate-700">Tên thuốc / Mã thuốc</label>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-3.5 text-slate-400" />
            <input type="text" placeholder="Tìm kiếm lô thuốc cần hủy..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all shadow-sm" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700">Số lượng hủy</label>
          <div className="relative">
            <Package size={18} className="absolute left-3 top-3.5 text-slate-400" />
            <input type="number" defaultValue="0" className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-slate-700">Lô cần hủy</label>
          <input type="text" placeholder="LOT-..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-sm font-bold text-slate-700">Người phê duyệt (Approved By)</label>
          <input type="text" placeholder="Nhập tên hoặc mã nhân viên..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all" />
        </div>
      </div>
    );
  }
