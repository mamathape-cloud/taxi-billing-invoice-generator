import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const STROKE = "#111827";
const PAD = 40;

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

function companyPhoneLines(phone) {
  if (!phone) return [];
  return String(phone)
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** First phone for inline "Phone:" row; rest shown under Mob: top-right */
function primaryPhoneLine(phones) {
  if (!phones.length) return "-";
  return phones[0];
}

/** Narrative for PDF: new description field or legacy trip route */
function invoiceDescriptionText(inv) {
  const d = inv.description && String(inv.description).trim();
  if (d) return d;
  const from = inv.tripFrom;
  const to = inv.tripTo;
  if (from && to && from !== "-" && to !== "-") return `${from} → ${to}`;
  return "-";
}

export async function generateInvoicePdfBuffer({ invoice, company }) {
  const doc = new PDFDocument({ size: "A4", margin: PAD });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));

  const done = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const left = PAD;
  const right = pageW - PAD;
  const contentW = right - left;

  const framePad = 2;
  const frameLeft = left - framePad;
  const frameRight = right + framePad;

  let y = PAD;

  // --- Outer frame (drawn after layout using endY; we record start) ---
  const frameStartY = y - 4;

  // 1) Title: Tax Invoice (top, centered)
  doc.fillColor("#111827");
  doc.font("Helvetica-Bold").fontSize(14).text("Tax Invoice", left, y, {
    width: contentW,
    align: "center"
  });
  y += 22;

  // 2) Company block: bordered region — logo row then name / address / Phone | Email
  const companyBoxTop = y;
  const logoRowH = 78;

  const logoPath = localPathFromUploadsUrl(company?.logoUrl);
  const logoInset = 10;
  if (logoPath && fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, left + logoInset, y + 6, { fit: [64, 64] });
    } catch {
      doc.font("Helvetica-Bold").fontSize(9).text("LOGO", left + logoInset, y + 28);
    }
  } else {
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#6B7280").text("LOGO", left + logoInset, y + 28);
  }

  doc.fillColor("#111827");
  const phones = companyPhoneLines(company?.phone);
  let mobY = y + 8;
  const mobX = right - 130;
  doc.font("Helvetica-Bold").fontSize(9).text("Mob :", mobX, mobY, { width: 120, align: "right" });
  mobY += 11;
  doc.font("Helvetica").fontSize(9);
  if (phones.length) {
    for (const p of phones.slice(0, 4)) {
      doc.text(p, mobX, mobY, { width: 120, align: "right" });
      mobY += 11;
    }
  } else {
    doc.text("-", mobX, mobY, { width: 120, align: "right" });
    mobY += 11;
  }

  y += logoRowH;
  doc.moveTo(left, y).lineTo(right, y).stroke(STROKE);

  const nameLineH = 18;
  const addrStr = company?.address || "-";
  doc.font("Helvetica-Bold").fontSize(13).text(company?.companyName || "Company Name", left, y + 6, {
    width: contentW,
    align: "center"
  });
  y += nameLineH + 8;
  doc.font("Helvetica").fontSize(9).text(addrStr, left + 8, y, { width: contentW - 16, align: "center" });
  y += doc.heightOfString(addrStr, { width: contentW - 16 }) + 8;

  const phoneDisplay = primaryPhoneLine(phones);
  const emailStr = company?.email || "";
  doc.font("Helvetica").fontSize(9);
  doc.text(`Phone: ${phoneDisplay}`, left + 12, y, { width: contentW / 2 - 20, align: "left" });
  if (emailStr) {
    doc.text(`Email: ${emailStr}`, left + contentW / 2, y, { width: contentW / 2 - 12, align: "right" });
  }
  y += 14;

  if (company?.gstNumber) {
    doc.font("Helvetica").fontSize(8).text(`GST: ${company.gstNumber}`, left, y, { width: contentW, align: "center" });
    y += 12;
  }

  doc.rect(left, companyBoxTop, contentW, y - companyBoxTop).stroke(STROKE);
  y += 12;

  // 3) Bill To | Invoice details
  const colW = contentW / 2 - 6;
  const boxH = 72;
  doc.rect(left, y, colW, boxH).stroke(STROKE);
  doc.rect(left + colW + 12, y, colW, boxH).stroke(STROKE);

  let yb = y + 8;
  doc.font("Helvetica-Bold").fontSize(10).text("Bill To:", left + 8, yb);
  yb += 14;
  doc.font("Helvetica").fontSize(9).text(invoice.customer?.name || "-", left + 8, yb, { width: colW - 16 });
  yb += 12;
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(`Contact No: ${invoice.customer?.phone || "-"}`, left + 8, yb, { width: colW - 16 });

  let yi = y + 8;
  doc.font("Helvetica-Bold").fontSize(10).text("Invoice Details:", left + colW + 20, yi);
  yi += 14;
  doc.font("Helvetica").fontSize(9).text(`No: ${invoice.invoiceNumber}`, left + colW + 20, yi, { width: colW - 16 });
  yi += 12;
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(`Date: ${formatDate(invoice.journeyDate)}`, left + colW + 20, yi, { width: colW - 16 });

  y += boxH + 12;

  // 4) Middle row: empty left + financial summary right (same outer height)
  const finW = Math.min(240, Math.floor(contentW * 0.42));
  const leftColW = contentW - finW - 12;
  const finH = 100;
  doc.rect(left, y, leftColW, finH).stroke(STROKE);
  doc.rect(left + leftColW + 12, y, finW, finH).stroke(STROKE);

  const finX = left + leftColW + 12;
  let fy = y + 10;
  doc.font("Helvetica-Bold").fontSize(9).text("Total:", finX + 8, fy, { width: 72 });
  doc.font("Helvetica").fontSize(9).text(`₹ ${money(invoice.amount)}`, finX + 80, fy, { width: finW - 92, align: "right" });
  fy += 14;
  doc.font("Helvetica-Bold").fontSize(8).text("Invoice Amount In Words:", finX + 8, fy, { width: finW - 16 });
  fy += 11;
  doc.font("Helvetica").fontSize(8).text(numberToWordsINR(invoice.amount), finX + 8, fy, { width: finW - 16 });
  fy += 24;
  doc.font("Helvetica-Bold").fontSize(9).text("Received:", finX + 8, fy, { width: 72 });
  doc.font("Helvetica").fontSize(9).text(`₹ ${money(invoice.amountReceived)}`, finX + 80, fy, {
    width: finW - 92,
    align: "right"
  });
  fy += 14;
  doc.font("Helvetica-Bold").fontSize(9).text("Balance:", finX + 8, fy, { width: 72 });
  doc.font("Helvetica").fontSize(9).text(`₹ ${money(invoice.balanceAmount)}`, finX + 80, fy, {
    width: finW - 92,
    align: "right"
  });

  y += finH + 12;

  // 5) Description | Terms
  const descColW = contentW / 2 - 6;
  const descText = invoiceDescriptionText(invoice);
  doc.font("Helvetica").fontSize(9);
  const descTextH = doc.heightOfString(descText, { width: descColW - 16 });
  const termsH = doc.heightOfString("Thank you for doing business with us.", { width: descColW - 16 });
  const bottomBoxH = Math.max(100, descTextH + 36, termsH + 36);

  doc.rect(left, y, descColW, bottomBoxH).stroke(STROKE);
  doc.rect(left + descColW + 12, y, descColW, bottomBoxH).stroke(STROKE);

  doc.font("Helvetica-Bold").fontSize(10).text("Description:", left + 8, y + 8);
  doc.font("Helvetica").fontSize(9).text(descText, left + 8, y + 24, { width: descColW - 16 });

  doc.font("Helvetica-Bold").fontSize(10).text("Terms And Conditions:", left + descColW + 20, y + 8);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text("Thank you for doing business with us.", left + descColW + 20, y + 24, { width: descColW - 16 });

  y += bottomBoxH + 16;

  // 6) Signature (no driver / vehicle phone on PDF)
  const sigPath = localPathFromUploadsUrl(company?.signatureUrl);
  const sigW = 160;
  const sigX = right - sigW;
  const companyShort = company?.companyName || "Company";
  doc.font("Helvetica").fontSize(9).text(`For ${companyShort}:`, sigX, y, { width: sigW, align: "center" });
  y += 14;
  if (sigPath && fs.existsSync(sigPath)) {
    try {
      doc.image(sigPath, sigX + 10, y, { fit: [sigW - 20, 50] });
    } catch {
      doc.font("Helvetica").fontSize(8).fillColor("#9CA3AF").text("(Signature)", sigX, y + 16, {
        width: sigW,
        align: "center"
      });
    }
  } else {
    doc.font("Helvetica").fontSize(8).fillColor("#9CA3AF").text("(Signature)", sigX, y + 16, {
      width: sigW,
      align: "center"
    });
  }
  doc.fillColor("#111827");
  doc.font("Helvetica-Bold").fontSize(9).text("Authorized Signatory", sigX, y + 56, { width: sigW, align: "center" });

  y += 88;

  // Outer frame around main invoice body
  const frameEndY = Math.min(y + 8, pageH - PAD);
  doc.lineWidth(0.8);
  doc.rect(frameLeft, frameStartY, frameRight - frameLeft, frameEndY - frameStartY).stroke(STROKE);
  doc.lineWidth(1);

  doc.end();
  return await done;
}
