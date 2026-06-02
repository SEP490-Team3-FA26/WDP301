import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Menu,
  X,
  Bell,
  PackageSearch,
  ShoppingCart,
  Building2,
  Banknote,
  BarChart3,
  Sparkles,
  HelpCircle,
  History,
  Search,
  ChevronDown
} from "lucide-react";
import { Logo } from "../ui/Logo";
import { useState, useEffect } from "react";

export function DashboardLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState("admin");
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/login");
  };

  const [isInventoryOpen, setIsInventoryOpen] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("userRole") || "admin";
    setUserRole(role);
  }, []);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Quản trị hệ thống";
      case "head_branch": return "Tổng chi nhánh";
      case "warehouse": return "Quản lý kho";
      case "branch": return "Quản lý chi nhánh";
      case "pharmacist": return "Dược sĩ / Nhân viên";
      default: return "Nhân viên";
    }
  };

  const getNavItemsByRole = (role: string) => {
    const items = [
      { name: "Tổng quan", href: "/dashboard", icon: <LayoutDashboard size={20} /> }
    ];

    if (role === "pharmacist" || role === "branch" || role === "admin") {
      items.push({ name: "Bán hàng (POS)", href: "/dashboard/sales", icon: <ShoppingCart size={20} /> });
    }

    if (role === "admin" || role === "head_branch") {
      items.push({ name: "Quản lý chi nhánh", href: "/dashboard/branches", icon: <Building2 size={20} /> });
    }

    if (role !== "pharmacist") {
      items.push({ 
        name: "Kho thông minh", 
        icon: <PackageSearch size={20} />,
        subItems: [
          { name: "Tổng quan kho", href: "/dashboard/inventory" },
          { name: "Nhập / Xuất kho", href: "/dashboard/inventory/import" },
          { name: "Kiểm kê kho", href: "/dashboard/inventory/dispose" },
        ]
      });
    }

    if (role === "admin" || role === "head_branch" || role === "branch") {
      items.push({ name: "Tài chính", href: "/dashboard/finance", icon: <Banknote size={20} /> });
      items.push({ name: "Báo cáo thống kê", href: "/dashboard/reports", icon: <BarChart3 size={20} /> });
    }

    if (role === "admin" || role === "head_branch" || role === "warehouse") {
      items.push({ name: "AI Insights", href: "/dashboard/ai-insights", icon: <Sparkles size={20} /> });
    }

    return items;
  };

  const navItems = getNavItemsByRole(userRole);

  const bottomNavItems = [
    { name: "Settings", href: "/dashboard/settings", icon: <Settings size={20} /> },
    { name: "Support", href: "/dashboard/support", icon: <HelpCircle size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-[#faf8ff] flex flex-col md:flex-row">
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

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-40 h-screen w-[260px] bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        flex flex-col flex-shrink-0 print:hidden
      `}>
        <div className="p-6 hidden md:block border-b border-white">
          <Logo />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto mt-2">
          {navItems.map((item) => (
            <div key={item.name}>
              {item.subItems ? (
                <div>
                  <button
                    onClick={() => setIsInventoryOpen(!isInventoryOpen)}
                    className={`
                      w-full flex items-center justify-between px-4 py-2.5 rounded-lg font-semibold transition-colors text-sm
                      text-slate-600 hover:bg-slate-50 hover:text-slate-900
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      {item.name}
                    </div>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isInventoryOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isInventoryOpen && (
                    <div className="mt-1 space-y-1 pl-11 pr-2">
                      {item.subItems.map((subItem) => (
                        <NavLink
                          key={subItem.name}
                          to={subItem.href}
                          end={subItem.href === "/dashboard/inventory"}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={({ isActive }) => `
                            block px-3 py-2 rounded-lg font-medium transition-colors text-[13px]
                            ${isActive 
                              ? "bg-[#f2f3ff] text-[#0057cd]" 
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            }
                          `}
                        >
                          {subItem.name}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <NavLink
                  to={item.href!}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-2.5 rounded-lg font-semibold transition-colors text-sm
                    ${isActive 
                      ? "bg-[#f2f3ff] text-[#0057cd]" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }
                  `}
                >
                  {item.icon}
                  {item.name}
                </NavLink>
              )}
            </div>
          ))}
        </nav>

        <div className="px-3 pb-4 space-y-1">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-2.5 rounded-lg font-semibold transition-colors text-[13px]
                ${isActive 
                  ? "bg-[#f2f3ff] text-[#0057cd]" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }
              `}
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}
          <div className="pt-4 mt-2 mb-2 px-2 border-t border-slate-100 flex items-center justify-between group">
             <div 
               className="flex items-center gap-3 cursor-pointer"
               onClick={() => navigate("/dashboard/profile")}
             >
                 <div className="w-10 h-10 rounded-full border border-[#cbd5e1] overflow-hidden flex-shrink-0 shadow-sm">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User Avatar" className="w-full h-full object-cover" />
                 </div>
                 <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">Nguyễn Văn A</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate">{getRoleLabel(userRole)}</div>
                 </div>
             </div>
             <button onClick={handleLogout} className="text-slate-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100 p-1" title="Logout">
                <LogOut size={16} />
             </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#faf8ff] print:h-auto print:bg-white print:overflow-visible">
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

        <div className="flex-1 overflow-auto bg-[#faf8ff] print:overflow-visible print:bg-white print:h-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
