import type { Sale } from "../sale/Sale";
import {
    getDocumentsForTransaction,
} from "../document/DocumentRepository";

export type TransactionFilter = {
    text: string;
};

export function filterTransactions(
    transactions: Sale[],
    filter: TransactionFilter,
) {
    const value =
        filter.text
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

        const customerName =
            sale.customer?.name ??
            "לקוח מזדמן";

        if (
            customerName
                .toLowerCase()
                .includes(value)
        ) {
            return true;
        }

        const documents =
            getDocumentsForTransaction(
                sale.id,
            );

        const matchesDocument =
            documents.some((document) => {
                return (
                    document.number
                        .toLowerCase()
                        .includes(value) ||
                    document.typeCode
                        .toLowerCase()
                        .includes(value)
                );
            });

        if (matchesDocument) {
            return true;
        }

        return sale.lines.some((line) => {
            return (
                line.productName
                    .toLowerCase()
                    .includes(value) ||
                line.sku
                    .toLowerCase()
                    .includes(value) ||
                line.barcode.includes(value)
            );
        });
    });
}