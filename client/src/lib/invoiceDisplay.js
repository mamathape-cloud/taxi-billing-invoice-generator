/** Short line for lists / history: description, or legacy trip, or em dash */
export function invoiceRouteSummary(inv) {
  if (inv?.description && String(inv.description).trim()) {
    const s = String(inv.description).trim();
    return s.length > 55 ? `${s.slice(0, 52)}…` : s;
  }
  if (inv?.tripFrom && inv?.tripTo && inv.tripFrom !== "-") {
    return `${inv.tripFrom} → ${inv.tripTo}`;
  }
  return "—";
}
