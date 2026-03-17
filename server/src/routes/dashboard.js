import express from "express";
import { prisma } from "../prisma.js";

export const dashboardRouter = express.Router();

/*
Month range helper
*/
function monthRangeUTC(year, month1to12) {
  const from = new Date(Date.UTC(year, month1to12 - 1, 1));
  const to = new Date(Date.UTC(year, month1to12, 1));
  return { from, to };
}

/*
Day range helper
*/
function dayRangeUTC(year, month1to12, day1to31) {
  const from = new Date(Date.UTC(year, month1to12 - 1, day1to31));
  const to = new Date(Date.UTC(year, month1to12 - 1, day1to31 + 1));
  return { from, to };
}

/*
MAIN DASHBOARD
*/
dashboardRouter.get("/", async (req, res) => {
  try {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();

    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

    const [totalCustomers, totalVehicles, invoices] = await Promise.all([
      prisma.customer.count(),
      prisma.vehicle.count(),
      prisma.invoice.findMany({
        where: {
          journeyDate: {
            gte: yearStart,
            lt: yearEnd
          }
        },
        select: {
          journeyDate: true,
          amount: true,
          balanceAmount: true
        }
      })
    ]);

    const revenueByMonth = Array(12).fill(0);
    const tripsByMonth = Array(12).fill(0);

    let revenueThisMonth = 0;
    let tripsThisMonth = 0;
    let pendingPayments = 0;

    for (const inv of invoices) {
      const m = inv.journeyDate.getUTCMonth();

      const amount = Number(inv.amount || 0);
      const balance = Number(inv.balanceAmount || 0);
      const received = amount - balance;

      revenueByMonth[m] += received;
      tripsByMonth[m] += 1;

      if (m === month) {
        revenueThisMonth += received;
        tripsThisMonth += 1;
      }

      pendingPayments += balance;
    }

    return res.json({
      cards: {
        totalRevenueThisMonth: revenueThisMonth,
        totalPendingPayments: pendingPayments,
        totalTripsThisMonth: tripsThisMonth,
        totalCustomers,
        totalVehicles
      },
      charts: {
        year,
        revenueByMonth,
        tripsByMonth
      }
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({
      message: "Failed to load dashboard."
    });
  }
});

/*
DAILY REVENUE
*/
dashboardRouter.get("/daily", async (req, res) => {
  try {
    let targetDate;

    if (req.query.date) {
      const [y, m, d] = String(req.query.date)
        .split("-")
        .map((v) => Number(v));

      if (!y || !m || !d) {
        return res
          .status(400)
          .json({ message: "Invalid date format. Expected YYYY-MM-DD." });
      }

      targetDate = { year: y, month: m, day: d };
    } else {
      const now = new Date();
      targetDate = {
        year: now.getUTCFullYear(),
        month: now.getUTCMonth() + 1,
        day: now.getUTCDate()
      };
    }

    const { from, to } = dayRangeUTC(
      targetDate.year,
      targetDate.month,
      targetDate.day
    );

    const invoices = await prisma.invoice.findMany({
      where: { journeyDate: { gte: from, lt: to } },
      select: {
        amount: true,
        balanceAmount: true
      }
    });

    let received = 0;

    for (const inv of invoices) {
      received += Number(inv.amount || 0) - Number(inv.balanceAmount || 0);
    }

    const isoDate = `${String(targetDate.year).padStart(4, "0")}-${String(
      targetDate.month
    ).padStart(2, "0")}-${String(targetDate.day).padStart(2, "0")}`;

    return res.json({
      date: isoDate,
      totalRevenueForDate: received
    });

  } catch (error) {
    console.error("Daily dashboard error:", error);
    return res.status(500).json({
      message: "Failed to load daily revenue."
    });
  }
});