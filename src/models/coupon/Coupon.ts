export type CouponValueType =
    | "fixed_amount"
    | "percentage";

export type CouponRedemptionPolicy =
    | "single_use_burn"
    | "partial_balance";

export type CouponStatus =
    | "active"
    | "redeemed"
    | "depleted"
    | "disabled"
    | "expired";

export type Coupon = {
    id: string;

    code: string;

    name: string;

    status: CouponStatus;

    valueType: CouponValueType;

    /**
     * Fixed amount in currency units or percentage value.
     * Examples:
     * fixed_amount: 100 => ₪100
     * percentage: 20 => 20%
     */
    value: number;

    /**
     * Optional cap for percentage coupons.
     * Example: 20% up to ₪100.
     */
    maxDiscountAmount?: number;

    /**
     * Relevant mainly for fixed_amount coupons.
     *
     * single_use_burn:
     * Coupon is fully consumed on first valid transaction.
     * ₪100 coupon on ₪80 transaction => ₪80 discount and coupon is redeemed.
     *
     * partial_balance:
     * Only the used amount is consumed and the balance remains available.
     */
    redemptionPolicy: CouponRedemptionPolicy;

    /**
     * Remaining monetary balance for partial_balance fixed coupons.
     * For single_use_burn fixed coupons this may equal value until redemption.
     */
    remainingAmount?: number;

    promotionId?: string;

    minimumBasketAmount?: number;

    allowedCustomerGroupIds?: string[];

    allowedBranchIds?: string[];

    allowedChannelIds?: string[];

    startsAt?: string;

    endsAt?: string;

    createdAt: string;

    updatedAt: string;
};

export type CouponRedemption = {
    id: string;

    couponId: string;

    couponCode: string;

    transactionId?: string;

    originalValue: number;

    discountApplied: number;

    balanceBefore?: number;

    balanceAfter?: number;

    burnedAmount?: number;

    createdAt: string;
};