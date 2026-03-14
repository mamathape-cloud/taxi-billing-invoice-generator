import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

function formatDate(d) {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN");
}

function money(n) {
  const num = Number(n || 0);
  return num.toFixed(2);
}

function localPathFromUploadsUrl(url) {
  if (!url) return null;
  const idx = url.indexOf("/uploads/");
  if (idx === -1) return null;
  const rel = url.substring(idx + "/uploads/".length);
  return path.join(process.cwd(), "uploads", rel);
}

// Basic INR words converter for invoice display (supports up to crores)
function numberToWordsINR(amount) {
  const n = Math.floor(Number(amount || 0));
  if (!Number.isFinite(n)) return "";
  if (n === 0) return "Zero Rupees Only";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen"
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const twoDigits = (x) => {
    if (x < 20) return ones[x];
    const t = Math.floor(x / 10);
    const o = x % 10;
    return `${tens[t]}${o ? " " + ones[o] : ""}`.trim();
  };
  const threeDigits = (x) => {
    const h = Math.floor(x / 100);
    const r = x % 100;
    const head = h ? `${ones[h]} Hundred` : "";
    const tail = r ? `${head ? " " : ""}${twoDigits(r)}` : "";
    return `${head}${tail}`.trim();
  };

  let num = n;
  const parts = [];

  const crore = Math.floor(num / 10000000);
  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  num %= 10000000;

  const lakh = Math.floor(num / 100000);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  num %= 100000;

  const thousand = Math.floor(num / 1000);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  num %= 1000;

  const rem = num;
  if (rem) parts.push(threeDigits(rem));

  return `${parts.join(" ")} Rupees Only`.replace(/\s+/g, " ").trim();
}

function drawKeyValue(doc, x, y, key, value, keyWidth = 90, lineHeight = 14) {
  doc.font("Helvetica-Bold").fontSize(9).text(key, x, y, { width: keyWidth });
  doc.font("Helvetica").fontSize(9).text(value ?? "-", x + keyWidth, y, { width: 200 });
  return y + lineHeight;
}

function drawTableRow(doc, y, cols, widths, { header = false } = {}) {
  doc.font(header ? "Helvetica-Bold" : "Helvetica").fontSize(9);
  let x = 50;
  for (let i = 0; i < cols.length; i++) {
    doc.text(String(cols[i] ?? ""), x + 4, y + 4, { width: widths[i] - 8 });
    x += widths[i];
  }
  doc.rect(50, y, widths.reduce((a, b) => a + b, 0), 22).stroke("#E5E7EB");
  x = 50;
  for (let i = 0; i < widths.length; i++) {
    doc.rect(x, y, widths[i], 22).stroke("#E5E7EB");
    x += widths[i];
  }
  return y + 22;
}

export async function generateInvoicePdfBuffer({ invoice, company }) {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));

  const done = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const pageWidth = doc.page.width;
  const left = 50;
  const right = pageWidth - 50;
  const BOX_HEIGHT = 120;
  const CHARGES_BOX_HEIGHT = 130;

  // Header background
  doc.rect(40, 40, pageWidth - 80, 90).fill("#FFFFFF").stroke("#E5E7EB");

  // Logo
  const logoPath = localPathFromUploadsUrl(company?.logoUrl);
  if (logoPath && fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, left, 50, { fit: [120, 80] });
    } catch {
      // ignore image errors
    }
  } else {
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827").text("TAXI INVOICE", left, 70);
  }

  // Company details
  doc.fillColor("#111827");
  doc.font("Helvetica-Bold").fontSize(14).text(company?.companyName || "Company Name", 160, 55, {
    width: right - 160,
    align: "right"
  });
  doc.font("Helvetica").fontSize(9);
  const infoLines = [
    company?.address,
    company?.phone ? `Phone: ${company.phone}` : null,
    company?.email ? `Email: ${company.email}` : null,
    company?.gstNumber ? `GST: ${company.gstNumber}` : null
  ].filter(Boolean);
  doc.text(infoLines.join("\n"), 160, 78, { width: right - 160, align: "right" });

  doc.moveDown(6);
  doc.fillColor("#111827");

  // Invoice Info
  let y = 150;
  doc.font("Helvetica-Bold").fontSize(11).text("Invoice Information", left, y);
  y += 14;
  doc.rect(40, y, pageWidth - 80, 70).stroke("#E5E7EB");
  let yLeft = y + 10;
  yLeft = drawKeyValue(doc, left, yLeft, "Invoice No:", invoice.invoiceNumber);
  yLeft = drawKeyValue(doc, left, yLeft, "Invoice Date:", formatDate(invoice.createdAt));
  yLeft = drawKeyValue(doc, left, yLeft, "Journey Date:", formatDate(invoice.journeyDate));

  // Customer / Vehicle / Driver + Trip summary blocks
  y += 90;
  doc.font("Helvetica-Bold").fontSize(11).text("Customer / Vehicle / Driver", left, y);
  doc.font("Helvetica-Bold").fontSize(11).text("Trip Details", pageWidth / 2 + 10, y);
  y += 14;

  const blockWidth = (pageWidth - 90) / 2;
  doc.rect(40, y, blockWidth, BOX_HEIGHT).stroke("#E5E7EB");
  doc.rect(50 + blockWidth, y, blockWidth, BOX_HEIGHT).stroke("#E5E7EB");

  const boxContentTop = y + 12;
  const boxContentBottom = y + BOX_HEIGHT - 12;

  // Left: customer / vehicle / driver
  let yC = boxContentTop;
  const driverName = invoice.driver?.name || "";
  const driverPhone = invoice.driver?.phone || "";

  function leftRow(label, value) {
    if (yC > boxContentBottom) return;
    yC = drawKeyValue(doc, left, yC, label, value);
  }

  leftRow("Name:", invoice.customer?.name);
  leftRow("Phone:", invoice.customer?.phone);
  leftRow("Vehicle:", invoice.vehicle?.vehicleNumber);
  leftRow("Driver:", driverName);
  leftRow("Driver Ph:", driverPhone);

  // Right: trip summary with right-aligned values
  let yT = boxContentTop;
  const rightBlockX = 50 + blockWidth;
  const tripKeyWidth = 105;
  const tripValWidth = blockWidth - tripKeyWidth - 24;
  const tripLineHeight = 14;

  function tripRow(label, value) {
    if (yT > boxContentBottom) return;
    doc.font("Helvetica-Bold").fontSize(9).text(label, rightBlockX, yT, { width: tripKeyWidth });
    doc
      .font("Helvetica")
      .fontSize(9)
      .text(value ?? "-", rightBlockX + tripKeyWidth, yT, {
        width: tripValWidth,
        align: "right"
      });
    yT += tripLineHeight;
  }

  tripRow("From:", invoice.tripFrom);
  tripRow("To:", invoice.tripTo);
  tripRow("From Date & Time:", `${formatDate(invoice.fromDate)} ${invoice.pickupTime || "-"}`);
  tripRow("To Date & Time:", `${formatDate(invoice.toDate)} ${invoice.closingTime || "-"}`);
  tripRow("Days:", String(invoice.numberOfDays));
  tripRow("Opening KM:", String(invoice.openingKm));
  tripRow("Closing KM:", String(invoice.closingKm));
  tripRow("Total KM:", String(invoice.totalKm));

  // Move below both boxes
  y += BOX_HEIGHT + 20;

  // Charges
  y += 18;
  doc.font("Helvetica-Bold").fontSize(11).text("Charges", left, y);
  y += 14;

  const chargesX = left;
  const descW = 300;
  const amtW = 180;
  // Fixed-height Charges box
  doc.rect(40, y, descW + amtW + 40, CHARGES_BOX_HEIGHT).stroke("#E5E7EB");

  doc.font("Helvetica-Bold").fontSize(9).text("Description", chargesX + 4, y + 6, { width: descW });
  doc.font("Helvetica-Bold").fontSize(9).text("Amount", chargesX + descW + 30, y + 6, {
    width: amtW,
    align: "right"
  });
  doc
    .moveTo(chargesX, y + 24)
    .lineTo(chargesX + descW + amtW + 40, y + 24)
    .stroke("#E5E7EB");

  const rows = [
    ["Trip Fare", money(Number(invoice.amount) - Number(invoice.tollCharges) - Number(invoice.parkingCharges))],
    ["Toll Charges", money(invoice.tollCharges)],
    ["Parking Charges", money(invoice.parkingCharges)]
  ];
  let ry = y + 30; // first row baseline
  const rowStep = 18;
  doc.font("Helvetica").fontSize(9);
  for (const [d, a] of rows) {
    doc.text(d, chargesX + 4, ry, { width: descW });
    doc.text(a, chargesX + descW + 30, ry, { width: amtW, align: "right" });
    ry += rowStep;
  }

  const totalY = y + CHARGES_BOX_HEIGHT - 24;
  doc.font("Helvetica-Bold").text("Total Amount", chargesX + 4, totalY, { width: descW });
  doc.font("Helvetica-Bold").text(money(invoice.amount), chargesX + descW + 30, totalY, {
    width: amtW,
    align: "right"
  });

  // Amount in words and payment summary
  y += 130;
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text("Amount in Words:", left, y);
  doc.font("Helvetica").fontSize(10).text(numberToWordsINR(invoice.amount), left + 120, y, {
    width: pageWidth - 260
  });

  const payX = pageWidth - 220;
  let py = y;
  // Received
  doc.font("Helvetica-Bold").fontSize(9).text("Received:", payX, py, { width: 80 });
  doc.font("Helvetica").fontSize(9).text(money(invoice.amountReceived), payX + 80, py, {
    width: 80,
    align: "right"
  });
  py += 14;
  // Balance
  doc.font("Helvetica-Bold").fontSize(9).text("Balance:", payX, py, { width: 80 });
  doc.font("Helvetica").fontSize(9).text(money(invoice.balanceAmount), payX + 80, py, {
    width: 80,
    align: "right"
  });
  py += 14;
  // Status
  doc.font("Helvetica-Bold").fontSize(9).text("Status:", payX, py, { width: 80 });
  doc.font("Helvetica").fontSize(9).text(String(invoice.paymentStatus || ""), payX + 80, py, {
    width: 80,
    align: "right"
  });

  // Footer
  const footerY = doc.page.height - 120;
  doc.moveTo(40, footerY - 10).lineTo(pageWidth - 40, footerY - 10).stroke("#E5E7EB");
  doc.font("Helvetica").fontSize(9).fillColor("#374151");
  doc.text(
    "Thank you for choosing our service.\nWe hope you had a comfortable journey and look forward to serving you again.",
    left,
    footerY + 8,
    { width: pageWidth - 260 }
  );

  const sigPath = localPathFromUploadsUrl(company?.signatureUrl);
  const sigX = pageWidth - 200;
  const sigY = footerY;
  if (sigPath && fs.existsSync(sigPath)) {
    try {
      doc.image(sigPath, sigX, sigY, { fit: [140, 60] });
    } catch {
      // ignore
    }
  } else {
    doc.font("Helvetica").fontSize(9).fillColor("#9CA3AF").text("(Signature)", sigX, sigY + 20, {
      width: 140,
      align: "center"
    });
  }
  doc.fillColor("#111827");
  doc.font("Helvetica-Bold").fontSize(9).text("Authorized Signatory", sigX, sigY + 66, {
    width: 140,
    align: "center"
  });

  doc.end();
  return await done;
}

