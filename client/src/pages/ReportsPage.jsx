import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { downloadWithAuth } from "../lib/download";
import { Button, Card, Input, PageTitle, Select, StatusBadge } from "../components/ui.jsx";

function inr(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n || 0));
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const TABS = [
  { id: "daily", label: "Daily" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" }
];

function tabFromParam(v) {
  if (v === "daily" || v === "monthly" || v === "yearly") return v;
  return "daily";
}

export default function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = tabFromParam(searchParams.get("tab"));

  const now = new Date();
  const defaultDate = () => {
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [dailyDate, setDailyDate] = useState(defaultDate);
  const [dailyData, setDailyData] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState("");

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [monthlyData, setMonthlyData] = useState(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyError, setMonthlyError] = useState("");

  const [yearlyYear, setYearlyYear] = useState(now.getFullYear());
  const [yearlyData, setYearlyData] = useState(null);
  const [yearlyLoading, setYearlyLoading] = useState(false);
  const [yearlyError, setYearlyError] = useState("");

  function setTab(next) {
    setSearchParams({ tab: next });
  }

  async function loadDaily() {
    setDailyLoading(true);
    setDailyError("");
    try {
      setDailyData(await api.dailyReport(dailyDate));
    } catch (e) {
      setDailyError(e.message);
      setDailyData(null);
    } finally {
      setDailyLoading(false);
    }
  }

  async function loadMonthly() {
    setMonthlyLoading(true);
    setMonthlyError("");
    try {
      setMonthlyData(await api.monthlyReport(month, year));
    } catch (e) {
      setMonthlyError(e.message);
      setMonthlyData(null);
    } finally {
      setMonthlyLoading(false);
    }
  }

  async function loadYearly() {
    setYearlyLoading(true);
    setYearlyError("");
    try {
      setYearlyData(await api.yearlyReport(yearlyYear));
    } catch (e) {
      setYearlyError(e.message);
      setYearlyData(null);
    } finally {
      setYearlyLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "daily") loadDaily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab === "monthly") loadMonthly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div>
      <PageTitle title="Reports" />

      <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              "rounded-lg px-4 py-2 text-sm font-medium",
              tab === t.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "daily" ? (
        <div>
          <div className="mb-6 flex flex-wrap items-end gap-3">
            <Input label="Date" type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} />
            <Button variant="secondary" onClick={loadDaily} disabled={dailyLoading}>
              {dailyLoading ? "Loading…" : "Apply"}
            </Button>
          </div>
          {dailyError ? (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{dailyError}</div>
          ) : null}
          {!dailyData ? (
            <div className="text-sm text-gray-600">{dailyLoading ? "Loading…" : "Select a date and click Apply."}</div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card title="Total Revenue" value={inr(dailyData.totals.totalRevenue)} />
                <Card title="Total Collected" value={inr(dailyData.totals.totalCollected)} />
                <Card title="Total Pending" value={inr(dailyData.totals.totalPending)} />
                <Card title="Invoices" value={dailyData.totals.totalTrips} />
              </div>
              <div className="mt-6 overflow-x-auto rounded-xl ring-1 ring-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Invoice</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Customer</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">Amount</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">Received</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600">Balance</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {dailyData.invoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 text-gray-600">
                          No invoices for this date.
                        </td>
                      </tr>
                    ) : (
                      dailyData.invoices.map((i) => (
                        <tr key={i.id}>
                          <td className="px-4 py-3 font-medium text-gray-900">{i.invoiceNumber}</td>
                          <td className="px-4 py-3 text-gray-700">{i.customerName || "—"}</td>
                          <td className="px-4 py-3 text-right">{inr(i.amount)}</td>
                          <td className="px-4 py-3 text-right">{inr(i.amountReceived)}</td>
                          <td className="px-4 py-3 text-right">{inr(i.balanceAmount)}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={i.paymentStatus} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : null}

      {tab === "monthly" ? (
        <div>
          <PageTitle
            title="Monthly summary"
            right={
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={loadMonthly} disabled={monthlyLoading}>
                  Apply
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    downloadWithAuth(api.monthlyReportCsvUrl(month, year), `monthly-report-${year}-${month}.csv`)
                  }
                >
                  Export CSV
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    downloadWithAuth(api.monthlyReportPdfUrl(month, year), `monthly-report-${year}-${month}.pdf`)
                  }
                >
                  Export PDF
                </Button>
              </div>
            }
          />
          {monthlyError ? (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{monthlyError}</div>
          ) : null}
          <div className="mb-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <Select label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTH_LABELS.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </Select>
            <Input label="Year" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
          {!monthlyData ? (
            <div className="text-sm text-gray-600">{monthlyLoading ? "Loading…" : "No data."}</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card title="Total Revenue" value={inr(monthlyData.totals.totalRevenue)} />
              <Card title="Total Collected" value={inr(monthlyData.totals.totalCollected)} />
              <Card title="Total Pending" value={inr(monthlyData.totals.totalPending)} />
              <Card title="Total Trips" value={monthlyData.totals.totalTrips} />
            </div>
          )}
        </div>
      ) : null}

      {tab === "yearly" ? (
        <div>
          <PageTitle
            title="Yearly summary"
            right={
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={loadYearly} disabled={yearlyLoading}>
                  Apply
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    downloadWithAuth(api.yearlyReportCsvUrl(yearlyYear), `yearly-report-${yearlyYear}.csv`)
                  }
                >
                  Export CSV
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    downloadWithAuth(api.yearlyReportPdfUrl(yearlyYear), `yearly-report-${yearlyYear}.pdf`)
                  }
                >
                  Export PDF
                </Button>
              </div>
            }
          />
          {yearlyError ? (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{yearlyError}</div>
          ) : null}
          <div className="mb-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <Input
              label="Year"
              type="number"
              value={yearlyYear}
              onChange={(e) => setYearlyYear(Number(e.target.value))}
            />
          </div>
          {!yearlyData ? (
            <div className="text-sm text-gray-600">
              {yearlyLoading ? "Loading…" : "Select a year and click Apply."}
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card title="Total Revenue" value={inr(yearlyData.totals.totalRevenue)} />
                <Card title="Total Collected" value={inr(yearlyData.totals.totalCollected)} />
                <Card title="Total Pending" value={inr(yearlyData.totals.totalPending)} />
                <Card title="Total Trips" value={yearlyData.totals.totalTrips} />
              </div>
              <div className="mt-6 overflow-x-auto rounded-xl bg-gray-50 p-4 ring-1 ring-gray-200">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-100 text-gray-700">
                      <th className="px-3 py-2 font-medium">Month</th>
                      <th className="px-3 py-2 text-right font-medium">Revenue</th>
                      <th className="px-3 py-2 text-right font-medium">Collected</th>
                      <th className="px-3 py-2 text-right font-medium">Pending</th>
                      <th className="px-3 py-2 text-right font-medium">Total Trips</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlyData.months.map((m) => (
                      <tr key={m.month} className="border-b border-gray-200">
                        <td className="px-3 py-2">{MONTH_LABELS[m.month - 1]}</td>
                        <td className="px-3 py-2 text-right">{inr(m.revenue)}</td>
                        <td className="px-3 py-2 text-right">{inr(m.collected)}</td>
                        <td className="px-3 py-2 text-right">{inr(m.pending)}</td>
                        <td className="px-3 py-2 text-right">{m.trips}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-300 font-semibold">
                      <td className="px-3 py-2">TOTAL</td>
                      <td className="px-3 py-2 text-right">{inr(yearlyData.totals.totalRevenue)}</td>
                      <td className="px-3 py-2 text-right">{inr(yearlyData.totals.totalCollected)}</td>
                      <td className="px-3 py-2 text-right">{inr(yearlyData.totals.totalPending)}</td>
                      <td className="px-3 py-2 text-right">{yearlyData.totals.totalTrips}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
