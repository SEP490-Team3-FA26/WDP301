import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Mail, Loader2, ShieldAlert } from "lucide-react";
import { authService } from "../../services/auth.service";

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await authService.forgotPassword(email);

      setSuccess("Mã xác nhận đã được gửi đến email của bạn! Đang chuyển hướng...");
      setTimeout(() => {
        navigate(`/auth/reset-password?email=${encodeURIComponent(email)}`);
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
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-[#0057cd] mb-4 ring-8 ring-white">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Quên mật khẩu?</h2>
        <p className="text-sm font-medium text-slate-500 mt-2">
          Đừng lo lắng! Nhập email của bạn và chúng tôi sẽ gửi mã khôi phục ngay.
        </p>
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
              placeholder="Nhập địa chỉ email của bạn"
              required
            />
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50/80 p-3.5 rounded-xl font-medium text-center border border-red-100 flex items-center justify-center gap-2 animate-in fade-in zoom-in-95 duration-300">
            <ShieldAlert className="w-4 h-4" />
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
              Đang gửi mã...
            </>
          ) : (
            <>
              Gửi mã xác nhận
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 text-center pt-6 border-t border-slate-100">
        <p className="text-sm font-medium text-slate-600">
          Nhớ lại mật khẩu?{" "}
          <Link to="/login" className="font-bold text-[#0057cd] hover:text-[#0046a6] hover:underline transition-colors">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
