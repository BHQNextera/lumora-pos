export type InventoryAdjustmentReason =
    | "stock_count"
    | "damage"
    | "loss"
    | "receiving_error"
    | "manual_correction"
    | "other";

export type InventoryAdjustmentDocumentStatus =
    | "draft"
    | "posted";

export type InventoryAdjustmentDocumentFilters = {
    name: string;
    sku: string;
    barcode: string;
    supplier: string;
    department: string;
    category: string;
    subcategory: string;
};

export type InventoryAdjustmentDocumentLine = {
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
     * Drafts may contain an incomplete / blank entry.
     * Posted documents always contain a concrete non-negative integer.
     */
    resultingQuantity: number | null;

    /**
     * Keeps the exact draft entry so a draft can be reopened safely.
     */
    enteredQuantity: string;

    difference: number | null;
};

export type InventoryAdjustmentDocument = {
    id: string;

    /**
     * Assigned only when the document is posted.
     * Drafts intentionally do not consume document numbers.
     */
    documentNumber?: string;

    status:
        InventoryAdjustmentDocumentStatus;

    tenantId: string;
    storeCode: string;
    registerCode: string;

    createdAt: string;
    updatedAt: string;
    postedAt?: string;

    filters:
        InventoryAdjustmentDocumentFilters;

    reason:
        InventoryAdjustmentReason;

    note: string;

    performedBy?: {
        employeeId: string;
        employeeName: string;
    };

    lines:
        InventoryAdjustmentDocumentLine[];
};

export type InventoryAdjustment = {
    id: string;

    tenantId: string;
    storeCode: string;
    registerCode: string;

    createdAt: string;

    /**
     * V1 document grouping.
     * Older persisted rows may not contain these fields and are migrated
     * into historical documents during repository hydration.
     */
    documentId?: string;
    documentNumber?: string;

    product: {
        id: string;
        name: string;
        sku: string;
        variantId?: string;
        variantLabel?: string;
    };

    previousQuantity: number;
    resultingQuantity: number;
    difference: number;

    reason:
        InventoryAdjustmentReason;

    note: string;

    performedBy?: {
        employeeId: string;
        employeeName: string;
    };
};
