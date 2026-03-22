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

// FIXED phone display (no "-" issue)
function displayPhone(s) {
if (!s) return "";
let t = String(s).trim();
t = t.replace(/^[-\u2013\u2014]+/, "").trim();
t = t.replace(/[^\d+]/g, "");
return t;
}

function numberToWordsINR(amount) {
const n = Math.floor(Number(amount || 0));
if (!Number.isFinite(n)) return "";
if (n === 0) return "Zero Rupees Only";

const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten",
"Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];

const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];

const twoDigits = (x) => {
if (x < 20) return ones[x];
return `${tens[Math.floor(x / 10)]} ${ones[x % 10]}`.trim();
};

const threeDigits = (x) => {
const h = Math.floor(x / 100);
const r = x % 100;
return `${h ? ones[h] + " Hundred " : ""}${twoDigits(r)}`.trim();
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

if (num) parts.push(threeDigits(num));

return `${parts.join(" ")} Rupees Only`.replace(/\s+/g, " ").trim();
}

function invoiceDescriptionText(inv) {
const d = inv.description && String(inv.description).trim();
if (d) return d;
if (inv.tripFrom && inv.tripTo) return `${inv.tripFrom} → ${inv.tripTo}`;
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

// TITLE
doc.font("Helvetica-Bold").fontSize(14).text("Tax Invoice", left, y, {
width: contentW,
align: "center"
});
y += 22;

// COMPANY BLOCK
const companyBoxTop = y;
const logoRowH = 78;

const logoPath = localPathFromUploadsUrl(company?.logoUrl);
if (logoPath && fs.existsSync(logoPath)) {
try {
doc.image(logoPath, left + 10, y + 6, { fit: [64, 64] });
} catch {}
}

// MOBILE (RIGHT SIDE)
const phones = (company?.phone || "").split(/[,;\n]+/);
let mobY = y + 8;
const mobX = right - 130;

doc.font("Helvetica-Bold").fontSize(9).text("Mob :", mobX, mobY, { width: 120, align: "right" });
mobY += 11;

doc.font("Helvetica").fontSize(9);
phones.forEach((p) => {
const clean = displayPhone(p);
if (clean) {
doc.text(clean, mobX, mobY, { width: 120, align: "right" });
mobY += 11;
}
});

y += logoRowH;
doc.moveTo(left, y).lineTo(right, y).stroke(STROKE);

// COMPANY NAME (LEFT ALIGNED)
doc.font("Helvetica-Bold").fontSize(13).text(company?.companyName || "Company Name", left + 8, y + 6);
y += 24;

// ADDRESS
doc.font("Helvetica").fontSize(9).text(company?.address || "-", left + 8, y);
y += doc.heightOfString(company?.address || "-") + 6;

// EMAIL ONLY
if (company?.email) {
doc.text(`Email: ${company.email}`, left + 8, y);
y += 14;
}

doc.rect(left, companyBoxTop, contentW, y - companyBoxTop).stroke(STROKE);
y += 12;

// BILL + INVOICE
const boxH = 72;
doc.rect(left, y, half, boxH).stroke(STROKE);
doc.rect(left + half, y, half, boxH).stroke(STROKE);

doc.font("Helvetica-Bold").fontSize(10).text("Bill To:", left + innerPad, y + 10);
doc.font("Helvetica").fontSize(9).text(invoice.customer?.name || "-", left + innerPad, y + 24);
doc.text(`Contact No: ${displayPhone(invoice.customer?.phone)}`, left + innerPad, y + 38);

const invX = left + half + innerPad;
doc.font("Helvetica-Bold").text("Invoice Details:", invX, y + 10);
doc.font("Helvetica").text(`No: ${invoice.invoiceNumber}`, invX, y + 24);
doc.text(`Date: ${formatDate(invoice.journeyDate)}`, invX, y + 38);

y += boxH + 12;

// FINANCIAL
const finH = 100;
doc.rect(left, y, half, finH).stroke(STROKE);
doc.rect(left + half, y, half, finH).stroke(STROKE);

let fy = y + 10;
const fx = left + half + innerPad;

doc.font("Helvetica-Bold").text("Total:", fx, fy);
doc.font("Helvetica").text(moneyLabel(invoice.amount), fx + 100, fy, { align: "right" });

fy += 14;
doc.font("Helvetica-Bold").text("Received:", fx, fy);
doc.font("Helvetica").text(moneyLabel(invoice.amountReceived), fx + 100, fy, { align: "right" });

fy += 14;
doc.font("Helvetica-Bold").text("Balance:", fx, fy);
doc.font("Helvetica").text(moneyLabel(invoice.balanceAmount), fx + 100, fy, { align: "right" });

fy += 20;
doc.font("Helvetica-Bold").text("Amount in words:", fx, fy);
fy += 12;
doc.font("Helvetica").text(numberToWordsINR(invoice.amount), fx, fy, { width: half - 16 });

y += finH + 12;

// DESCRIPTION + TERMS
const desc = invoiceDescriptionText(invoice);
const descH = doc.heightOfString(desc, { width: half - 16 });
const termsH = doc.heightOfString(TERMS_TEXT, { width: half - 16 });
const h = Math.max(72, descH + 30, termsH + 30);

doc.rect(left, y, half, h).stroke(STROKE);
doc.rect(left + half, y, half, h).stroke(STROKE);

doc.font("Helvetica-Bold").text("Description:", left + innerPad, y + 10);
doc.font("Helvetica").text(desc, left + innerPad, y + 24);

doc.font("Helvetica-Bold").text("Terms And Conditions:", left + half + innerPad, y + 10);
doc.font("Helvetica").text(TERMS_TEXT, left + half + innerPad, y + 24);

y += h + 20;

// SIGNATURE (RIGHT ALIGNED)
const sigPath = localPathFromUploadsUrl(company?.signatureUrl);
const sigWidth = 150;
const sigX = right - sigWidth;

if (sigPath && fs.existsSync(sigPath)) {
try {
doc.image(sigPath, sigX, y, { fit: [sigWidth, 50] });
} catch {}
}

doc.font("Helvetica-Bold").text("Authorized Signatory", sigX, y + 55, {
width: sigWidth,
align: "right"
});

doc.end();
return await done;
}
