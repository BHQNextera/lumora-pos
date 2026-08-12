export type SaleLineKind =
    | "sale"
    | "return";

export type SaleLineSource =
    | "catalog"
    | "calculator";

export type ReturnSource =
    | "linked_document"
    | "without_document";

export type AppliedSalePromotion = {
    id: string;
    name: string;
    discountAmount: number;
};

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

    /**
     * Promotions that actually participated in pricing this line.
     * A promotion may appear with discountAmount=0 when the line
     * participated in the promotion but another line carried the
     * monetary discount (for example the paid item in 1+1).
     */
    appliedPromotions?: AppliedSalePromotion[];

    netAmount: number;

    returnSource?: ReturnSource;
    returnReason?: string;

    originalSaleId?: string;
    originalSaleNumber?: string;
    originalSaleLineId?: string;

    originalDocumentId?: string;
    originalDocumentNumber?: string;
};
