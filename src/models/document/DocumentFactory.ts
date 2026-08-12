import type {
    DocumentType,
    SaleDocument,
} from "./Document";
import {
    allocateDocumentNumber,
} from "./DocumentNumbering";
import {
    resolveDocumentTypes,
} from "./DocumentPolicy";
import {
    getDocumentsForTransaction,
    saveDocument,
} from "./DocumentRepository";
import type {
    Sale,
} from "../sale/Sale";

function buildRuleContext(
    sale: Sale,
) {
    return {
        transactionType:
            sale.transactionType,
        total:
            sale.total,
        hasPositiveLines:
            sale.lines.some(
                (line) =>
                    line.netAmount > 0,
            ),
        hasNegativeLines:
            sale.lines.some(
                (line) =>
                    line.netAmount < 0,
            ),
    };
}

function resolveOriginalDocument(
    sale: Sale,
): SaleDocument | null {
    const originalSaleIds =
        Array.from(
            new Set(
                sale.lines
                    .filter(
                        (line) =>
                            line.kind === "return" &&
                            line.returnSource ===
                            "linked_document" &&
                            Boolean(
                                line.originalSaleId,
                            ),
                    )
                    .map(
                        (line) =>
                            line.originalSaleId!,
                    ),
            ),
        );

    /*
     * SaleDocument currently supports one original document link.
     * A linked return created from one source transaction can therefore
     * be linked safely. If a future transaction contains returns from
     * multiple source transactions, we intentionally do not guess.
     * That case will require a multi-source document-reference model.
     */
    if (
        originalSaleIds.length !== 1
    ) {
        return null;
    }

    const sourceDocuments =
        getDocumentsForTransaction(
            originalSaleIds[0],
        );

    return (
        sourceDocuments[0] ??
        null
    );
}

function createDocument(
    sale: Sale,
    type: DocumentType,
): SaleDocument {
    const allocation =
        allocateDocumentNumber(type);

    const now =
        new Date().toISOString();

    const originalDocument =
        resolveOriginalDocument(
            sale,
        );

    return saveDocument({
        id:
            crypto.randomUUID(),

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

        originalDocumentId:
            originalDocument?.id,

        originalDocumentNumber:
            originalDocument?.number,

        originalIssueAt:
            now,

        outputCount:
            0,

        createdAt:
            now,
    });
}

export function createAccountingDocuments(
    sale: Sale,
): SaleDocument[] {
    const existing =
        getDocumentsForTransaction(
            sale.id,
        );

    const requiredTypes =
        resolveDocumentTypes(
            buildRuleContext(
                sale,
            ),
        );

    const result = [
        ...existing,
    ];

    for (
        const type of
        requiredTypes
    ) {
        if (
            result.some(
                (document) =>
                    document.type ===
                    type,
            )
        ) {
            continue;
        }

        result.push(
            createDocument(
                sale,
                type,
            ),
        );
    }

    return result;
}

// Compatibility wrapper for the current sale flow.
// New document-aware flows should use createAccountingDocuments().
export function createAccountingDocument(
    sale: Sale,
): SaleDocument | null {
    return (
        createAccountingDocuments(
            sale,
        )[0] ??
        null
    );
}