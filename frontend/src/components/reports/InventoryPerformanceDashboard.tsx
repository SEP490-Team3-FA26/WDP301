import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, TrendingDown, RefreshCw, CalendarDays, Search, Building } from 'lucide-react';
import api from '../../services/api';

export function InventoryPerformanceDashboard() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  
  // Date range logic
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  
  const [startDate, setStartDate] = useState(defaultStartDate.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [branchesList, setBranchesList] = useState<any[]>([]);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchPerformanceData();
  }, [startDate, endDate, selectedBranch]);

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

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/reports/inventory-performance?branchId=${selectedBranch}&startDate=${startDate}&endDate=${endDate}`);
      if (res.data && res.data.success) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error('Lỗi tải báo cáo hiệu suất:', error);
    } finally {
      setLoading(false);
    }
  };

  const topSelling = data?.topSelling || [];
  const slowMoving = data?.slowMoving || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={20} className="text-[#0057cd]" />
          <span className="font-bold text-slate-800">Hiệu suất sản phẩm</span>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full sm:w-auto items-center">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <CalendarDays size={16} />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent outline-none cursor-pointer" />
            <span>-</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent outline-none cursor-pointer" />
          </div>
          
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3.5 py-2 border border-slate-200 bg-white rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0057cd]"
          >
            <option value="all">Tất cả chi nhánh</option>
            {branchesList.map(b => (
              <option key={b.branchCode} value={b.branchCode}>{b.name}</option>
            ))}
          </select>

          <button 
            onClick={fetchPerformanceData}
            disabled={loading}
            className="p-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <RefreshCw size={36} className="animate-spin text-[#0057cd]" />
          <p className="text-sm font-bold text-slate-500">Đang tổng hợp dữ liệu thời gian thực...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Selling Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="p-5 border-b border-slate-100 bg-emerald-50/50 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-slate-880 text-sm flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-600" /> Top 20 Hàng Bán Chạy (Theo số lượng)
              </h3>
            </div>
            <div className="overflow-auto flex-1 p-0">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-5 py-3">#</th>
                    <th className="px-5 py-3">Tên sản phẩm</th>
                    <th className="px-5 py-3 text-center">Số lượng bán</th>
                    <th className="px-5 py-3 text-right">Tổng thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {topSelling.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-400">{idx + 1}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-800">{item.name}</td>
                      <td className="px-5 py-3.5 text-center font-black text-emerald-600">{item.totalQuantity}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-600">{(item.totalRevenue || 0).toLocaleString('vi-VN')} đ</td>
                    </tr>
                  ))}
                  {topSelling.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-slate-400 font-semibold">
                        Không có dữ liệu hàng bán ra trong kỳ.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Slow Moving / Dead Stock Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="p-5 border-b border-slate-100 bg-red-50/50 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-slate-880 text-sm flex items-center gap-2">
                <TrendingDown size={18} className="text-red-500" /> Hàng Chậm Luân Chuyển (Không bán được trong kỳ)
              </h3>
              <span className="text-[10px] font-bold bg-white text-red-500 border border-red-200 px-2 py-0.5 rounded-full">
                {slowMoving.length} mặt hàng
              </span>
            </div>
            <div className="overflow-auto flex-1 p-0">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-5 py-3">Tên sản phẩm</th>
                    <th className="px-5 py-3 text-center">Tồn kho</th>
                    <th className="px-5 py-3 text-center">Lưu kho</th>
                    <th className="px-5 py-3 text-right">Đơn giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {slowMoving.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-800">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.sku}</p>
                      </td>
                      <td className="px-5 py-3.5 text-center font-black text-amber-600">{item.stock} {item.unit}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="text-[11px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-600">
                          {item.daysInStock} ngày
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-600">{(item.price || 0).toLocaleString('vi-VN')} đ</td>
                    </tr>
                  ))}
                  {slowMoving.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-slate-400 font-semibold">
                        Tuyệt vời! Không có mặt hàng nào bị chậm luân chuyển.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
