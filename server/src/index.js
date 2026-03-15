import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";

import { authRouter } from "./routes/auth.js";
import { companyRouter } from "./routes/company.js";
import { customersRouter } from "./routes/customers.js";
import { vehiclesRouter } from "./routes/vehicles.js";
import { driversRouter } from "./routes/drivers.js";
import { invoicesRouter } from "./routes/invoices.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { reportsRouter } from "./routes/reports.js";
import { requireAuth } from "./middleware/auth.js";

const app = express();

/*
CORS configuration
*/
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://taxi-billing-invoice-generator-clie.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));

/*
Root route
*/
app.get("/", (req, res) => {
  res.json({ message: "Taxi Billing API Running 🚕" });
});

/*
Health check
*/
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

/*
Uploads folder (fix for Railway)
*/
const uploadsDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use("/uploads", express.static(uploadsDir));

/*
Public routes
*/
app.use("/auth", authRouter);

/*
Portal routes
*/
app.use("/portal/company", companyRouter);
app.use("/portal/customers", customersRouter);
app.use("/portal/vehicles", vehiclesRouter);
app.use("/portal/drivers", driversRouter);
app.use("/portal/invoices", invoicesRouter);

/*
Protected routes
*/
app.use(requireAuth);

app.use("/company", companyRouter);
app.use("/customers", customersRouter);
app.use("/vehicles", vehiclesRouter);
app.use("/drivers", driversRouter);
app.use("/invoices", invoicesRouter);
app.use("/dashboard", dashboardRouter);
app.use("/reports", reportsRouter);

/*
Error handler
*/
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    message: err?.message || "Server error",
  });
});

/*
Railway dynamic port
*/
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});