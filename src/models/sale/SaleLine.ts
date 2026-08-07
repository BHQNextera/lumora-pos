export type SaleLineKind =
    | "sale"
    | "return";

export type SaleLineSource =
    | "catalog"
    | "calculator";

export type ReturnSource =
    | "linked_document"
    | "without_document";

export type SaleLine = {
    id: string;

    kind: SaleLineKind;
    source: SaleLineSource;

    productId: string;

    /**
     * Original master/catalog name.
     */
    productName: string;

    /**
     * Transaction-only description.
     */
    descriptionOverride?: string;

    sku: string;
    barcode: string;

    quantity: number;
    unitPrice: number;

    originalUnitPrice?: number;

    grossAmount: number;

    lineDiscountAmount: number;
    allocatedSaleDiscountAmount: number;

    netAmount: number;

    returnSource?: ReturnSource;
    returnReason?: string;

    originalSaleId?: string;
    originalSaleNumber?: string;
    originalSaleLineId?: string;
};