import express from "express";
import { body, param, query, validationResult } from "express-validator";
import { prisma } from "../prisma.js";
import { diffDaysInclusive, computeTotals } from "../utils/invoiceMath.js";
import { getNextInvoiceNumber } from "../utils/invoiceNumber.js";
import { generateInvoicePdfBuffer } from "../utils/pdfInvoice.js";

export const invoicesRouter = express.Router();

function parseMoney(v, def = 0) {
  if (v === undefined || v === null || v === "") return def;
  return Number(v);
}

invoicesRouter.get(
  "/",
  query("month").optional().isInt({ min: 1, max: 12 }).toInt(),
  query("year").optional().isInt({ min: 2000, max: 2100 }).toInt(),
  query("customerId").optional().isString(),
  query("vehicleId").optional().isInt().toInt(),
  query("driverId").optional().isInt().toInt(),
  query("paymentStatus").optional().isIn(["FULL", "PARTIAL", "PENDING"]),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const where = {};
    const month = req.query.month;
    const year = req.query.year;
    if (month && year) {
      const from = new Date(Date.UTC(year, month - 1, 1));
      const to = new Date(Date.UTC(year, month, 1));
      where.journeyDate = { gte: from, lt: to };
    }
    if (req.query.customerId) where.customerId = req.query.customerId;
    if (req.query.vehicleId) where.vehicleId = req.query.vehicleId;
    if (req.query.paymentStatus) where.paymentStatus = req.query.paymentStatus;
    if (req.query.driverId) where.driverId = req.query.driverId;

    const invoices = await prisma.invoice.findMany({
      where,
      include: { customer: true, vehicle: true, driver: true },
      orderBy: { createdAt: "desc" }
    });
    return res.json(invoices);
  }
);

invoicesRouter.get("/:id", param("id").isString(), async (req, res) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { customer: true, vehicle: true, driver: true }
  });
  if (!invoice) return res.status(404).json({ message: "Not found" });
  return res.json(invoice);
});

invoicesRouter.post(
  "/",
  body("customerId").isString().notEmpty(),
  body("vehicleId").isInt().toInt(),
  body("driverId").isInt().toInt(),
  body("journeyDate").isISO8601(),
  body("tripFrom").trim().notEmpty().withMessage("From Trip cannot be empty"),
  body("tripTo").trim().notEmpty().withMessage("To Trip cannot be empty"),
  body("fromDate").isISO8601(),
  body("toDate").isISO8601(),
  body("pickupTime").optional({ nullable: true }).isString(),
  body("closingTime").optional({ nullable: true }).isString(),
  body("openingKm").isInt({ min: 0 }).toInt(),
  body("closingKm").isInt({ min: 0 }).toInt(),
  body("tollCharges").optional({ nullable: true }).isNumeric(),
  body("parkingCharges").optional({ nullable: true }).isNumeric(),
  body("amount").isNumeric(),
  body("amountReceived").optional({ nullable: true }).isNumeric(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const openingKm = Number(req.body.openingKm);
    const closingKm = Number(req.body.closingKm);
    if (closingKm < openingKm) {
      return res.status(400).json({ message: "Closing KM cannot be less than Opening KM." });
    }

    const fromDate = new Date(req.body.fromDate);
    const toDate = new Date(req.body.toDate);
    if (toDate < fromDate) {
      return res.status(400).json({ message: "To Date cannot be earlier than From Date." });
    }

    const numberOfDays = diffDaysInclusive(fromDate, toDate);
    const amount = parseMoney(req.body.amount);
    const amountReceived = parseMoney(req.body.amountReceived, 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Total Amount is required and must be greater than zero." });
    }
    if (amountReceived > amount) {
      return res.status(400).json({ message: "Amount Received cannot be more than Total Amount." });
    }
    const { totalKm, balanceAmount, paymentStatus } = computeTotals({
      openingKm,
      closingKm,
      amount,
      amountReceived
    });

    const customer = await prisma.customer.findUnique({ where: { id: req.body.customerId } });
    if (!customer) {
      return res.status(400).json({ message: "Customer not found. Please add customer first." });
    }
    const vehicle = await prisma.vehicle.findUnique({ where: { id: req.body.vehicleId } });
    if (!vehicle) {
      return res.status(400).json({ message: "Vehicle not found. Please add vehicle first." });
    }

    const invoiceNumber = await getNextInvoiceNumber(prisma);
    const driver = await prisma.driver.findUnique({ where: { id: req.body.driverId } });
    if (!driver) {
      return res.status(400).json({ message: "Driver not found. Please add driver first." });
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: req.body.customerId,
        vehicleId: req.body.vehicleId,
        driverId: req.body.driverId,
        journeyDate: new Date(req.body.journeyDate),
        tripFrom: req.body.tripFrom,
        tripTo: req.body.tripTo,
        fromDate,
        toDate,
        numberOfDays,
        pickupTime: req.body.pickupTime || null,
        closingTime: req.body.closingTime || null,
        openingKm,
        closingKm,
        totalKm,
        tollCharges: parseMoney(req.body.tollCharges, 0),
        parkingCharges: parseMoney(req.body.parkingCharges, 0),
        amount,
        amountReceived,
        balanceAmount,
        paymentStatus
      },
      include: { customer: true, vehicle: true, driver: true }
    });

    return res.status(201).json(invoice);
  }
);

invoicesRouter.put(
  "/:id",
  param("id").isString(),
  body("customerId").isString().notEmpty(),
  body("vehicleId").isInt().toInt(),
  body("driverId").isInt().toInt(),
  body("journeyDate").isISO8601(),
  body("tripFrom").trim().notEmpty().withMessage("From Trip cannot be empty"),
  body("tripTo").trim().notEmpty().withMessage("To Trip cannot be empty"),
  body("fromDate").isISO8601(),
  body("toDate").isISO8601(),
  body("pickupTime").optional({ nullable: true }).isString(),
  body("closingTime").optional({ nullable: true }).isString(),
  body("openingKm").isInt({ min: 0 }).toInt(),
  body("closingKm").isInt({ min: 0 }).toInt(),
  body("tollCharges").optional({ nullable: true }).isNumeric(),
  body("parkingCharges").optional({ nullable: true }).isNumeric(),
  body("amount").isNumeric(),
  body("amountReceived").optional({ nullable: true }).isNumeric(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const openingKm = Number(req.body.openingKm);
    const closingKm = Number(req.body.closingKm);
    if (closingKm < openingKm) {
      return res.status(400).json({ message: "Closing KM cannot be less than Opening KM." });
    }

    const fromDate = new Date(req.body.fromDate);
    const toDate = new Date(req.body.toDate);
    if (toDate < fromDate) {
      return res.status(400).json({ message: "To Date cannot be earlier than From Date." });
    }

    const numberOfDays = diffDaysInclusive(fromDate, toDate);
    const amount = parseMoney(req.body.amount);
    const amountReceived = parseMoney(req.body.amountReceived, 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Total Amount is required and must be greater than zero." });
    }
    if (amountReceived > amount) {
      return res.status(400).json({ message: "Amount Received cannot be more than Total Amount." });
    }
    const { totalKm, balanceAmount, paymentStatus } = computeTotals({
      openingKm,
      closingKm,
      amount,
      amountReceived
    });
    const customer = await prisma.customer.findUnique({ where: { id: req.body.customerId } });
    if (!customer) {
      return res.status(400).json({ message: "Customer not found. Please add customer first." });
    }
    const vehicle = await prisma.vehicle.findUnique({ where: { id: req.body.vehicleId } });
    if (!vehicle) {
      return res.status(400).json({ message: "Vehicle not found. Please add vehicle first." });
    }
    const driver = await prisma.driver.findUnique({ where: { id: req.body.driverId } });
    if (!driver) {
      return res.status(400).json({ message: "Driver not found. Please add driver first." });
    }

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        customerId: req.body.customerId,
        vehicleId: req.body.vehicleId,
        driverId: req.body.driverId,
        journeyDate: new Date(req.body.journeyDate),
        tripFrom: req.body.tripFrom,
        tripTo: req.body.tripTo,
        fromDate,
        toDate,
        numberOfDays,
        pickupTime: req.body.pickupTime || null,
        closingTime: req.body.closingTime || null,
        openingKm,
        closingKm,
        totalKm,
        tollCharges: parseMoney(req.body.tollCharges, 0),
        parkingCharges: parseMoney(req.body.parkingCharges, 0),
        amount,
        amountReceived,
        balanceAmount,
        paymentStatus
      },
      include: { customer: true, vehicle: true, driver: true }
    });

    return res.json(invoice);
  }
);

invoicesRouter.delete("/:id", param("id").isString(), async (req, res) => {
  await prisma.invoice.delete({ where: { id: req.params.id } });
  return res.status(204).send();
});

invoicesRouter.get("/:id/pdf", param("id").isString(), async (req, res) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: { customer: true, vehicle: true, driver: true }
  });
  if (!invoice) return res.status(404).json({ message: "Not found" });
  const company = await prisma.company.findFirst({ orderBy: { createdAt: "asc" } });

  const pdf = await generateInvoicePdfBuffer({ invoice, company, baseUrl: process.env.UPLOAD_BASE_URL });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`);
  return res.send(pdf);
});

