import express from "express";
import { query, validationResult } from "express-validator";
import { prisma } from "../prisma.js";
import PDFDocument from "pdfkit";

export const reportsRouter = express.Router();

/** Full text for CSV; description or legacy trip route */
function invoiceDescriptionExport(inv) {
  const d = inv.description && String(inv.description).trim();
  if (d) return d;
  const tf = inv.tripFrom;
  const tt = inv.tripTo;
  if (tf && tt && tf !== "-") return `${tf} → ${tt}`;
  return "";
}

/** Single-line for PDF table cells */
function invoiceDescriptionPdfCell(inv) {
  const full = invoiceDescriptionExport(inv);
  if (!full) return "";
  return full.length > 42 ? `${full.slice(0, 39)}...` : full;
}

function monthRangeUTC(year, month1to12) {
  const from = new Date(Date.UTC(year, month1to12 - 1, 1));
  const to = new Date(Date.UTC(year, month1to12, 1));
  return { from, to };
}

async function buildYearlyAggregates(year) {
  const months = await Promise.all(
    Array.from({ length: 12 }, (_, idx) => idx + 1).map(async (m) => {
      const { from, to } = monthRangeUTC(year, m);
      const agg = await prisma.invoice.aggregate({
        where: { journeyDate: { gte: from, lt: to } },
        _sum: { amount: true, amountReceived: true, balanceAmount: true },
        _count: { id: true }
      });
      return {
        month: m,
        revenue: Number(agg._sum.amount || 0),
        collected: Number(agg._sum.amountReceived || 0),
        pending: Number(agg._sum.balanceAmount || 0),
        trips: agg._count.id
      };
    })
  );

  const totals = months.reduce(
    (acc, m) => {
      acc.totalRevenue += m.revenue;
      acc.totalCollected += m.collected;
      acc.totalPending += m.pending;
      acc.totalTrips += m.trips;
      return acc;
    },
    { totalRevenue: 0, totalCollected: 0, totalPending: 0, totalTrips: 0 }
  );

  return { months, totals };
}

reportsRouter.get(
  "/monthly",
  query("month").isInt({ min: 1, max: 12 }).toInt(),
  query("year").isInt({ min: 2000, max: 2100 }).toInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const month = req.query.month;
    const year = req.query.year;
    const { from, to } = monthRangeUTC(year, month);

    const [agg, invoices] = await Promise.all([
      prisma.invoice.aggregate({
        where: { journeyDate: { gte: from, lt: to } },
        _sum: { amount: true, amountReceived: true, balanceAmount: true },
        _count: { id: true }
      }),
      prisma.invoice.findMany({
        where: { journeyDate: { gte: from, lt: to } },
        select: { journeyDate: true, amount: true }
      })
    ]);

    // Day-wise revenue for the selected month
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const revenueByDay = Array.from({ length: daysInMonth }, () => 0);
    for (const inv of invoices) {
      const d = new Date(inv.journeyDate).getUTCDate(); // 1..days
      revenueByDay[d - 1] += Number(inv.amount);
    }

    return res.json({
      month,
      year,
      totals: {
        totalRevenue: Number(agg._sum.amount || 0),
        totalCollected: Number(agg._sum.amountReceived || 0),
        totalPending: Number(agg._sum.balanceAmount || 0),
        totalTrips: agg._count.id
      },
      charts: {
        revenueByDay
      }
    });
  }
);

reportsRouter.get(
  "/monthly/export.csv",
  query("month").isInt({ min: 1, max: 12 }).toInt(),
  query("year").isInt({ min: 2000, max: 2100 }).toInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const month = req.query.month;
    const year = req.query.year;
    const { from, to } = monthRangeUTC(year, month);

    const invoices = await prisma.invoice.findMany({
      where: { journeyDate: { gte: from, lt: to } },
      include: { customer: true, vehicle: true, driver: true },
      orderBy: { journeyDate: "asc" }
    });

    const header = [
      "InvoiceNumber",
      "Date",
      "Customer",
      "Vehicle",
      "Driver",
      "Description",
      "TotalAmount",
      "Received",
      "Balance",
      "Status"
    ];

    let totalAmount = 0;
    let totalReceived = 0;
    let totalBalance = 0;

    const rows = invoices.map((i) => {
      const amt = Number(i.amount || 0);
      const rec = Number(i.amountReceived || 0);
      const bal = Number(i.balanceAmount || 0);
      totalAmount += amt;
      totalReceived += rec;
      totalBalance += bal;
      return [
        i.invoiceNumber,
        new Date(i.journeyDate).toISOString().slice(0, 10),
        i.customer?.name || "",
        i.vehicle?.vehicleNumber || "",
        i.driver?.name || "",
        invoiceDescriptionExport(i),
        amt.toFixed(2),
        rec.toFixed(2),
        bal.toFixed(2),
        i.paymentStatus
      ];
    });

    const totalRow = [
      "TOTAL",
      "",
      "",
      "",
      "",
      "",
      totalAmount.toFixed(2),
      totalReceived.toFixed(2),
      totalBalance.toFixed(2),
      ""
    ];

    const csv = [header, ...rows, totalRow]
      .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="monthly-report-${year}-${month}.csv"`);
    return res.send(csv);
  }
);

reportsRouter.get(
  "/monthly/export.pdf",
  query("month").isInt({ min: 1, max: 12 }).toInt(),
  query("year").isInt({ min: 2000, max: 2100 }).toInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const month = req.query.month;
    const year = req.query.year;
    const { from, to } = monthRangeUTC(year, month);

    const [agg, invoices] = await Promise.all([
      prisma.invoice.aggregate({
        where: { journeyDate: { gte: from, lt: to } },
        _sum: { amount: true, amountReceived: true, balanceAmount: true },
        _count: { id: true }
      }),
      prisma.invoice.findMany({
        where: { journeyDate: { gte: from, lt: to } },
        include: { customer: true, vehicle: true, driver: true },
        orderBy: { journeyDate: "asc" }
      })
    ]);

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    const done = new Promise((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    doc.font("Helvetica-Bold").fontSize(16).text("Monthly Revenue Report", { align: "center" });
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(10).text(`Month: ${month}/${year}`, { align: "center" });
    doc.moveDown(1.5);

    const totals = {
      totalRevenue: Number(agg._sum.amount || 0),
      totalCollected: Number(agg._sum.amountReceived || 0),
      totalPending: Number(agg._sum.balanceAmount || 0),
      totalTrips: agg._count.id
    };

    doc.font("Helvetica-Bold").fontSize(12).text("Summary");
    doc.moveDown(0.6);
    doc.font("Helvetica").fontSize(11);
    doc.text(`Total Revenue: ${totals.totalRevenue.toFixed(2)}`);
    doc.text(`Total Collected: ${totals.totalCollected.toFixed(2)}`);
    doc.text(`Total Pending: ${totals.totalPending.toFixed(2)}`);
    doc.text(`Total Trips: ${totals.totalTrips}`);

    doc.moveDown(1.5);

    // Detailed invoice table
    const tableTop = doc.y;
    const xStart = 40;

    const columns = [
      { key: "invoice", label: "Invoice", width: 42 },
      { key: "date", label: "Date", width: 40 },
      { key: "customer", label: "Customer", width: 58 },
      { key: "vehicle", label: "Vehicle", width: 42 },
      { key: "driver", label: "Driver", width: 50 },
      { key: "description", label: "Description", width: 66 },
      { key: "total", label: "Total", width: 36 },
      { key: "received", label: "Received", width: 36 },
      { key: "balance", label: "Balance", width: 36 },
      { key: "status", label: "Status", width: 44 }
    ];

    function drawTableHeader(y) {
      doc.font("Helvetica-Bold").fontSize(8);
      let x = xStart;
      for (const col of columns) {
        doc.text(col.label, x, y, { width: col.width, align: "left" });
        x += col.width + 4;
      }
      doc.moveTo(xStart, y - 2).lineTo(x - 4, y - 2).stroke();
    }

    function drawRow(row, y) {
      doc.font("Helvetica").fontSize(8);
      let x = xStart;
      for (const col of columns) {
        doc.text(String(row[col.key] ?? ""), x, y, {
          width: col.width,
          align: col.key === "total" || col.key === "received" || col.key === "balance" ? "right" : "left"
        });
        x += col.width + 4;
      }
    }

    let y = tableTop;
    drawTableHeader(y);
    y += 12;

    for (const inv of invoices) {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 50;
        drawTableHeader(y);
        y += 12;
      }

      const row = {
        invoice: inv.invoiceNumber,
        date: new Date(inv.journeyDate).toISOString().slice(0, 10),
        customer: inv.customer?.name || "",
        vehicle: inv.vehicle?.vehicleNumber || "",
        driver: inv.driver?.name || "",
        description: invoiceDescriptionPdfCell(inv),
        total: Number(inv.amount || 0).toFixed(2),
        received: Number(inv.amountReceived || 0).toFixed(2),
        balance: Number(inv.balanceAmount || 0).toFixed(2),
        status: inv.paymentStatus
      };

      drawRow(row, y);
      y += 12;
    }

    // Totals row
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 50;
      drawTableHeader(y);
      y += 12;
    }

    doc.font("Helvetica-Bold").fontSize(8);
    let x = xStart;
    const totalsLabelWidth =
      columns.slice(0, 6).reduce((acc, col) => acc + col.width + 4, 0) - 4;
    doc.text("TOTALS", x, y, { width: totalsLabelWidth, align: "right" });
    x = xStart;
    for (const col of columns) {
      if (col.key === "total") {
        doc.text(totals.totalRevenue.toFixed(2), x, y, { width: col.width, align: "right" });
      } else if (col.key === "received") {
        doc.text(totals.totalCollected.toFixed(2), x, y, { width: col.width, align: "right" });
      } else if (col.key === "balance") {
        doc.text(totals.totalPending.toFixed(2), x, y, { width: col.width, align: "right" });
      }
      x += col.width + 4;
    }

    doc.moveDown(2);
    doc.font("Helvetica").fontSize(9).fillColor("#6B7280");
    doc.text("Generated by Taxi Billing System", { align: "center" });

    doc.end();
    const pdf = await done;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="monthly-report-${year}-${month}.pdf"`);
    return res.send(pdf);
  }
);

reportsRouter.get(
  "/yearly",
  query("year").isInt({ min: 2000, max: 2100 }).toInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const year = req.query.year;
    const aggregates = await buildYearlyAggregates(year);
    return res.json({ year, ...aggregates });
  }
);

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

reportsRouter.get(
  "/yearly/export.csv",
  query("year").isInt({ min: 2000, max: 2100 }).toInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const year = req.query.year;
    const { months, totals } = await buildYearlyAggregates(year);

    const header = ["Month", "Revenue", "Collected", "Pending", "TotalTrips"];
    const rows = months.map((m) => [
      MONTH_LABELS[m.month - 1],
      m.revenue.toFixed(2),
      m.collected.toFixed(2),
      m.pending.toFixed(2),
      String(m.trips)
    ]);
    const totalRow = [
      "TOTAL",
      totals.totalRevenue.toFixed(2),
      totals.totalCollected.toFixed(2),
      totals.totalPending.toFixed(2),
      String(totals.totalTrips)
    ];

    const csv = [header, ...rows, totalRow]
      .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="yearly-report-${year}.csv"`);
    return res.send(csv);
  }
);

reportsRouter.get(
  "/yearly/export.pdf",
  query("year").isInt({ min: 2000, max: 2100 }).toInt(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const year = req.query.year;
    const { months, totals } = await buildYearlyAggregates(year);

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    const done = new Promise((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    doc.font("Helvetica-Bold").fontSize(16).text("Yearly Revenue Report", { align: "center" });
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(10).text(`Year: ${year}`, { align: "center" });
    doc.moveDown(1.5);

    doc.font("Helvetica-Bold").fontSize(12).text("Summary");
    doc.moveDown(0.6);
    doc.font("Helvetica").fontSize(11);
    doc.text(`Total Revenue: ${totals.totalRevenue.toFixed(2)}`);
    doc.text(`Total Collected: ${totals.totalCollected.toFixed(2)}`);
    doc.text(`Total Pending: ${totals.totalPending.toFixed(2)}`);
    doc.text(`Total Trips: ${totals.totalTrips}`);

    doc.moveDown(1.5);

    const tableTop = doc.y;
    const xStart = 40;
    const columns = [
      { key: "month", label: "Month", width: 70 },
      { key: "revenue", label: "Revenue", width: 70 },
      { key: "collected", label: "Collected", width: 70 },
      { key: "pending", label: "Pending", width: 70 },
      { key: "trips", label: "Total Trips", width: 70 }
    ];

    function drawYearlyHeader(y) {
      doc.font("Helvetica-Bold").fontSize(9);
      let x = xStart;
      for (const col of columns) {
        doc.text(col.label, x, y, { width: col.width, align: "left" });
        x += col.width + 6;
      }
      doc.moveTo(xStart, y - 2).lineTo(x - 6, y - 2).stroke();
    }

    function drawYearlyRow(row, y) {
      doc.font("Helvetica").fontSize(9);
      let x = xStart;
      for (const col of columns) {
        const alignRight = ["revenue", "collected", "pending"].includes(col.key);
        doc.text(String(row[col.key] ?? ""), x, y, {
          width: col.width,
          align: alignRight ? "right" : "left"
        });
        x += col.width + 6;
      }
    }

    let y = tableTop;
    drawYearlyHeader(y);
    y += 14;

    for (const m of months) {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 50;
        drawYearlyHeader(y);
        y += 14;
      }

      const row = {
        month: MONTH_LABELS[m.month - 1],
        revenue: m.revenue.toFixed(2),
        collected: m.collected.toFixed(2),
        pending: m.pending.toFixed(2),
        trips: String(m.trips)
      };
      drawYearlyRow(row, y);
      y += 14;
    }

    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 50;
      drawYearlyHeader(y);
      y += 14;
    }

    doc.font("Helvetica-Bold").fontSize(9);
    let x = xStart;
    doc.text("TOTALS", x, y, { width: columns[0].width, align: "left" });
    x += columns[0].width + 6;
    doc.text(totals.totalRevenue.toFixed(2), x, y, { width: columns[1].width, align: "right" });
    x += columns[1].width + 6;
    doc.text(totals.totalCollected.toFixed(2), x, y, { width: columns[2].width, align: "right" });
    x += columns[2].width + 6;
    doc.text(totals.totalPending.toFixed(2), x, y, { width: columns[3].width, align: "right" });
    x += columns[3].width + 6;
    doc.text(String(totals.totalTrips), x, y, { width: columns[4].width, align: "right" });

    doc.moveDown(2);
    doc.font("Helvetica").fontSize(9).fillColor("#6B7280");
    doc.text("Generated by Taxi Billing System", { align: "center" });

    doc.end();
    const pdf = await done;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="yearly-report-${year}.pdf"`);
    return res.send(pdf);
  }
);

