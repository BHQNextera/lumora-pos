import type {
    SaleDocument,
} from "./Document";
import {
    allocateDocumentNumber,
} from "./DocumentNumbering";
import {
    documentPolicy,
} from "./DocumentPolicy";
import {
    saveDocument,
} from "./DocumentRepository";
import type {
    Sale,
} from "../sale/Sale";

function getDocumentTypeForTransaction(
    sale: Sale,
) {
    if (sale.total < 0) {
        return documentPolicy
            .creditDocumentType;
    }

    return documentPolicy
        .salesDocumentType;
}

export function createAccountingDocument(
    sale: Sale,
): SaleDocument | null {
    if (
        Math.abs(sale.total) <
        0.001
    ) {
        return null;
    }

    const type =
        getDocumentTypeForTransaction(
            sale,
        );

    const allocation =
        allocateDocumentNumber(
            type,
        );

    const now =
        new Date().toISOString();

    const document: SaleDocument = {
        id: crypto.randomUUID(),

        transactionId:
            sale.id,

        transactionNumber:
            sale.number,

        type,

        typeCode:
            allocation.documentTypeCode,

        number:
            allocation.documentNumber,

        storeCode:
            allocation.storeCode,

        registerCode:
            allocation.registerCode,

        runningNumber:
            allocation.runningNumber,

        status:
            "issued_original",

        originalIssueAt:
            now,

        outputCount: 1,

        createdAt: now,
    };

    saveDocument(document);

    return document;
}