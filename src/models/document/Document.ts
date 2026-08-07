export type DocumentType =
    | "tax_invoice_receipt"
    | "receipt"
    | "tax_credit_invoice"
    | "credit_receipt"
    | "exchange_note"
    | "credit_voucher"
    | "gift_card_receipt";

export type DocumentCopyType =
    | "original"
    | "copy";

export type DocumentStatus =
    | "issued_original"
    | "reissued_copy"
    | "voided";

export type SaleDocument = {
    id: string;

    transactionId: string;
    transactionNumber: string;

    type: DocumentType;
    typeCode: string;

    number: string;

    storeCode: string;
    registerCode: string;
    runningNumber: number;

    status: DocumentStatus;

    originalDocumentId?: string;
    originalDocumentNumber?: string;

    originalIssueAt: string;

    outputCount: number;

    createdAt: string;
};

export type DocumentOutputEvent = {
    id: string;

    documentId: string;

    copyType: DocumentCopyType;

    channel:
    | "screen"
    | "print"
    | "whatsapp"
    | "email";

    employeeId?: string;
    registerCode: string;

    createdAt: string;
};