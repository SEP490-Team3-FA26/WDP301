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
   RefreshCw,
   Plus,
   ArrowDownRight,
   ArrowUpRight,
   Receipt
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
import { financeService, ExpenseItem, CashFlowSummary } from "../../services/finance.service";
import { CreateExpenseModal } from "../../components/CreateExpenseModal";

export function Finance() {
   const [selectedBranch, setSelectedBranch] = useState("all");
   const [selectedYear, setSelectedYear] = useState("2026");
   const [timeRange, setTimeRange] = useState("year");
   const [orders, setOrders] = useState<any[]>([]);
   const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
   const [summaryData, setSummaryData] = useState<CashFlowSummary | null>(null);
   const [branchesList, setBranchesList] = useState<any[]>([]);
   const [loading, setLoading] = useState(false);
   const [showExpenseModal, setShowExpenseModal] = useState(false);

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

   // Fetch all data
   useEffect(() => {
      fetchBranches();
      fetchAllFinancialData();
   }, [selectedBranch, selectedYear, timeRange]);

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

   const fetchAllFinancialData = async () => {
      setLoading(true);
      try {
         const [ordersRes, expensesRes, summaryRes] = await Promise.allSettled([
            api.get('/api/orders'),
            financeService.getExpenses({ branchId: selectedBranch, year: selectedYear }),
            financeService.getCashFlowSummary({ branchId: selectedBranch, year: selectedYear }),
         ]);

         if (ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value.data)) {
            setOrders(ordersRes.value.data);
         } else {
            setOrders([]);
         }

         if (expensesRes.status === 'fulfilled' && Array.isArray(expensesRes.value)) {
            setExpenses(expensesRes.value);
         } else {
            setExpenses([]);
         }

         if (summaryRes.status === 'fulfilled' && summaryRes.value) {
            setSummaryData(summaryRes.value);
         } else {
            setSummaryData(null);
         }
      } catch (err) {
         console.error("Lỗi tải dữ liệu tài chính:", err);
      } finally {
         setLoading(false);
      }
   };

   // Dynamic Filtering based on Branch, Year, and Time Range
   const getFilteredOrders = () => {
      const now = new Date();
      return orders.filter(order => {
         const bId = order.branchId || 'BR-001';
         if (selectedBranch !== 'all' && bId !== selectedBranch) return false;

         const orderDate = new Date(order.createdAt || Date.now());
         const orderYear = orderDate.getFullYear();
         const orderMonth = orderDate.getMonth();

         if (selectedYear !== 'all' && orderYear !== Number(selectedYear)) {
            return false;
         }

         if (timeRange === 'month') {
            return orderMonth === now.getMonth() && orderYear === now.getFullYear();
         }

         if (timeRange === 'quarter') {
            const currentQuarter = Math.floor(now.getMonth() / 3);
            const orderQuarter = Math.floor(orderMonth / 3);
            return orderQuarter === currentQuarter && orderYear === now.getFullYear();
         }

         return true;
      });
   };

   const getFilteredExpenses = () => {
      const now = new Date();
      return expenses.filter(exp => {
         const bId = exp.branchId || 'BR-001';
         if (selectedBranch !== 'all' && bId !== selectedBranch) return false;

         const date = new Date(exp.transactionDate || exp.createdAt || Date.now());
         const yr = date.getFullYear();
         const mo = date.getMonth();

         if (selectedYear !== 'all' && yr !== Number(selectedYear)) {
            return false;
         }

         if (timeRange === 'month') {
            return mo === now.getMonth() && yr === now.getFullYear();
         }

         if (timeRange === 'quarter') {
            const currentQuarter = Math.floor(now.getMonth() / 3);
            const expQuarter = Math.floor(mo / 3);
            return expQuarter === currentQuarter && yr === now.getFullYear();
         }

         return true;
      });
   };

   const filteredOrders = getFilteredOrders();
   const filteredExpenses = getFilteredExpenses();

   // Compute KPI Metrics from real data
   const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || o.finalAmount || 0), 0);
   
   const totalCogs = filteredOrders.reduce((sum, o) => {
      let orderCogs = 0;
      if (Array.isArray(o.items)) {
         orderCogs = o.items.reduce((iSum: number, item: any) => {
            const importPrice = item.importPrice || item.costPrice || (item.price ? item.price * 0.65 : 0);
            return iSum + (importPrice * (item.quantity || 1));
         }, 0);
      }
      if (!orderCogs || orderCogs === 0) {
         orderCogs = Math.round((o.totalAmount || 0) * 0.65);
      }
      return sum + orderCogs;
   }, 0);

   const totalFixedExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
   const totalExpense = totalCogs + totalFixedExpenses;
   const netProfit = totalRevenue - totalExpense;

   // Monthly Chart Data combine Revenues, COGS, and Fixed Expenses
   const monthsList = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];
   const monthlyRevenueMap: Record<number, number> = {};
   const monthlyCogsMap: Record<number, number> = {};
   const monthlyExpenseMap: Record<number, number> = {};

   orders.forEach(order => {
      const bId = order.branchId || 'BR-001';
      if (selectedBranch !== 'all' && bId !== selectedBranch) return;

      const orderDate = new Date(order.createdAt || Date.now());
      if (selectedYear === 'all' || orderDate.getFullYear() === Number(selectedYear)) {
         const m = orderDate.getMonth();
         const rev = order.totalAmount || order.finalAmount || 0;
         let cogs = 0;
         if (Array.isArray(order.items)) {
            cogs = order.items.reduce((s: number, item: any) => {
               const ip = item.importPrice || item.costPrice || (item.price ? item.price * 0.65 : 0);
               return s + (ip * (item.quantity || 1));
            }, 0);
         }
         if (!cogs || cogs === 0) cogs = Math.round(rev * 0.65);

         monthlyRevenueMap[m] = (monthlyRevenueMap[m] || 0) + rev;
         monthlyCogsMap[m] = (monthlyCogsMap[m] || 0) + cogs;
      }
   });

   expenses.forEach(exp => {
      const bId = exp.branchId || 'BR-001';
      if (selectedBranch !== 'all' && bId !== selectedBranch) return;

      const expDate = new Date(exp.transactionDate || exp.createdAt || Date.now());
      if (selectedYear === 'all' || expDate.getFullYear() === Number(selectedYear)) {
         const m = expDate.getMonth();
         monthlyExpenseMap[m] = (monthlyExpenseMap[m] || 0) + (exp.amount || 0);
      }
   });

   const chartData = monthsList.map((name, index) => {
      const revVal = monthlyRevenueMap[index] || 0;
      const cogsVal = monthlyCogsMap[index] || 0;
      const fixedVal = monthlyExpenseMap[index] || 0;
      const totalExpVal = cogsVal + fixedVal;
      return {
         name,
         revenue: parseFloat((revVal / 1000000).toFixed(2)),
         expense: parseFloat((totalExpVal / 1000000).toFixed(2)),
         fixedExpenses: parseFloat((fixedVal / 1000000).toFixed(2)),
         netProfit: parseFloat(((revVal - totalExpVal) / 1000000).toFixed(2)),
      };
   });

   // Net Cash Flow Ledger: Combine Order Transactions & Expense Entries into chronological ledger
   const orderTransactions = filteredOrders.map(o => {
      const bId = o.branchId || 'BR-001';
      const foundBranch = branchesList.find(b => b.branchCode === bId || b.id === bId);
      const branchName = foundBranch ? foundBranch.name : `Chi nhánh ${bId}`;
      const paymentMethodName = o.paymentMethod === 'QR_PAY' ? 'QR PayOS' : o.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Thẻ POS';
      return {
         id: String(o.orderCode || (o._id ? o._id.slice(-8) : 'GD-1001')),
         timestamp: new Date(o.createdAt || Date.now()).getTime(),
         date: new Date(o.createdAt || Date.now()).toLocaleDateString('vi-VN'),
         branch: branchName,
         type: 'INCOME',
         categoryText: o.type === 'ONLINE' ? 'Bán hàng (Online)' : 'Bán hàng (Quầy)',
         title: `Thu tiền đơn hàng #${o.orderCode || o._id?.substring(0, 6)}`,
         amount: o.totalAmount || o.finalAmount || 0,
         method: paymentMethodName,
         notes: o.customerPhone ? `Khách hàng: ${o.customerPhone}` : 'Thanh toán trực tiếp'
      };
   });

   const categoryBadgeMap: Record<string, { label: string; color: string }> = {
      RENT: { label: 'Mặt bằng (Rent)', color: 'bg-amber-100 text-amber-800 border-amber-200' },
      SALARY: { label: 'Lương nhân viên (Salary)', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      UTILITY: { label: 'Điện nước (Utility)', color: 'bg-purple-100 text-purple-800 border-purple-200' },
      OTHER: { label: 'Chi phí khác', color: 'bg-slate-100 text-slate-800 border-slate-200' },
   };

   const expenseTransactions = filteredExpenses.map(e => {
      const bId = e.branchId || 'BR-001';
      const foundBranch = branchesList.find(b => b.branchCode === bId || b.id === bId);
      const branchName = foundBranch ? foundBranch.name : e.branchName || `Chi nhánh ${bId}`;
      return {
         id: `EXP-${e._id ? e._id.slice(-6).toUpperCase() : Math.floor(1000 + Math.random() * 9000)}`,
         timestamp: new Date(e.transactionDate || e.createdAt || Date.now()).getTime(),
         date: new Date(e.transactionDate || e.createdAt || Date.now()).toLocaleDateString('vi-VN'),
         branch: branchName,
         type: 'EXPENSE',
         categoryCode: e.category,
         categoryText: categoryBadgeMap[e.category]?.label || 'Chi phí cố định',
         title: e.title || 'Chi phí vận hành',
         amount: e.amount || 0,
         method: 'Chuyển khoản / Tiền mặt',
         notes: e.notes || `Ghi nhận bởi: ${e.createdBy || 'Admin'}`
      };
   });

   const combinedLedger = [...orderTransactions, ...expenseTransactions]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 30);

   const handlePrint = () => {
      window.print();
   };

   const handleExportExcel = () => {
      const csvContent = "data:text/csv;charset=utf-8,"
         + "Mã GD,Ngày,Chi nhánh,Loại GD,Hạng mục/Loại chi phí,Nội dung khoản chi,Số tiền (VND),PTTT\n"
         + combinedLedger.map(t =>
            `${t.id},${t.date},${t.branch},${t.type === 'INCOME' ? 'Thu' : 'Chi'},${t.categoryText},"${t.title.replace(/"/g, '""')}",${t.amount},${t.method}`
         ).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `So_quy_dong_tien_${selectedBranch}_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
   };

   return (
      <div className="space-y-6 flex flex-col h-full bg-[#faf8ff] p-6 lg:p-8 overflow-y-auto print:bg-white print:p-0">
         {/* Header - Hidden in Print */}
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
            <div>
               <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Kế toán & Quản lý Dòng tiền (UC-59)</h1>
               <p className="text-slate-500 mt-1">Báo cáo dòng tiền, doanh thu, chi phí cố định (mặt bằng, lương, điện nước...) và lợi nhuận ròng.</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
               <button
                  onClick={fetchAllFinancialData}
                  disabled={loading}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors border border-slate-200 flex items-center justify-center"
                  title="Làm mới"
               >
                  <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
               </button>
               {isAdmin && (
                  <button
                     onClick={() => setShowExpenseModal(true)}
                     className="px-4 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-sm flex items-center gap-2"
                  >
                     <Plus size={18} />
                     <span>+ Thêm khoản chi phí</span>
                  </button>
               )}
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
                  <option value="all">Tất cả chi nhánh (Tổng hợp toàn hệ thống)</option>
                  {branchesList.map(b => (
                     <option key={b.branchCode || b.id} value={b.branchCode || b.id}>{b.name}</option>
                  ))}
               </select>
            </div>

            <div className="hidden md:block w-px h-8 bg-slate-200"></div>

            <div className="w-full md:w-48 flex items-center gap-3">
               <Calendar className="text-slate-400 shrink-0" size={20} />
               <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0057cd]"
               >
                  <option value="2026">Năm 2026</option>
                  <option value="2025">Năm 2025</option>
                  <option value="2024">Năm 2024</option>
                  <option value="all">Tất cả các năm</option>
               </select>
            </div>

            <div className="hidden md:block w-px h-8 bg-slate-200"></div>

            <div className="flex-1 w-full flex items-center gap-3">
               <Filter className="text-slate-400 shrink-0" size={20} />
               <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0057cd]"
               >
                  <option value="year">Cả năm (Năm đã chọn)</option>
                  <option value="month">Tháng hiện tại</option>
                  <option value="quarter">Quý hiện tại</option>
                  <option value="all">Tất cả thời gian</option>
               </select>
            </div>
         </div>

         {/* Print Header */}
         <div className="hidden print:block mb-8 text-center">
            <h1 className="text-3xl font-black text-black">SỔ QUỸ & BÁO CÁO DÒNG TIỀN (UC-59)</h1>
            <h2 className="text-xl font-bold mt-2">
               {selectedBranch === 'all'
                  ? 'Tất cả chi nhánh (Tổng hợp toàn hệ thống)'
                  : branchesList.find(b => (b.branchCode || b.id) === selectedBranch)?.name || selectedBranch}
            </h2>
            <p className="text-gray-600 mt-1">Kỳ báo cáo: {selectedYear === 'all' ? 'Tất cả thời gian' : `Năm ${selectedYear}`}</p>
         </div>

         {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
               <RefreshCw size={36} className="animate-spin text-[#0057cd]" />
               <p className="text-sm font-bold text-slate-500">Đang tổng hợp dữ liệu thu chi & dòng tiền hệ thống...</p>
            </div>
         ) : (
            <>
               {/* KPI Cards */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-5 print:grid-cols-4 print:gap-4 border-slate-200 print:mb-8">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                     <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dòng Thu (Doanh Thu)</h3>
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Banknote size={18} /></div>
                     </div>
                     <div className="text-2xl font-black text-slate-900 tracking-tight">
                        +{totalRevenue.toLocaleString('vi-VN')}đ
                     </div>
                     <div className="mt-2 text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <ArrowUpRight size={14} /> Tổng từ {filteredOrders.length} đơn bán hàng
                     </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                     <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chi Phí Cố Định</h3>
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Receipt size={18} /></div>
                     </div>
                     <div className="text-2xl font-black text-amber-600 tracking-tight">
                        -{totalFixedExpenses.toLocaleString('vi-VN')}đ
                     </div>
                     <div className="mt-2 text-[11px] font-bold text-amber-600 flex items-center gap-1">
                        <ArrowDownRight size={14} /> {filteredExpenses.length} khoản chi (mặt bằng, lương, điện nước)
                     </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                     <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Giá Vốn (COGS)</h3>
                        <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><DollarSign size={18} /></div>
                     </div>
                     <div className="text-2xl font-black text-slate-900 tracking-tight">
                        -{totalCogs.toLocaleString('vi-VN')}đ
                     </div>
                     <div className="mt-2 text-[11px] font-bold text-slate-500">
                        Ước tính giá vốn hàng nhập kho
                     </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                     <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lợi Nhuận Ròng (Net Profit)</h3>
                        <div className={`p-2 rounded-xl ${netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                           <PieChart size={18} />
                        </div>
                     </div>
                     <div className={`text-2xl font-black tracking-tight ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString('vi-VN')}đ
                     </div>
                     <div className="mt-2 text-[11px] font-bold text-slate-500">
                        = Doanh thu - (COGS + Chi phí cố định)
                     </div>
                  </div>
               </div>

               {/* Chart Section */}
               <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
                  <div className="flex items-center justify-between mb-6">
                     <div>
                        <h3 className="font-bold text-slate-900 text-lg">Biểu đồ Dòng tiền & Lợi nhuận ròng {selectedYear === 'all' ? 'Tất cả thời gian' : `Năm ${selectedYear}`}</h3>
                        <p className="text-slate-500 text-sm mt-1">So sánh Doanh thu thu vào vs Chi phí cố định & Tổng chi xuất ra (Đơn vị: Triệu VNĐ)</p>
                      </div>
                     <span className="text-xs font-bold text-[#0057cd] px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                        Cập nhật thời gian thực
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
                           <Bar dataKey="revenue" name="Thu (Doanh thu)" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                           <Bar dataKey="fixedExpenses" name="Chi cố định (Mặt bằng/Lương)" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={30} />
                           <Bar dataKey="expense" name="Tổng chi (Gồm COGS)" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={30} />
                           <Bar dataKey="netProfit" name="Lợi nhuận ròng" fill="#0057cd" radius={[4, 4, 0, 0]} maxBarSize={30} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               {/* Net Cash Flow Ledger Table */}
               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:shadow-none print:border-gray-800 flex flex-col flex-1">
                  <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between print:bg-white print:border-b-2 print:border-gray-800 print:px-2">
                     <div>
                        <h3 className="font-bold text-slate-900 text-lg print:text-xl">Sổ quỹ & Nhật ký Dòng tiền (Net Cash Flow Ledger)</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Liệt kê nhật ký Thu (Đơn hàng) và Chi (Mặt bằng, Lương nhân viên, Điện nước...)</p>
                     </div>
                     <div className="hidden print:block text-sm font-bold">Ngày in: {new Date().toLocaleDateString('vi-VN')}</div>
                  </div>

                  <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left">
                        <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 border-b border-slate-200 print:bg-gray-100 print:text-black">
                           <tr>
                              <th className="px-6 py-4 print:px-2">Mã GD</th>
                              <th className="px-6 py-4 print:px-2">Ngày</th>
                              {selectedBranch === "all" && <th className="px-6 py-4 print:px-2">Chi nhánh</th>}
                              <th className="px-6 py-4 print:px-2">Loại GD</th>
                              <th className="px-6 py-4 print:px-2">Nội dung / Chứng từ</th>
                              <th className="px-6 py-4 print:px-2">Hình thức / Ghi chú</th>
                              <th className="px-6 py-4 text-right print:px-2">Số tiền</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 print:divide-gray-400">
                           {combinedLedger.length > 0 ? (
                              combinedLedger.map((tx) => (
                                 <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-mono font-bold text-slate-700 print:px-2 print:text-black">{tx.id}</td>
                                    <td className="px-6 py-4 text-slate-600 print:px-2 print:text-black">{tx.date}</td>
                                    {selectedBranch === "all" && <td className="px-6 py-4 font-medium text-slate-800 print:px-2 print:text-black">{tx.branch}</td>}
                                    <td className="px-6 py-4 print:px-2">
                                       {tx.type === 'INCOME' ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                             <ArrowUpRight size={12} /> THU BAN HANG
                                          </span>
                                       ) : (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                             <ArrowDownRight size={12} /> CHI PHI CO DINH
                                          </span>
                                       )}
                                    </td>
                                    <td className="px-6 py-4 print:px-2">
                                       <span className="font-bold text-slate-900 block">{tx.title}</span>
                                       <span className="text-xs text-slate-500">{tx.categoryText}</span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 text-xs print:px-2 print:text-black">
                                       <span className="font-medium text-slate-700 block">{tx.method}</span>
                                       <span>{tx.notes}</span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-black print:px-2 ${
                                       tx.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'
                                    }`}>
                                       {tx.type === 'INCOME' ? '+' : '-'}{tx.amount.toLocaleString('vi-VN')}đ
                                    </td>
                                 </tr>
                              ))
                           ) : (
                              <tr>
                                 <td colSpan={7} className="px-6 py-12 text-center text-slate-500 print:hidden font-bold">
                                    Không có giao dịch dòng tiền nào trong khoảng thời gian này.
                                 </td>
                               </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </>
         )}

         {/* Expense Creation Modal */}
         <CreateExpenseModal
            isOpen={showExpenseModal}
            branches={branchesList.map(b => ({ id: b.branchCode || b.id, name: b.name, code: b.branchCode }))}
            onClose={() => setShowExpenseModal(false)}
            onSuccess={() => {
               fetchAllFinancialData();
            }}
         />

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
