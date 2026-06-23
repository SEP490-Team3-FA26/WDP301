import React, { useState, useEffect } from 'react';
import { User, Package, Clock, MapPin, Phone, Mail, Edit2 } from 'lucide-react';
import api from '../../services/api';

// MOCK DATA for layout demonstration.
// In a real application, you would fetch this data from your user-service & orders-service
const MOCK_USER = {
  fullName: "Nguyễn Văn A",
  phone: "0901234567",
  email: "nguyenvana@gmail.com",
  address: "123 Đường Nguyễn Trãi, Quận 1, TP.HCM",
  loyaltyPoints: 1500
};

const MOCK_ORDERS = [
  {
    id: "ORD-98231",
    date: "2026-06-20",
    totalAmount: 350000,
    status: "DELIVERED",
    items: ["Panadol Extra (x2)", "Vitamin C 500mg (x1)"]
  },
  {
    id: "ORD-98100",
    date: "2026-06-15",
    totalAmount: 120000,
    status: "PROCESSING",
    items: ["Nước súc miệng Listerine (x1)"]
  }
];

export function CustomerProfile() {
  const [activeTab, setActiveTab] = useState<'profile' | 'history'>('profile');
  const [user, setUser] = useState(MOCK_USER);
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [loading, setLoading] = useState(false);

  // Example of how you would fetch real data
  /*
  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        // Fetch User Profile
        // const userRes = await api.get('/api/users/me');
        // setUser(userRes.data);

        // Fetch User Order History
        // const ordersRes = await api.get('/api/orders/my-orders');
        // setOrders(ordersRes.data);
      } catch (error) {
        console.error("Failed to load profile data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, []);
  */

  const renderProfile = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 animate-fade-in h-[600px] w-full flex flex-col overflow-y-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Thông tin tài khoản</h2>
          <p className="text-slate-500 text-sm mt-1">Quản lý thông tin cá nhân và địa chỉ giao hàng.</p>
        </div>
        <button className="flex items-center gap-2 text-[#0d6efd] hover:bg-[#f2f3ff] px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm shadow-blue-500/10">
          <Edit2 className="w-4 h-4" />
          Chỉnh sửa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Họ và Tên</label>
            <div className="flex items-center gap-3 mt-1.5 text-slate-800 font-bold bg-slate-50 p-3 rounded-xl border border-slate-100">
              <User className="w-5 h-5 text-slate-400" />
              {user.fullName}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Số điện thoại</label>
            <div className="flex items-center gap-3 mt-1.5 text-slate-800 font-bold bg-slate-50 p-3 rounded-xl border border-slate-100">
              <Phone className="w-5 h-5 text-slate-400" />
              {user.phone}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
            <div className="flex items-center gap-3 mt-1.5 text-slate-800 font-bold bg-slate-50 p-3 rounded-xl border border-slate-100">
              <Mail className="w-5 h-5 text-slate-400" />
              {user.email}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Địa chỉ nhận hàng mặc định</label>
            <div className="flex items-start gap-3 mt-1.5 text-slate-800 font-bold bg-slate-50 p-3 rounded-xl border border-slate-100">
              <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              <span className="leading-tight">{user.address}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 p-5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
        <div className="relative z-10">
          <h3 className="font-bold text-blue-900 text-lg">Điểm thành viên (Loyalty Points)</h3>
          <p className="text-blue-700 text-sm mt-1">Sử dụng điểm để đổi quà hoặc giảm giá ở lần mua sau.</p>
        </div>
        <div className="text-3xl font-black text-[#0d6efd] relative z-10 bg-white px-5 py-2 rounded-xl shadow-sm border border-blue-100">
          {user.loyaltyPoints} <span className="text-sm font-bold uppercase tracking-wider text-slate-400 ml-1">pts</span>
        </div>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 animate-fade-in h-[600px] w-full flex flex-col overflow-y-auto">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Lịch sử đơn hàng của bạn</h2>
      
      {orders.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="font-medium text-lg text-slate-400">Bạn chưa có đơn hàng nào.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order, idx) => (
            <div key={order.id} className="border border-slate-100 rounded-xl p-5 hover:shadow-lg hover:border-blue-100 transition-all bg-slate-50/50 group">
              <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-200 pb-4 mb-4">
                <div>
                  <span className="font-black text-slate-800 text-lg group-hover:text-[#0d6efd] transition-colors">#{order.id}</span>
                  <span className="text-slate-500 text-sm ml-3 flex items-center gap-1.5 inline-flex font-medium bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-blue-500" /> {order.date}
                  </span>
                </div>
                <div>
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm ${
                    order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                    'bg-amber-100 text-amber-700 border border-amber-200'
                  }`}>
                    {order.status === 'DELIVERED' ? 'Đã giao hàng' : 'Đang xử lý'}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sản phẩm:</p>
                  <ul className="text-sm text-slate-700 space-y-1 font-medium bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    {order.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#0d6efd] mt-1">•</span> {item}
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
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 min-h-[calc(100vh-160px)]">
      <div className="grid grid-cols-1 md:grid-cols-[3fr_7fr] gap-8">
        
        {/* Sidebar */}
        <div className="w-full">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sticky top-28 h-[600px]">
            <div className="flex items-center gap-4 p-4 mb-4 border-b border-slate-100 pb-6 bg-slate-50 rounded-xl">
              <div className="w-14 h-14 bg-gradient-to-tr from-[#0d6efd] to-sky-400 rounded-full flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-500/20">
                {user.fullName.charAt(0)}
              </div>
              <div>
                <p className="font-black text-slate-800 text-lg leading-tight">{user.fullName}</p>
                <p className="text-[10px] uppercase tracking-wider font-bold text-[#0d6efd] mt-1 bg-blue-50 inline-block px-2 py-0.5 rounded-full">Khách hàng thành viên</p>
              </div>
            </div>
            
            <nav className="space-y-1.5 px-1">
              <button 
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-sm font-bold uppercase tracking-wider transition-all ${
                  activeTab === 'profile' ? 'bg-[#0d6efd] text-white shadow-md shadow-blue-500/20' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <User className="w-5 h-5" />
                Hồ sơ cá nhân
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-sm font-bold uppercase tracking-wider transition-all ${
                  activeTab === 'history' ? 'bg-[#0d6efd] text-white shadow-md shadow-blue-500/20' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Package className="w-5 h-5" />
                Lịch sử mua hàng
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="w-full min-w-0">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0d6efd]"></div>
            </div>
          ) : (
            activeTab === 'profile' ? renderProfile() : renderHistory()
          )}
        </div>

      </div>
    </div>
  );
}
