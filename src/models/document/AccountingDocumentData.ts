import type {
    DocumentCopyType,
    DocumentType,
} from "./Document";

export type AccountingDocumentBusiness = {
    name: string;
    branchName?: string;

    businessNumber?: string;
    vatNumber?: string;

    address?: string;
    phone?: string;
};

export type AccountingDocumentCustomer = {
    id?: string;
    name: string;
    phone?: string;
};

export type AccountingDocumentLine = {
    id: string;

    kind:
        | "sale"
        | "return";

    productName: string;
    description?: string;

    sku?: string;
    barcode?: string;

    quantity: number;
    unitPrice: number;

    grossAmount: number;

    lineDiscountAmount: number;
    allocatedSaleDiscountAmount: number;

    /**
     * Total discount allocated to this line.
     * Kept for renderer/reporting compatibility.
     */
    discountAmount: number;

    netAmount: number;

    promotionNames: string[];

    sourceDocument?: {
        id?: string;
        number: string;
    };
};

export type AccountingDocumentPayment = {
    id: string;

    method: string;
    label: string;

    amount: number;

    tenderedAmount?: number;
    changeAmount?: number;

    externalReference?: string;
    providerReference?: string;
};

export type AccountingDocumentTotals = {
    subtotal: number;
    discount: number;

    beforeTax: number;
    tax: number;

    total: number;
};

export type AccountingDocumentIdentity = {
    documentId?: string;

    type?: DocumentType;
    title: string;

    number: string;

    copyType: DocumentCopyType;

    transactionId: string;
    transactionNumber: string;

    storeCode?: string;
    registerCode?: string;

    issuedAt: string;

    /**
     * Document-level source is used only when the whole
     * accounting document derives from one source document.
     *
     * Mixed exchanges keep source identity at return-line level.
     */
    originalDocument?: {
        id?: string;
        number: string;
    };
};

export type AccountingDocumentBarcode = {
    value: string;

    /**
     * Human-readable value printed below
     * the machine-readable barcode.
     */
    displayValue: string;
};

export type AccountingDocumentData = {
    identity:
        AccountingDocumentIdentity;

    business:
        AccountingDocumentBusiness;

    customer:
        AccountingDocumentCustomer;

    lines:
        AccountingDocumentLine[];

    cancellationFeeAmount?: number;

    totals:
        AccountingDocumentTotals;

    payments:
        AccountingDocumentPayment[];

    barcode:
        AccountingDocumentBarcode;

    legalLines:
        string[];
};
