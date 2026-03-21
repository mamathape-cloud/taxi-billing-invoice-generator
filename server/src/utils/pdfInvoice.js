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

function companyPhoneLines(phone) {
  if (!phone) return [];
  return String(phone)
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
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
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));

  const done = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const pageWidth = doc.page.width;
  const left = 40;
  const right = pageWidth - 40;
  const contentW = right - left;

  let y = 45;

  // Top row: logo left, phone(s) right
  const logoPath = localPathFromUploadsUrl(company?.logoUrl);
  const logoTop = y;
  if (logoPath && fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, left, y, { fit: [72, 72] });
    } catch {
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text("LOGO", left, y + 28);
    }
  } else {
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text("LOGO", left, y + 28);
  }

  doc.fillColor("#111827");
  const phones = companyPhoneLines(company?.phone);
  let phoneY = y;
  doc.font("Helvetica-Bold").fontSize(9).text("Phone:", right - 140, phoneY, { width: 140, align: "right" });
  phoneY += 12;
  doc.font("Helvetica").fontSize(9);
  if (phones.length) {
    for (const p of phones.slice(0, 4)) {
      doc.text(p, right - 140, phoneY, { width: 140, align: "right" });
      phoneY += 11;
    }
  } else {
    doc.text("-", right - 140, phoneY, { width: 140, align: "right" });
    phoneY += 11;
  }

  y = Math.max(y + 78, phoneY + 8);

  // Company name + address (centered, like sample)
  doc.fillColor("#111827");
  doc.font("Helvetica-Bold").fontSize(15).text(company?.companyName || "Company Name", left, y, {
    width: contentW,
    align: "center"
  });
  y += 20;
  doc.font("Helvetica").fontSize(9).text(company?.address || "-", left, y, { width: contentW, align: "center" });
  y += doc.heightOfString(company?.address || "-", { width: contentW }) + 6;

  if (company?.email) {
    doc.font("Helvetica").fontSize(8).text(`Email: ${company.email}`, left, y, { width: contentW, align: "center" });
    y += 12;
  }
  if (company?.gstNumber) {
    doc.font("Helvetica").fontSize(8).text(`GST: ${company.gstNumber}`, left, y, { width: contentW, align: "center" });
    y += 12;
  }

  y += 8;
  doc.font("Helvetica-Bold").fontSize(12).text("Tax Invoice", left, y, { width: contentW, align: "center" });
  y += 22;

  // Bill To | Invoice details
  const colW = contentW / 2 - 6;
  const boxH = 72;
  doc.rect(left, y, colW, boxH).stroke("#E5E7EB");
  doc.rect(left + colW + 12, y, colW, boxH).stroke("#E5E7EB");

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

  y += boxH + 14;

  // Financial summary (right block style from sample)
  const finW = 220;
  const finX = right - finW;
  const finH = 88;
  doc.rect(finX, y, finW, finH).stroke("#E5E7EB");
  let fy = y + 10;
  doc.font("Helvetica-Bold").fontSize(9).text("Total:", finX + 8, fy, { width: 80 });
  doc.font("Helvetica").fontSize(9).text(`₹ ${money(invoice.amount)}`, finX + 88, fy, { width: finW - 96, align: "right" });
  fy += 14;
  doc.font("Helvetica-Bold").fontSize(8).text("Invoice Amount In Words:", finX + 8, fy, { width: finW - 16 });
  fy += 11;
  doc.font("Helvetica").fontSize(8).text(numberToWordsINR(invoice.amount), finX + 8, fy, { width: finW - 16 });
  fy += 22;
  doc.font("Helvetica-Bold").fontSize(9).text("Received:", finX + 8, fy, { width: 80 });
  doc.font("Helvetica").fontSize(9).text(`₹ ${money(invoice.amountReceived)}`, finX + 88, fy, {
    width: finW - 96,
    align: "right"
  });
  fy += 14;
  doc.font("Helvetica-Bold").fontSize(9).text("Balance:", finX + 8, fy, { width: 80 });
  doc.font("Helvetica").fontSize(9).text(`₹ ${money(invoice.balanceAmount)}`, finX + 88, fy, {
    width: finW - 96,
    align: "right"
  });

  y += finH + 14;

  // Description (left) + Terms (right)
  const descColW = contentW / 2 - 6;
  const descText = invoiceDescriptionText(invoice);
  doc.font("Helvetica").fontSize(9);
  const descTextH = doc.heightOfString(descText, { width: descColW - 16 });
  const termsH = doc.heightOfString("Thank you for doing business with us.", { width: descColW - 16 });
  const bottomBoxH = Math.max(100, descTextH + 36, termsH + 36);

  doc.rect(left, y, descColW, bottomBoxH).stroke("#E5E7EB");
  doc.rect(left + descColW + 12, y, descColW, bottomBoxH).stroke("#E5E7EB");

  doc.font("Helvetica-Bold").fontSize(10).text("Description:", left + 8, y + 8);
  doc.font("Helvetica").fontSize(9).text(descText, left + 8, y + 24, { width: descColW - 16 });

  doc.font("Helvetica-Bold").fontSize(10).text("Terms And Conditions:", left + descColW + 20, y + 8);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text("Thank you for doing business with us.", left + descColW + 20, y + 24, { width: descColW - 16 });

  y += bottomBoxH + 20;

  // Signature block bottom right
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

  doc.end();
  return await done;
}

