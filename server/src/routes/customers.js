import express from "express";
import { body, param, query, validationResult } from "express-validator";
import { prisma } from "../prisma.js";
//import { PaymentStatus } from "@prisma/client";


export const customersRouter = express.Router();

customersRouter.get(
  "/",
  query("q").optional().isString(),
  async (req, res) => {
    const q = (req.query.q || "").toString().trim();
    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } }
          ]
        }
      : {};

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });
    return res.json(customers);
  }
);

customersRouter.get("/:id", param("id").isString(), async (req, res) => {
  const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!customer) return res.status(404).json({ message: "Not found" });
  return res.json(customer);
});

customersRouter.post(
  "/",
  body("name").isString().trim().notEmpty().withMessage("Please enter name, phone"),
  body("phone").isString().trim().notEmpty().withMessage("Please enter name, phone"),
  body("email").optional({ nullable: true }).isEmail(),
  body("address").optional({ nullable: true }).isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    const customer = await prisma.customer.create({
      data: {
        name: req.body.name,
        phone: req.body.phone,
        email: req.body.email || null,
        address: req.body.address || null
      }
    });
    return res.status(201).json(customer);
  }
);

customersRouter.put(
  "/:id",
  param("id").isString(),
  body("name").isString().trim().notEmpty().withMessage("Please enter name, phone"),
  body("phone").isString().trim().notEmpty().withMessage("Please enter name, phone"),
  body("email").optional({ nullable: true }).isEmail(),
  body("address").optional({ nullable: true }).isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        phone: req.body.phone,
        email: req.body.email || null,
        address: req.body.address || null
      }
    });
    return res.json(customer);
  }
);

customersRouter.delete("/:id", param("id").isString(), async (req, res) => {
  const unpaidCount = await prisma.invoice.count({
    where: {
      customerId: req.params.id,
      paymentStatus: { in: [PaymentStatus.PARTIAL, PaymentStatus.PENDING] }
    }
  });

  if (unpaidCount > 0) {
    return res.status(400).json({
      message: "Cannot delete customer with unpaid invoices"
    });
  }

  await prisma.customer.delete({ where: { id: req.params.id } });
  return res.status(204).send();
});

customersRouter.get("/:id/invoices", param("id").isString(), async (req, res) => {
  const invoices = await prisma.invoice.findMany({
    where: { customerId: req.params.id },
    include: { vehicle: true, customer: true },
    orderBy: { createdAt: "desc" }
  });
  return res.json(invoices);
});

