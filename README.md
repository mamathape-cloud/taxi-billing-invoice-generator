# Taxi Billing & Invoice Generator

Full-stack web app for Tours & Travels office billing:

- Company settings (logo + signature uploads)
- Customers, Vehicles, Drivers
- Trip invoices with automatic calculations
- Partial/full payment tracking
- Professional PDF invoice generation
- Dashboard + Monthly reports (charts)

## Tech

- Frontend: React + Tailwind CSS + Chart.js
- Backend: Node.js + Express
- DB: PostgreSQL + Prisma ORM
- Auth: JWT admin login
- PDF: pdfkit

## Prerequisites

- Node.js 18+ (with npm)
- PostgreSQL 14+

## 1) Database setup

Create a Postgres database, for example:

```sql
CREATE DATABASE taxi_billing;
```

## 2) Backend setup

```bash
cd server
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Backend runs on `http://localhost:4000`.

## 3) Frontend setup

In a new terminal:

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Optional: Run both together (npm workspaces)

From the project root:

```bash
npm install
npm run dev
```

## 4) Default admin login (seeded)

- Email: `admin@demo.com`
- Password: `Admin@123`

## Notes

- Uploaded files are stored in `server/uploads/` and served from `/uploads/*`.
- Invoice numbers are sequential like `INV-0001`.

