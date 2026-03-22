import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { invoiceRouteSummary } from "../lib/invoiceDisplay.js";
import { Button, Input, PageTitle, TextArea, StatusBadge } from "../components/ui.jsx";

function emptyForm() {
  return { id: null, name: "", phone: "", email: "", address: "" };
}

export default function CustomersPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [editing, setEditing] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState({ open: false, customer: null, invoices: [], loading: false });

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await api.listCustomers(q));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => items, [items]);

  async function onSave() {
    const errs = {};
    if (!editing.name.trim()) errs.name = "Please Enter Name";
    if (!editing.phone.trim()) errs.phone = "Please Enter Phone number";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: editing.name,
        phone: editing.phone,
        email: editing.email || null,
        address: editing.address || null
      };
      if (editing.id) await api.updateCustomer(editing.id, payload);
      else await api.createCustomer(payload);
      setEditing(emptyForm());
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    if (!confirm("Delete this customer?")) return;
    setError("");
    try {
      await api.deleteCustomer(id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function openHistory(c) {
    setHistory({ open: true, customer: c, invoices: [], loading: true });
    try {
      const invoices = await api.customerInvoices(c.id);
      setHistory({ open: true, customer: c, invoices, loading: false });
    } catch (e) {
      setError(e.message);
      setHistory((h) => ({ ...h, loading: false }));
    }
  }

  return (
    <div>
      <PageTitle
        title="Customers"
        right={
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search name or phone..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-64"
            />
            <Button variant="secondary" onClick={load}>
              Search
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      ) : null}

      <div className="mb-5 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
        <div className="mb-3 text-sm font-semibold text-gray-900">
          {editing.id ? "Edit Customer" : "Add Customer"}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Name"
            value={editing.name}
            onChange={(e) => { setEditing((f) => ({ ...f, name: e.target.value })); setFieldErrors((p) => ({ ...p, name: undefined })); }}
            error={fieldErrors.name}
          />
          <Input
            label="Phone"
            value={editing.phone}
            onChange={(e) => { setEditing((f) => ({ ...f, phone: e.target.value })); setFieldErrors((p) => ({ ...p, phone: undefined })); }}
            error={fieldErrors.phone}
          />
          <Input
            label="Email"
            type="email"
            value={editing.email || ""}
            onChange={(e) => setEditing((f) => ({ ...f, email: e.target.value }))}
          />
          <TextArea
            label="Address"
            rows={2}
            value={editing.address || ""}
            onChange={(e) => setEditing((f) => ({ ...f, address: e.target.value }))}
          />
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button variant="secondary" onClick={() => setEditing(emptyForm())}>
            Clear
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="overflow-x-auto rounded-xl ring-1 ring-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Email</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-sm text-gray-600" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-sm text-gray-600" colSpan={5}>
                    No customers found.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.phone}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.address || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.email || "-"}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      <div className="inline-flex gap-2">
                        <Button variant="ghost" onClick={() => openHistory(c)}>
                          History
                        </Button>
                        <Button variant="secondary" onClick={() => setEditing({ ...c })}>
                          Edit
                        </Button>
                        <Button variant="danger" onClick={() => onDelete(c.id)}>
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

        {history.open ? (
          <div className="rounded-xl bg-white p-4 ring-1 ring-gray-200">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">Trip History</div>
                <button className="text-sm text-gray-600 hover:text-gray-900" onClick={() => setHistory({ open: false, customer: null, invoices: [], loading: false })}>
                  Close
                </button>
              </div>
              <div className="mb-3 text-xs text-gray-600">{history.customer?.name}</div>
              {history.loading ? (
                <div className="text-sm text-gray-600">Loading…</div>
              ) : history.invoices.length === 0 ? (
              <div className="text-sm text-gray-600">No invoices yet.</div>
            ) : (
              <div className="space-y-2">
                {history.invoices.slice(0, 10).map((i) => (
                  <div key={i.id} className="rounded-lg bg-gray-50 p-3 ring-1 ring-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-900">{i.invoiceNumber}</div>
                      <StatusBadge status={i.paymentStatus} />
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      {new Date(i.journeyDate).toLocaleDateString("en-IN")} • {invoiceRouteSummary(i)} • {i.vehicle?.vehicleNumber}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

