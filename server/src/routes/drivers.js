import express from "express";
import { body, param, query, validationResult } from "express-validator";
import { prisma } from "../prisma.js";
import { PaymentStatus } from "@prisma/client";

export const driversRouter = express.Router();

driversRouter.get(
  "/",
  query("q").optional().isString(),
  async (req, res) => {
    try {
      const q = (req.query.q || "").toString().trim();

      const where = q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } }
            ]
          }
        : {};

      const drivers = await prisma.driver.findMany({
        where,
        orderBy: { createdAt: "desc" }
      });

      return res.json(drivers);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch drivers" });
    }
  }
);

driversRouter.get("/:id", param("id").isString(), async (req, res) => {
  try {
    const id = Number(req.params.id);

    const driver = await prisma.driver.findUnique({
      where: { id }
    });

    if (!driver) return res.status(404).json({ message: "Not found" });

    return res.json(driver);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch driver" });
  }
});

driversRouter.post(
  "/",
  body("name").isString().trim().notEmpty().withMessage("Please enter name, phone"),
  body("phone").isString().trim().notEmpty().withMessage("Please enter name, phone"),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });

      const driver = await prisma.driver.create({
        data: {
          name: req.body.name,
          phone: req.body.phone
        }
      });

      return res.status(201).json(driver);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create driver" });
    }
  }
);

driversRouter.put(
  "/:id",
  param("id").isString(),
  body("name").isString().trim().notEmpty().withMessage("Please enter name, phone"),
  body("phone").isString().trim().notEmpty().withMessage("Please enter name, phone"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });

      const driver = await prisma.driver.update({
        where: { id },
        data: {
          name: req.body.name,
          phone: req.body.phone
        }
      });

      return res.json(driver);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to update driver" });
    }
  }
);

driversRouter.delete("/:id", param("id").isString(), async (req, res) => {
  try {
    const id = Number(req.params.id);

    const unpaidCount = await prisma.invoice.count({
      where: {
        driverId: id,
        paymentStatus: { in: [PaymentStatus.PARTIAL, PaymentStatus.PENDING] }
      }
    });

    if (unpaidCount > 0) {
      return res.status(400).json({
        message: "Cannot delete driver with unpaid invoices"
      });
    }

    await prisma.driver.delete({
      where: { id }
    });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete driver" });
  }
});

driversRouter.get("/:id/invoices", param("id").isString(), async (req, res) => {
  try {
    const id = Number(req.params.id);

    const invoices = await prisma.invoice.findMany({
      where: { driverId: id },
      include: { vehicle: true, customer: true, driver: true },
      orderBy: { createdAt: "desc" }
    });

    return res.json(invoices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch invoices" });
  }
});