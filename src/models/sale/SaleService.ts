import type { Payment } from "../Payment";
import type { Sale } from "./Sale";
import type { SaleLine } from "./SaleLine";
import { saveSale } from "../transaction/TransactionRepository";

let saleSequence = 1;

function createSaleNumber() {
    const number = saleSequence
        .toString()
        .padStart(6, "0");

    saleSequence += 1;

    return `S-${number}`;
}

export function completeSale(
    lines: SaleLine[],
    payments: Payment[],
): Sale {
    const now = new Date().toISOString();

    const subtotal = lines.reduce(
        (sum, line) => sum + line.grossAmount,
        0,
    );

    const discount = lines.reduce(
        (sum, line) =>
            sum +
            line.lineDiscountAmount +
            line.allocatedSaleDiscountAmount,
        0,
    );

    const total = lines.reduce(
        (sum, line) => sum + line.netAmount,
        0,
    );

    const sale: Sale = {
        id: crypto.randomUUID(),
        number: createSaleNumber(),
        status: "completed",

        lines,

        subtotal,
        discount,
        tax: 0,
        total,

        payments,

        createdAt: now,
        completedAt: now,
    };

    saveSale(sale);

    return sale;
}

export function getNextSaleNumber() {
    return `S-${saleSequence
        .toString()
        .padStart(6, "0")}`;
}