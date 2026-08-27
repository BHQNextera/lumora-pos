import type {
    SupplierDocumentAttachment,
} from "./SupplierDocumentAttachment";

export type SupplierInvoiceStatus =
    | "draft"
    | "posted"
    | "cancelled";

export type SupplierInvoiceDocumentLine = {
    key: string;

    product: {
        id: string;
        name: string;
        sku: string;
        variantId?: string;
        variantLabel?: string;
    };

    previousQuantity: number;

    /**
     * Drafts may contain incomplete lines. Posted documents always
     * contain concrete quantity / cost values.
     */
    receivedQuantity: number | null;
    resultingQuantity: number | null;
    unitCostBeforeVat: number | null;

    /** Exact draft text, kept so reopening a draft does not lose input. */
    enteredQuantity: string;
    enteredUnitCost: string;

    previousUnitCostBeforeVat?: number;
    vatRate: number;
    lineNet: number;
    lineVat: number;
    lineGross: number;
};

export type SupplierInvoiceDocument = {
    id: string;

    /** Assigned only when the document is posted. */
    documentNumber?: string;

    status:
        SupplierInvoiceStatus;

    tenantId: string;
    storeCode: string;
    registerCode: string;

    createdAt: string;
    updatedAt: string;
    postedAt?: string;

    supplier: {
        id?: string;
        name: string;
    };

    /** The number/reference printed on the supplier's own invoice. */
    supplierInvoiceNumber: string;
    invoiceDate: string;
    note: string;

    attachments:
        SupplierDocumentAttachment[];

    receivedBy?: {
        employeeId: string;
        employeeName: string;
    };

    lines:
        SupplierInvoiceDocumentLine[];

    totals: {
        net: number;
        vat: number;
        gross: number;
    };
};
