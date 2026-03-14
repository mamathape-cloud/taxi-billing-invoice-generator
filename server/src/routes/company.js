import express from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../prisma.js";
import { makeUploader, publicUploadUrl } from "../utils/upload.js";

export const companyRouter = express.Router();

const logoUpload = makeUploader({
  folder: "logos",
  allowedMime: ["image/png", "image/jpeg", "image/webp"]
});
const signatureUpload = makeUploader({
  folder: "signatures",
  allowedMime: ["image/png"]
});

companyRouter.get("/", async (req, res) => {
  const company = await prisma.company.findFirst({ orderBy: { createdAt: "asc" } });
  return res.json(company);
});

companyRouter.put(
  "/",
  body("companyName").isString().notEmpty(),
  body("address").isString().notEmpty(),
  body("phone").isString().notEmpty(),
  body("email").isEmail(),
  body("gstNumber").optional({ nullable: true }).isString(),
  body("logoUrl").optional({ nullable: true }).isString(),
  body("signatureUrl").optional({ nullable: true }).isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const existing = await prisma.company.findFirst({ orderBy: { createdAt: "asc" } });
    const data = {
      companyName: req.body.companyName,
      address: req.body.address,
      phone: req.body.phone,
      email: req.body.email,
      gstNumber: req.body.gstNumber || null,
      logoUrl: req.body.logoUrl || null,
      signatureUrl: req.body.signatureUrl || null
    };

    const company = existing
      ? await prisma.company.update({ where: { id: existing.id }, data })
      : await prisma.company.create({ data });

    return res.json(company);
  }
);

companyRouter.post("/upload/logo", logoUpload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ message: "File required" });
  const url = publicUploadUrl(req, `/uploads/logos/${file.filename}`);
  return res.json({ url });
});

companyRouter.post(
  "/upload/signature",
  signatureUpload.single("file"),
  async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ message: "File required" });
    const url = publicUploadUrl(req, `/uploads/signatures/${file.filename}`);
    return res.json({ url });
  }
);

