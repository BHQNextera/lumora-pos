import type { PosActionAuthorization } from "../employee/PosActionAuthorization";
import type {
    ProductVariantIdentity,
} from "../catalog/ProductVariantIdentity";
import type {
    SellerAssignment,
} from "./SellerAssignment";
import type {
    ProductTaxClass,
} from "../../types/product";
import type {
    SaleLineTaxSnapshot,
} from "../tax/TaxPolicy";

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
     * Exact product variant identity at transaction time.
     *
     * Example:
     * Style SHIRT-101 / Black / M.
     *
     * This snapshot remains immutable even if the catalog
     * definition changes later.
     */
    variant?: ProductVariantIdentity;

    seller?: SellerAssignment;

    /**
     * Transaction-only description.
     */
    descriptionOverride?: string;

    /**
     * Line note captured with the completed transaction.
     */
    note?: string;

    /**
     * Whether the line note was approved for inclusion
     * in the customer-facing accounting document.
     */
    printNoteOnDocument?: boolean;

    sku: string;
    barcode: string;

    quantity: number;
    unitPrice: number;

    originalUnitPrice?: number;
    priceOverrideAuthorization?: PosActionAuthorization;
    lineDiscountAuthorization?: PosActionAuthorization;

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

    /**
     * Product tax classification captured at transaction time.
     * Legacy transactions may omit it and are treated as standard.
     */
    taxClass?: ProductTaxClass;

    /**
     * Immutable effective tax treatment for this exact line.
     *
     * This prevents later changes to VAT rate, branch profile or
     * product master data from rewriting transaction history.
     */
    taxSnapshot?: SaleLineTaxSnapshot;

    returnSource?: ReturnSource;
    returnReason?: string;

    originalSaleId?: string;
    originalSaleNumber?: string;
    originalSaleLineId?: string;

    originalDocumentId?: string;
    originalDocumentNumber?: string;
};