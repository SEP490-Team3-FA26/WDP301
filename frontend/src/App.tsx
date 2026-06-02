/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { AuthLayout } from "./components/layout/AuthLayout";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { Profile } from "./pages/Profile";
import { Settings } from "./pages/Settings";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Inventory } from "./pages/Inventory";
import { InventoryHistory } from "./pages/InventoryHistory";
import { Branches } from "./pages/Branches";
import { Sales } from "./pages/Sales";
import { Finance } from "./pages/Finance";
import { Reports } from "./pages/Reports";
import { AIInsights } from "./pages/AIInsights";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="branches" element={<Branches />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="inventory/import" element={<InventoryHistory type="import" />} />
          <Route path="inventory/export" element={<InventoryHistory type="export" />} />
          <Route path="inventory/dispose" element={<InventoryHistory type="dispose" />} />
          <Route path="finance" element={<Finance />} />
          <Route path="reports" element={<Reports />} />
          <Route path="ai-insights" element={<AIInsights />} />
          <Route path="sales" element={<Sales />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
