import { PrismaClient, PaymentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function toDateOnly(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function diffDaysInclusive(fromDate, toDate) {
  const from = toDateOnly(fromDate).getTime();
  const to = toDateOnly(toDate).getTime();
  const days = Math.floor((to - from) / (24 * 60 * 60 * 1000)) + 1;
  return Math.max(days, 1);
}

function computePaymentStatus(balanceAmount, amountReceived) {
  if (Number(balanceAmount) === 0) return PaymentStatus.FULL;
  if (Number(amountReceived) === 0) return PaymentStatus.PENDING;
  return PaymentStatus.PARTIAL;
}

async function main() {
  const adminEmail = "admin@demo.com";
  const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("Admin@123", 10);
    await prisma.admin.create({
      data: { email: adminEmail, passwordHash }
    });
  }

  const companyCount = await prisma.company.count();
  if (companyCount === 0) {
    await prisma.company.create({
      data: {
        companyName: "Sri Ganesh Taxi Services",
        address: "Demo Address, City, State",
        phone: "9999999999",
        email: "billing@sriganeshtaxi.com",
        gstNumber: null
      }
    });
  }

  await prisma.invoiceCounter.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, current: 0 }
  });

  const [cust1, cust2] = await Promise.all([
    prisma.customer.upsert({
      where: { id: "seed-customer-1" },
      update: {},
      create: {
        id: "seed-customer-1",
        name: "Ravi Kumar",
        phone: "9000000001",
        email: "ravi@example.com",
        address: "Hyderabad"
      }
    }),
    prisma.customer.upsert({
      where: { id: "seed-customer-2" },
      update: {},
      create: {
        id: "seed-customer-2",
        name: "Anita Sharma",
        phone: "9000000002",
        email: "anita@example.com",
        address: "Bengaluru"
      }
    })
  ]);

  const [veh1, veh2] = await Promise.all([
    prisma.vehicle.upsert({
      where: { vehicleNumber: "TS09AB1234" },
      update: {},
      create: {
        vehicleNumber: "TS09AB1234",
        vehicleModel: "Dzire",
        vehicleType: "Sedan"
      }
    }),
    prisma.vehicle.upsert({
      where: { vehicleNumber: "KA01CD5678" },
      update: {},
      create: {
        vehicleNumber: "KA01CD5678",
        vehicleModel: "Innova",
        vehicleType: "SUV"
      }
    })
  ]);

  const driver1 = await prisma.driver.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Suresh",
      phone: "8000000001"
    }
  });

  const existingInvoice = await prisma.invoice.findFirst();
  if (!existingInvoice) {
    const invoiceNumber = "INV-0001";
    const fromDate = new Date();
    const toDate = new Date();
    const numberOfDays = diffDaysInclusive(fromDate, toDate);
    const openingKm = 1000;
    const closingKm = 1125;
    const totalKm = closingKm - openingKm;
    const amount = 1600.0;
    const amountReceived = 1000.0;
    const balanceAmount = amount - amountReceived;
    const paymentStatus = computePaymentStatus(balanceAmount, amountReceived);

    await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: cust1.id,
        vehicleId: veh1.id,
        driverId: driver1.id,
        journeyDate: new Date(),
        tripFrom: "Hyderabad",
        tripTo: "Airport",
        fromDate,
        toDate,
        numberOfDays,
        pickupTime: "10:00",
        closingTime: "14:00",
        openingKm,
        closingKm,
        totalKm,
        tollCharges: 100.0,
        parkingCharges: 50.0,
        amount,
        amountReceived,
        balanceAmount,
        paymentStatus
      }
    });

    await prisma.invoiceCounter.update({
      where: { id: 1 },
      data: { current: 1 }
    });
  }

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

