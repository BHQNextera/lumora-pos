import type {
    SupplierDocumentAttachment,
} from "./SupplierDocumentAttachment";

export type SupplierReturnStatus =
    | "draft"
    | "posted"
    | "cancelled";

export type SupplierReturnDocumentLine = {
    key: string;

    product: {
        id: string;
        name: string;
        sku: string;
        variantId?: string;
        variantLabel?: string;
    };

    sourceInvoiceLineKey?: string;

    previousQuantity: number;
    returnedQuantity: number | null;
    resultingQuantity: number | null;
    unitCostBeforeVat: number | null;

    enteredQuantity: string;
    enteredUnitCost: string;

    vatRate: number;
    lineNet: number;
    lineVat: number;
    lineGross: number;
};

export type SupplierReturnDocument = {
    id: string;
    documentNumber?: string;
    status: SupplierReturnStatus;

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

    returnDate: string;
    supplierReferenceNumber: string;
    note: string;

    sourceSupplierInvoice?: {
        id: string;
        documentNumber?: string;
        supplierInvoiceNumber: string;
    };

    returnedBy?: {
        employeeId: string;
        employeeName: string;
    };

    attachments:
        SupplierDocumentAttachment[];

    lines:
        SupplierReturnDocumentLine[];

    totals: {
        net: number;
        vat: number;
        gross: number;
    };
};
