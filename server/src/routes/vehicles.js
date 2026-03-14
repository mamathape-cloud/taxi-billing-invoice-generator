import express from "express";
import { body, param, query, validationResult } from "express-validator";
import { prisma } from "../prisma.js";
import { PaymentStatus } from "@prisma/client";

export const vehiclesRouter = express.Router();

vehiclesRouter.get(
  "/",
  query("q").optional().isString(),
  async (req, res) => {
    const q = (req.query.q || "").toString().trim();
    const where = q
      ? {
          OR: [
            { vehicleNumber: { contains: q, mode: "insensitive" } },
            { vehicleModel: { contains: q, mode: "insensitive" } },
            { vehicleType: { contains: q, mode: "insensitive" } }
          ]
        }
      : {};

    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });
    return res.json(vehicles);
  }
);

vehiclesRouter.get("/:id", param("id").isString(), async (req, res) => {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: req.params.id } });
  if (!vehicle) return res.status(404).json({ message: "Not found" });
  return res.json(vehicle);
});

vehiclesRouter.post(
  "/",
  body("vehicleNumber").isString().trim().notEmpty().withMessage("Please enter vehicle number if empty"),
  body("vehicleModel").optional({ nullable: true }).isString(),
  body("vehicleType").optional({ nullable: true }).isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });

    const vehicle = await prisma.vehicle.create({
      data: {
        vehicleNumber: req.body.vehicleNumber,
        vehicleModel: req.body.vehicleModel || null,
        vehicleType: req.body.vehicleType || null
      }
    });
    return res.status(201).json(vehicle);
  }
);

vehiclesRouter.put(
  "/:id",
  param("id").isString(),
  body("vehicleNumber").isString().trim().notEmpty().withMessage("Please enter vehicle number if empty"),
  body("vehicleModel").optional({ nullable: true }).isString(),
  body("vehicleType").optional({ nullable: true }).isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });

    const vehicle = await prisma.vehicle.update({
      where: { id: req.params.id },
      data: {
        vehicleNumber: req.body.vehicleNumber,
        vehicleModel: req.body.vehicleModel || null,
        vehicleType: req.body.vehicleType || null
      }
    });
    return res.json(vehicle);
  }
);

vehiclesRouter.delete("/:id", param("id").isString(), async (req, res) => {
  const unpaidCount = await prisma.invoice.count({
    where: {
      vehicleId: req.params.id,
      paymentStatus: { in: [PaymentStatus.PARTIAL, PaymentStatus.PENDING] }
    }
  });

  if (unpaidCount > 0) {
    return res.status(400).json({
      message: "Cannot delete vehicle with unpaid invoices"
    });
  }

  await prisma.vehicle.delete({ where: { id: req.params.id } });
  return res.status(204).send();
});

vehiclesRouter.get("/:id/invoices", param("id").isString(), async (req, res) => {
  const invoices = await prisma.invoice.findMany({
    where: { vehicleId: req.params.id },
    include: { vehicle: true, customer: true },
    orderBy: { createdAt: "desc" }
  });
  return res.json(invoices);
});

