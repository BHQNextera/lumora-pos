import type { Payment } from "../Payment";
import type { CouponRedemptionPolicy, CouponValueType } from "../coupon/Coupon";
import type { SaleLine } from "./SaleLine";
import type { PosActionAuthorization } from "../employee/PosActionAuthorization";

export type SaleStatus =
    | "draft"
    | "completed"
    | "cancelled";

export type TransactionType =
    | "sale"
    | "return"
    | "exchange";

export type SaleCustomer = {
    id?: string;
    name: string;
    phone?: string;
    groupIds?: string[];
    isClubMember?: boolean;
};

export type StoreCreditObligoSnapshot = {
    beforeBalance: number;
    creditLimit: number;

    /**
     * Positive = new store-credit charge.
     * Negative = debt reduction on return/refund.
     */
    movementAmount: number;

    afterBalance: number;
};
export type AppliedSaleCoupon = {
    couponId: string;
    code: string;
    name: string;

    valueType: CouponValueType;
    originalValue: number;

    redemptionPolicy:
    CouponRedemptionPolicy;

    discountApplied: number;
};

export type Sale = {
    id: string;
    number: string;

    status: SaleStatus;
    transactionType: TransactionType;


    shiftId?: string;
customer: SaleCustomer;

    lines: SaleLine[];

    subtotal: number;
    discount: number;

    transactionDiscountAuthorization?: PosActionAuthorization;


    returnRefundAuthorization?: PosActionAuthorization;
coupon?: AppliedSaleCoupon;

    /**
     * Transaction/document-level operator note.
     *
     * Stored on the transaction even when it is
     * internal only and not printed.
     */
    documentNote?: string;

    /**
     * Explicit permission to include documentNote
     * in the customer-facing accounting document.
     *
     * Missing / false means internal only.
     */
    printDocumentNote?: boolean;

    cancellationFeeAmount?: number;

    tax: number;
    total: number;

    payments: Payment[];

    /**
     * Historical customer-account snapshot for this
     * transaction. Never recalculated from the customer's
     * later balance.
     */
    storeCreditObligo?:
        StoreCreditObligoSnapshot;

    createdAt: string;
    completedAt?: string;
};
