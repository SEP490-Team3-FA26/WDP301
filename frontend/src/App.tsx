import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layouts
import { AuthLayout } from "./layouts/AuthLayout";
import { AdminLayout } from "./layouts/AdminLayout";
import { WarehouseLayout } from "./layouts/WarehouseLayout";
import { BranchLayout } from "./layouts/BranchLayout";
import { PharmacistLayout } from "./layouts/PharmacistLayout";
import { CustomerLayout } from "./layouts/CustomerLayout";

// Protected Route Guard
import { ProtectedRoute } from "./components/ProtectedRoute";

// Auth Pages
import { Landing } from "./pages/common/Landing";
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
import { ResetPassword } from "./pages/auth/ResetPassword";

// Common Pages
import { DashboardHome } from "./pages/common/Dashboard";
import { Profile } from "./pages/common/Profile";
import { Settings } from "./pages/common/Settings";
import { AIInsights } from "./pages/common/AIInsights";

// Customer Pages
import { CustomerShop } from "./pages/customer/CustomerShop";
import { CustomerCart } from "./pages/customer/CustomerCart";
import { CustomerCheckout } from "./pages/customer/CustomerCheckout";
import { AIConsultant } from "./pages/customer/AIConsultant";

// Master Data
import { Products } from "./pages/master-data/Products";
import { Suppliers } from "./pages/master-data/Suppliers";

// Warehouse Pages
import { Inventory } from "./pages/warehouse/Inventory";
import { InventoryHistory } from "./pages/warehouse/InventoryHistory";
import { PurchaseOrderCreate } from "./pages/warehouse/PurchaseOrderCreate";
import { PurchaseRequisition } from "./pages/warehouse/PurchaseRequisition";

// Admin / HQ Pages
import { Finance } from "./pages/admin/Finance";
import { Reports } from "./pages/admin/Reports";
import { Branches } from "./pages/admin/Branches";
import { HQApproval } from "./pages/admin/HQApproval";

// Branch Pages
import { BranchRequisition } from "./pages/branch/BranchRequisition";

// Pharmacist / Branch Pages
import { Sales } from "./pages/pharmacist/Sales";
import { DrugInteractions } from "./pages/pharmacist/DrugInteractions";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/interactions" element={<DrugInteractions />} />
        
        {/* Auth Routes */}
        <Route path="/auth" element={<AuthLayout />}>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
        </Route>

        {/* Cũ (Redirect để tương thích trong trường hợp back lại) */}
        <Route path="/login" element={<Navigate to="/auth/login" replace />} />
        <Route path="/register" element={<Navigate to="/auth/register" replace />} />
        <Route path="/forgot-password" element={<Navigate to="/auth/forgot-password" replace />} />
        <Route path="/dashboard" element={<Navigate to="/admin" replace />} />

        {/* --- Customer Routes --- */}
        <Route element={<ProtectedRoute allowedRoles={["user"]} />}>
          <Route path="/customer" element={<CustomerLayout />}>
            <Route index element={<Navigate to="shop" replace />} />
            <Route path="shop" element={<CustomerShop />} />
            <Route path="cart" element={<CustomerCart />} />
            <Route path="checkout" element={<CustomerCheckout />} />
            <Route path="ai-consult" element={<AIConsultant />} />
          </Route>
        </Route>

        {/* --- Admin Routes --- */}
        <Route element={<ProtectedRoute allowedRoles={["admin", "head_branch"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="branches" element={<Branches />} />
            <Route path="approvals" element={<HQApproval />} />
            <Route path="finance" element={<Finance />} />
            <Route path="reports" element={<Reports />} />
            <Route path="ai-insights" element={<AIInsights />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            
            <Route path="inventory" element={<Inventory />} />
            <Route path="inventory/import" element={<InventoryHistory type="import" />} />
            <Route path="inventory/import/new" element={<PurchaseOrderCreate />} />
            <Route path="inventory/export" element={<InventoryHistory type="export" />} />
            <Route path="inventory/dispose" element={<InventoryHistory type="dispose" />} />

            <Route path="master-data/products" element={<Products />} />
            <Route path="master-data/suppliers" element={<Suppliers />} />
          </Route>
        </Route>

        {/* --- Warehouse Routes --- */}
        <Route element={<ProtectedRoute allowedRoles={["warehouse"]} />}>
          <Route path="/warehouse" element={<WarehouseLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="inventory/requisitions" element={<PurchaseRequisition />} />
            <Route path="inventory/import" element={<InventoryHistory type="import" />} />
            <Route path="inventory/import/new" element={<PurchaseOrderCreate />} />
            <Route path="inventory/export" element={<InventoryHistory type="export" />} />
            <Route path="inventory/dispose" element={<InventoryHistory type="dispose" />} />
            <Route path="ai-insights" element={<AIInsights />} />
            <Route path="profile" element={<Profile />} />
            
            <Route path="master-data/products" element={<Products />} />
            <Route path="master-data/suppliers" element={<Suppliers />} />
          </Route>
        </Route>

        {/* --- Branch Routes --- */}
        <Route element={<ProtectedRoute allowedRoles={["branch"]} />}>
          <Route path="/branch" element={<BranchLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="sales" element={<Sales />} />
            <Route path="requisitions" element={<BranchRequisition />} />
            <Route path="finance" element={<Finance />} />
            <Route path="reports" element={<Reports />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>

        {/* --- Pharmacist Routes --- */}
        <Route element={<ProtectedRoute allowedRoles={["pharmacist"]} />}>
          <Route path="/pharmacist" element={<PharmacistLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="sales" element={<Sales />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>

        {/* Profile riêng lẻ cho user thường */}
        <Route element={<ProtectedRoute allowedRoles={["admin", "head_branch", "warehouse", "branch", "pharmacist", "user"]} />}>
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
