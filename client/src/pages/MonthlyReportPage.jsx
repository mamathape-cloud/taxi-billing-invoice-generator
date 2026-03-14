import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { downloadWithAuth } from "../lib/download";
import { Button, Card, Input, PageTitle, Select } from "../components/ui.jsx";

function inr(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n || 0));
}

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function MonthlyReportPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [yearlyYear, setYearlyYear] = useState(now.getFullYear());
  const [yearlyData, setYearlyData] = useState(null);
  const [yearlyLoading, setYearlyLoading] = useState(false);
  const [yearlyError, setYearlyError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await api.monthlyReport(month, year));
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

  async function loadYearly() {
    setYearlyLoading(true);
    setYearlyError("");
    try {
      const result = await api.yearlyReport(yearlyYear);
      setYearlyData(result);
    } catch (e) {
      setYearlyError(e.message);
    } finally {
      setYearlyLoading(false);
    }
  }

  return (
    <div>
      <PageTitle
        title="Monthly Report"
        right={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={load} disabled={loading}>
              Apply
            </Button>
            <Button
              variant="ghost"
              onClick={() => downloadWithAuth(api.monthlyReportCsvUrl(month, year), `monthly-report-${year}-${month}.csv`)}
            >
              Export CSV
            </Button>
            <Button
              variant="ghost"
              onClick={() => downloadWithAuth(api.monthlyReportPdfUrl(month, year), `monthly-report-${year}-${month}.pdf`)}
            >
              Export PDF
            </Button>
          </div>
        }
      />

      {error ? (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
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

      {!data ? (
        <div className="text-sm text-gray-600">{loading ? "Loading…" : "No data."}</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card title="Total Revenue" value={inr(data.totals.totalRevenue)} />
            <Card title="Total Collected" value={inr(data.totals.totalCollected)} />
            <Card title="Total Pending" value={inr(data.totals.totalPending)} />
            <Card title="Total Trips" value={data.totals.totalTrips} />
          </div>

          <div className="mt-8">
            <PageTitle
              title="Yearly Report"
              right={
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={loadYearly} disabled={yearlyLoading}>
                    Apply
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      downloadWithAuth(
                        api.yearlyReportCsvUrl(yearlyYear),
                        `yearly-report-${yearlyYear}.csv`
                      )
                    }
                  >
                    Export CSV
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      downloadWithAuth(
                        api.yearlyReportPdfUrl(yearlyYear),
                        `yearly-report-${yearlyYear}.pdf`
                      )
                    }
                  >
                    Export PDF
                  </Button>
                </div>
              }
            />

            {yearlyError ? (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
                {yearlyError}
              </div>
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
                {yearlyLoading ? "Loading…" : "No data. Select a year and click Apply."}
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
        </>
      )}
    </div>
  );
}

