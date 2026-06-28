import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Lock, ShieldCheck, Mail, Loader2, KeyRound } from "lucide-react";
import { authService } from "../../services/auth.service";

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Fallback to localStorage if search params does not contain email
  const [email, setEmail] = useState(
    searchParams.get("email") || authService.getPendingEmail() || ""
  );

  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!email) {
      setError("Thiếu thông tin email. Vui lòng quay lại bước gửi mã.");
      setLoading(false);
      return;
    }

    try {
      await authService.resetPassword(email, token, newPassword);

      setSuccess("Đặt lại mật khẩu thành công! Đang chuyển hướng...");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 text-center mt-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mb-4 ring-8 ring-white">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Đặt lại mật khẩu</h2>
        <p className="text-sm font-medium text-slate-500 mt-2">Nhập email, mã OTP và mật khẩu mới của bạn</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-slate-700">Email liên hệ</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#0057cd] transition-colors">
              <Mail className="h-5 w-5" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd] transition-all shadow-sm"
              placeholder="Nhập email của bạn"
              required
            />
          </div>
        </div>
        
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-slate-700">Mã xác nhận (OTP)</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#0057cd] transition-colors">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd] transition-all shadow-sm tracking-[0.25em] font-bold text-center"
              placeholder="Nhập mã 6 số"
              maxLength={6}
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-slate-700">Mật khẩu mới</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#0057cd] transition-colors">
              <Lock className="h-5 w-5" />
            </div>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd]/20 focus:border-[#0057cd] transition-all shadow-sm"
              placeholder="Nhập mật khẩu mới"
              required
            />
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50/80 p-3.5 rounded-xl font-medium text-center border border-red-100 flex items-center justify-center gap-2 animate-in fade-in zoom-in-95 duration-300">
            <ShieldCheck className="w-4 h-4" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="text-sm text-emerald-600 bg-emerald-50/80 p-3.5 rounded-xl font-medium text-center border border-emerald-100 animate-in fade-in zoom-in-95 duration-300">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-[#0057cd] hover:bg-[#0046a6] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0057cd] transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed group mt-4"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Đang xử lý...
            </>
          ) : (
            <>
              Xác nhận đổi mật khẩu
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center pt-6 border-t border-slate-100">
        <p className="text-sm font-medium text-slate-600">
          Chưa nhận được mã?{" "}
          <button onClick={() => navigate('/auth/forgot-password')} className="font-bold text-[#0057cd] hover:text-[#0046a6] hover:underline transition-colors">
            Gửi lại mã
          </button>
        </p>
      </div>
    </div>
  );
}
