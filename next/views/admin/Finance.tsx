import React, { useState } from "react";
import { 
  Banknote, 
  Download, 
  Printer, 
  TrendingUp, 
  TrendingDown,
  Building2,
  Calendar,
  Filter,
  DollarSign,
  PieChart,
  FileSpreadsheet
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

const branches = [
  { id: "all", name: "Tất cả chi nhánh (Tổng hợp)" },
  { id: "BR-001", name: "Nhà thuốc VinaPharmacy - CN1" },
  { id: "BR-002", name: "Nhà thuốc VinaPharmacy - CN2" },
  { id: "BR-003", name: "Nhà thuốc VinaPharmacy - CN3" },
  { id: "BR-004", name: "Nhà thuốc VinaPharmacy - CN4" }
];

const mockFinancialData = {
  "all": {
    revenue: 452310000,
    expense: 280150000,
    profit: 172160000,
    growth: 12.5,
    chartData: [
      { name: "T4", revenue: 320, expense: 210 },
      { name: "T5", revenue: 350, expense: 230 },
      { name: "T6", revenue: 380, expense: 250 },
      { name: "T7", revenue: 360, expense: 220 },
      { name: "T8", revenue: 410, expense: 260 },
      { name: "T9", revenue: 430, expense: 275 },
      { name: "T10", revenue: 452, expense: 280 }
    ],
    transactions: [
      { id: "TX1001", date: "24/10/2023", branch: "CN1", type: "income", category: "Bán hàng", amount: 15400000, method: "Chuyển khoản" },
      { id: "TX1002", date: "24/10/2023", branch: "CN2", type: "expense", category: "Nhập thuốc", amount: -4200000, method: "Tiền mặt" },
      { id: "TX1003", date: "23/10/2023", branch: "CN1", type: "income", category: "Bán hàng", amount: 12100000, method: "Thẻ POS" },
      { id: "TX1004", date: "23/10/2023", branch: "Tổng hợp", type: "expense", category: "Lương nhân viên", amount: -85000000, method: "Chuyển khoản" },
      { id: "TX1005", date: "22/10/2023", branch: "CN3", type: "income", category: "Bán hàng", amount: 8400000, method: "Tiền mặt" },
    ]
  },
  "BR-001": {
    revenue: 145000000,
    expense: 80000000,
    profit: 65000000,
    growth: 8.2,
    chartData: [
      { name: "T4", revenue: 110, expense: 65 },
      { name: "T5", revenue: 115, expense: 68 },
      { name: "T6", revenue: 125, expense: 70 },
      { name: "T7", revenue: 120, expense: 68 },
      { name: "T8", revenue: 130, expense: 75 },
      { name: "T9", revenue: 135, expense: 78 },
      { name: "T10", revenue: 145, expense: 80 }
    ],
    transactions: [
      { id: "TX1001", date: "24/10/2023", branch: "CN1", type: "income", category: "Bán hàng", amount: 15400000, method: "Chuyển khoản" },
      { id: "TX1003", date: "23/10/2023", branch: "CN1", type: "income", category: "Bán hàng", amount: 12100000, method: "Thẻ POS" },
    ]
  },
  "BR-002": {
    revenue: 95500000,
    expense: 50000000,
    profit: 45500000,
    growth: -2.1,
    chartData: [
       { name: "T4", revenue: 85, expense: 40 },
       { name: "T5", revenue: 90, expense: 42 },
       { name: "T6", revenue: 100, expense: 48 },
       { name: "T7", revenue: 95, expense: 45 },
       { name: "T8", revenue: 105, expense: 52 },
       { name: "T9", revenue: 98, expense: 45 },
       { name: "T10", revenue: 95, expense: 50 }
    ],
    transactions: [
      { id: "TX1002", date: "24/10/2023", branch: "CN2", type: "expense", category: "Nhập thuốc", amount: -4200000, method: "Tiền mặt" },
    ]
  },
  "BR-003": {
    revenue: 68000000,
    expense: 35000000,
    profit: 33000000,
    growth: 15.4,
    chartData: [
       { name: "T4", revenue: 45, expense: 28 },
       { name: "T5", revenue: 50, expense: 30 },
       { name: "T6", revenue: 55, expense: 32 },
       { name: "T7", revenue: 52, expense: 30 },
       { name: "T8", revenue: 60, expense: 32 },
       { name: "T9", revenue: 62, expense: 33 },
       { name: "T10", revenue: 68, expense: 35 }
    ],
    transactions: [
      { id: "TX1005", date: "22/10/2023", branch: "CN3", type: "income", category: "Bán hàng", amount: 8400000, method: "Tiền mặt" },
    ]
  },
  "BR-004": {
    revenue: 143810000,
    expense: 115150000,
    profit: 28660000,
    growth: 5.8,
    chartData: [
       { name: "T4", revenue: 80, expense: 77 },
       { name: "T5", revenue: 95, expense: 90 },
       { name: "T6", revenue: 100, expense: 100 },
       { name: "T7", revenue: 93, expense: 77 },
       { name: "T8", revenue: 115, expense: 101 },
       { name: "T9", revenue: 135, expense: 119 },
       { name: "T10", revenue: 143, expense: 115 }
    ],
    transactions: []
  }
};

export function Finance() {
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [timeRange, setTimeRange] = useState("month");
  
  const currentData = mockFinancialData[selectedBranch as keyof typeof mockFinancialData];

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    // In a real app, this would generate an Excel file (e.g., using SheetJS)
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Mã GD,Ngày,Chi nhánh,Loại,Danh mục,Số tiền,PTTT\n"
      + currentData.transactions.map(t => 
          `${t.id},${t.date},${t.branch},${t.type === 'income' ? 'Thu' : 'Chi'},${t.category},${t.amount},${t.method}`
        ).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Bao_cao_tai_chinh_${selectedBranch}_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto print:bg-white print:p-0">
      
      {/* Header - Hidden in Print */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Kế toán & Tài chính</h1>
          <p className="text-slate-500 mt-1">Báo cáo doanh thu, chi phí và lợi nhuận hệ thống.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={handlePrint} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2">
            <Printer size={18} />
            <span className="hidden sm:inline">In báo cáo</span>
          </button>
          <button onClick={handleExportExcel} className="px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2">
            <FileSpreadsheet size={18} />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Filters - Hidden in Print */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4 print:hidden">
         <div className="flex-1 w-full flex items-center gap-3">
            <Building2 className="text-slate-400 shrink-0" size={20} />
            <select 
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0057cd]"
            >
               {branches.map(b => (
                 <option key={b.id} value={b.id}>{b.name}</option>
               ))}
            </select>
         </div>
         <div className="hidden md:block w-px h-8 bg-slate-200"></div>
         <div className="flex-1 w-full flex items-center gap-3">
            <Calendar className="text-slate-400 shrink-0" size={20} />
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0057cd]"
            >
               <option value="week">Tuần này</option>
               <option value="month">Tháng này (Tháng 10/2023)</option>
               <option value="quarter">Quý 3/2023</option>
               <option value="year">Năm 2023</option>
            </select>
         </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-8 text-center">
         <h1 className="text-3xl font-black text-black">BÁO CÁO TÀI CHÍNH</h1>
         <h2 className="text-xl font-bold mt-2">{branches.find(b => b.id === selectedBranch)?.name}</h2>
         <p className="text-gray-600 mt-1">Kỳ báo cáo: Tháng 10/2023</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 print:grid-cols-3 print:gap-4 border-slate-200 print:mb-8">
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-gray-800">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider print:text-black">Tổng Doanh Thu</h3>
               <div className="p-2 bg-blue-50 text-blue-600 rounded-xl print:hidden"><Banknote size={20}/></div>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight print:text-black">
               {currentData.revenue.toLocaleString()}đ
            </div>
            <div className="mt-2 text-xs font-bold text-emerald-600 flex items-center gap-1">
               <TrendingUp size={14}/> +{currentData.growth}% so với kỳ trước
            </div>
         </div>

         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-gray-800">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider print:text-black">Tổng Chi Phí</h3>
               <div className="p-2 bg-rose-50 text-rose-600 rounded-xl print:hidden"><DollarSign size={20}/></div>
            </div>
            <div className="text-3xl font-black text-slate-900 tracking-tight print:text-black">
               {currentData.expense.toLocaleString()}đ
            </div>
            <div className="mt-2 text-xs font-bold text-amber-600 flex items-center gap-1">
               <TrendingUp size={14}/> +2.5% so với kỳ trước
            </div>
         </div>

         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-gray-800">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider print:text-black">Lợi Nhuận Gộp</h3>
               <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl print:hidden"><PieChart size={20}/></div>
            </div>
            <div className="text-3xl font-black text-emerald-600 tracking-tight print:text-black">
               {currentData.profit.toLocaleString()}đ
            </div>
            <div className="mt-2 text-xs font-bold text-emerald-600 flex items-center gap-1">
               Biên lợi nhuận: {Math.round((currentData.profit / currentData.revenue) * 100)}%
            </div>
         </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
         <div className="flex items-center justify-between mb-6">
            <div>
               <h3 className="font-bold text-slate-900 text-lg">Biểu đồ Doanh thu & Chi phí</h3>
               <p className="text-slate-500 text-sm mt-1">Đơn vị: Triệu VNĐ</p>
            </div>
            <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-[#0057cd] focus:border-[#0057cd] block p-2 outline-none font-medium">
              <option>Năm nay (2023)</option>
              <option>Năm ngoái (2022)</option>
            </select>
         </div>
         <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart data={currentData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                     cursor={{ fill: '#f8fafc' }}
                     contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 600 }}
                     labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                     itemStyle={{ color: '#334155' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="revenue" name="Doanh thu" fill="#0057cd" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="expense" name="Chi phí" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
               </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-gray-800 flex flex-col flex-1">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between print:bg-white print:border-b-2 print:border-gray-800 print:px-2">
            <h3 className="font-bold text-slate-900 text-lg print:text-xl">Lịch sử giao dịch</h3>
            <div className="hidden print:block text-sm font-bold">Ngày in: {new Date().toLocaleDateString('vi-VN')}</div>
            <div className="flex gap-2 print:hidden">
               <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 bg-white">
                  <Filter size={18} />
               </button>
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 border-b border-slate-200 print:bg-gray-100 print:text-black">
              <tr>
                <th className="px-6 py-4 print:px-2">Mã GD</th>
                <th className="px-6 py-4 print:px-2">Ngày</th>
                {selectedBranch === "all" && <th className="px-6 py-4 print:px-2">Chi nhánh</th>}
                <th className="px-6 py-4 print:px-2">Hạng mục</th>
                <th className="px-6 py-4 print:px-2">Hình thức</th>
                <th className="px-6 py-4 text-right print:px-2">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-gray-400">
               {currentData.transactions.length > 0 ? (
                 currentData.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                       <td className="px-6 py-4 font-bold text-slate-700 print:px-2 print:text-black">{tx.id}</td>
                       <td className="px-6 py-4 text-slate-600 print:px-2 print:text-black">{tx.date}</td>
                       {selectedBranch === "all" && <td className="px-6 py-4 font-medium text-slate-800 print:px-2 print:text-black">{tx.branch}</td>}
                       <td className="px-6 py-4 print:px-2">
                          <span className="font-semibold text-slate-800 print:text-black">{tx.category}</span>
                       </td>
                       <td className="px-6 py-4 text-slate-500 print:px-2 print:text-black">{tx.method}</td>
                       <td className={`px-6 py-4 text-right font-black print:px-2 print:text-black ${
                          tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                       }`}>
                          {tx.type === 'income' ? '+' : ''}{tx.amount.toLocaleString()}đ
                       </td>
                    </tr>
                 ))
               ) : (
                 <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 print:hidden">
                       Không có giao dịch nào trong khoảng thời gian này.
                    </td>
                 </tr>
               )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Print Footer Signature */}
      <div className="hidden print:flex justify-between mt-12 px-8">
         <div className="text-center">
            <p className="font-bold text-lg mb-16">Người lập biểu</p>
            <p className="italic">(Ký và ghi rõ họ tên)</p>
         </div>
         <div className="text-center">
            <p className="font-bold text-lg mb-16">Giám đốc / Kế toán trưởng</p>
            <p className="italic">(Ký và ghi rõ họ tên)</p>
         </div>
      </div>

    </div>
  );
}
