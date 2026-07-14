import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

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
import { VerifyEmail } from "./pages/auth/VerifyEmail";

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
import { CustomerProfile } from "./pages/customer/CustomerProfile";
import { CustomerOrders } from "./pages/customer/CustomerOrders";

// Master Data
import { Products } from "./pages/master-data/Products";
import { Suppliers } from "./pages/master-data/Suppliers";

// Warehouse Pages
import { Inventory } from "./pages/warehouse/Inventory";
import { InventoryHistory } from "./pages/warehouse/InventoryHistory";
import { PurchaseOrderCreate } from "./pages/warehouse/PurchaseOrderCreate";
import { PurchaseRequisition } from "./pages/warehouse/PurchaseRequisition";
import { InventoryCheck } from "./pages/warehouse/InventoryCheck";

// Admin / HQ Pages
import { Finance } from "./pages/admin/Finance";
import { Reports } from "./pages/admin/Reports";
import { Branches } from "./pages/admin/Branches";
import { VoucherManagement } from "./pages/admin/VoucherManagement";
import { HQApproval } from "./pages/admin/HQApproval";
import { PriceManagement } from "./pages/admin/PriceManagement";
import { SupplierCreditManagement } from "./pages/admin/SupplierCreditManagement";

// Branch Pages
import { BranchRequisition } from "./pages/branch/BranchRequisition";
import { BranchStockReceive } from "./pages/branch/BranchStockReceive";
import { BranchInventory } from "./pages/branch/BranchInventory";
import { BranchTransfer } from "./pages/branch/BranchTransfer";

// Pharmacist / Branch Pages
import { Sales } from "./pages/pharmacist/Sales";
import { DrugInteractions } from "./pages/pharmacist/DrugInteractions";

// Helper component to preserve query parameters on redirect
function RedirectWithSearch({ to }: { to: string }) {
  const location = useLocation();
  return <Navigate to={{ pathname: to, search: location.search }} replace />;
}

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
          <Route path="verify-email" element={<VerifyEmail />} />
        </Route>

        {/* Cũ (Redirect để tương thích trong trường hợp back lại) */}
        <Route path="/login" element={<RedirectWithSearch to="/auth/login" />} />
        <Route path="/register" element={<RedirectWithSearch to="/auth/register" />} />
        <Route path="/forgot-password" element={<RedirectWithSearch to="/auth/forgot-password" />} />
        <Route path="/verify-email" element={<RedirectWithSearch to="/auth/verify-email" />} />
        <Route path="/dashboard" element={<Navigate to="/admin" replace />} />

        {/* --- Customer Routes --- */}
        <Route path="/customer" element={<CustomerLayout />}>
          <Route index element={<Navigate to="shop" replace />} />
          <Route path="shop" element={<CustomerShop />} />
          <Route path="cart" element={<CustomerCart />} />
          <Route path="checkout" element={<CustomerCheckout />} />
          <Route path="interactions" element={<DrugInteractions />} />
          <Route path="ai-consult" element={<AIConsultant />} />
          <Route path="profile" element={<CustomerProfile />} />
          <Route path="orders" element={<CustomerOrders />} />
        </Route>

        {/* --- Admin / HQ Routes --- */}
        <Route element={<ProtectedRoute allowedRoles={["admin", "head_branch"]} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="branches" element={<Branches />} />
            <Route path="vouchers" element={<VoucherManagement />} />
            <Route path="approvals" element={<HQApproval />} />
            <Route path="finance" element={<Finance />} />
            <Route path="supplier-credit" element={<SupplierCreditManagement />} />
            <Route path="reports" element={<Reports />} />
            <Route path="ai-insights" element={<AIInsights />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />

            <Route path="inventory" element={<Inventory />} />
            <Route path="inventory/checks" element={<InventoryCheck />} />
            <Route path="inventory/import" element={<InventoryHistory type="import" />} />
            <Route path="inventory/import/new" element={<PurchaseOrderCreate />} />
            <Route path="inventory/export" element={<InventoryHistory type="export" />} />
            <Route path="inventory/dispose" element={<InventoryHistory type="dispose" />} />

            <Route path="master-data/products" element={<Products />} />
            <Route path="master-data/suppliers" element={<Suppliers />} />
          </Route>
        </Route>

        {/* --- Warehouse / Quản lý Kho Routes --- */}
        <Route element={<ProtectedRoute allowedRoles={["warehouse"]} />}>
          <Route path="/warehouse" element={<WarehouseLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="inventory/checks" element={<InventoryCheck />} />
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

        {/* --- Branch / Quản lý Chi nhánh Routes --- */}
        <Route element={<ProtectedRoute allowedRoles={["branch"]} />}>
          <Route path="/branch" element={<BranchLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="sales" element={<Sales />} />
            <Route path="pricing" element={<PriceManagement />} />
            <Route path="requisitions" element={<BranchRequisition />} />
            <Route path="receive-transfers" element={<BranchStockReceive />} />
            <Route path="inventory" element={<BranchInventory />} />
            <Route path="transfers" element={<BranchTransfer />} />
            <Route path="finance" element={<Finance />} />
            <Route path="supplier-credit" element={<SupplierCreditManagement />} />
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