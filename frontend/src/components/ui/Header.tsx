import { Bell, History, Search, LogOut, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Logo } from "./Logo";

interface HeaderProps {
  userRole: string;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (val: boolean) => void;
  handleLogout: () => void;
  getRoleLabel: (role: string) => string;
}

export function Header({ 
  userRole, 
  isMobileMenuOpen, 
  setIsMobileMenuOpen, 
  handleLogout, 
  getRoleLabel 
}: HeaderProps) {
  const navigate = useNavigate();

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 print:hidden">
        <Logo />
        <div className="flex items-center gap-4">
          <button className="text-slate-500 hover:text-slate-900">
            <Bell size={20} />
          </button>
          <button 
            className="text-slate-500 hover:text-slate-900"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-20 print:hidden">
        <div className="flex items-center gap-8 flex-1">
          <h2 className="text-xl font-bold text-[#191b24] tracking-tight whitespace-nowrap">Không gian làm việc</h2>
          <div className="max-w-xl flex-1 relative hidden lg:block">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm hệ thống / Global Search..."
              className="w-full pl-11 pr-4 py-2.5 bg-[#f8fafc] border border-[#d8d9e5] rounded-full text-sm font-medium focus:ring-2 focus:ring-[#b1c5ff] focus:border-[#0057cd] hover:border-[#c2c6d8] outline-none transition-all placeholder:font-normal"
            />
          </div>
        </div>
        <div className="flex items-center gap-4 ml-4">
          <button className="text-slate-600 hover:text-[#0057cd] relative transition-colors">
            <Bell size={22} />
            <span className="absolute top-0 -right-0.5 w-[9px] h-[9px] bg-rose-500 rounded-full border-2 border-white"></span>
          </button>
          <button className="text-slate-600 hover:text-[#0057cd] transition-colors relative mt-0.5">
            <History size={22} />
          </button>
          <div className="flex items-center gap-3 pl-5 ml-2 border-l border-slate-200 cursor-pointer" onClick={() => navigate("/dashboard/profile")}>
              <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-900">Nguyễn Văn A</div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{getRoleLabel(userRole)}</div>
              </div>
              <div className="w-8 h-8 rounded-full border border-slate-200 overflow-hidden shadow-sm">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jack" alt="User Avatar" className="w-full h-full object-cover" />
              </div>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-rose-600 transition-colors ml-2 bg-slate-50 hover:bg-rose-50 p-2 rounded-full" title="Logout">
              <LogOut size={18} />
          </button>
        </div>
      </header>
    </>
  );
}
