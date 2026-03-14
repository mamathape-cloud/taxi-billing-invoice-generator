import React from "react";

export function Button({ variant = "primary", className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50";
  const v =
    variant === "primary"
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : variant === "secondary"
        ? "bg-gray-100 text-gray-900 hover:bg-gray-200"
        : variant === "danger"
          ? "bg-red-600 text-white hover:bg-red-700"
          : "bg-white text-gray-900 ring-1 ring-gray-300 hover:bg-gray-50";
  return <button className={`${base} ${v} ${className}`} {...props} />;
}

export function Input({ label, className = "", error, ...props }) {
  const hasError = error && String(error).trim();
  return (
    <label className="block">
      {label ? <div className="mb-1 text-sm font-medium text-gray-700">{label}</div> : null}
      <input
        className={`block w-full rounded-lg shadow-sm focus:ring-2 ${hasError ? "border-red-500 ring-2 ring-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-blue-600 focus:ring-blue-600"} ${className}`}
        {...props}
      />
      {hasError ? <div className="mt-1 text-sm text-red-600">{error}</div> : null}
    </label>
  );
}

export function TextArea({ label, className = "", error, ...props }) {
  const hasError = error && String(error).trim();
  return (
    <label className="block">
      {label ? <div className="mb-1 text-sm font-medium text-gray-700">{label}</div> : null}
      <textarea
        className={`block w-full rounded-lg shadow-sm focus:ring-2 ${hasError ? "border-red-500 ring-2 ring-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-blue-600 focus:ring-blue-600"} ${className}`}
        {...props}
      />
      {hasError ? <div className="mt-1 text-sm text-red-600">{error}</div> : null}
    </label>
  );
}

export function Select({ label, className = "", children, error, ...props }) {
  const hasError = error && String(error).trim();
  return (
    <label className="block">
      {label ? <div className="mb-1 text-sm font-medium text-gray-700">{label}</div> : null}
      <select
        className={`block w-full rounded-lg shadow-sm focus:ring-2 ${hasError ? "border-red-500 ring-2 ring-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300 focus:border-blue-600 focus:ring-blue-600"} ${className}`}
        {...props}
      >
        {children}
      </select>
      {hasError ? <div className="mt-1 text-sm text-red-600">{error}</div> : null}
    </label>
  );
}

export function Card({ title, value, subtitle }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="text-sm font-medium text-gray-600">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
      {subtitle ? <div className="mt-1 text-xs text-gray-500">{subtitle}</div> : null}
    </div>
  );
}

export function StatusBadge({ status }) {
  const s = String(status || "").toUpperCase();
  const cls =
    s === "FULL"
      ? "bg-green-50 text-green-700 ring-green-200"
      : s === "PARTIAL"
        ? "bg-orange-50 text-orange-700 ring-orange-200"
        : "bg-red-50 text-red-700 ring-red-200";
  const label = s === "FULL" ? "Paid" : s === "PARTIAL" ? "Partial" : "Pending";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${cls}`}>
      {label}
    </span>
  );
}

export function PageTitle({ title, right }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="text-lg font-semibold text-gray-900">{title}</div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}

