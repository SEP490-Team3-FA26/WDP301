"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
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
  userRole, 
  isMobileMenuOpen, 
  setIsMobileMenuOpen, 
  handleLogout, 
  getRoleLabel 
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);

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
                    {item.subItems.map((subItem) => {
                      const isActive = pathname === subItem.href;
                      return (
                        <Link
                          key={subItem.name}
                          href={subItem.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`
                            block px-3 py-2 rounded-lg font-medium transition-colors text-[13px]
                            ${isActive 
                              ? "bg-[#f2f3ff] text-[#0057cd]" 
                              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            }
                          `}
                        >
                          {subItem.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              (() => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    href={item.href!}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-2.5 rounded-lg font-semibold transition-colors text-sm
                      ${isActive 
                        ? "bg-[#f2f3ff] text-[#0057cd]" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }
                    `}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                );
              })()
            )}
          </div>
        ))}
      </nav>

      <div className="px-3 pb-4 space-y-1">
        <div className="pt-4 mt-2 mb-2 px-2 border-t border-slate-100 flex items-center justify-between group">
           <div 
             className="flex items-center gap-3 cursor-pointer"
             onClick={() => router.push("/profile")}
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
  );
}
