import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { downloadWithAuth } from "../lib/download";
import { Button, Input, PageTitle, Select, StatusBadge } from "../components/ui.jsx";

function inr(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n || 0));
}

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function InvoiceListPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [filters, setFilters] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    customerId: "",
    vehicleId: "",
    paymentStatus: ""
  });
  const [data, setData] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [invoices, cs, vs] = await Promise.all([
        api.listInvoices(filters),
        api.listCustomers(""),
        api.listVehicles("")
      ]);
      setData(invoices);
      setCustomers(cs);
      setVehicles(vs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = useMemo(() => {
    const t = data.reduce(
      (a, i) => {
        a.amount += Number(i.amount);
        a.received += Number(i.amountReceived);
        a.balance += Number(i.balanceAmount);
        return a;
      },
      { amount: 0, received: 0, balance: 0 }
    );
    return t;
  }, [data]);

  async function onDelete(id) {
    if (!confirm("Delete this invoice?")) return;
    setError("");
    try {
      await api.deleteInvoice(id);
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <PageTitle
        title="Invoices"
        right={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate("/invoices/new")}>Create Invoice</Button>
            <Button variant="secondary" onClick={loadAll}>
              Refresh
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      ) : null}

      <div className="mb-5 grid gap-3 md:grid-cols-5">
        <Select
          label="Month"
          value={filters.month}
          onChange={(e) => setFilters((f) => ({ ...f, month: Number(e.target.value) }))}
        >
          {MONTH_LABELS.map((m, idx) => (
            <option key={idx + 1} value={idx + 1}>
              {m}
            </option>
          ))}
        </Select>
        <Input
          label="Year"
          type="number"
          value={filters.year}
          onChange={(e) => setFilters((f) => ({ ...f, year: Number(e.target.value) }))}
        />
        <Select
          label="Customer"
          value={filters.customerId}
          onChange={(e) => setFilters((f) => ({ ...f, customerId: e.target.value }))}
        >
          <option value="">All</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.phone})
            </option>
          ))}
        </Select>
        <Select
          label="Vehicle"
          value={filters.vehicleId}
          onChange={(e) => setFilters((f) => ({ ...f, vehicleId: e.target.value }))}
        >
          <option value="">All</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.vehicleNumber} ({v.driverName})
            </option>
          ))}
        </Select>
        <Select
          label="Payment Status"
          value={filters.paymentStatus}
          onChange={(e) => setFilters((f) => ({ ...f, paymentStatus: e.target.value }))}
        >
          <option value="">All</option>
          <option value="FULL">Paid</option>
          <option value="PARTIAL">Partial</option>
          <option value="PENDING">Pending</option>
        </Select>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={loadAll} disabled={loading}>
          Apply Filters
        </Button>
        <div className="text-xs text-gray-600">
          Totals: <span className="font-medium text-gray-900">{inr(total.amount)}</span> • Received{" "}
          <span className="font-medium text-gray-900">{inr(total.received)}</span> • Balance{" "}
          <span className="font-medium text-gray-900">{inr(total.balance)}</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Invoice</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Total</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Received</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Balance</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr>
                <td className="px-4 py-4 text-sm text-gray-600" colSpan={10}>
                  Loading…
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-sm text-gray-600" colSpan={10}>
                  No invoices found.
                </td>
              </tr>
                ) : (
                  data.map((i) => (
                    <tr key={i.id}>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{i.invoiceNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(i.journeyDate).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">{inr(i.amount)}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">{inr(i.amountReceived)}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900">{inr(i.balanceAmount)}</td>
                      <td className="px-4 py-3 text-sm">
                        <StatusBadge status={i.paymentStatus} />
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <div className="inline-flex gap-2">
                          <Button variant="secondary" onClick={() => navigate(`/invoices/${i.id}/edit`)}>
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => downloadWithAuth(api.downloadInvoicePdfUrl(i.id), `${i.invoiceNumber}.pdf`)}
                          >
                            PDF
                          </Button>
                          <Button variant="danger" onClick={() => onDelete(i.id)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

