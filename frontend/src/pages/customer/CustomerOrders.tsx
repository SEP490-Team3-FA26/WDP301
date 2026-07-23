import React, { useState, useEffect } from 'react';
import { Package, Clock } from 'lucide-react';
import api from '../../services/core/api';

export function CustomerOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredOrders = orders.filter(order => filterStatus === 'ALL' || order.paymentStatus === filterStatus);

  useEffect(() => {
    const fetchOrdersData = async () => {
      setLoading(true);
      try {
        const ordersRes = await api.get('/api/orders/my-orders');
        setOrders(ordersRes.data || []);
      } catch (error) {
        console.error("Failed to load orders data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrdersData();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 w-full h-[calc(100vh-120px)] flex flex-col">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 animate-fade-in w-full flex flex-col flex-1 min-h-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#0d6efd] to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Package size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Lịch sử đơn hàng</h2>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Theo dõi trạng thái các đơn hàng đã mua.</p>
            </div>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto hide-scrollbar w-full lg:w-auto">
            {['ALL', 'PAID', 'PENDING', 'CANCELLED'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`flex-1 lg:flex-none whitespace-nowrap px-4 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${
                  filterStatus === status 
                    ? 'bg-white text-[#0d6efd] shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                }`}
              >
                {status === 'ALL' ? 'Tất cả' : status === 'PAID' ? 'Đã thanh toán' : status === 'CANCELLED' ? 'Đã hủy' : 'Chưa thanh toán'}
              </button>
            ))}
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0d6efd]"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="font-bold text-lg text-slate-400">Không có đơn hàng nào.</p>
          </div>
        ) : (
          <div className="space-y-5 overflow-y-auto flex-1 pr-2">
            {filteredOrders.map((order: any) => (
              <div key={order._id || order.orderCode} className="border border-slate-100 rounded-xl p-5 hover:shadow-lg hover:border-blue-100 transition-all bg-slate-50/50 group">
                <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-200 pb-4 mb-4">
                  <div>
                    <span className="font-black text-slate-800 text-lg group-hover:text-[#0d6efd] transition-colors">#{order.orderCode}</span>
                    <span className="text-slate-500 text-sm ml-3 flex items-center gap-1.5 inline-flex font-medium bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">
                      <Clock className="w-3.5 h-3.5 text-blue-500" /> {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div>
                    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm ${
                      order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                      order.paymentStatus === 'CANCELLED' ? 'bg-red-100 text-red-700 border border-red-200' :
                      'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}>
                      {order.paymentStatus === 'PAID' ? 'Đã thanh toán' : order.paymentStatus === 'CANCELLED' ? 'Đã hủy' : 'Chưa thanh toán'}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                  <div className="flex-1 w-full">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sản phẩm:</p>
                    <ul className="text-sm text-slate-700 space-y-1 font-medium bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                      {order.items?.map((item: any, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[#0d6efd] mt-1">•</span> {item.name} (x{item.quantity})
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-left sm:text-right w-full sm:w-auto bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Tổng tiền</p>
                    <p className="text-2xl font-black text-[#0d6efd]">
                      {order.totalAmount.toLocaleString('vi-VN')} <span className="text-base text-slate-400">₫</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
