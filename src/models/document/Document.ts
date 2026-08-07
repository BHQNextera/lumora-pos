export type DocumentType =
    | "tax_invoice_receipt"
    | "receipt"
    | "credit_invoice"
    | "exchange_note";

export type DocumentCopyType =
    | "original"
    | "copy";

export type SaleDocument = {
    id: string;

    saleId: string;
    saleNumber: string;

    type: DocumentType;
    copyType: DocumentCopyType;

    number: string;

    issueCount: number;

    issuedAt: string;
};