import { NavLink } from "react-router-dom";
import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Logo } from "./Logo";

export interface NavItem {
  name: string;
  href?: string;
  icon: ReactNode;
  subItems?: { name: string; href: string }[];
}

interface SidebarProps {
  navItems: NavItem[];
  userRole: string;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (val: boolean) => void;
  handleLogout: () => void;
  getRoleLabel: (role: string) => string;
}

export function Sidebar({
  navItems,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}: SidebarProps) {
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = (name: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  return (
    <aside className={`
      fixed md:sticky top-0 left-0 z-40 h-[100dvh] w-[260px] bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out
      ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      flex flex-col flex-shrink-0 print:hidden
    `}>
      <div className="p-6 hidden md:block border-b border-slate-100">
        <Logo />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto mt-2 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
        {navItems.map((item) => {
          const isOpen = openMenus[item.name] || false;
          return (
            <div key={item.name}>
              {item.subItems ? (
                <div>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={`
                    w-full flex items-center justify-between px-4 py-2.5 rounded-lg font-semibold transition-colors text-sm
                    text-slate-600 hover:bg-slate-50 hover:text-slate-900
                  `}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      {item.name}
                    </div>
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="mt-1 space-y-1 pl-11 pr-2">
                      {item.subItems.map((subItem) => (
                        <NavLink
                          key={subItem.name}
                          to={subItem.href}
                          end
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
                  end
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
          );
        })}
      </nav>
    </aside>
  );
}
