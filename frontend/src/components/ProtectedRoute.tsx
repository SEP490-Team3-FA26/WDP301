import { Navigate, Outlet } from "react-router-dom";

interface ProtectedRouteProps {
  allowedRoles: string[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("userRole");

  if (!token) {
    return <Navigate to="/auth/login" replace />;
  }

  if (role && !allowedRoles.includes(role)) {
    // Redirect other roles to their respective dashboards
    switch (role) {
      case "admin":
      case "head_branch":
        return <Navigate to="/admin" replace />;
      case "warehouse":
        return <Navigate to="/warehouse" replace />;
      case "branch":
        return <Navigate to="/branch" replace />;
      case "pharmacist":
        return <Navigate to="/pharmacist" replace />;
      case "user":
        return <Navigate to="/customer" replace />;
      default:
        return <Navigate to="/auth/login" replace />;
    }
  }

  return <Outlet />;
}
