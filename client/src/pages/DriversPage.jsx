import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { invoiceRouteSummary } from "../lib/invoiceDisplay.js";
import { Button, Input, PageTitle, StatusBadge, TextArea } from "../components/ui.jsx";

function emptyForm() {
  return { id: null, name: "", phone: "", email: "", address: "" };
}

export default function DriversPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [editing, setEditing] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState({ open: false, driver: null, invoices: [], loading: false });

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await api.listDrivers(q));
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
        phone: editing.phone
      };
      if (editing.id) await api.updateDriver(editing.id, payload);
      else await api.createDriver(payload);
      setEditing(emptyForm());
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id) {
    if (!confirm("Delete this driver?")) return;
    setError("");
    try {
      await api.deleteDriver(id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function openHistory(d) {
    setHistory({ open: true, driver: d, invoices: [], loading: true });
    try {
      const invoices = await api.driverInvoices(d.id);
      setHistory({ open: true, driver: d, invoices, loading: false });
    } catch (e) {
      setError(e.message);
      setHistory((h) => ({ ...h, loading: false }));
    }
  }

  return (
    <div>
      <PageTitle
        title="Drivers"
        right={
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search driver name or phone..."
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
          {editing.id ? "Edit Driver" : "Add Driver"}
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
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-sm text-gray-600" colSpan={4}>
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-sm text-gray-600" colSpan={4}>
                    No drivers found.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{d.phone}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      <div className="inline-flex gap-2">
                        <Button variant="ghost" onClick={() => openHistory(d)}>
                          History
                        </Button>
                        <Button variant="secondary" onClick={() => setEditing({ ...d })}>
                          Edit
                        </Button>
                        <Button variant="danger" onClick={() => onDelete(d.id)}>
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
              <button
                className="text-sm text-gray-600 hover:text-gray-900"
                onClick={() =>
                  setHistory({ open: false, driver: null, invoices: [], loading: false })
                }
              >
                Close
              </button>
            </div>
            <div className="mb-3 text-xs text-gray-600">{history.driver?.name}</div>
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
                      {new Date(i.journeyDate).toLocaleDateString("en-IN")} • {invoiceRouteSummary(i)} •{" "}
                      {i.vehicle?.vehicleNumber}
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

