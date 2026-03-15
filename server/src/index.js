import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";

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
Allows Vercel frontend + local development
*/
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://taxi-billing-invoice-generator-clie.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));

/*
Root route (useful to confirm API is running)
*/
app.get("/", (req, res) => {
  res.json({ message: "Taxi Billing API Running 🚕" });
});

/*
Health check (used by Railway sometimes)
*/
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

/*
Static uploads
*/
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

/*
Public routes
*/
app.use("/auth", authRouter);

/*
Portal routes (public)
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
// eslint-disable-next-line no-unused-vars
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