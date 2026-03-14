import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { isAuthed } from "./lib/auth.js";
import LoginPage from "./pages/LoginPage.jsx";
import CreateInvoicePortal from "./pages/CreateInvoicePortal.jsx";
import AppLayout from "./components/AppLayout.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import CompanySettingsPage from "./pages/CompanySettingsPage.jsx";
import CustomersPage from "./pages/CustomersPage.jsx";
import VehiclesPage from "./pages/VehiclesPage.jsx";
import DriversPage from "./pages/DriversPage.jsx";
import InvoiceListPage from "./pages/InvoiceListPage.jsx";
import InvoiceFormPage from "./pages/InvoiceFormPage.jsx";
import MonthlyReportPage from "./pages/MonthlyReportPage.jsx";

function RequireAuth({ children }) {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/portal/create-invoice" element={<CreateInvoicePortal />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="company" element={<CompanySettingsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="drivers" element={<DriversPage />} />
        <Route path="invoices" element={<InvoiceListPage />} />
        <Route path="invoices/new" element={<InvoiceFormPage mode="create" />} />
        <Route path="invoices/:id/edit" element={<InvoiceFormPage mode="edit" />} />
        <Route path="reports/monthly" element={<MonthlyReportPage />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthed() ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

