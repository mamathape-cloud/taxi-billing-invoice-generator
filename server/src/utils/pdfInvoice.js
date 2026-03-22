import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const STROKE = "#111827";
const PAD = 40;

const TERMS_TEXT =
  "Thank you, It was a pleasure serving you. We hope to see you again soon.";

function formatDate(d) {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN");
}

function money(n) {
  const num = Number(n || 0);
  return num.toFixed(2);
}

/** Rs. prefix avoids Helvetica mis-rendering Unicode ₹ as superscript "1" in PDFKit */
function moneyLabel(n) {
  return `Rs. ${money(n)}`;
}

function localPathFromUploadsUrl(url) {
  if (!url) return null;
  const idx = url.indexOf("/uploads/");
  if (idx === -1) return null;
  const rel = url.substring(idx + "/uploads/".length);
  return path.join(process.cwd(), "uploads", rel);
}

/** Strip leading ASCII/en-dash/em-dash from phone for PDF display only */
function displayPhone(s) {
  if (!s) return "";
  let t = String(s).trim();

  // remove leading -, –, —
  t = t.replace(/^[\-\u2013\u2014]+/, "").trim();

  // remove accidental commas/spaces
  t = t.replace(/[^\d+]/g, "");

  return t;
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

/** First raw segment for Phone row (display via displayPhone) */
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
  const left = PAD;
  const right = pageW - PAD;
  const contentW = right - left;
  const half = contentW / 2;
  const innerPad = 8;

  let y = PAD;

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
      doc.text(displayPhone(p), mobX, mobY, { width: 120, align: "right" });
      mobY += 11;
    }
  } else {
    doc.text("", mobX, mobY, { width: 120, align: "right" });
    mobY += 11;
  }

  y += logoRowH;
  doc.moveTo(left, y).lineTo(right, y).stroke(STROKE);

  const nameLineH = 18;
  const addrStr = company?.address || "-";
  doc.font("Helvetica-Bold").fontSize(13).text(company?.companyName || "Company Name", left + 8, y + 6, {
    width: contentW - 16,
    align: "left"
  });
  y += nameLineH + 8;
  
  doc.font("Helvetica").fontSize(9).text(addrStr, left + 8, y, {
    width: contentW - 16,
    align: "left"
  });
  y += doc.heightOfString(addrStr, { width: contentW - 16 }) + 8;
  
  const emailStr = company?.email || "";
  
  if (emailStr) {
    doc.font("Helvetica").fontSize(9).text(`Email: ${emailStr}`, left + 8, y, {
      width: contentW - 16,
      align: "left"
    });
    y += 14;
  }

  if (company?.gstNumber) {
    doc.font("Helvetica").fontSize(8).text(`GST: ${company.gstNumber}`, left, y, { width: contentW, align: "center" });
    y += 12;
  }

  doc.rect(left, companyBoxTop, contentW, y - companyBoxTop).stroke(STROKE);
  y += 12;

  // 3) Bill To | Invoice details — strict 50% / 50%
  const boxH = 72;
  doc.rect(left, y, half, boxH).stroke(STROKE);
  doc.rect(left + half, y, half, boxH).stroke(STROKE);

  const colInnerW = half - 2 * innerPad;
  let yb = y + innerPad;
  doc.font("Helvetica-Bold").fontSize(10).text("Bill To:", left + innerPad, yb);
  yb += 14;
  doc.font("Helvetica").fontSize(9).text(invoice.customer?.name || "-", left + innerPad, yb, { width: colInnerW });
  yb += 12;
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      `Contact No: ${displayPhone(invoice.customer?.phone)}`,
      left + innerPad,
      yb,
      { width: colInnerW }
    );

  const invX = left + half + innerPad;
  let yi = y + innerPad;
  doc.font("Helvetica-Bold").fontSize(10).text("Invoice Details:", invX, yi);
  yi += 14;
  doc.font("Helvetica").fontSize(9).text(`No: ${invoice.invoiceNumber}`, invX, yi, { width: colInnerW });
  yi += 12;
  doc.font("Helvetica").fontSize(9).text(`Date: ${formatDate(invoice.journeyDate)}`, invX, yi, { width: colInnerW });

  y += boxH + 12;

  // 4) Middle row: empty left 50% + financial summary right 50%
  const finH = 100;
  doc.rect(left, y, half, finH).stroke(STROKE);
  doc.rect(left + half, y, half, finH).stroke(STROKE);

  const finX = left + half + innerPad;
  const finW = half - 2 * innerPad;
  let fy = y + 10;
  doc.font("Helvetica-Bold").fontSize(9).text("Total:", finX, fy, { width: 72 });
  doc.font("Helvetica").fontSize(9).text(moneyLabel(invoice.amount), finX + 72, fy, { width: finW - 80, align: "right" });
  fy += 14;
  doc.font("Helvetica-Bold").fontSize(8).text("Invoice Amount In Words:", finX, fy, { width: finW });
  fy += 11;
  doc.font("Helvetica").fontSize(8).text(numberToWordsINR(invoice.amount), finX, fy, { width: finW });
  fy += 24;
  doc.font("Helvetica-Bold").fontSize(9).text("Received:", finX, fy, { width: 72 });
  doc.font("Helvetica").fontSize(9).text(moneyLabel(invoice.amountReceived), finX + 72, fy, {
    width: finW - 80,
    align: "right"
  });
  fy += 14;
  doc.font("Helvetica-Bold").fontSize(9).text("Balance:", finX, fy, { width: 72 });
  doc.font("Helvetica").fontSize(9).text(moneyLabel(invoice.balanceAmount), finX + 72, fy, {
    width: finW - 80,
    align: "right"
  });

  y += finH + 12;

  // 5) Description | Terms — 50% / 50%, auto height
  const descText = invoiceDescriptionText(invoice);
  doc.font("Helvetica").fontSize(9);
  const descTextH = doc.heightOfString(descText, { width: colInnerW });
  const termsH = doc.heightOfString(TERMS_TEXT, { width: colInnerW });
  const headerBand = 24;
  const bottomBoxH = Math.max(72, descTextH + headerBand + 8, termsH + headerBand + 8);

  doc.rect(left, y, half, bottomBoxH).stroke(STROKE);
  doc.rect(left + half, y, half, bottomBoxH).stroke(STROKE);

  doc.font("Helvetica-Bold").fontSize(10).text("Description:", left + innerPad, y + innerPad);
  doc.font("Helvetica").fontSize(9).text(descText, left + innerPad, y + innerPad + 14, { width: colInnerW });

  const termsX = left + half + innerPad;
  doc.font("Helvetica-Bold").fontSize(10).text("Terms And Conditions:", termsX, y + innerPad);
  doc.font("Helvetica").fontSize(9).text(TERMS_TEXT, termsX, y + innerPad + 14, { width: colInnerW });

  y += bottomBoxH + 16;

  // 6) Signature — centered on page, aligned with Authorized Signatory
  const sigPath = localPathFromUploadsUrl(company?.signatureUrl);

  const sigBlockW = 180;
  const sigLeft = right - sigBlockW;
  const fitW = sigBlockW - 24;
  const fitH = 50;

  if (sigPath && fs.existsSync(sigPath)) {
    try {
      doc.image(sigPath, sigLeft + (sigBlockW - fitW) / 2, y, { fit: [fitW, fitH] });
    } catch {
      doc.font("Helvetica").fontSize(8).fillColor("#9CA3AF").text("(Signature)", sigLeft, y + 26, {
        width: sigBlockW,
        align: "right"
      });
    }
  } else {
    doc.font("Helvetica").fontSize(8).fillColor("#9CA3AF").text("(Signature)", sigLeft, y + 26, {
      width: sigBlockW,
      align: "right"
    });
  }
  doc.fillColor("#111827");
  doc.font("Helvetica-Bold").fontSize(9).text("Authorized Signatory", sigLeft, y + 56, {
    width: sigBlockW,
    align: "right"
  });

  doc.end();
  return await done;
}
