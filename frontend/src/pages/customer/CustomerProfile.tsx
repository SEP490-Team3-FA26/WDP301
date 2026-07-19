import React, { useState, useEffect } from 'react';
import { User, MapPin, Phone, Mail, Edit2 } from 'lucide-react';
import api from '../../services/core/api';

export function CustomerProfile() {
  const [user, setUser] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    loyaltyPoints: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        const userRes = await api.get('/api/auth/profile');
        if (userRes && userRes.data) {
          setUser({
            fullName: userRes.data.fullName || userRes.data.name || 'Người dùng',
            phone: userRes.data.phone || 'Chưa cập nhật',
            email: userRes.data.email,
            address: userRes.data.address || 'Chưa cập nhật',
            loyaltyPoints: userRes.data.loyaltyPoints || 0
          });
        }
      } catch (error) {
        console.error("Failed to load profile data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 w-full">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0d6efd]"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 animate-fade-in w-full flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-tr from-[#0d6efd] to-sky-400 rounded-full flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-500/20">
                {user.fullName.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Thông tin tài khoản</h2>
                <p className="text-slate-500 text-sm mt-1">Quản lý thông tin cá nhân và địa chỉ giao hàng.</p>
              </div>
            </div>
            <button className="flex items-center gap-2 text-[#0d6efd] hover:bg-[#f2f3ff] px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm shadow-blue-500/10">
              <Edit2 className="w-4 h-4" />
              Chỉnh sửa
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
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
      )}
    </div>
  );
}
