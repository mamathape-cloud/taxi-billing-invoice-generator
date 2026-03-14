import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button, Input, PageTitle, TextArea } from "../components/ui.jsx";

export default function CompanySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState({
    companyName: "",
    address: "",
    phone: "",
    email: "",
    gstNumber: "",
    logoUrl: "",
    signatureUrl: ""
  });

  useEffect(() => {
    let alive = true;
    api
      .getCompany()
      .then((c) => {
        if (!alive) return;
        setForm({
          companyName: c?.companyName || "",
          address: c?.address || "",
          phone: c?.phone || "",
          email: c?.email || "",
          gstNumber: c?.gstNumber || "",
          logoUrl: c?.logoUrl || "",
          signatureUrl: c?.signatureUrl || ""
        });
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  async function onUpload(type, file) {
    setError("");
    setOk("");
    try {
      const r = type === "logo" ? await api.uploadLogo(file) : await api.uploadSignature(file);
      setForm((f) => ({ ...f, [type === "logo" ? "logoUrl" : "signatureUrl"]: r.url }));
    } catch (e) {
      setError(e.message);
    }
  }

  async function onSave() {
    setSaving(true);
    setError("");
    setOk("");
    try {
      await api.saveCompany({
        ...form,
        gstNumber: form.gstNumber || null,
        logoUrl: form.logoUrl || null,
        signatureUrl: form.signatureUrl || null
      });
      setOk("Company settings saved.");
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageTitle
        title="Company Settings"
        right={
          <Button onClick={onSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save"}
          </Button>
        }
      />

      {error ? (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      ) : null}
      {ok ? (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 ring-1 ring-green-200">{ok}</div>
      ) : null}

      {loading ? (
        <div className="text-sm text-gray-600">Loading…</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
              <div className="text-sm font-semibold text-gray-900">Logo</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="relative h-16 w-32 overflow-hidden rounded-lg bg-white ring-1 ring-gray-200">
                  {form.logoUrl ? (
                    <>
                      <img src={form.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                      <button
                        type="button"
                        className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-semibold text-gray-600 shadow ring-1 ring-gray-300 hover:bg-gray-100"
                        onClick={() => setForm((f) => ({ ...f, logoUrl: "" }))}
                        aria-label="Remove logo"
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">No logo</div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => e.target.files?.[0] && onUpload("logo", e.target.files[0])}
                  />
                  <span className="text-xs text-gray-500">
                    {form.logoUrl ? "Logo uploaded" : "No file selected"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
              <div className="text-sm font-semibold text-gray-900">Signature (PNG)</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="relative h-16 w-32 overflow-hidden rounded-lg bg-white ring-1 ring-gray-200">
                  {form.signatureUrl ? (
                    <>
                      <img src={form.signatureUrl} alt="Signature" className="h-full w-full object-contain" />
                      <button
                        type="button"
                        className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-semibold text-gray-600 shadow ring-1 ring-gray-300 hover:bg-gray-100"
                        onClick={() => setForm((f) => ({ ...f, signatureUrl: "" }))}
                        aria-label="Remove signature"
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                      No signature
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <input type="file" accept="image/png" onChange={(e) => e.target.files?.[0] && onUpload("signature", e.target.files[0])} />
                  <span className="text-xs text-gray-500">
                    {form.signatureUrl ? "Signature uploaded" : "No file selected"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Company Name"
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
            />
            <TextArea
              label="Address"
              rows={3}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <Input
              label="GST Number (optional)"
              value={form.gstNumber}
              onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value }))}
            />
          </div>
        </div>
      )}
    </div>
  );
}

