import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  RefreshCw, 
  DollarSign, 
  Activity, 
  PieChart, 
  Building 
} from 'lucide-react';
import api from '../../services/api';
import { KpiCard } from './KpiCard';

const branchColors: Record<string, string> = {
  'BR-001': '#3182CE',
  'BR-002': '#38A169',
  'BR-003': '#D69E2E',
  'BR-004': '#E53E3E',
};

export function ProfitAnalyticsDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedMonth, selectedBranch]);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await api.get('/api/branches');
      if (Array.isArray(res.data)) {
        setBranchesList(res.data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách chi nhánh:', err);
    }
  };

  const fetchAnalyticsData = async () => {
    setLoadingAnalytics(true);
    try {
      const dateStr = `${selectedMonth}-01`;
      const res = await api.get(`/api/reports/profit?period=month&date=${dateStr}&branchId=${selectedBranch}`);
      if (res.data && res.data.success) {
        setAnalyticsData(res.data.data);
      }
    } catch (err) {
      console.error('Lỗi tải phân tích lợi nhuận:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const ordersList = analyticsData?.orders || [];
  const totalRevenue = analyticsData?.summary?.netRevenue || 0;
  const totalCogs = analyticsData?.summary?.totalCogs || 0;
  const totalProfit = analyticsData?.summary?.totalProfit || 0;
  const profitMargin = analyticsData?.summary?.profitMargin || 0;

  // 1. Group Profit by Branch
  const branchSalesMap: Record<string, { name: string; sales: number; cogs: number; profit: number; count: number; color: string }> = {};
  ordersList.forEach((o: any) => {
    const bId = o.branchId || 'BR-001';
    if (!branchSalesMap[bId]) {
      const foundBranch = branchesList.find(b => b.branchCode === bId);
      branchSalesMap[bId] = {
        name: foundBranch ? foundBranch.name : `Chi nhánh ${bId}`,
        sales: 0,
        cogs: 0,
        profit: 0,
        count: 0,
        color: branchColors[bId] || '#718096',
      };
    }
    branchSalesMap[bId].sales += o.net || 0;
    branchSalesMap[bId].cogs += o.cogs || 0;
    branchSalesMap[bId].profit += o.profit || 0;
    branchSalesMap[bId].count += 1;
  });
  const branchAnalytics = Object.keys(branchSalesMap)
    .map((key) => ({
      id: key,
      ...branchSalesMap[key],
    }))
    .sort((a, b) => b.profit - a.profit);

  // 2. Group Sales & COGS by Day of Month
  const dailyMap: Record<string, { sales: number; cogs: number }> = {};
  ordersList.forEach((o: any) => {
    const dateObj = new Date(o.createdAt);
    const dayStr = dateObj.getDate().toString().padStart(2, '0');
    if (!dailyMap[dayStr]) {
      dailyMap[dayStr] = { sales: 0, cogs: 0 };
    }
    dailyMap[dayStr].sales += o.net || 0;
    dailyMap[dayStr].cogs += o.cogs || 0;
  });

  const year = parseInt(selectedMonth.split('-')[0]);
  const month = parseInt(selectedMonth.split('-')[1]);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyAnalytics = Array.from({ length: daysInMonth }, (_, idx) => {
    const d = (idx + 1).toString().padStart(2, '0');
    return {
      day: d,
      sales: dailyMap[d]?.sales || 0,
      cogs: dailyMap[d]?.cogs || 0,
      profit: (dailyMap[d]?.sales || 0) - (dailyMap[d]?.cogs || 0),
    };
  });

  const maxVal = Math.max(
    ...dailyAnalytics.map((d) => Math.max(d.sales, d.cogs)),
    100000
  );

  // 3. Donut segments calculations based on Profit
  let accumulatedPercent = 0;
  const donutSegments = branchAnalytics.map((b) => {
    const percent = totalProfit > 0 ? (b.profit / totalProfit) * 100 : 0;
    const strokeDasharray = `${(percent * 314) / 100} 314`;
    const strokeDashoffset = `${314 - (accumulatedPercent * 314) / 100}`;
    accumulatedPercent += percent;
    return {
      ...b,
      percent,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-emerald-600" />
          <span className="font-bold text-slate-800">Bộ lọc phân tích lợi nhuận (FEFO)</span>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3.5 py-2 border border-slate-200 bg-white rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="all">Tất cả chi nhánh</option>
            {branchesList.map(b => (
              <option key={b.branchCode} value={b.branchCode}>{b.name}</option>
            ))}
          </select>

          <button 
            onClick={fetchAnalyticsData}
            disabled={loadingAnalytics}
            className="p-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={18} className={loadingAnalytics ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loadingAnalytics ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <RefreshCw size={36} className="animate-spin text-emerald-600" />
          <p className="text-sm font-bold text-slate-500">Đang tổng hợp báo cáo lợi nhuận chi tiết...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <KpiCard
              icon={<DollarSign size={24} />}
              iconBgClass="bg-blue-50"
              iconColorClass="text-blue-600"
              title="Doanh thu thực tế (Net)"
              value={`${totalRevenue.toLocaleString('vi-VN')} đ`}
            />
            <KpiCard
              icon={<Activity size={24} />}
              iconBgClass="bg-orange-50"
              iconColorClass="text-orange-600"
              title="Giá vốn thực tế (COGS)"
              value={`${totalCogs.toLocaleString('vi-VN')} đ`}
            />
            <KpiCard
              icon={<TrendingUp size={24} />}
              iconBgClass="bg-emerald-50"
              iconColorClass="text-emerald-600"
              title="Lợi nhuận gộp (Profit)"
              value={`${totalProfit.toLocaleString('vi-VN')} đ`}
            />
            <KpiCard
              icon={<PieChart size={24} />}
              iconBgClass="bg-purple-50"
              iconColorClass="text-purple-600"
              title="Tỉ suất lợi nhuận"
              value={`${profitMargin}%`}
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-880 text-sm">Biểu đồ Doanh thu vs Giá vốn ({selectedMonth})</h3>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-500">
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-sm" /> Doanh thu
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-500">
                    <div className="w-2.5 h-2.5 bg-orange-400 rounded-sm" /> Giá vốn
                  </div>
                </div>
              </div>
              
              {ordersList.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm font-semibold">
                  Chưa có đơn hàng phát sinh trong kỳ này.
                </div>
              ) : (
                <div className="flex items-end justify-between h-48 pt-6 border-b border-slate-100 px-2">
                  {dailyAnalytics.map((dayData, index) => {
                    const revHeight = (dayData.sales / maxVal) * 100;
                    const cogsHeight = (dayData.cogs / maxVal) * 100;
                    return (
                      <div 
                        key={index} 
                        className="flex flex-col items-center flex-1 group relative cursor-pointer"
                      >
                        <div className="flex items-end justify-center gap-[2px] w-full">
                          {/* Revenue Bar */}
                          <div 
                            style={{ height: `${Math.max(revHeight, 2)}%` }}
                            className="w-[5px] bg-blue-500 hover:bg-blue-700 rounded-t-sm transition-all duration-300"
                          />
                          {/* COGS Bar */}
                          <div 
                            style={{ height: `${Math.max(cogsHeight, 2)}%` }}
                            className="w-[5px] bg-orange-400 hover:bg-orange-600 rounded-t-sm transition-all duration-300"
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 mt-2 font-mono group-hover:text-slate-800 transition-colors">
                          {dayData.day}
                        </span>
                        <div className="absolute bottom-full mb-2 bg-slate-900 text-white text-[9px] font-bold py-2 px-2.5 rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap space-y-0.5">
                          <p className="text-slate-200">Ngày {dayData.day}:</p>
                          <p className="text-blue-300">Net: {dayData.sales.toLocaleString('vi-VN')}đ</p>
                          <p className="text-orange-300">COGS: {dayData.cogs.toLocaleString('vi-VN')}đ</p>
                          <p className="text-emerald-300 font-extrabold border-t border-slate-700 pt-0.5">Lời: {dayData.profit.toLocaleString('vi-VN')}đ</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <h3 className="font-bold text-slate-880 text-sm mb-4">Cơ cấu lợi nhuận gộp theo Chi nhánh</h3>
              
              {ordersList.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm font-semibold">
                  Chưa có dữ liệu chi nhánh.
                </div>
              ) : (
                <div className="flex flex-row items-center justify-around gap-2 flex-1">
                  <div className="relative w-[130px] h-[130px]">
                    <svg width="130" height="130" viewBox="0 0 120 120" className="transform -rotate-90">
                      <circle cx="60" cy="60" r="50" fill="transparent" stroke="#F1F5F9" strokeWidth="10" />
                      {donutSegments.map((segment, index) => (
                        <circle
                          key={index}
                          cx="60"
                          cy="60"
                          r="50"
                          fill="transparent"
                          stroke={segment.color}
                          strokeWidth="10"
                          strokeDasharray={segment.strokeDasharray}
                          strokeDashoffset={segment.strokeDashoffset}
                          className="transition-all duration-305 hover:stroke-[12px]"
                        />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">TỔNG LỜI</span>
                      <span className="text-xs font-black text-slate-800 mt-0.5">{totalProfit.toLocaleString('vi-VN')}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {donutSegments.map((seg, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                        <div className="text-left">
                          <p className="text-[10px] font-bold text-slate-700 leading-none">{seg.id}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5 font-semibold">{seg.percent.toFixed(1)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pivot Branch Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-bold text-slate-880 text-sm flex items-center gap-2">
                <Building size={16} className="text-emerald-600" /> Báo cáo tổng hợp doanh thu & lợi nhuận chi nhánh
              </h3>
              <span className="text-xs font-bold text-emerald-600 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded">
                Tháng {month}/{year}
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Mã CN</th>
                    <th className="px-6 py-4">Tên chi nhánh</th>
                    <th className="px-6 py-4 text-right">Doanh thu (Net)</th>
                    <th className="px-6 py-4 text-right">Giá vốn (COGS)</th>
                    <th className="px-6 py-4 text-right">Lợi nhuận gộp</th>
                    <th className="px-6 py-4 text-center">Biên LN (%)</th>
                    <th className="px-6 py-4 text-center">Đóng góp lợi nhuận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {branchAnalytics.map((item, idx) => {
                    const ratio = totalProfit > 0 ? (item.profit / totalProfit) * 100 : 0;
                    const margin = item.sales > 0 ? ((item.profit / item.sales) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3.5 font-bold font-mono text-xs text-slate-800">{item.id}</td>
                        <td className="px-6 py-3.5 font-medium">{item.name}</td>
                        <td className="px-6 py-3.5 text-right font-semibold text-slate-700">{item.sales.toLocaleString('vi-VN')} đ</td>
                        <td className="px-6 py-3.5 text-right font-medium text-slate-500">{item.cogs.toLocaleString('vi-VN')} đ</td>
                        <td className="px-6 py-3.5 text-right font-bold text-emerald-700">{item.profit.toLocaleString('vi-VN')} đ</td>
                        <td className="px-6 py-3.5 text-center font-bold text-purple-700">{margin}%</td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.max(ratio, 0)}%`, backgroundColor: item.color }} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 w-8">{ratio.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  
                  {branchAnalytics.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center font-bold text-slate-400">
                        Không tìm thấy dữ liệu kinh doanh phù hợp.
                      </td>
                    </tr>
                  )}
                  
                  {branchAnalytics.length > 0 && (
                    <tr className="bg-slate-50 font-bold border-t border-slate-200 text-slate-950">
                      <td colSpan={2} className="px-6 py-4 text-left uppercase text-xs tracking-wide text-slate-700">Tổng cộng (Grand Total)</td>
                      <td className="px-6 py-4 text-right text-blue-800">{totalRevenue.toLocaleString('vi-VN')} đ</td>
                      <td className="px-6 py-4 text-right text-slate-500">{totalCogs.toLocaleString('vi-VN')} đ</td>
                      <td className="px-6 py-4 text-right text-emerald-800">{totalProfit.toLocaleString('vi-VN')} đ</td>
                      <td className="px-6 py-4 text-center text-purple-800">{profitMargin}%</td>
                      <td className="px-6 py-4 text-center">100.0%</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
