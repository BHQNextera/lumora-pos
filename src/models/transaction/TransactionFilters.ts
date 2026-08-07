import type { Sale } from "../sale/Sale";

export type TransactionFilter = {
    text: string;
};

export function filterTransactions(
    transactions: Sale[],
    filter: TransactionFilter,
) {
    const value = filter.text
        .trim()
        .toLowerCase();

    if (!value) {
        return transactions;
    }

    return transactions.filter((sale) => {
        if (
            sale.number
                .toLowerCase()
                .includes(value)
        ) {
            return true;
        }

        return sale.lines.some(
            (line) =>
                line.productName
                    .toLowerCase()
                    .includes(value) ||
                line.sku
                    .toLowerCase()
                    .includes(value) ||
                line.barcode.includes(value),
        );
    });
}