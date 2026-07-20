import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Mail, Lock, Building2, PackageSearch, Store, Pill, ShieldCheck, CheckCircle2, Users } from "lucide-react";
import { authService } from "../../services/auth/auth.service";
import { requestNotificationPermission } from "../../utils/notificationPermission";
import { notifyAuthTokenChanged } from "../../utils/authEvents";

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState("admin");
  const [email, setEmail] = useState("admin@vinapharmacy.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Xử lý khi đăng nhập Google thành công và redirect về kèm token
    const token = searchParams.get('token');
    const urlError = searchParams.get('error');

    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("userRole", "user"); // Mặc định role user từ google login
      notifyAuthTokenChanged();
      navigate('/customer');
    }

    if (urlError) {
      setError(urlError);
    }
  }, [searchParams, navigate]);

  const roles = [
    { id: "admin", label: "Admin Tổng", subLabel: "Hệ thống", email: "admin@vinapharmacy.com", icon: <ShieldCheck size={20} />, activeColor: "bg-rose-50 border-rose-200 text-rose-700", iconColor: "text-rose-500" },
    { id: "warehouse", label: "Quản lý kho", subLabel: "Kho vận", email: "warehouse@vinapharmacy.com", icon: <PackageSearch size={20} />, activeColor: "bg-amber-50 border-amber-200 text-amber-700", iconColor: "text-amber-500" },
    { id: "branch", label: "QL Chi nhánh", subLabel: "Cơ sở", email: "manager@vinapharmacy.com", icon: <Store size={20} />, activeColor: "bg-emerald-50 border-emerald-200 text-emerald-700", iconColor: "text-emerald-500" },
    { id: "pharmacist", label: "Thuốc / Bán", subLabel: "Dược sĩ", email: "pharmacist@vinapharmacy.com", icon: <Pill size={20} />, activeColor: "bg-blue-50 border-blue-200 text-blue-700", iconColor: "text-[#0057cd]" },
    { id: "user", label: "Người dùng", subLabel: "Khách hàng", email: "user@vinapharmacy.com", icon: <Users size={20} />, activeColor: "bg-purple-50 border-purple-200 text-purple-700", iconColor: "text-purple-500" },
  ];

  const handleRoleSelect = (selectedRole: any) => {
    setRole(selectedRole.id);
    setEmail(selectedRole.email);
    setPassword("123456");
    setError("");
  };

  const redirectByRole = (userRole: string) => {
    switch (userRole) {
      case "admin":
      case "head_branch":
        return "/admin";
      case "warehouse":
        return "/warehouse";
      case "branch":
        return "/branch";
      case "pharmacist":
        return "/pharmacist";
      case "user":
        return "/customer";
      default:
        return "/admin";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await authService.login(email, password);

      // Lưu JWT Token và Role
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("userRole", data.user.role);
      notifyAuthTokenChanged();

      // Request notification permission (don't block login)
      requestNotificationPermission().catch(err => {
        console.warn('Failed to request notification permission:', err);
      });

      // Redirect theo Role
      navigate(redirectByRole(data.user.role));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-6 text-center mt-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Đăng nhập</h2>
        <p className="text-sm font-medium text-slate-500 mt-2">Truy cập không gian làm việc</p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3">Chọn chức vụ để tự điền Test Account</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {roles.map((r) => {
              const isActive = role === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => handleRoleSelect(r)}
                  className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col items-center text-center gap-2 ${isActive
                    ? `${r.activeColor} shadow-sm scale-[1.02]`
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >
                  <div className={`${isActive ? r.iconColor : 'text-slate-400'} transition-colors`}>
                    {r.icon}
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${isActive ? '' : 'text-slate-700'}`}>{r.label}</div>
                    <div className="text-[10px] uppercase font-bold opacity-70 tracking-wider mt-0.5">{r.subLabel}</div>
                  </div>
                  {isActive && (
                    <div className={`absolute -top-2 -right-2 bg-white rounded-full ${r.iconColor}`}>
                      <CheckCircle2 size={18} className="fill-current text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email..."
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-bold text-slate-700">Mật khẩu</label>
                <Link to="/forgot-password" className="text-sm font-semibold text-[#0057cd] hover:underline">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 py-3.5 px-4 mt-6 border border-transparent rounded-xl shadow-md text-sm font-black text-white bg-[#0057cd] hover:bg-[#0a58ca] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0057cd] transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? 'Đang xử lý...' : 'Truy cập hệ thống quản trị'}
          {!loading && <ArrowRight size={18} />}
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-500">Hoặc tiếp tục với</span>
          </div>
        </div>

        <a
          href="/api/auth/google"
          className="w-full flex justify-center items-center gap-3 py-3.5 px-4 bg-white border border-slate-200 rounded-xl shadow-sm text-sm font-bold text-slate-700 hover:bg-slate-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-200 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          Đăng nhập với Google
        </a>
      </form>

      <div className="mt-8 text-center text-sm font-medium border-t border-slate-200/60 pt-6">
        <span className="text-slate-400">Chưa có tài khoản? </span>
        <Link to="/register" className="font-bold text-[#0057cd] hover:text-[#00419e] transition-colors hover:underline">
          Đăng ký ngay
        </Link>
      </div>
    </>
  );
}
