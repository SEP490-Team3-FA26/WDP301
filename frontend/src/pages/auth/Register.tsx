import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Mail, Lock, User } from "lucide-react";

export function Register() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password, role: 'user' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Đăng ký thất bại');
      }

      setSuccess("Đăng ký thành công! Đang chuyển hướng sang trang xác thực OTP...");
      setTimeout(() => {
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="mb-8 text-center mt-2">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tạo tài khoản mới</h2>
        <p className="text-sm font-medium text-slate-500 mt-2">Đăng ký để sử dụng hệ thống quản lý nhà thuốc</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Họ và tên</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <User size={18} />
            </div>
            <input 
              type="text" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="VD: Nguyễn Văn A"
              className="w-full pl-11 pr-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] focus:bg-white transition-all shadow-sm" 
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Email liên hệ</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Mail size={18} />
            </div>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Địa chỉ Email của bạn"
              className="w-full pl-11 pr-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] focus:bg-white transition-all shadow-sm" 
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Mật khẩu</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Lock size={18} />
            </div>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tạo mật khẩu an toàn"
              className="w-full pl-11 pr-4 py-3 bg-white/60 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0057cd] focus:bg-white transition-all shadow-sm" 
              required
            />
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 rounded-lg">
            {error}
          </div>
        )}
        
        {success && (
          <div className="text-emerald-500 text-sm font-medium text-center bg-emerald-50 py-2 rounded-lg">
            {success}
          </div>
        )}

        <button 
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 py-3 px-4 mt-6 border border-transparent rounded-xl shadow-md text-sm font-black text-white bg-[#0057cd] hover:bg-[#00419e] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0057cd] transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? 'Đang xử lý...' : 'Hoàn tất đăng ký'}
          {!loading && <ArrowRight size={18} />}
        </button>
      </form>

      <div className="mt-8 text-center text-sm font-medium border-t border-slate-200/60 pt-6">
        <span className="text-slate-400">Đã có tài khoản nhân viên? </span>
        <Link to="/login" className="font-bold text-[#0057cd] hover:text-[#00419e] transition-colors hover:underline">
          Đăng nhập ngay
        </Link>
      </div>
    </>
  );
}
