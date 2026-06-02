import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Mail, Lock, Building2, PackageSearch, Store, Pill, ShieldCheck, CheckCircle2 } from "lucide-react";

export function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState("admin");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate setting mock role into local storage
    localStorage.setItem("userRole", role);
    navigate("/dashboard");
  };

  const roles = [
    { id: "admin", label: "Admin Tổng", subLabel: "Hệ thống", icon: <ShieldCheck size={20} />, activeColor: "bg-rose-50 border-rose-200 text-rose-700", iconColor: "text-rose-500" },
    { id: "head_branch", label: "Tổng chi nhánh", subLabel: "Giám đốc", icon: <Building2 size={20} />, activeColor: "bg-indigo-50 border-indigo-200 text-indigo-700", iconColor: "text-indigo-500" },
    { id: "warehouse", label: "Quản lý kho", subLabel: "Kho vận", icon: <PackageSearch size={20} />, activeColor: "bg-amber-50 border-amber-200 text-amber-700", iconColor: "text-amber-500" },
    { id: "branch", label: "QL Chi nhánh", subLabel: "Cơ sở", icon: <Store size={20} />, activeColor: "bg-emerald-50 border-emerald-200 text-emerald-700", iconColor: "text-emerald-500" },
    { id: "pharmacist", label: "Thuốc / Bán", subLabel: "Dược sĩ", icon: <Pill size={20} />, activeColor: "bg-blue-50 border-blue-200 text-blue-700", iconColor: "text-[#0057cd]" },
  ];

  return (
    <>
      <div className="mb-6 text-center mt-2">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Đăng nhập</h2>
        <p className="text-sm font-medium text-slate-500 mt-2">Truy cập không gian làm việc giả lập</p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3">Chọn chức vụ (Mock Role)</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {roles.map((r) => {
              const isActive = role === r.id;
              return (
                <div 
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 flex flex-col items-center text-center gap-2 ${
                    isActive 
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

        <div className="opacity-40 pointer-events-none border-t border-slate-100 pt-5">
           <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Mã nhân viên / Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                  <Mail size={18} />
                </div>
                <input 
                  type="text" 
                  placeholder="Nhập thông tin bất kỳ..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm shadow-sm" 
                  disabled
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm shadow-sm" 
                  disabled
                />
              </div>
            </div>
          </div>
        </div>

        <button 
          type="submit"
          className="w-full flex justify-center items-center gap-2 py-3.5 px-4 mt-6 border border-transparent rounded-xl shadow-md text-sm font-black text-white bg-[#0057cd] hover:bg-[#0a58ca] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0057cd] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          Truy cập hệ thống quản trị
          <ArrowRight size={18} />
        </button>
      </form>

      <div className="mt-8 text-center text-sm font-medium border-t border-slate-200/60 pt-6">
        <span className="text-slate-400 inline-flex items-center gap-1.5 justify-center">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            Chế độ Mockup dữ liệu đang kích hoạt
        </span>
      </div>
    </>
  );
}
