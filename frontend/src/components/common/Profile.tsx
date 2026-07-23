import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, Lock, Edit2, Save, X, Eye, EyeOff, CheckCircle2, AlertCircle, Shield, Building2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/core/api';
import { notifyAuthTokenChanged } from '../../utils/authEvents';

const ROLE_MAP: Record<string, { label: string; color: string; bg: string }> = {
  admin:       { label: 'Quản trị viên',       color: 'text-purple-700', bg: 'bg-purple-100' },
  head_branch: { label: 'Quản lý Chuỗi',       color: 'text-blue-700',   bg: 'bg-blue-100'   },
  warehouse:   { label: 'Thủ kho Tổng',         color: 'text-orange-700', bg: 'bg-orange-100' },
  branch:      { label: 'Quản lý Chi nhánh',    color: 'text-indigo-700', bg: 'bg-indigo-100' },
  pharmacist:  { label: 'Dược sĩ Chi nhánh',   color: 'text-green-700',  bg: 'bg-green-100'  },
  user:        { label: 'Khách hàng',           color: 'text-slate-700',  bg: 'bg-slate-100'  },
};

function getAvatarGradient(role: string) {
  switch (role) {
    case 'admin':       return 'from-purple-500 to-indigo-600';
    case 'head_branch': return 'from-blue-500 to-cyan-600';
    case 'warehouse':   return 'from-orange-500 to-amber-600';
    case 'branch':      return 'from-indigo-500 to-violet-600';
    case 'pharmacist':  return 'from-green-500 to-emerald-600';
    default:            return 'from-slate-500 to-slate-700';
  }
}

export function Profile() {
  const navigate = useNavigate();

  // ── Profile state ──
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    role: '',
    branchId: '',
  });
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [branchName, setBranchName] = useState('');

  // ── Edit mode state ──
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ fullName: '', phone: '', address: '' });
  const [isSaving, setIsSaving] = useState(false);

  // ── Change Password state ──
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // ── Load profile + branch name ──
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/auth/profile');
        const data = res.data;
        const fetchedBranchId = data.branchId || '';
        setProfile({
          fullName: data.fullName || data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          role: data.role || '',
          branchId: fetchedBranchId,
        });

        // Nếu có branchId → fetch danh sách branch để lấy tên
        if (fetchedBranchId) {
          try {
            const branchRes = await api.get('/api/branches');
            const branches: any[] = branchRes.data || [];
            // branchId trong user là branchCode (VD: "BR-002"), khớp với b.branchCode hoặc b._id
            const found = branches.find(
              (b: any) =>
                b.branchCode === fetchedBranchId ||
                b._id === fetchedBranchId ||
                b.id === fetchedBranchId
            );
            setBranchName(found?.name || fetchedBranchId);
          } catch {
            setBranchName(fetchedBranchId);
          }
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // ── Edit handlers ──
  const handleStartEdit = () => {
    setEditData({ fullName: profile.fullName, phone: profile.phone, address: profile.address });
    setProfileError('');
    setProfileSuccess('');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setProfileError('');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData.fullName.trim()) {
      setProfileError('Họ và tên không được để trống.');
      return;
    }
    setIsSaving(true);
    setProfileError('');
    try {
      await api.put('/api/users/profile', {
        fullName: editData.fullName.trim(),
        phone: editData.phone.trim(),
        address: editData.address.trim(),
      });
      setProfile(prev => ({ ...prev, ...editData }));
      setIsEditing(false);
      setProfileSuccess('Cập nhật thông tin thành công!');
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err: any) {
      setProfileError(err.response?.data?.message || err.message || 'Cập nhật thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Change password handlers ──
  const handleOpenPasswordModal = () => {
    setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    setPasswordError(''); setPasswordSuccess('');
    setIsPasswordModalOpen(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (newPassword.length < 6) { setPasswordError('Mật khẩu mới phải có ít nhất 6 ký tự.'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('Mật khẩu xác nhận không khớp.'); return; }
    setIsChangingPassword(true);
    try {
      await api.post('/api/auth/change-password', { oldPassword, newPassword });
      setPasswordSuccess('Đổi mật khẩu thành công! Bạn sẽ được đăng xuất...');
      setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        notifyAuthTokenChanged();
        navigate('/auth/login');
      }, 2500);
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || err.message || 'Đã xảy ra lỗi khi đổi mật khẩu.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const roleInfo = ROLE_MAP[profile.role] || ROLE_MAP.user;
  const avatarGradient = getAvatarGradient(profile.role);
  const avatarLetter = profile.fullName?.charAt(0)?.toUpperCase() || '?';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 w-full space-y-6">

      {/* ── Header Card ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar */}
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-black text-2xl shadow-md flex-shrink-0`}>
            {avatarLetter}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-slate-900 tracking-tight truncate">{profile.fullName || 'Chưa cập nhật'}</h1>
            <p className="text-slate-500 text-sm mt-0.5 truncate">{profile.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${roleInfo.bg} ${roleInfo.color}`}>
                <Shield size={11} />
                {roleInfo.label}
              </span>
              {profile.branchId && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <Building2 size={11} />
                  {branchName || profile.branchId}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 shrink-0 flex-wrap">
            <button
              onClick={handleOpenPasswordModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors"
            >
              <Lock size={15} /> Đổi mật khẩu
            </button>
            {!isEditing && (
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/20"
              >
                <Edit2 size={15} /> Chỉnh sửa
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Success Banner ── */}
      {profileSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          {profileSuccess}
        </div>
      )}

      {/* ── Info / Edit Card ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
          <User size={17} className="text-indigo-500" />
          Thông tin cá nhân
        </h2>

        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {profileError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium">
                <AlertCircle size={16} className="shrink-0" /> {profileError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Họ và tên *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  required
                  value={editData.fullName}
                  onChange={e => setEditData(d => ({ ...d, fullName: e.target.value }))}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                  placeholder="Nguyễn Văn A"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Số điện thoại</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="tel"
                  value={editData.phone}
                  onChange={e => setEditData(d => ({ ...d, phone: e.target.value }))}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                  placeholder="0901 234 567"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Địa chỉ</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-slate-400" size={16} />
                <textarea
                  rows={2}
                  value={editData.address}
                  onChange={e => setEditData(d => ({ ...d, address: e.target.value }))}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 resize-none"
                  placeholder="Số nhà, đường, phường/xã, tỉnh/thành"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors"
              >
                <X size={15} /> Hủy
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: <User size={16} />, label: 'Họ và tên',       value: profile.fullName || 'Chưa cập nhật' },
              { icon: <Mail size={16} />, label: 'Email',            value: profile.email   || 'Chưa cập nhật' },
              { icon: <Phone size={16} />, label: 'Số điện thoại',  value: profile.phone   || 'Chưa cập nhật' },
              { icon: <MapPin size={16} />, label: 'Địa chỉ',       value: profile.address || 'Chưa cập nhật' },
            ].map(({ icon, label, value }) => (
              <div key={label} className="group">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</p>
                <div className="flex items-start gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 group-hover:bg-slate-50 group-hover:border-slate-200 transition-colors">
                  <span className="text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0 mt-0.5">{icon}</span>
                  <span className="text-sm font-semibold text-slate-800 leading-snug">{value}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Security Card ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
          <Lock size={17} className="text-indigo-500" />
          Bảo mật tài khoản
        </h2>
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div>
            <p className="text-sm font-bold text-slate-800">Mật khẩu</p>
            <p className="text-xs text-slate-500 mt-0.5">Bảo vệ tài khoản bằng mật khẩu mạnh</p>
          </div>
          <button
            onClick={handleOpenPasswordModal}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
          >
            Đổi mật khẩu →
          </button>
        </div>
      </div>

      {/* ── Change Password Modal ── */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => !isChangingPassword && setIsPasswordModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
            {/* Modal header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Lock size={16} /></div>
                Đổi mật khẩu
              </h3>
              <button
                onClick={() => !isChangingPassword && setIsPasswordModalOpen(false)}
                disabled={isChangingPassword}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {passwordSuccess ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <CheckCircle2 size={28} />
                  </div>
                  <h4 className="text-base font-bold text-emerald-800 mb-1">Thành công!</h4>
                  <p className="text-sm text-emerald-600 font-medium">{passwordSuccess}</p>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {passwordError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl flex items-start gap-2 text-sm font-medium">
                      <AlertCircle size={16} className="shrink-0 mt-0.5" /> {passwordError}
                    </div>
                  )}

                  {/* Old password */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Mật khẩu hiện tại</label>
                    <div className="relative">
                      <input
                        type={showOld ? 'text' : 'password'}
                        value={oldPassword}
                        onChange={e => setOldPassword(e.target.value)}
                        required
                        disabled={isChangingPassword}
                        className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400 disabled:opacity-60"
                        placeholder="Nhập mật khẩu hiện tại"
                      />
                      <button type="button" onClick={() => setShowOld(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* New password */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Mật khẩu mới</label>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                        minLength={6}
                        disabled={isChangingPassword}
                        className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-400 disabled:opacity-60"
                        placeholder="Tối thiểu 6 ký tự"
                      />
                      <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Xác nhận mật khẩu mới</label>
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={isChangingPassword}
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-1 transition-all placeholder:text-slate-400 disabled:opacity-60 ${
                        confirmPassword && confirmPassword !== newPassword
                          ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/30'
                          : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500'
                      }`}
                      placeholder="Nhập lại mật khẩu mới"
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isChangingPassword || !oldPassword || !newPassword || !confirmPassword}
                      className="w-full flex justify-center items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isChangingPassword ? (
                        <><Loader2 size={16} className="animate-spin" /> Đang xử lý...</>
                      ) : 'Cập nhật mật khẩu'}
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
