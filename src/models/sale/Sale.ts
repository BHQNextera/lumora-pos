import type { Payment } from "../Payment";
import type { CouponRedemptionPolicy, CouponValueType } from "../coupon/Coupon";
import type { SaleLine } from "./SaleLine";

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

    createdAt: string;
    completedAt?: string;
};
