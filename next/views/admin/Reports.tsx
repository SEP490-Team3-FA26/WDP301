import React, { useState } from "react";
import { 
  FileText, 
  Download, 
  Filter, 
  Calendar, 
  Clock, 
  FileSpreadsheet, 
  File as FilePdf,
  Plus,
  RefreshCw,
  Search,
  MoreHorizontal
} from "lucide-react";

const reportsList = [
  { id: "REP-001", name: "Báo cáo doanh thu tháng 10/2023", type: "Doanh thu", format: "PDF", date: "31/10/2023", size: "2.4 MB", status: "Hoàn thành", author: "Hệ thống" },
  { id: "REP-002", name: "Thống kê xuất/nhập kho Q3/2023", type: "Tồn kho", format: "Excel", date: "01/10/2023", size: "5.1 MB", status: "Hoàn thành", author: "Nguyễn Văn A" },
  { id: "REP-003", name: "Báo cáo thuốc sắp hết hạn (Tháng 11)", type: "Cảnh báo", format: "Excel", date: "28/10/2023", size: "1.2 MB", status: "Hoàn thành", author: "Hệ thống" },
  { id: "REP-004", name: "Báo cáo hiệu suất chi nhánh CN1", type: "Hiệu suất", format: "PDF", date: "25/10/2023", size: "3.8 MB", status: "Hoàn thành", author: "Trần Thị B" },
  { id: "REP-005", name: "Thống kê hao hụt & xuất hủy Q3", type: "Tồn kho", format: "PDF", date: "05/10/2023", size: "1.5 MB", status: "Hoàn thành", author: "Lê Văn C" },
  { id: "REP-006", name: "Báo cáo doanh thu tuần 4 T10", type: "Doanh thu", format: "Excel", date: "28/10/2023", size: "---", status: "Đang tạo...", author: "Hệ thống" },
];

export function Reports() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredReports = reportsList.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Báo Cáo Hệ Thống</h1>
          <p className="text-slate-500 mt-1">Quản lý, xuất và tải xuống các báo cáo thống kê định kỳ.</p>
        </div>
        <button className="px-5 py-2.5 bg-[#0057cd] text-white font-bold rounded-xl hover:bg-[#00419e] transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap">
          <Plus size={18} />
          Tạo báo cáo mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-blue-50 text-[#0057cd] rounded-xl"><FileText size={24}/></div>
           <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng báo cáo</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">128</p>
           </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Calendar size={24}/></div>
           <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tháng này</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">14</p>
           </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Clock size={24}/></div>
           <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tự động (Cron)</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">5<span className="text-sm font-medium text-slate-500 ml-1">lịch</span></p>
           </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
           <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Download size={24}/></div>
           <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đã tải xuống</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">85</p>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                 type="text"
                 placeholder="Tìm kiếm tên báo cáo..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all"
              />
           </div>
           <div className="flex gap-3 w-full sm:w-auto">
              <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-colors text-sm font-bold w-full sm:w-auto justify-center">
                 <Filter size={16} /> Lọc
              </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Tên báo cáo</th>
                <th className="px-6 py-4">Định dạng</th>
                <th className="px-6 py-4">Ngày tạo</th>
                <th className="px-6 py-4">Người tạo</th>
                <th className="px-6 py-4">Dung lượng</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                     <div className="font-bold text-slate-800">{report.name}</div>
                     <div className="text-xs text-slate-500 mt-0.5">{report.id} • {report.type}</div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-1.5">
                        {report.format === 'PDF' ? <FilePdf size={16} className="text-rose-500"/> : <FileSpreadsheet size={16} className="text-emerald-500"/>}
                        <span className="font-semibold text-slate-700">{report.format}</span>
                     </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{report.date}</td>
                  <td className="px-6 py-4 text-slate-600">
                     <span className={report.author === 'Hệ thống' ? 'px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-medium' : ''}>
                        {report.author}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">{report.size}</td>
                  <td className="px-6 py-4">
                     {report.status === 'Hoàn thành' ? (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded border border-emerald-200">Hoàn thành</span>
                     ) : (
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded border border-blue-200 flex items-center gap-1.5 w-max">
                           <RefreshCw size={12} className="animate-spin" /> Đang tạo...
                        </span>
                     )}
                  </td>
                  <td className="px-6 py-4 text-right">
                     <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-slate-400 hover:text-[#0057cd] hover:bg-blue-50 rounded-lg transition-colors" title="Tải xuống">
                           <Download size={18} />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors" title="Thêm">
                           <MoreHorizontal size={18} />
                        </button>
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
