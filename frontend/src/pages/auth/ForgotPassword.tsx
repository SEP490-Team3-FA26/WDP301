import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Mail } from "lucide-react";
import { authService } from "../../services/auth/auth.service";

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const isSubmitting = React.useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting.current) return;
    isSubmitting.current = true;
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
      isSubmitting.current = false;
    }
  };

  return (
    <>
      <div className="mb-8 text-center mt-2">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Quên mật khẩu?</h2>
        <p className="text-sm font-medium text-slate-500 mt-2">Nhập email của bạn để nhận mã khôi phục</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-slate-700">Email liên hệ</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#0057cd] transition-colors">
              <Mail className="h-5 w-5" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] focus:bg-white transition-all shadow-sm"
              placeholder="Nhập email của bạn"
              required
            />
          </div>
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg font-medium text-center border border-red-100">{error}</div>}
        {success && <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg font-medium text-center border border-green-100">{success}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-[#0057cd] hover:bg-[#0046a6] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0057cd] transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed mt-2"
        >
          {loading ? "Đang gửi..." : "Gửi mã xác nhận"}
          {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-sm font-medium text-slate-600">
          Nhớ lại mật khẩu?{" "}
          <Link to="/login" className="font-bold text-[#0057cd] hover:text-[#0046a6] hover:underline transition-colors">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </>
  );
}
