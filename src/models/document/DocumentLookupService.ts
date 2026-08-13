import type {
    SaleDocument,
} from "./Document";
import {
    getDocuments,
} from "./DocumentRepository";
import type {
    Sale,
} from "../sale/Sale";
import {
    getTransaction,
} from "../transaction/TransactionRepository";

export type DocumentLookupResult = {
    document: SaleDocument;
    sale: Sale;
};

export function findByDocumentNumber(
    value: string,
): DocumentLookupResult | null {
    const normalized =
        value.trim();

    if (!normalized) {
        return null;
    }

    const document =
        getDocuments().find(
            (item) =>
                item.number ===
                normalized,
        );

    if (!document) {
        return null;
    }

    const sale =
        getTransaction(
            document.transactionId,
        );

    if (!sale) {
        return null;
    }

    return {
        document,
        sale,
    };
}