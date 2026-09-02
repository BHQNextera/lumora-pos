import type { PosActionAuthorization } from "../employee/PosActionAuthorization";
import type {
    ProductVariantIdentity,
} from "../catalog/ProductVariantIdentity";
import type {
    Product,
} from "../../types/product";
import type {
    SellerAssignment,
} from "./SellerAssignment";

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

    /**
     * Exact product variant identity captured for this transaction.
     *
     * Used by segment models such as Fashion.
     * This is a transaction snapshot and must not depend on the
     * current state of the product master after the sale.
     */
    variant?: ProductVariantIdentity;

    seller?: SellerAssignment;

    quantity: number;
    unitPrice: number;

    originalUnitPrice?: number;
    priceOverrideAuthorization?: PosActionAuthorization;
    lineDiscountAuthorization?: PosActionAuthorization;

    /**
     * Transaction-only description.
     * Never changes the catalog/master product name.
     */
    descriptionOverride?: string;

    /**
     * Operator note for this transaction line.
     *
     * This is separate from descriptionOverride:
     * descriptionOverride changes the transaction display
     * description, while note is operational information.
     */
    note?: string;

    /**
     * When true, the line note may be included in the
     * customer-facing accounting document.
     *
     * Default behaviour is false / internal only.
     */
    printNoteOnDocument?: boolean;

    lineDiscountAmount: number;
    allocatedSaleDiscountAmount: number;

    returnSource?: ReturnSource;
    returnReason?: string;

    origin?: CartLineOrigin;
};