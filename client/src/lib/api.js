import { getToken, clearToken } from "./auth.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||  "https://taxi-billing-server-production.up.railway.app";

async function request(path, { method = "GET", body, headers } = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {})
    },
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined
  });

  if (res.status === 401) {
    clearToken();
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    const err = isJson ? await res.json().catch(() => ({})) : { message: await res.text() };
    throw new Error(err.message || "Request failed");
  }

  if (res.status === 204) return null;
  return isJson ? res.json() : res.text();
}

export const api = {
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),

  getDashboard: () => request("/dashboard"),
  getDashboardDaily: (date) =>
    request(`/dashboard/daily${date ? `?date=${encodeURIComponent(date)}` : ""}`),

  getCompany: () => request("/company"),
  saveCompany: (data) => request("/company", { method: "PUT", body: data }),
  uploadLogo: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return request("/company/upload/logo", { method: "POST", body: fd });
  },
  uploadSignature: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return request("/company/upload/signature", { method: "POST", body: fd });
  },

  listCustomers: (q) => request(`/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  getCustomer: (id) => request(`/customers/${id}`),
  createCustomer: (data) => request("/customers", { method: "POST", body: data }),
  updateCustomer: (id, data) => request(`/customers/${id}`, { method: "PUT", body: data }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: "DELETE" }),
  customerInvoices: (id) => request(`/customers/${id}/invoices`),

  listVehicles: (q) => request(`/vehicles${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  getVehicle: (id) => request(`/vehicles/${id}`),
  createVehicle: (data) => request("/vehicles", { method: "POST", body: data }),
  updateVehicle: (id, data) => request(`/vehicles/${id}`, { method: "PUT", body: data }),
  deleteVehicle: (id) => request(`/vehicles/${id}`, { method: "DELETE" }),
  vehicleInvoices: (id) => request(`/vehicles/${id}/invoices`),

  listDrivers: (q) => request(`/drivers${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  getDriver: (id) => request(`/drivers/${id}`),
  createDriver: (data) => request("/drivers", { method: "POST", body: data }),
  updateDriver: (id, data) => request(`/drivers/${id}`, { method: "PUT", body: data }),
  deleteDriver: (id) => request(`/drivers/${id}`, { method: "DELETE" }),
  driverInvoices: (id) => request(`/drivers/${id}/invoices`),

  listInvoices: (filters = {}) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    }
    const qs = params.toString();
    return request(`/invoices${qs ? `?${qs}` : ""}`);
  },
  getInvoice: (id) => request(`/invoices/${id}`),
  createInvoice: (data) => request("/invoices", { method: "POST", body: data }),
  updateInvoice: (id, data) => request(`/invoices/${id}`, { method: "PUT", body: data }),
  deleteInvoice: (id) => request(`/invoices/${id}`, { method: "DELETE" }),

  downloadInvoicePdfUrl: (id) => `${API_BASE_URL}/invoices/${id}/pdf`,

  monthlyReport: (month, year) => request(`/reports/monthly?month=${month}&year=${year}`),
  monthlyReportCsvUrl: (month, year) => `${API_BASE_URL}/reports/monthly/export.csv?month=${month}&year=${year}`,
  monthlyReportPdfUrl: (month, year) => `${API_BASE_URL}/reports/monthly/export.pdf?month=${month}&year=${year}`,

  yearlyReport: (year) => request(`/reports/yearly?year=${year}`),
  yearlyReportCsvUrl: (year) => `${API_BASE_URL}/reports/yearly/export.csv?year=${year}`,
  yearlyReportPdfUrl: (year) => `${API_BASE_URL}/reports/yearly/export.pdf?year=${year}`
};

/** Portal API: no auth, uses /portal/* paths */
async function portalRequest(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  if (!res.ok) {
    const err = isJson ? await res.json().catch(() => ({})) : { message: await res.text() };
    throw new Error(err.message || "Request failed");
  }
  if (res.status === 204) return null;
  return isJson ? res.json() : res.text();
}

export const portalApi = {
  getCompany: () => portalRequest("/portal/company"),
  listCustomers: (q) => portalRequest(`/portal/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  createCustomer: (data) => portalRequest("/portal/customers", { method: "POST", body: data }),
  listVehicles: (q) => portalRequest(`/portal/vehicles${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  createVehicle: (data) => portalRequest("/portal/vehicles", { method: "POST", body: data }),
  listDrivers: (q) => portalRequest(`/portal/drivers${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  createDriver: (data) => portalRequest("/portal/drivers", { method: "POST", body: data }),
  createInvoice: (data) => portalRequest("/portal/invoices", { method: "POST", body: data }),
  invoicePdfUrl: (id) => `${API_BASE_URL}/portal/invoices/${id}/pdf`
};

export { API_BASE_URL };

