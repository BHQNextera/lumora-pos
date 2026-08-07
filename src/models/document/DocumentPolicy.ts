import type {
    DocumentType,
} from "./Document";

export type DocumentTypeDefinition = {
    type: DocumentType;
    code: string;
};

export type DocumentPolicy = {
    salesDocumentType:
    | "tax_invoice_receipt"
    | "receipt";

    creditDocumentType:
    | "tax_credit_invoice"
    | "credit_receipt";

    documentTypes: Record<
        DocumentType,
        DocumentTypeDefinition
    >;
};

export const currentRegister = {
    storeCode: "01",
    registerCode: "02",
};

export const documentPolicy: DocumentPolicy = {
    salesDocumentType:
        "tax_invoice_receipt",

    creditDocumentType:
        "tax_credit_invoice",

    documentTypes: {
        tax_invoice_receipt: {
            type: "tax_invoice_receipt",
            code: "01",
        },

        receipt: {
            type: "receipt",
            code: "02",
        },

        tax_credit_invoice: {
            type: "tax_credit_invoice",
            code: "03",
        },

        credit_receipt: {
            type: "credit_receipt",
            code: "04",
        },

        exchange_note: {
            type: "exchange_note",
            code: "05",
        },

        credit_voucher: {
            type: "credit_voucher",
            code: "06",
        },

        gift_card_receipt: {
            type: "gift_card_receipt",
            code: "07",
        },
    },
};