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

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (req, res) => res.json({ ok: true }));

// Static uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Public
app.use("/auth", authRouter);

// Portal (public, no auth): same handlers as protected routes
app.use("/portal/company", companyRouter);
app.use("/portal/customers", customersRouter);
app.use("/portal/vehicles", vehiclesRouter);
app.use("/portal/drivers", driversRouter);
app.use("/portal/invoices", invoicesRouter);

// Protected
app.use(requireAuth);
app.use("/company", companyRouter);
app.use("/customers", customersRouter);
app.use("/vehicles", vehiclesRouter);
app.use("/drivers", driversRouter);
app.use("/invoices", invoicesRouter);
app.use("/dashboard", dashboardRouter);
app.use("/reports", reportsRouter);

// Error handler (including multer)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  return res.status(500).json({ message: err?.message || "Server error" });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});

