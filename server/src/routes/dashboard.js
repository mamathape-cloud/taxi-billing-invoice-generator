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
    const month = now.getUTCMonth() + 1;

    const { from, to } = monthRangeUTC(year, month);

    const [
      totalCustomers,
      totalVehicles,
      tripsThisMonth,
      revenueAgg,
      pendingAgg,
      monthlyInvoices
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.vehicle.count(),

      prisma.invoice.count({
        where: { journeyDate: { gte: from, lt: to } }
      }),

      prisma.invoice.aggregate({
        where: { journeyDate: { gte: from, lt: to } },
        _sum: { amount: true }
      }),

      prisma.invoice.aggregate({
        where: {
          paymentStatus: { in: ["PARTIAL", "PENDING"] }
        },
        _sum: { balanceAmount: true }
      }),

      prisma.invoice.findMany({
        where: {
          journeyDate: {
            gte: new Date(Date.UTC(year, 0, 1)),
            lt: new Date(Date.UTC(year + 1, 0, 1))
          }
        },
        select: {
          journeyDate: true,
          amount: true
        }
      })
    ]);

    /*
    Build monthly charts
    */
    const revenueByMonth = Array(12).fill(0);
    const tripsByMonth = Array(12).fill(0);

    for (const inv of monthlyInvoices) {
      const m = inv.journeyDate.getUTCMonth();
      revenueByMonth[m] += Number(inv.amount || 0);
      tripsByMonth[m] += 1;
    }

    return res.json({
      cards: {
        totalRevenueThisMonth: Number(revenueAgg._sum.amount || 0),
        totalPendingPayments: Number(pendingAgg._sum.balanceAmount || 0),
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

    const agg = await prisma.invoice.aggregate({
      where: { journeyDate: { gte: from, lt: to } },
      _sum: { amount: true }
    });

    const isoDate = `${String(targetDate.year).padStart(4, "0")}-${String(
      targetDate.month
    ).padStart(2, "0")}-${String(targetDate.day).padStart(2, "0")}`;

    return res.json({
      date: isoDate,
      totalRevenueForDate: Number(agg._sum.amount || 0)
    });
  } catch (error) {
    console.error("Daily dashboard error:", error);
    return res.status(500).json({
      message: "Failed to load daily revenue."
    });
  }
});