import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { downloadWithAuth } from "../lib/download";
import { Button, Input, PageTitle, TextArea } from "../components/ui.jsx";

function toISODate(d) {
  if (!d) return "";
  const dt = new Date(d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function diffDaysInclusive(fromDate, toDate) {
  if (!fromDate || !toDate) return 0;
  const f = new Date(fromDate);
  const t = new Date(toDate);
  f.setHours(0, 0, 0, 0);
  t.setHours(0, 0, 0, 0);
  const days = Math.floor((t.getTime() - f.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  return Math.max(days, 1);
}

export default function InvoiceFormPage({ mode }) {
  const navigate = useNavigate();
  const params = useParams();
  const invoiceId = params.id;

  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [customerSearch, setCustomerSearch] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [driverOpen, setDriverOpen] = useState(false);

  const [addNewCustomer, setAddNewCustomer] = useState({ show: false, name: "", phone: "", email: "", address: "" });
  const [addNewVehicle, setAddNewVehicle] = useState({ show: false, vehicleNumber: "", vehicleModel: "", vehicleType: "" });
  const [addNewDriver, setAddNewDriver] = useState({ show: false, name: "", phone: "" });

  const [form, setForm] = useState({
    customerId: "",
    vehicleId: "",
    driverId: "",
    journeyDate: toISODate(new Date()),
    description: "",
    fromDate: toISODate(new Date()),
    toDate: toISODate(new Date()),
    amount: 0,
    amountReceived: 0
  });

  useEffect(() => {
    let alive = true;
    Promise.all([api.listCustomers(""), api.listVehicles(""), api.listDrivers("")])
      .then(([cs, vs, ds]) => {
        if (!alive) return;
        setCustomers(cs);
        setVehicles(vs);
        setDrivers(ds);
      })
      .catch((e) => alive && setError(e.message));

    if (mode === "edit" && invoiceId) {
      api
        .getInvoice(invoiceId)
        .then((inv) => {
          if (!alive) return;
          setForm({
            customerId: inv.customerId,
            vehicleId: inv.vehicleId,
            driverId: inv.driverId || "",
            journeyDate: toISODate(inv.journeyDate),
            description:
              (inv.description && String(inv.description).trim()) ||
              (inv.tripFrom && inv.tripTo && inv.tripFrom !== "-"
                ? `${inv.tripFrom} → ${inv.tripTo}`
                : ""),
            fromDate: toISODate(inv.fromDate),
            toDate: toISODate(inv.toDate),
            amount: Number(inv.amount),
            amountReceived: Number(inv.amountReceived)
          });

          // Prefill search text for edit mode
          setCustomerSearch(inv.customer?.name || "");
          setVehicleSearch(inv.vehicle?.vehicleNumber || "");
          setDriverSearch(inv.driver?.name || "");
        })
        .catch((e) => alive && setError(e.message))
        .finally(() => alive && setLoading(false));
    } else {
      setLoading(false);
    }

    return () => {
      alive = false;
    };
  }, [mode, invoiceId]);

  const customer = useMemo(() => customers.find((c) => c.id === form.customerId), [customers, form.customerId]);
  const numberOfDays = useMemo(() => diffDaysInclusive(form.fromDate, form.toDate), [form.fromDate, form.toDate]);
  const balanceAmount = useMemo(
    () => Number(form.amount || 0) - Number(form.amountReceived || 0),
    [form.amount, form.amountReceived]
  );

  const filteredCustomers = useMemo(
    () =>
      customers.filter((c) => {
        if (!customerSearch.trim()) return true;
        const q = customerSearch.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          (c.phone || "").toLowerCase().includes(q)
        );
      }),
    [customers, customerSearch]
  );

  const filteredVehicles = useMemo(
    () =>
      vehicles.filter((v) => {
        if (!vehicleSearch.trim()) return true;
        const q = vehicleSearch.toLowerCase();
        return (
          v.vehicleNumber.toLowerCase().includes(q) ||
          (v.vehicleModel || "").toLowerCase().includes(q) ||
          (v.vehicleType || "").toLowerCase().includes(q)
        );
      }),
    [vehicles, vehicleSearch]
  );

  const filteredDrivers = useMemo(
    () =>
      drivers.filter((d) => {
        if (!driverSearch.trim()) return true;
        const q = driverSearch.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          (d.phone || "").toLowerCase().includes(q)
        );
      }),
    [drivers, driverSearch]
  );

  function handleCustomerChange(e) {
    const value = e.target.value;
    setCustomerSearch(value);
    if (!value.trim()) {
      setForm((f) => ({ ...f, customerId: "" }));
    }
    setFieldErrors((prev) => ({ ...prev, customerId: undefined }));
    setCustomerOpen(true);
  }

  function handleVehicleChange(e) {
    const value = e.target.value;
    setVehicleSearch(value);
    if (!value.trim()) {
      setForm((f) => ({ ...f, vehicleId: "" }));
    }
    setFieldErrors((prev) => ({ ...prev, vehicleId: undefined }));
    setVehicleOpen(true);
  }

  function handleDriverChange(e) {
    const value = e.target.value;
    setDriverSearch(value);
    if (!value.trim()) {
      setForm((f) => ({ ...f, driverId: "" }));
    }
    setFieldErrors((prev) => ({ ...prev, driverId: undefined }));
    setDriverOpen(true);
  }

  function selectCustomer(c) {
    setForm((f) => ({ ...f, customerId: c.id }));
    setCustomerSearch(c.name);
    setCustomerOpen(false);
  }

  function selectVehicle(v) {
    setForm((f) => ({ ...f, vehicleId: v.id }));
    setVehicleSearch(v.vehicleNumber);
    setVehicleOpen(false);
  }

  function selectDriver(d) {
    setForm((f) => ({ ...f, driverId: d.id }));
    setDriverSearch(d.name);
    setDriverOpen(false);
  }

  function handleBlur(setOpen) {
    // Small delay so clicks on suggestions still register
    setTimeout(() => setOpen(false), 150);
  }

  async function handleAddCustomer() {
    if (!addNewCustomer.name.trim()) {
      setError("Please Enter Name");
      return;
    }
    if (!addNewCustomer.phone.trim()) {
      setError("Please Enter Phone number");
      return;
    }
    setError("");
    try {
      const c = await api.createCustomer({
        name: addNewCustomer.name.trim(),
        phone: addNewCustomer.phone.trim(),
        email: addNewCustomer.email.trim() || null,
        address: addNewCustomer.address.trim() || null
      });
      setCustomers((prev) => [c, ...prev]);
      setForm((f) => ({ ...f, customerId: c.id }));
      setCustomerSearch(c.name);
      setAddNewCustomer({ show: false, name: "", phone: "", email: "", address: "" });
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleAddVehicle() {
    if (!addNewVehicle.vehicleNumber.trim()) {
      setError("Please enter vehicle number.");
      return;
    }
    setError("");
    try {
      const v = await api.createVehicle({
        vehicleNumber: addNewVehicle.vehicleNumber.trim(),
        vehicleModel: addNewVehicle.vehicleModel.trim() || null,
        vehicleType: addNewVehicle.vehicleType.trim() || null
      });
      setVehicles((prev) => [v, ...prev]);
      setForm((f) => ({ ...f, vehicleId: v.id }));
      setVehicleSearch(v.vehicleNumber);
      setAddNewVehicle({ show: false, vehicleNumber: "", vehicleModel: "", vehicleType: "" });
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleAddDriver() {
    if (!addNewDriver.name.trim()) {
      setError("Please Enter Name");
      return;
    }
    if (!addNewDriver.phone.trim()) {
      setError("Please Enter Phone number");
      return;
    }
    setError("");
    try {
      const d = await api.createDriver({
        name: addNewDriver.name.trim(),
        phone: addNewDriver.phone.trim()
      });
      setDrivers((prev) => [d, ...prev]);
      setForm((f) => ({ ...f, driverId: d.id }));
      setDriverSearch(d.name);
      setAddNewDriver({ show: false, name: "", phone: "" });
    } catch (e) {
      setError(e.message);
    }
  }

  function validateForm() {
    const errs = {};
    if (!form.description || !form.description.trim()) {
      errs.description = "Description cannot be empty.";
    }
    if (!form.customerId) {
      errs.customerId = "Please select a customer or add a new one.";
    }
    if (!form.vehicleId) {
      errs.vehicleId = "Please select a vehicle or add a new one.";
    }
    if (!form.driverId) {
      errs.driverId = "Please select a driver or add a new one.";
    }
    const from = new Date(form.fromDate);
    const to = new Date(form.toDate);
    if (form.fromDate && form.toDate && to < from) {
      errs.toDate = "To Date cannot be earlier than From Date.";
    }
    const amount = Number(form.amount);
    const amountReceived = Number(form.amountReceived || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      errs.amount = "Total Amount is required and must be greater than zero.";
    }
    if (Number.isFinite(amountReceived) && amountReceived > amount) {
      errs.amountReceived = "Amount Received cannot be more than Total Amount.";
    }
    if (Object.keys(errs).length > 0) {
      return { ok: false, fieldErrors: errs };
    }
    return { ok: true };
  }

  async function saveInvoice() {
    setSaving(true);
    setError("");
    setFieldErrors({});
    try {
      const validation = validateForm();
      if (!validation.ok) {
        setFieldErrors(validation.fieldErrors || {});
        return null;
      }

      const payload = {
        customerId: form.customerId,
        vehicleId: form.vehicleId,
        driverId: form.driverId,
        journeyDate: new Date(form.journeyDate).toISOString(),
        description: form.description.trim(),
        fromDate: new Date(form.fromDate).toISOString(),
        toDate: new Date(form.toDate).toISOString(),
        pickupTime: null,
        closingTime: null,
        openingKm: 0,
        closingKm: 0,
        tollCharges: 0,
        parkingCharges: 0,
        amount: Number(form.amount),
        amountReceived: Number(form.amountReceived || 0)
      };
      if (mode === "edit") {
        const updated = await api.updateInvoice(invoiceId, payload);
        return updated;
      }
      const created = await api.createInvoice(payload);
      return created;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function onSave() {
    const inv = await saveInvoice();
    if (!inv) return;
    navigate("/invoices");
  }

  async function onSaveAndPdf() {
    const inv = await saveInvoice();
    if (!inv) return;
    await downloadWithAuth(api.downloadInvoicePdfUrl(inv.id), `${inv.invoiceNumber}.pdf`);
    navigate("/invoices");
  }

  return (
    <div>
      <PageTitle
        title={mode === "edit" ? "Edit Invoice" : "Create Invoice"}
        right={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate("/invoices")}>
              Back
            </Button>
            <Button onClick={onSave} disabled={saving || loading}>
              Save
            </Button>
            <Button variant="ghost" onClick={onSaveAndPdf} disabled={saving || loading}>
              Save & Generate PDF
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      ) : null}

      {loading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    label="Customer"
                    placeholder="Type name"
                    value={customerSearch}
                    onChange={handleCustomerChange}
                    onFocus={() => setCustomerOpen(true)}
                    onBlur={() => handleBlur(setCustomerOpen)}
                    error={fieldErrors.customerId}
                  />
                  {customerOpen && (
                    <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white text-sm shadow-lg">
                      <button
                        type="button"
                        className="flex w-full items-center px-3 py-2 text-left font-medium text-blue-600 hover:bg-blue-50"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setAddNewCustomer((a) => ({ ...a, show: true }));
                          setCustomerOpen(false);
                          setForm((f) => ({ ...f, customerId: "" }));
                          setCustomerSearch("");
                        }}
                      >
                        Add New Customer
                      </button>
                      {filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectCustomer(c)}
                        >
                          <span className="font-medium text-gray-900">{c.name}</span>
                          {c.phone ? (
                            <span className="ml-2 text-xs text-gray-500">{c.phone}</span>
                          ) : null}
                        </button>
                      ))}
                      {filteredCustomers.length === 0 && customerSearch.trim() && (
                        <div className="px-3 py-2 text-gray-500">No results</div>
                      )}
                    </div>
                  )}
                </div>
                {addNewCustomer.show ? (
                  <div className="mt-3 rounded-lg bg-gray-50 p-3 space-y-2">
                    <Input label="Name" value={addNewCustomer.name} onChange={(e) => setAddNewCustomer((a) => ({ ...a, name: e.target.value }))} />
                    <Input label="Phone" value={addNewCustomer.phone} onChange={(e) => setAddNewCustomer((a) => ({ ...a, phone: e.target.value }))} />
                    <Input label="Email" type="email" value={addNewCustomer.email} onChange={(e) => setAddNewCustomer((a) => ({ ...a, email: e.target.value }))} />
                    <TextArea label="Address" rows={2} value={addNewCustomer.address} onChange={(e) => setAddNewCustomer((a) => ({ ...a, address: e.target.value }))} />
                    <div className="flex gap-2">
                      <Button onClick={handleAddCustomer}>Add Customer</Button>
                      <Button variant="secondary" onClick={() => setAddNewCustomer((a) => ({ ...a, show: false }))}>Cancel</Button>
                    </div>
                  </div>
                ) : null}
              </div>
              <Input label="Customer Phone" value={customer?.phone || ""} disabled />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    label="Vehicle"
                    placeholder="Type number"
                    value={vehicleSearch}
                    onChange={handleVehicleChange}
                    onFocus={() => setVehicleOpen(true)}
                    onBlur={() => handleBlur(setVehicleOpen)}
                    error={fieldErrors.vehicleId}
                  />
                  {vehicleOpen && (
                    <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white text-sm shadow-lg">
                      <button
                        type="button"
                        className="flex w-full items-center px-3 py-2 text-left font-medium text-blue-600 hover:bg-blue-50"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setAddNewVehicle((a) => ({ ...a, show: true }));
                          setVehicleOpen(false);
                          setForm((f) => ({ ...f, vehicleId: "" }));
                          setVehicleSearch("");
                        }}
                      >
                        Add New Vehicle
                      </button>
                      {filteredVehicles.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectVehicle(v)}
                        >
                          <span className="font-medium text-gray-900">{v.vehicleNumber}</span>
                          {(v.vehicleModel || v.vehicleType) && (
                            <span className="ml-2 text-xs text-gray-500">
                              {[v.vehicleModel, v.vehicleType].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </button>
                      ))}
                      {filteredVehicles.length === 0 && vehicleSearch.trim() && (
                        <div className="px-3 py-2 text-gray-500">No results</div>
                      )}
                    </div>
                  )}
                </div>
                {addNewVehicle.show ? (
                  <div className="mt-3 rounded-lg bg-gray-50 p-3 space-y-2">
                    <Input label="Vehicle Number" value={addNewVehicle.vehicleNumber} onChange={(e) => setAddNewVehicle((a) => ({ ...a, vehicleNumber: e.target.value }))} />
                    <Input label="Model" value={addNewVehicle.vehicleModel} onChange={(e) => setAddNewVehicle((a) => ({ ...a, vehicleModel: e.target.value }))} />
                    <Input label="Type" value={addNewVehicle.vehicleType} onChange={(e) => setAddNewVehicle((a) => ({ ...a, vehicleType: e.target.value }))} />
                    <div className="flex gap-2">
                      <Button onClick={handleAddVehicle}>Add Vehicle</Button>
                      <Button variant="secondary" onClick={() => setAddNewVehicle((a) => ({ ...a, show: false }))}>Cancel</Button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Input
                    label="Driver"
                    placeholder="Type name"
                    value={driverSearch}
                    onChange={handleDriverChange}
                    onFocus={() => setDriverOpen(true)}
                    onBlur={() => handleBlur(setDriverOpen)}
                    error={fieldErrors.driverId}
                  />
                  {driverOpen && (
                    <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white text-sm shadow-lg">
                      <button
                        type="button"
                        className="flex w-full items-center px-3 py-2 text-left font-medium text-blue-600 hover:bg-blue-50"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setAddNewDriver((a) => ({ ...a, show: true }));
                          setDriverOpen(false);
                          setForm((f) => ({ ...f, driverId: "" }));
                          setDriverSearch("");
                        }}
                      >
                        Add New Driver
                      </button>
                      {filteredDrivers.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectDriver(d)}
                        >
                          <span className="font-medium text-gray-900">{d.name}</span>
                          {d.phone ? (
                            <span className="ml-2 text-xs text-gray-500">{d.phone}</span>
                          ) : null}
                        </button>
                      ))}
                      {filteredDrivers.length === 0 && driverSearch.trim() && (
                        <div className="px-3 py-2 text-gray-500">No results</div>
                      )}
                    </div>
                  )}
                </div>
                {addNewDriver.show ? (
                  <div className="mt-3 rounded-lg bg-gray-50 p-3 space-y-2">
                    <Input label="Name" value={addNewDriver.name} onChange={(e) => setAddNewDriver((a) => ({ ...a, name: e.target.value }))} />
                    <Input label="Phone" value={addNewDriver.phone} onChange={(e) => setAddNewDriver((a) => ({ ...a, phone: e.target.value }))} />
                    <div className="flex gap-2">
                      <Button onClick={handleAddDriver}>Add Driver</Button>
                      <Button variant="secondary" onClick={() => setAddNewDriver((a) => ({ ...a, show: false }))}>Cancel</Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <Input label="Journey Date" type="date" value={form.journeyDate} onChange={(e) => setForm((f) => ({ ...f, journeyDate: e.target.value }))} />

            <TextArea
              label="Description"
              rows={5}
              placeholder="Vehicle, route, toll, parking, and other trip details"
              value={form.description}
              onChange={(e) => {
                setForm((f) => ({ ...f, description: e.target.value }));
                setFieldErrors((p) => ({ ...p, description: undefined }));
              }}
              error={fieldErrors.description}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="From Date" type="date" value={form.fromDate} onChange={(e) => { setForm((f) => ({ ...f, fromDate: e.target.value })); setFieldErrors((p) => ({ ...p, toDate: undefined })); }} />
              <Input label="To Date" type="date" value={form.toDate} onChange={(e) => { setForm((f) => ({ ...f, toDate: e.target.value })); setFieldErrors((p) => ({ ...p, toDate: undefined })); }} error={fieldErrors.toDate} />
              <Input label="Number of Days" value={numberOfDays} disabled />
            </div>

          </div>

          <div className="space-y-4">
            <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
              <div className="mb-3 text-sm font-semibold text-gray-900">Charges</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Total Amount" type="number" value={form.amount} onChange={(e) => { setForm((f) => ({ ...f, amount: e.target.value })); setFieldErrors((p) => ({ ...p, amount: undefined, amountReceived: undefined })); }} error={fieldErrors.amount} />
                <Input label="Amount Received" type="number" value={form.amountReceived} onChange={(e) => { setForm((f) => ({ ...f, amountReceived: e.target.value })); setFieldErrors((p) => ({ ...p, amountReceived: undefined })); }} error={fieldErrors.amountReceived} />
              </div>
              <div className="mt-4">
                <Input label="Balance Amount" value={Number.isFinite(balanceAmount) ? balanceAmount : ""} disabled />
              </div>
            </div>

            <div className="rounded-xl bg-white p-4 ring-1 ring-gray-200">
              <div className="text-sm font-semibold text-gray-900">Auto Calculations</div>
              <div className="mt-2 text-sm text-gray-700">
                Days: <span className="font-medium text-gray-900">{numberOfDays}</span>
                <br />
                Balance: <span className="font-medium text-gray-900">{Number.isFinite(balanceAmount) ? balanceAmount : "-"}</span>
              </div>
              <div className="mt-3 text-xs text-gray-500">Payment status is computed automatically when saving.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

