import { Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Sidebar, NavItem } from "../components/ui/Sidebar";
import { Header } from "../components/ui/Header";

interface BaseDashboardLayoutProps {
  navItems: NavItem[];
  userRole: string;
}

export function BaseDashboardLayout({ navItems, userRole }: BaseDashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    navigate("/auth/login");
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Quản trị hệ thống";
      case "warehouse": return "Quản lý kho";
      case "branch": return "Quản lý chi nhánh";
      case "pharmacist": return "Dược sĩ / Nhân viên";
      default: return "Khách hàng";
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#faf8ff] flex flex-col md:flex-row">
      <Sidebar
        navItems={navItems}
        userRole={userRole}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        handleLogout={handleLogout}
        getRoleLabel={getRoleLabel}
      />

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden bg-[#faf8ff] print:h-auto print:bg-white print:overflow-visible">
        <Header
          userRole={userRole}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          handleLogout={handleLogout}
          getRoleLabel={getRoleLabel}
        />
        <div className="flex-1 min-h-0 overflow-y-auto bg-[#faf8ff] print:overflow-visible print:bg-white print:h-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
