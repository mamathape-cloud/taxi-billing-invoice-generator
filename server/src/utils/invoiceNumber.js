import { formatInvoiceNumber } from "./invoiceMath.js";

export async function getNextInvoiceNumber(prisma) {
  return await prisma.$transaction(async (tx) => {
    const counter = await tx.invoiceCounter.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, current: 0 }
    });

    const next = counter.current + 1;
    await tx.invoiceCounter.update({
      where: { id: 1 },
      data: { current: next }
    });

    return formatInvoiceNumber(next);
  });
}

