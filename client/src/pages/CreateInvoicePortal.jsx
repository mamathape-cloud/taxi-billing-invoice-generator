import React, { useEffect, useMemo, useState } from "react";
import { portalApi } from "../lib/api";
import { downloadWithoutAuth } from "../lib/download";
import { Button, Input, TextArea } from "../components/ui.jsx";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

function formatPhoneForWhatsApp(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return "91" + digits;
  return digits;
}

export default function CreateInvoicePortal() {
  const [company, setCompany] = useState(null);
  const [companyError, setCompanyError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [createdInvoice, setCreatedInvoice] = useState(null);

  const [form, setForm] = useState({
    customerId: "",
    vehicleId: "",
    driverId: "",
    tripFrom: "",
    tripTo: "",
    pickupDateTime: "",
    dropDateTime: "",
    openingKm: "",
    closingKm: "",
    parkingCharges: 0,
    tollCharges: 0,
    amount: "",
    amountReceived: 0
  });

  const [addNewCustomer, setAddNewCustomer] = useState({ show: false, name: "", phone: "", email: "", address: "" });
  const [addNewVehicle, setAddNewVehicle] = useState({ show: false, vehicleNumber: "", vehicleModel: "", vehicleType: "" });
  const [addNewDriver, setAddNewDriver] = useState({ show: false, name: "", phone: "" });

  const [customerSearch, setCustomerSearch] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [driverOpen, setDriverOpen] = useState(false);

  const filteredCustomers = useMemo(
    () =>
      customers.filter((c) => {
        if (!customerSearch.trim()) return true;
        const q = customerSearch.toLowerCase();
        return c.name.toLowerCase().includes(q) || (c.phone || "").toLowerCase().includes(q);
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
        return d.name.toLowerCase().includes(q) || (d.phone || "").toLowerCase().includes(q);
      }),
    [drivers, driverSearch]
  );

  useEffect(() => {
    portalApi.getCompany().then(setCompany).catch((e) => setCompanyError(e.message));
  }, []);

  useEffect(() => {
    if (!showForm) return;
    setLoading(true);
    Promise.all([
      portalApi.listCustomers(""),
      portalApi.listVehicles(""),
      portalApi.listDrivers("")
    ])
      .then(([cs, vs, ds]) => {
        setCustomers(cs);
        setVehicles(vs);
        setDrivers(ds);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [showForm]);

  const totalKm = form.openingKm !== "" && form.closingKm !== "" ? Number(form.closingKm) - Number(form.openingKm) : null;
  const balanceAmount = form.amount !== "" && Number.isFinite(Number(form.amount))
    ? Number(form.amount) - Number(form.amountReceived || 0)
    : null;

  function handleCustomerChange(e) {
    const value = e.target.value;
    setCustomerSearch(value);
    if (!value.trim()) setForm((f) => ({ ...f, customerId: "" }));
    setFieldErrors((p) => ({ ...p, customerId: undefined }));
    setCustomerOpen(true);
  }
  function handleVehicleChange(e) {
    const value = e.target.value;
    setVehicleSearch(value);
    if (!value.trim()) setForm((f) => ({ ...f, vehicleId: "" }));
    setFieldErrors((p) => ({ ...p, vehicleId: undefined }));
    setVehicleOpen(true);
  }
  function handleDriverChange(e) {
    const value = e.target.value;
    setDriverSearch(value);
    if (!value.trim()) setForm((f) => ({ ...f, driverId: "" }));
    setFieldErrors((p) => ({ ...p, driverId: undefined }));
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
    setTimeout(() => setOpen(false), 150);
  }

  function validateForm() {
    const errs = {};
    if (!form.customerId) errs.customerId = "Please select a customer or add a new one.";
    if (!form.vehicleId) errs.vehicleId = "Please select a vehicle or add a new one.";
    if (!form.driverId) errs.driverId = "Please select a driver or add a new one.";
    if (!form.tripFrom?.trim()) errs.tripFrom = "From Trip cannot be empty.";
    if (!form.tripTo?.trim()) errs.tripTo = "To Trip cannot be empty.";
    if (!form.pickupDateTime) errs.pickupDateTime = "Please enter Pickup Date and Time.";
    if (!form.dropDateTime) errs.dropDateTime = "Please enter Drop Date and Time.";
    const openKm = Number(form.openingKm);
    const closeKm = Number(form.closingKm);
    if (!Number.isFinite(openKm) || openKm < 0) errs.openingKm = "Please enter valid Opening KM.";
    if (!Number.isFinite(closeKm) || closeKm < 0) errs.closingKm = "Please enter valid Closing KM.";
    if (Number.isFinite(openKm) && Number.isFinite(closeKm) && closeKm < openKm) errs.closingKm = "Closing KM cannot be less than Opening KM.";
    const amt = Number(form.amount);
    if (!Number.isFinite(amt) || amt <= 0) errs.amount = "Total Amount is required and must be greater than zero.";
    const received = Number(form.amountReceived || 0);
    if (received > amt) errs.amountReceived = "Amount Received cannot be more than Total Amount.";
    if (form.pickupDateTime && form.dropDateTime) {
      const fromDate = form.pickupDateTime.slice(0, 10);
      const toDate = form.dropDateTime.slice(0, 10);
      if (toDate < fromDate) errs.dropDateTime = "Drop date cannot be earlier than Pickup date.";
    }
    if (Object.keys(errs).length > 0) return { ok: false, fieldErrors: errs };
    return { ok: true };
  }

  function buildPayload() {
    const fromDate = form.pickupDateTime.slice(0, 10);
    const toDate = form.dropDateTime.slice(0, 10);
    const pickupTime = form.pickupDateTime.slice(11, 16) || null;
    const closingTime = form.dropDateTime.slice(11, 16) || null;
    return {
      customerId: form.customerId,
      vehicleId: Number(form.vehicleId),
      driverId: Number(form.driverId),
      journeyDate: new Date(form.pickupDateTime).toISOString(),
      tripFrom: form.tripFrom.trim(),
      tripTo: form.tripTo.trim(),
      fromDate: new Date(fromDate).toISOString(),
      toDate: new Date(toDate).toISOString(),
      pickupTime,
      closingTime,
      openingKm: Number(form.openingKm),
      closingKm: Number(form.closingKm),
      tollCharges: Number(form.tollCharges) || 0,
      parkingCharges: Number(form.parkingCharges) || 0,
      amount: Number(form.amount),
      amountReceived: Number(form.amountReceived) || 0
    };
  }

  async function handleSaveInvoice(andDownloadPdf) {
    const validation = validateForm();
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors || {});
      return;
    }
    setError("");
    setFieldErrors({});
    setSaving(true);
    try {
      const payload = buildPayload();
      const inv = await portalApi.createInvoice(payload);
      setCreatedInvoice(inv);
      if (andDownloadPdf) {
        await downloadWithoutAuth(portalApi.invoicePdfUrl(inv.id), `${inv.invoiceNumber}.pdf`);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
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
      const c = await portalApi.createCustomer({
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
      const v = await portalApi.createVehicle({
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
      const d = await portalApi.createDriver({
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

  function handleWhatsApp() {
    const inv = createdInvoice;
    const customer = inv?.customer;
    const phone = customer?.phone;
    if (!phone) {
      setError("Customer phone not available for WhatsApp.");
      return;
    }
    const companyName = company?.companyName || "Our Company";
    const customerName = customer?.name || "Customer";
    const message = [
      `Hello ${customerName},`,
      "",
      `Thank you for choosing ${companyName}.`,
      "",
      "Trip Details",
      `From: ${inv.tripFrom}`,
      `To: ${inv.tripTo}`,
      "",
      `Total Amount: ₹${Number(inv.amount).toFixed(2)}`,
      "",
      "Your invoice has been generated.",
      "",
      "Regards",
      companyName
    ].join("\n");
    const encoded = encodeURIComponent(message);
    const num = formatPhoneForWhatsApp(phone);
    if (!num) {
      setError("Invalid phone number for WhatsApp.");
      return;
    }
    window.open(`https://wa.me/${num}?text=${encoded}`, "_blank", "noopener,noreferrer");
  }

  function getLogoUrl(logoUrl) {
    if (!logoUrl) return null;
    if (logoUrl.startsWith("http")) return logoUrl;
    return `${API_BASE_URL}${logoUrl.startsWith("/") ? "" : "/"}${logoUrl}`;
  }

  if (createdInvoice) {
    const inv = createdInvoice;
    return (
      <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-lg">
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Invoice created</h2>
            <p className="mt-2 text-sm text-gray-600">Invoice number: {inv.invoiceNumber}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                onClick={() => downloadWithoutAuth(portalApi.invoicePdfUrl(inv.id), `${inv.invoiceNumber}.pdf`)}
              >
                Download PDF
              </Button>
              <Button variant="secondary" onClick={handleWhatsApp}>
                Send via WhatsApp
              </Button>
            </div>
            <div className="mt-6">
              <Button variant="ghost" onClick={() => {
                setCreatedInvoice(null);
                setShowForm(false);
                setForm({
                  customerId: "", vehicleId: "", driverId: "", tripFrom: "", tripTo: "", pickupDateTime: "", dropDateTime: "",
                  openingKm: "", closingKm: "", parkingCharges: 0, tollCharges: 0, amount: "", amountReceived: 0
                });
                setFieldErrors({});
                setCustomerSearch("");
                setVehicleSearch("");
                setDriverSearch("");
              }}>
                Create another invoice
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {companyError ? (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{companyError}</div>
        ) : null}

        {!showForm ? (
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200 text-center">
            {company ? (
              <>
                {company.logoUrl ? (
                  <img
                    src={getLogoUrl(company.logoUrl)}
                    alt={company.companyName}
                    className="mx-auto h-24 w-auto object-contain"
                  />
                ) : (
                  <div className="mx-auto h-24 w-24 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-sm">Logo</div>
                )}
                <h1 className="mt-4 text-xl font-semibold text-gray-900">{company.companyName || "Company"}</h1>
              </>
            ) : (
              <div className="text-sm text-gray-500">Loading company…</div>
            )}
            <div className="mt-8">
              <Button
                onClick={() => setShowForm(true)}
                disabled={!company}
                className="w-full sm:w-auto min-w-[200px]"
              >
                Create Invoice
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              {company?.logoUrl ? (
                <img src={getLogoUrl(company.logoUrl)} alt={company.companyName} className="h-12 w-auto object-contain" />
              ) : null}
              <span className="text-lg font-semibold text-gray-900">{company?.companyName || "Create Invoice"}</span>
            </div>

            {error ? (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
            ) : null}

            {loading ? (
              <div className="text-sm text-gray-600">Loading…</div>
            ) : (
              <div className="rounded-xl bg-white p-4 sm:p-6 shadow-sm ring-1 ring-gray-200 space-y-6">
                {/* Customer */}
                <div>
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
                            {c.phone ? <span className="ml-2 text-xs text-gray-500">{c.phone}</span> : null}
                          </button>
                        ))}
                        {customerOpen && filteredCustomers.length === 0 && customerSearch.trim() && (
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

                {/* Vehicle */}
                <div>
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
                        {vehicleOpen && filteredVehicles.length === 0 && vehicleSearch.trim() && (
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

                {/* Driver */}
                <div>
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
                            {d.phone ? <span className="ml-2 text-xs text-gray-500">{d.phone}</span> : null}
                          </button>
                        ))}
                        {driverOpen && filteredDrivers.length === 0 && driverSearch.trim() && (
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

                {/* Trip details */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Trip details</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="From" value={form.tripFrom} onChange={(e) => { setForm((f) => ({ ...f, tripFrom: e.target.value })); setFieldErrors((p) => ({ ...p, tripFrom: undefined })); }} placeholder="Trip from" error={fieldErrors.tripFrom} />
                    <Input label="To" value={form.tripTo} onChange={(e) => { setForm((f) => ({ ...f, tripTo: e.target.value })); setFieldErrors((p) => ({ ...p, tripTo: undefined })); }} placeholder="Trip to" error={fieldErrors.tripTo} />
                    <Input
                      label="Pickup Date & Time"
                      type="datetime-local"
                      value={form.pickupDateTime}
                      onChange={(e) => { setForm((f) => ({ ...f, pickupDateTime: e.target.value })); setFieldErrors((p) => ({ ...p, pickupDateTime: undefined, dropDateTime: undefined })); }}
                      error={fieldErrors.pickupDateTime}
                    />
                    <Input
                      label="Drop Date & Time"
                      type="datetime-local"
                      value={form.dropDateTime}
                      onChange={(e) => { setForm((f) => ({ ...f, dropDateTime: e.target.value })); setFieldErrors((p) => ({ ...p, dropDateTime: undefined })); }}
                      error={fieldErrors.dropDateTime}
                    />
                    <Input label="Opening KM" type="number" min={0} value={form.openingKm} onChange={(e) => { setForm((f) => ({ ...f, openingKm: e.target.value })); setFieldErrors((p) => ({ ...p, openingKm: undefined, closingKm: undefined })); }} error={fieldErrors.openingKm} />
                    <Input label="Closing KM" type="number" min={0} value={form.closingKm} onChange={(e) => { setForm((f) => ({ ...f, closingKm: e.target.value })); setFieldErrors((p) => ({ ...p, closingKm: undefined })); }} error={fieldErrors.closingKm} />
                  </div>
                  {totalKm !== null && Number.isFinite(totalKm) ? (
                    <p className="mt-2 text-sm text-gray-600">Total KM: <strong>{totalKm}</strong></p>
                  ) : null}
                </div>

                {/* Charges */}
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Charges</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Parking" type="number" min={0} value={form.parkingCharges} onChange={(e) => setForm((f) => ({ ...f, parkingCharges: e.target.value }))} />
                    <Input label="Toll" type="number" min={0} value={form.tollCharges} onChange={(e) => setForm((f) => ({ ...f, tollCharges: e.target.value }))} />
                    <Input label="Total Amount" type="number" min={0} value={form.amount} onChange={(e) => { setForm((f) => ({ ...f, amount: e.target.value })); setFieldErrors((p) => ({ ...p, amount: undefined, amountReceived: undefined })); }} error={fieldErrors.amount} />
                    <Input label="Amount Received" type="number" min={0} value={form.amountReceived} onChange={(e) => { setForm((f) => ({ ...f, amountReceived: e.target.value })); setFieldErrors((p) => ({ ...p, amountReceived: undefined })); }} error={fieldErrors.amountReceived} />
                  </div>
                  {balanceAmount !== null && Number.isFinite(balanceAmount) ? (
                    <p className="mt-2 text-sm text-gray-600">Balance Amount: <strong>₹{balanceAmount.toFixed(2)}</strong></p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                  <Button onClick={() => handleSaveInvoice(false)} disabled={saving}>
                    {saving ? "Saving…" : "Save Invoice"}
                  </Button>
                  <Button variant="secondary" onClick={() => handleSaveInvoice(true)} disabled={saving}>
                    {saving ? "Saving…" : "Save & Generate PDF"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowForm(false)}>Back</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
