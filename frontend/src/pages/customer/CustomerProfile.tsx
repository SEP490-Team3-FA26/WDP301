import React, { useState, useEffect } from 'react';
import { User, MapPin, Phone, Mail, Edit2, Lock, X, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/core/api';

export function CustomerProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    loyaltyPoints: 0
  });
  const [loading, setLoading] = useState(true);

  // Change Password States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  const handleOpenPasswordModal = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess('');
    setIsPasswordModalOpen(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post('/api/auth/change-password', {
        oldPassword,
        newPassword
      });
      
      setPasswordSuccess('Đổi mật khẩu thành công! Bạn sẽ được đăng xuất để đăng nhập lại...');
      
      // Delay and redirect
      setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        navigate('/auth/login');
      }, 3000);
      
    } catch (error: any) {
      setPasswordError(error.response?.data?.message || error.message || 'Đã xảy ra lỗi khi đổi mật khẩu.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 w-full relative">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0d6efd]"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sm:p-8 animate-fade-in w-full flex flex-col relative z-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-tr from-[#0d6efd] to-sky-400 rounded-full flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-500/30">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Thông tin tài khoản</h2>
                <p className="text-slate-500 text-sm mt-1 font-medium">Quản lý thông tin cá nhân và bảo mật.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={handleOpenPasswordModal}
                className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-[0.98]"
              >
                <Lock className="w-4 h-4 text-slate-500" />
                Đổi mật khẩu
              </button>
              <button className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-[#0d6efd] hover:bg-[#0b5ed7] text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-500/20 active:scale-[0.98]">
                <Edit2 className="w-4 h-4" />
                Chỉnh sửa
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            <div className="space-y-5">
              <div className="group">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Họ và Tên</label>
                <div className="flex items-center gap-3 text-slate-800 font-bold bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 transition-colors group-hover:bg-slate-50 group-hover:border-slate-200">
                  <div className="bg-white p-2 rounded-lg shadow-sm text-slate-400 group-hover:text-blue-500 transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <span className="text-[15px]">{user.fullName}</span>
                </div>
              </div>
              <div className="group">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Số điện thoại</label>
                <div className="flex items-center gap-3 text-slate-800 font-bold bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 transition-colors group-hover:bg-slate-50 group-hover:border-slate-200">
                  <div className="bg-white p-2 rounded-lg shadow-sm text-slate-400 group-hover:text-blue-500 transition-colors">
                    <Phone className="w-5 h-5" />
                  </div>
                  <span className="text-[15px]">{user.phone}</span>
                </div>
              </div>
            </div>
            <div className="space-y-5">
              <div className="group">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Email</label>
                <div className="flex items-center gap-3 text-slate-800 font-bold bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 transition-colors group-hover:bg-slate-50 group-hover:border-slate-200">
                  <div className="bg-white p-2 rounded-lg shadow-sm text-slate-400 group-hover:text-blue-500 transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <span className="text-[15px]">{user.email}</span>
                </div>
              </div>
              <div className="group">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Địa chỉ nhận hàng mặc định</label>
                <div className="flex items-start gap-3 text-slate-800 font-bold bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 transition-colors group-hover:bg-slate-50 group-hover:border-slate-200">
                  <div className="bg-white p-2 rounded-lg shadow-sm text-slate-400 shrink-0 mt-0.5 group-hover:text-blue-500 transition-colors">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="leading-snug text-[15px] mt-1.5">{user.address}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 p-6 bg-gradient-to-r from-blue-50 via-[#f0f5ff] to-blue-50 rounded-2xl border border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden group hover:border-blue-200 transition-colors">
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full -mr-10 -mt-10 blur-3xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100/50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-blue-200/50">
                Thành viên VIP
              </div>
              <h3 className="font-black text-slate-800 text-xl tracking-tight">Điểm Loyalty (Loyalty Points)</h3>
              <p className="text-slate-500 text-sm mt-1.5 font-medium max-w-md">Tích lũy điểm khi mua sắm để đổi lấy các phần quà và voucher giảm giá hấp dẫn ở lần mua tiếp theo.</p>
            </div>
            <div className="flex items-baseline gap-1.5 relative z-10 bg-white px-6 py-4 rounded-2xl shadow-sm border border-blue-100 group-hover:shadow-md transition-shadow">
              <span className="text-4xl font-black text-[#0d6efd] tracking-tighter">{user.loyaltyPoints}</span>
              <span className="text-sm font-bold uppercase tracking-wider text-slate-400">pts</span>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => !isChangingPassword && setIsPasswordModalOpen(false)}
          ></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up border border-slate-100">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <Lock className="w-4 h-4" />
                </div>
                Đổi mật khẩu
              </h3>
              <button 
                onClick={() => !isChangingPassword && setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors focus:outline-none"
                disabled={isChangingPassword}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {passwordSuccess ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center animate-fade-in">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm shadow-emerald-500/20">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-emerald-800 mb-2">Thành công!</h4>
                  <p className="text-sm text-emerald-600 font-medium leading-relaxed">{passwordSuccess}</p>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-5">
                  {passwordError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm font-medium px-4 py-3 rounded-xl flex items-start gap-3 animate-fade-in">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <p>{passwordError}</p>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Mật khẩu hiện tại</label>
                    <div className="relative">
                      <input 
                        type={showOldPassword ? "text" : "password"}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:font-normal placeholder:text-slate-400"
                        placeholder="Nhập mật khẩu hiện tại"
                        required
                        disabled={isChangingPassword}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showOldPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Mật khẩu mới</label>
                    <div className="relative">
                      <input 
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:font-normal placeholder:text-slate-400"
                        placeholder="Tối thiểu 6 ký tự"
                        minLength={6}
                        required
                        disabled={isChangingPassword}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Xác nhận mật khẩu mới</label>
                    <input 
                      type={showNewPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full px-4 py-3 bg-slate-50 border ${confirmPassword && confirmPassword !== newPassword ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/30' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500'} rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-1 transition-all placeholder:font-normal placeholder:text-slate-400`}
                      placeholder="Nhập lại mật khẩu mới"
                      minLength={6}
                      required
                      disabled={isChangingPassword}
                    />
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit"
                      disabled={isChangingPassword || !oldPassword || !newPassword || !confirmPassword}
                      className="w-full flex justify-center items-center gap-2 bg-[#0d6efd] hover:bg-[#0b5ed7] text-white py-3.5 rounded-xl font-bold transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                      {isChangingPassword ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Đang xử lý...
                        </>
                      ) : (
                        'Cập nhật mật khẩu'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
