import { History, Search, LogOut, Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { NotificationBell } from "./NotificationBell";

function getUserFromToken() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return { name: '', role: '' };
    // Decode base64url -> UTF-8 correctly (handles Vietnamese & unicode)
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    const payload = JSON.parse(jsonPayload);
    return { name: payload.fullName || payload.name || payload.email || '', role: payload.role || '' };
  } catch { return { name: '', role: '' }; }
}

function getProfilePath(role: string) {
  switch (role) {
    case 'admin':       return '/admin/profile';
    case 'head_branch': return '/admin/profile';
    case 'warehouse':   return '/warehouse/profile';
    case 'branch':      return '/branch/profile';
    case 'pharmacist':  return '/pharmacist/profile';
    default:            return '/profile';
  }
}

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
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const { name } = getUserFromToken();
    setUserName(name);
  }, []);

  const profilePath = getProfilePath(userRole);
  const avatarLetter = userName.charAt(0).toUpperCase() || '?';

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 print:hidden">
        <Logo />
        <div className="flex items-center gap-4">
          <NotificationBell />
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
          <NotificationBell />
          <button className="text-slate-600 hover:text-[#0057cd] transition-colors relative mt-0.5">
            <History size={22} />
          </button>
          <div className="flex items-center gap-3 pl-5 ml-2 border-l border-slate-200 cursor-pointer" onClick={() => navigate(profilePath)}>
              <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-900">{userName || 'Người dùng'}</div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{getRoleLabel(userRole)}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
                  {avatarLetter}
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
