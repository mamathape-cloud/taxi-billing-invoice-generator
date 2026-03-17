
function toDateOnly(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export function diffDaysInclusive(fromDate, toDate) {
  const from = toDateOnly(fromDate).getTime();
  const to = toDateOnly(toDate).getTime();
  const days = Math.floor((to - from) / (24 * 60 * 60 * 1000)) + 1;
  return Math.max(days, 1);
}

export function computeTotals({ openingKm, closingKm, amount, amountReceived }) {
  const totalKm = Number(closingKm) - Number(openingKm);
  const balanceAmount = Number(amount) - Number(amountReceived || 0);
  let paymentStatus = "PARTIAL";
  if (balanceAmount === 0) paymentStatus = "FULL";
  else if (Number(amountReceived || 0) === 0) paymentStatus = "PENDING";

  return { totalKm, balanceAmount, paymentStatus };
}

export function formatInvoiceNumber(n) {
  return `INV-${String(n).padStart(4, "0")}`;
}

