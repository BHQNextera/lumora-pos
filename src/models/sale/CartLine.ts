import type { Product } from "../../types/product";

export type CartLineKind =
    | "sale"
    | "return";

export type CartLineSource =
    | "catalog"
    | "calculator";

export type ReturnSource =
    | "linked_document"
    | "without_document";

export type CartLineOrigin = {
    saleId: string;
    saleNumber: string;
    saleLineId: string;

    documentId?: string;
    documentNumber?: string;
};

export type CartLine = {
    id: string;

    kind: CartLineKind;
    source: CartLineSource;

    product: Product;

    quantity: number;
    unitPrice: number;

    originalUnitPrice?: number;

    /**
     * Transaction-only description.
     * Never changes the catalog/master product name.
     */
    descriptionOverride?: string;

    lineDiscountAmount: number;
    allocatedSaleDiscountAmount: number;

    returnSource?: ReturnSource;
    returnReason?: string;

    origin?: CartLineOrigin;
};
