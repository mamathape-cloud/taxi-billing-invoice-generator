import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Card, PageTitle } from "../components/ui.jsx";

function inr(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n || 0));
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [company, setCompany] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [dailyRevenue, setDailyRevenue] = useState(null);
  const [dailyError, setDailyError] = useState("");
  const [dailyLoading, setDailyLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([api.getDashboard(), api.getCompany()])
      .then(([d, c]) => {
        if (!alive) return;
        setData(d);
        setCompany(c || null);
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setDailyLoading(true);
    setDailyError("");
    api
      .getDashboardDaily(selectedDate)
      .then((d) => {
        if (!alive) return;
        setDailyRevenue(d.totalRevenueForDate);
      })
      .catch((e) => {
        if (!alive) return;
        setDailyError(e.message || "Could not load daily revenue.");
        setDailyRevenue(null);
      })
      .finally(() => {
        if (!alive) return;
        setDailyLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedDate]);

  return (
    <div>
      <PageTitle title="Dashboard" />

      <div className="mb-4 rounded-xl bg-white p-6 ring-1 ring-gray-200">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1 flex justify-center md:justify-start">
            {company?.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company?.companyName || "Company logo"}
                className="h-32 w-auto max-w-xs object-contain"
              />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-md bg-gray-100 text-sm font-medium text-gray-600">
                Logo here
              </div>
            )}
          </div>

          <div className="flex-[2] text-left">
            <span className="block text-sm text-gray-500">Welcome,</span>
            <span className="mt-1 block text-xl font-semibold text-gray-900">
              {company?.companyName || "Your Company"}
            </span>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
      ) : null}

      {!data ? (
        <div className="text-sm text-gray-600">Loading dashboard…</div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
            <label className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
              <span className="font-medium">Revenue on date</span>
              <input
                type="date"
                className="rounded-lg border-gray-300 text-sm shadow-sm focus:border-blue-600 focus:ring-blue-600"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </label>
            <div className="text-sm text-gray-800">
              Total revenue this day:{" "}
              <span className="font-semibold text-gray-900">
                {dailyLoading ? "Loading…" : inr(dailyRevenue)}
              </span>
              {dailyError ? (
                <span className="ml-2 text-xs text-red-600">({dailyError})</span>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card title="Total Revenue This Month" value={inr(data.cards.totalRevenueThisMonth)} />
            <Card title="Total Pending Payments" value={inr(data.cards.totalPendingPayments)} />
            <Card title="Total Trips This Month" value={data.cards.totalTripsThisMonth} />
            <Card title="Total Customers" value={data.cards.totalCustomers} />
            <Card title="Total Vehicles" value={data.cards.totalVehicles} />
          </div>
        </>
      )}
    </div>
  );
}

