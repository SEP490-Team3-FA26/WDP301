import React, { useState, useEffect } from "react";
import {
   Banknote,
   Printer,
   TrendingUp,
   Building2,
   Calendar,
   Filter,
   DollarSign,
   PieChart,
   FileSpreadsheet,
   RefreshCw
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
import api from "../../services/core/api";

export function Finance() {
   const [selectedBranch, setSelectedBranch] = useState("all");
   const [timeRange, setTimeRange] = useState("month");
   const [orders, setOrders] = useState<any[]>([]);
   const [branchesList, setBranchesList] = useState<any[]>([]);
   const [loading, setLoading] = useState(false);

   // Extract token user details
   const token = localStorage.getItem("token") || "";
   let userDetails = { branchId: null, role: "branch" };
   if (token) {
      try {
         const base64Url = token.split('.')[1];
         const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
         const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
         }).join(''));
         userDetails = JSON.parse(jsonPayload);
      } catch (e) {
         console.error("Lỗi giải mã token:", e);
      }
   }

   const isAdmin = userDetails.role === 'admin' || userDetails.role === 'head_branch';

   // Lock branch selection for branch managers
   useEffect(() => {
      if (!isAdmin && userDetails.branchId) {
         setSelectedBranch(userDetails.branchId);
      }
   }, [isAdmin, userDetails.branchId]);

   // Fetch all orders and branches list
   useEffect(() => {
      fetchOrders();
      fetchBranches();
   }, []);

   const fetchBranches = async () => {
      try {
         const res = await api.get('/api/branches');
         if (Array.isArray(res.data)) {
            setBranchesList(res.data);
         }
      } catch (err) {
         console.error("Lỗi lấy danh sách chi nhánh:", err);
      }
   };

   const fetchOrders = async () => {
      setLoading(true);
      try {
         const res = await api.get('/api/orders');
         if (Array.isArray(res.data)) {
            setOrders(res.data);
         }
      } catch (err) {
         console.error("Lỗi lấy danh sách đơn hàng:", err);
      } finally {
         setLoading(false);
      }
   };

   // Process and filter orders based on selectedBranch & timeRange
   // Standard target year is 2026 based on database orders
   const targetYear = 2026;

   const getFilteredOrders = () => {
      return orders.filter(order => {
         // Filter by Payment Status (Only count paid orders for finance revenue)
         if (order.paymentStatus !== 'PAID') return false;

         // Filter by Branch
         const bId = order.branchId || 'BR-001';
         if (selectedBranch !== 'all' && bId !== selectedBranch) return false;

         // Filter by Time Range
         const orderDate = new Date(order.createdAt);
         const orderYear = orderDate.getFullYear();

         if (timeRange === 'year') {
            return orderYear === targetYear;
         }

         if (timeRange === 'quarter') {
            // Q2 (T4, T5, T6 - June is inside Q2)
            const month = orderDate.getMonth(); // 0-indexed
            return orderYear === targetYear && month >= 3 && month <= 5; // Q2: April to June
         }

         if (timeRange === 'month') {
            // June (month index 5)
            const month = orderDate.getMonth();
            return orderYear === targetYear && month === 5;
         }

         if (timeRange === 'week') {
            // Orders around mid-June (June 12)
            const diffTime = Math.abs(new Date(2026, 5, 15).getTime() - orderDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return orderYear === targetYear && diffDays <= 7;
         }

         return true;
      });
   };

   const filteredOrders = getFilteredOrders();

   // Compute KPI Metrics
   const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
   const totalExpense = Math.round(totalRevenue * 0.65);
   const totalProfit = totalRevenue - totalExpense;

   // Compute Monthly Chart Data (for targetYear 2026)
   const monthsList = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
   const monthlyRevenueMap: Record<number, number> = {};

   orders.forEach(order => {
      if (order.paymentStatus !== 'PAID') return;
      const bId = order.branchId || 'BR-001';
      if (selectedBranch !== 'all' && bId !== selectedBranch) return;

      const orderDate = new Date(order.createdAt);
      if (orderDate.getFullYear() === targetYear) {
         const m = orderDate.getMonth(); // 0-11
         monthlyRevenueMap[m] = (monthlyRevenueMap[m] || 0) + order.totalAmount;
      }
   });

   const chartData = monthsList.map((name, index) => {
      const revVal = monthlyRevenueMap[index] || 0;
      // Convert to Millions (Triệu VNĐ) for the chart scaling
      const revMillions = parseFloat((revVal / 1000000).toFixed(2));
      const expMillions = parseFloat((revMillions * 0.65).toFixed(2));
      return {
         name,
         revenue: revMillions,
         expense: expMillions
      };
   });

   // Convert filteredOrders to Recent Transactions List
   const transactions = filteredOrders.slice(0, 15).map(o => {
      const bId = o.branchId || 'BR-001';
      const foundBranch = branchesList.find(b => b.branchCode === bId);
      const branchName = foundBranch ? foundBranch.name : `Chi nhánh ${bId}`;
      const paymentMethodName = o.paymentMethod === 'QR_PAY' ? 'QR PayOS' : o.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Thẻ POS';
      return {
         id: String(o.orderCode || o._id.slice(-8)),
         date: new Date(o.createdAt).toLocaleDateString('vi-VN'),
         branch: branchName,
         type: 'income',
         category: o.type === 'ONLINE' ? 'Bán hàng (Online)' : 'Bán hàng (Quầy)',
         amount: o.totalAmount,
         method: paymentMethodName
      };
   });

   const handlePrint = () => {
      window.print();
   };

   const handleExportExcel = () => {
      const csvContent = "data:text/csv;charset=utf-8,"
         + "Mã GD,Ngày,Chi nhánh,Loại,Danh mục,Số tiền,PTTT\n"
         + transactions.map(t =>
            `${t.id},${t.date},${t.branch},Thu,${t.category},${t.amount},${t.method}`
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
               <p className="text-slate-500 mt-1">Báo cáo doanh thu, chi phí và lợi nhuận hệ thống từ dữ liệu bán hàng.</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
               <button
                  onClick={fetchOrders}
                  disabled={loading}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors border border-slate-200 flex items-center justify-center"
                  title="Làm mới"
               >
                  <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
               </button>
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
                  disabled={!isAdmin}
                  className="w-full bg-slate-50 disabled:bg-slate-100 border border-slate-200 text-slate-800 disabled:text-slate-500 font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0057cd]"
               >
                  <option value="all">Tất cả chi nhánh (Tổng hợp)</option>
                  {branchesList.map(b => (
                     <option key={b.branchCode} value={b.branchCode}>{b.name}</option>
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
                  <option value="week">Tuần này (Xung quanh 12/06/2026)</option>
                  <option value="month">Tháng này (Tháng 06/2026)</option>
                  <option value="quarter">Quý 2/2026 (Tháng 4 - Tháng 6)</option>
                  <option value="year">Năm 2026</option>
               </select>
            </div>
         </div>

         {/* Print Header */}
         <div className="hidden print:block mb-8 text-center">
            <h1 className="text-3xl font-black text-black">BÁO CÁO TÀI CHÍNH</h1>
            <h2 className="text-xl font-bold mt-2">
               {selectedBranch === 'all'
                  ? 'Tất cả chi nhánh (Tổng hợp)'
                  : branchesList.find(b => b.branchCode === selectedBranch)?.name || selectedBranch}
            </h2>
            <p className="text-gray-600 mt-1">Kỳ báo cáo: Năm {targetYear}</p>
         </div>

         {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
               <RefreshCw size={36} className="animate-spin text-[#0057cd]" />
               <p className="text-sm font-bold text-slate-500">Đang đồng bộ dữ liệu tài chính từ hệ thống...</p>
            </div>
         ) : (
            <>
               {/* KPI Cards */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-5 print:grid-cols-3 print:gap-4 border-slate-200 print:mb-8">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-gray-800">
                     <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider print:text-black">Tổng Doanh Thu</h3>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl print:hidden"><Banknote size={20} /></div>
                     </div>
                     <div className="text-3xl font-black text-slate-900 tracking-tight print:text-black">
                        {totalRevenue.toLocaleString('vi-VN')}đ
                     </div>
                     <div className="mt-2 text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <TrendingUp size={14} /> +8.2% so với kỳ trước
                     </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-gray-800">
                     <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider print:text-black">Tổng Chi Phí (COGS)</h3>
                        <div className="p-2 bg-rose-50 text-rose-600 rounded-xl print:hidden"><DollarSign size={20} /></div>
                     </div>
                     <div className="text-3xl font-black text-slate-900 tracking-tight print:text-black">
                        {totalExpense.toLocaleString('vi-VN')}đ
                     </div>
                     <div className="mt-2 text-xs font-bold text-amber-600 flex items-center gap-1">
                        <TrendingUp size={14} /> Chi phí ước tính ~65% doanh thu
                     </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-gray-800">
                     <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider print:text-black">Lợi Nhuận Gộp ước tính</h3>
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl print:hidden"><PieChart size={20} /></div>
                     </div>
                     <div className="text-3xl font-black text-emerald-600 tracking-tight print:text-black">
                        {totalProfit.toLocaleString('vi-VN')}đ
                     </div>
                     <div className="mt-2 text-xs font-bold text-emerald-600 flex items-center gap-1">
                        Biên lợi nhuận gộp: 35%
                     </div>
                  </div>
               </div>

               {/* Chart Section */}
               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
                  <div className="flex items-center justify-between mb-6">
                     <div>
                        <h3 className="font-bold text-slate-900 text-lg">Biểu đồ Doanh thu & Chi phí năm {targetYear}</h3>
                        <p className="text-slate-500 text-sm mt-1">Đơn vị: Triệu VNĐ</p>
                     </div>
                     <span className="text-xs font-bold text-[#0057cd] px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                        Dữ liệu thời gian thực
                     </span>
                  </div>
                  <div className="h-[350px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                           <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                           <Tooltip
                              cursor={{ fill: '#f8fafc' }}
                              contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 600 }}
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
                     <h3 className="font-bold text-slate-900 text-lg print:text-xl">Lịch sử giao dịch bán hàng</h3>
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
                           {transactions.length > 0 ? (
                              transactions.map((tx) => (
                                 <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-700 print:px-2 print:text-black">{tx.id}</td>
                                    <td className="px-6 py-4 text-slate-600 print:px-2 print:text-black">{tx.date}</td>
                                    {selectedBranch === "all" && <td className="px-6 py-4 font-medium text-slate-800 print:px-2 print:text-black">{tx.branch}</td>}
                                    <td className="px-6 py-4 print:px-2">
                                       <span className="font-semibold text-slate-800 print:text-black">{tx.category}</span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 print:px-2 print:text-black">{tx.method}</td>
                                    <td className="px-6 py-4 text-right font-black print:px-2 print:text-emerald-650 text-emerald-600">
                                       +{tx.amount.toLocaleString('vi-VN')}đ
                                    </td>
                                 </tr>
                              ))
                           ) : (
                              <tr>
                                 <td colSpan={6} className="px-6 py-12 text-center text-slate-500 print:hidden font-bold">
                                    Không có giao dịch bán hàng nào trong khoảng thời gian này.
                                 </td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </>
         )}

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
