import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Building2,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Search,
  Edit2,
  CheckCircle2,
  X,
  Loader2,
  Calendar,
  Clock,
  ArrowUpRight,
  ChevronRight,
  FileText,
  User
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from "recharts";
import { motion, AnimatePresence } from "motion/react";

export function SupplierCreditManagement() {
  const [tab, setTab] = useState<"SUMMARY" | "LIST" | "OVERDUE">("SUMMARY");
  const [summaryData, setSummaryData] = useState<any>(null);
  const [overdueData, setOverdueData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Form inputs
  const [newCreditLimit, setNewCreditLimit] = useState<number>(0);
  const [newPaymentTerm, setNewPaymentTerm] = useState<number>(30);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("BANK_TRANSFER");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [performedBy, setPerformedBy] = useState<string>("Admin");

  // History & Aging state for selected supplier
  const [debtDetail, setDebtDetail] = useState<any>(null);
  const [agingData, setAgingData] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchSummary = async () => {
    try {
      const res = await fetch("/api/supplier-credit/summary");
      if (res.ok) {
        const data = await res.json();
        setSummaryData(data);
      } else {
        throw new Error("Lỗi tải thông tin tổng hợp công nợ");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Lỗi kết nối");
    }
  };

  const fetchOverdue = async () => {
    try {
      const res = await fetch("/api/supplier-credit/overdue");
      if (res.ok) {
        const data = await res.json();
        setOverdueData(data);
      } else {
        throw new Error("Lỗi tải thông tin nợ quá hạn");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Lỗi kết nối");
    }
  };

  const initData = async () => {
    setLoading(true);
    setErrorMsg(null);
    await Promise.all([fetchSummary(), fetchOverdue()]);
    setLoading(false);
  };

  useEffect(() => {
    initData();
  }, []);

  const handleOpenLimitModal = (supplier: any) => {
    setSelectedSupplier(supplier);
    setNewCreditLimit(supplier.creditLimit || 0);
    setNewPaymentTerm(supplier.paymentTermDays || 30);
    setShowLimitModal(true);
  };

  const handleOpenPaymentModal = (supplier: any) => {
    setSelectedSupplier(supplier);
    setPayAmount(supplier.currentDebt || 0);
    setPaymentMethod("BANK_TRANSFER");
    setPaymentNotes("");
    setShowPaymentModal(true);
  };

  const handleOpenHistoryModal = async (supplier: any) => {
    setSelectedSupplier(supplier);
    setShowHistoryModal(true);
    setLoadingDetail(true);
    try {
      const [resDetail, resAging] = await Promise.all([
        fetch(`/api/suppliers/${supplier.id}/credit`),
        fetch(`/api/suppliers/${supplier.id}/aging`)
      ]);
      if (resDetail.ok) {
        setDebtDetail(await resDetail.json());
      }
      if (resAging.ok) {
        const aging = await resAging.json();
        setAgingData(aging);
      }
    } catch (e: any) {
      setErrorMsg("Lỗi tải lịch sử công nợ: " + e.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSaveLimit = async () => {
    if (!selectedSupplier) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${selectedSupplier.id}/credit-limit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditLimit: Number(newCreditLimit),
          paymentTermDays: Number(newPaymentTerm)
        })
      });
      const resData = await res.json();
      if (res.ok) {
        setSuccessMsg(resData.message || "Cập nhật hạn mức công nợ thành công!");
        setShowLimitModal(false);
        await initData();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        throw new Error(resData.message || "Cập nhật thất bại");
      }
    } catch (e: any) {
      setErrorMsg(e.message);
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedSupplier) return;
    if (payAmount <= 0) {
      alert("Số tiền thanh toán phải lớn hơn 0");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/suppliers/${selectedSupplier.id}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(payAmount),
          paymentMethod,
          notes: paymentNotes,
          performedBy
        })
      });
      const resData = await res.json();
      if (res.ok) {
        setSuccessMsg(resData.message || "Ghi nhận thanh toán thành công!");
        setShowPaymentModal(false);
        await initData();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        throw new Error(resData.message || "Ghi nhận thất bại");
      }
    } catch (e: any) {
      setErrorMsg(e.message);
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Process data for charts
  const getAgingChartData = () => {
    if (!agingData || !agingData.aging) {
      // General overview default chart data
      return [
        { name: "Trong hạn", value: summaryData ? summaryData.totalDebt - (overdueData ? overdueData.totalOverdueAmount : 0) : 100000000, color: "#10b981" },
        { name: "Nợ quá hạn", value: overdueData ? overdueData.totalOverdueAmount : 20000000, color: "#f43f5e" }
      ];
    }
    const a = agingData.aging;
    return [
      { name: "Trong hạn", value: a.current || 0, color: "#10b981" },
      { name: "1 - 30 ngày", value: a.days1_30 || 0, color: "#eab308" },
      { name: "31 - 60 ngày", value: a.days31_60 || 0, color: "#f97316" },
      { name: "61 - 90 ngày", value: a.days61_90 || 0, color: "#ef4444" },
      { name: "Trên 90 ngày", value: a.over90 || 0, color: "#881337" }
    ];
  };

  const getSupplierUtilizationData = () => {
    if (!summaryData || !summaryData.suppliers) return [];
    return summaryData.suppliers
      .slice(0, 5)
      .map((s: any) => ({
        name: s.name.substring(0, 15) + (s.name.length > 15 ? "..." : ""),
        "Hạn mức": s.creditLimit,
        "Dư nợ": s.currentDebt
      }));
  };

  const filteredSuppliers = summaryData?.suppliers?.filter((s: any) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] p-6 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-500 text-white shadow-lg shadow-indigo-200">
            <CreditCard size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Công Nợ Nhà Cung Cấp</h1>
            <p className="text-slate-500 text-sm mt-0.5">Quản lý hạn mức công nợ, thời hạn và các đợt thanh toán cho Nhà cung cấp</p>
          </div>
        </div>
        <button
          onClick={initData}
          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl text-sm transition shadow-sm flex items-center gap-1.5 self-start md:self-auto"
        >
          Tải lại dữ liệu
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm animate-pulse">
          <CheckCircle2 size={16} className="text-emerald-500" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm">
          <AlertTriangle size={16} className="text-rose-500" />
          {errorMsg}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">TỔNG DƯ NỢ NCC</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">
              {summaryData?.totalDebt?.toLocaleString("vi-VN") || 0}đ
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <DollarSign size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">TỔNG HẠN MỨC CẤP</span>
            <span className="text-xl font-black text-slate-900 mt-1 block">
              {summaryData?.totalCreditLimit?.toLocaleString("vi-VN") || 0}đ
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">TỶ LỆ SỬ DỤNG</span>
            <span className="text-xl font-black text-indigo-600 mt-1 block">
              {summaryData?.utilizationRate || 0}%
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">NỢ QUÁ HẠN ⚠️</span>
            <span className="text-xl font-black text-rose-600 mt-1 block">
              {overdueData?.totalOverdueAmount?.toLocaleString("vi-VN") || 0}đ
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          onClick={() => setTab("SUMMARY")}
          className={`px-4 py-3 font-bold text-sm border-b-2 transition-all ${
            tab === "SUMMARY" ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Tổng hợp & Biểu đồ
        </button>
        <button
          onClick={() => setTab("LIST")}
          className={`px-4 py-3 font-bold text-sm border-b-2 transition-all ${
            tab === "LIST" ? "border-indigo-500 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Hạn mức & Thanh toán ({summaryData?.suppliers?.length || 0})
        </button>
        <button
          onClick={() => setTab("OVERDUE")}
          className={`px-4 py-3 font-bold text-sm border-b-2 transition-all ${
            tab === "OVERDUE" ? "border-rose-500 text-rose-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Nợ quá hạn NCC ({overdueData?.totalOverdueSuppliers || 0})
        </button>
      </div>

      {/* Tab 1: Summary Dashboard */}
      {tab === "SUMMARY" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Credit Utilization by Supplier */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 size={16} className="text-indigo-500" /> Top Dư nợ so với Hạn mức của NCC
            </h3>
            <div className="h-72 w-full">
              {summaryData?.suppliers && summaryData.suppliers.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getSupplierUtilizationData()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" fontSize={11} stroke="#64748b" />
                    <YAxis fontSize={11} stroke="#64748b" />
                    <Tooltip 
                      formatter={(value) => value != null ? `${value.toLocaleString("vi-VN")}đ` : ""}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                      itemStyle={{ color: '#334155' }}
                    />
                    <Legend />
                    <Bar dataKey="Hạn mức" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Dư nợ" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">Chưa có dữ liệu công nợ.</div>
              )}
            </div>
          </div>

          {/* Chart 2: Debt Overdue vs Current */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-500" /> Tỷ lệ Nợ quá hạn NCC
            </h3>
            <div className="h-72 w-full flex flex-col md:flex-row items-center justify-center gap-6">
              <div className="w-1/2 h-full min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getAgingChartData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {getAgingChartData().map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => value != null ? `${value.toLocaleString("vi-VN")}đ` : ""}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                      itemStyle={{ color: '#334155' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2.5 self-start md:self-center">
                {getAgingChartData().map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <span className="w-3.5 h-3.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-500">{item.name}:</span>
                    <span>{item.value?.toLocaleString("vi-VN")}đ</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Table: Quick Stats */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Nhà cung cấp có dư nợ cao nhất</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-xs text-slate-400 font-bold uppercase">
                    <th className="py-2.5">Nhà cung cấp</th>
                    <th className="py-2.5 text-right">Hạn mức</th>
                    <th className="py-2.5 text-right">Dư nợ</th>
                    <th className="py-2.5 text-right">Khả dụng</th>
                    <th className="py-2.5 text-center">Tỷ lệ dùng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {summaryData?.suppliers?.slice(0, 5).map((s: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 font-semibold text-slate-800">{s.name}</td>
                      <td className="py-3 text-right font-bold text-slate-500">{s.creditLimit?.toLocaleString("vi-VN")}đ</td>
                      <td className="py-3 text-right font-black text-indigo-600">{s.currentDebt?.toLocaleString("vi-VN")}đ</td>
                      <td className="py-3 text-right font-bold text-emerald-600">{s.remainingCredit?.toLocaleString("vi-VN")}đ</td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          s.utilizationPercent > 80 ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600"
                        }`}>{s.utilizationPercent}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Supplier List & Credit Actions */}
      {tab === "LIST" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col flex-1">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Tìm NCC theo tên..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <span className="text-xs font-bold text-slate-500">Hiển thị {filteredSuppliers.length} NCC có công nợ</span>
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 font-bold uppercase bg-slate-50/50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Nhà cung cấp</th>
                  <th className="px-5 py-3 text-right">Hạn mức</th>
                  <th className="px-5 py-3 text-right">Dư nợ hiện tại</th>
                  <th className="px-5 py-3 text-right">Còn lại</th>
                  <th className="px-5 py-3">Tỷ lệ dùng</th>
                  <th className="px-5 py-3 text-center">Hạn TT</th>
                  <th className="px-5 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <span className="font-bold text-slate-800 block text-sm">{s.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">ID: {s.id}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-slate-600">
                      {s.creditLimit?.toLocaleString("vi-VN")}đ
                    </td>
                    <td className="px-5 py-4 text-right font-black text-indigo-600">
                      {s.currentDebt?.toLocaleString("vi-VN")}đ
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-emerald-600">
                      {s.remainingCredit?.toLocaleString("vi-VN")}đ
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${s.utilizationPercent > 80 ? "bg-rose-500" : "bg-indigo-500"}`}
                            style={{ width: `${Math.min(100, s.utilizationPercent)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700">{s.utilizationPercent}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center font-bold text-slate-600">
                      {s.paymentTermDays || 30} ngày
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenHistoryModal(s)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Lịch sử giao dịch"
                        >
                          <FileText size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenLimitModal(s)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Cấu hình hạn mức"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenPaymentModal(s)}
                          disabled={s.currentDebt <= 0}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-lg text-xs transition"
                        >
                          Thanh toán
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Overdue Suppliers & Alerts */}
      {tab === "OVERDUE" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col flex-1">
          <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-rose-950 flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-600" /> Báo cáo nợ quá hạn
              </h3>
              <p className="text-xs text-rose-700 mt-1">Danh sách nhà cung cấp có các khoản nhập hàng đã quá kỳ hạn thanh toán</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-500 block">TỔNG NỢ QUÁ HẠN</span>
              <span className="text-lg font-black text-rose-600">{overdueData?.totalOverdueAmount?.toLocaleString("vi-VN") || 0}đ</span>
            </div>
          </div>

          <div className="overflow-auto flex-1">
            {!overdueData?.suppliers || overdueData.suppliers.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-3 text-slate-400">
                <CheckCircle2 size={36} className="text-emerald-500" />
                <p className="text-sm font-semibold text-slate-800">Tuyệt vời! Không có NCC nào bị quá hạn công nợ.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-[11px] text-slate-500 font-bold uppercase bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Nhà cung cấp</th>
                    <th className="px-5 py-3 text-right">Tổng nợ quá hạn</th>
                    <th className="px-5 py-3 text-center">Số lô quá hạn</th>
                    <th className="px-5 py-3">Ngày hết hạn cũ nhất</th>
                    <th className="px-5 py-3">Số ngày trễ hạn</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {overdueData.suppliers.map((os: any, idx: number) => (
                    <tr key={idx} className="hover:bg-rose-50/20 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-bold text-slate-800 block">{os.supplierName}</span>
                      </td>
                      <td className="px-5 py-4 text-right font-black text-rose-600">
                        {os.totalOverdue?.toLocaleString("vi-VN")}đ
                      </td>
                      <td className="px-5 py-4 text-center font-bold text-slate-700">
                        {os.overdueCount}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <Calendar size={13} className="inline mr-1 text-slate-400" />
                        {os.oldestDueDate ? new Date(os.oldestDueDate).toLocaleDateString("vi-VN") : "N/A"}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-black rounded text-xs">
                          {os.daysOverdue} ngày trễ
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleOpenPaymentModal({ id: os.supplierId, name: os.supplierName, currentDebt: os.totalOverdue })}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition"
                        >
                          Settle Nợ quá hạn
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Edit Limit Modal */}
      <AnimatePresence>
        {showLimitModal && selectedSupplier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLimitModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 bg-amber-50">
                <h3 className="font-bold text-amber-950 flex items-center gap-1.5">
                  <Edit2 size={16} className="text-amber-600" /> Cấu hình Hạn mức & Kỳ hạn
                </h3>
                <p className="text-xs text-amber-700 mt-1">{selectedSupplier.name}</p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">HẠN MỨC CÔNG NỢ TỐI ĐA (VNĐ)</label>
                  <input
                    type="number"
                    value={newCreditLimit}
                    onChange={e => setNewCreditLimit(Number(e.target.value))}
                    placeholder="Nhập số tiền..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Nhập 0 để chặn mua nợ hoàn toàn.</span>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">KỲ HẠN THANH TOÁN (NGÀY)</label>
                  <input
                    type="number"
                    value={newPaymentTerm}
                    onChange={e => setNewPaymentTerm(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
              <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
                <button onClick={() => setShowLimitModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-bold">
                  Hủy
                </button>
                <button onClick={handleSaveLimit} className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm">
                  Lưu thay đổi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Record Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedSupplier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 bg-emerald-50">
                <h3 className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <CreditCard size={16} className="text-emerald-600" /> Thanh Toán Cho NCC
                </h3>
                <p className="text-xs text-emerald-700 mt-1">{selectedSupplier.name}</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold">Dư nợ hiện tại:</span>
                    <span className="font-black text-slate-800">{(selectedSupplier.currentDebt || selectedSupplier.totalOverdue)?.toLocaleString("vi-VN")}đ</span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">SỐ TIỀN THANH TOÁN (VNĐ)</label>
                  <input
                    type="number"
                    max={selectedSupplier.currentDebt}
                    value={payAmount}
                    onChange={e => setPayAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-emerald-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">PHƯƠNG THỨC THANH TOÁN</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="BANK_TRANSFER">Chuyển khoản ngân hàng</option>
                    <option value="CASH">Tiền mặt</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">GHI CHÚ / THAM CHIẾU</label>
                  <textarea
                    rows={2}
                    value={paymentNotes}
                    onChange={e => setPaymentNotes(e.target.value)}
                    placeholder="Nhập mã UNC, số biên nhận..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">NGƯỜI THỰC HIỆN</label>
                  <input
                    type="text"
                    value={performedBy}
                    onChange={e => setPerformedBy(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
                <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-bold">
                  Hủy
                </button>
                <button onClick={handleRecordPayment} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm">
                  Xác nhận
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History & Aging Modal */}
      <AnimatePresence>
        {showHistoryModal && selectedSupplier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-950 flex items-center gap-1.5">
                    <FileText size={16} className="text-indigo-600" /> Lịch Sử Công Nợ & Phân Tích Tuổi Nợ
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{selectedSupplier.name}</p>
                </div>
                <button onClick={() => setShowHistoryModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-5 flex-1">
                {loadingDetail ? (
                  <div className="flex flex-col items-center py-16 gap-3">
                    <Loader2 className="animate-spin text-indigo-600" size={28} />
                    <p className="text-slate-500 text-sm">Đang tải chi tiết...</p>
                  </div>
                ) : (
                  <>
                    {/* Aging stats for this supplier */}
                    {agingData && agingData.aging && (
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Phân tích tuổi nợ (Aging Analysis)</h4>
                        <div className="grid grid-cols-5 gap-2 text-center">
                          <div className="p-2 bg-white rounded-lg border border-slate-150">
                            <span className="text-[10px] font-bold text-emerald-600 block">Trong hạn</span>
                            <span className="text-xs font-black text-slate-800">{(agingData.aging.current || 0).toLocaleString("vi-VN")}đ</span>
                          </div>
                          <div className="p-2 bg-white rounded-lg border border-slate-150">
                            <span className="text-[10px] font-bold text-yellow-600 block">1-30 ngày</span>
                            <span className="text-xs font-black text-slate-800">{(agingData.aging.days1_30 || 0).toLocaleString("vi-VN")}đ</span>
                          </div>
                          <div className="p-2 bg-white rounded-lg border border-slate-150">
                            <span className="text-[10px] font-bold text-orange-600 block">31-60 ngày</span>
                            <span className="text-xs font-black text-slate-800">{(agingData.aging.days31_60 || 0).toLocaleString("vi-VN")}đ</span>
                          </div>
                          <div className="p-2 bg-white rounded-lg border border-slate-150">
                            <span className="text-[10px] font-bold text-rose-600 block">61-90 ngày</span>
                            <span className="text-xs font-black text-slate-800">{(agingData.aging.days61_90 || 0).toLocaleString("vi-VN")}đ</span>
                          </div>
                          <div className="p-2 bg-white rounded-lg border border-slate-150">
                            <span className="text-[10px] font-bold text-red-950 block">&gt;90 ngày</span>
                            <span className="text-xs font-black text-slate-800">{(agingData.aging.over90 || 0).toLocaleString("vi-VN")}đ</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Transaction history list */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase">Nhật ký giao dịch công nợ (Tối đa 50)</h4>
                      {!debtDetail?.transactions || debtDetail.transactions.length === 0 ? (
                        <p className="text-sm text-slate-400 py-6 text-center">Chưa có nhật ký giao dịch nào.</p>
                      ) : (
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {debtDetail.transactions.map((t: any) => (
                            <div key={t.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-150 text-xs">
                              <div>
                                <span className={`inline-block px-2 py-0.5 rounded font-black text-[9px] uppercase ${
                                  t.type === "GRN_PAYABLE" ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700"
                                }`}>
                                  {t.type === "GRN_PAYABLE" ? "Nhập nợ (GRN)" : t.type === "PAYMENT" ? "Thanh toán" : "Điều chỉnh"}
                                </span>
                                <span className="text-slate-400 font-mono ml-2">#{t.referenceId || "N/A"}</span>
                                <p className="text-slate-500 mt-1 font-semibold">{t.notes}</p>
                                <div className="text-[10px] text-slate-400 mt-0.5 flex gap-3">
                                  <span>Ngày: {new Date(t.createdAt).toLocaleString("vi-VN")}</span>
                                  {t.dueDate && <span>Hạn: {new Date(t.dueDate).toLocaleDateString("vi-VN")}</span>}
                                  {t.performedBy && <span>Thực hiện: {t.performedBy}</span>}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`font-black text-sm block ${t.amount > 0 ? "text-orange-600" : "text-emerald-600"}`}>
                                  {t.amount > 0 ? "+" : ""}{t.amount.toLocaleString("vi-VN")}đ
                                </span>
                                <span className="text-[10px] text-slate-400">Dư nợ: {t.balanceAfter.toLocaleString("vi-VN")}đ</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
