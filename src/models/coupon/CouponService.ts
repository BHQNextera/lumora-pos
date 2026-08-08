import type {
    Coupon,
    CouponRedemption,
} from "./Coupon";
import {
    getCouponByCode,
    saveCoupon,
    saveCouponRedemption,
} from "./CouponRepository";

function roundMoney(
    value: number,
) {
    return (
        Math.round(
            (value + Number.EPSILON) *
            100,
        ) / 100
    );
}

export type CouponValidationContext = {
    basketAmount: number;

    customerGroupId?: string;

    branchId?: string;

    channelId?: string;

    now?: Date;
};

export type CouponValidationResult =
    | {
        valid: true;
        coupon: Coupon;
    }
    | {
        valid: false;
        reason:
        | "not_found"
        | "not_active"
        | "expired"
        | "not_started"
        | "basket_too_low"
        | "customer_group_not_allowed"
        | "branch_not_allowed"
        | "channel_not_allowed"
        | "empty_balance";
    };

export function validateCoupon(
    code: string,
    context: CouponValidationContext,
): CouponValidationResult {
    const coupon =
        getCouponByCode(
            code,
        );

    if (!coupon) {
        return {
            valid: false,
            reason: "not_found",
        };
    }

    if (
        coupon.status !==
        "active"
    ) {
        return {
            valid: false,
            reason: "not_active",
        };
    }

    const now =
        context.now ??
        new Date();

    const nowTimestamp =
        now.getTime();

    if (
        coupon.startsAt &&
        new Date(
            coupon.startsAt,
        ).getTime() >
        nowTimestamp
    ) {
        return {
            valid: false,
            reason: "not_started",
        };
    }

    if (
        coupon.endsAt &&
        new Date(
            coupon.endsAt,
        ).getTime() <
        nowTimestamp
    ) {
        return {
            valid: false,
            reason: "expired",
        };
    }

    if (
        (
            coupon.minimumBasketAmount ??
            0
        ) >
        context.basketAmount
    ) {
        return {
            valid: false,
            reason:
                "basket_too_low",
        };
    }

    if (
        coupon.allowedCustomerGroupIds &&
        coupon.allowedCustomerGroupIds
            .length > 0 &&
        (
            !context.customerGroupId ||
            !coupon.allowedCustomerGroupIds.includes(
                context.customerGroupId,
            )
        )
    ) {
        return {
            valid: false,
            reason:
                "customer_group_not_allowed",
        };
    }

    if (
        coupon.allowedBranchIds &&
        coupon.allowedBranchIds
            .length > 0 &&
        (
            !context.branchId ||
            !coupon.allowedBranchIds.includes(
                context.branchId,
            )
        )
    ) {
        return {
            valid: false,
            reason:
                "branch_not_allowed",
        };
    }

    if (
        coupon.allowedChannelIds &&
        coupon.allowedChannelIds
            .length > 0 &&
        (
            !context.channelId ||
            !coupon.allowedChannelIds.includes(
                context.channelId,
            )
        )
    ) {
        return {
            valid: false,
            reason:
                "channel_not_allowed",
        };
    }

    if (
        coupon.valueType ===
        "fixed_amount" &&
        coupon.redemptionPolicy ===
        "partial_balance" &&
        (
            coupon.remainingAmount ??
            coupon.value
        ) <= 0
    ) {
        return {
            valid: false,
            reason:
                "empty_balance",
        };
    }

    return {
        valid: true,
        coupon,
    };
}

export function calculateCouponDiscount(
    coupon: Coupon,
    basketAmount: number,
) {
    const safeBasket =
        roundMoney(
            Math.max(
                0,
                basketAmount,
            ),
        );

    if (safeBasket <= 0) {
        return 0;
    }

    if (
        coupon.valueType ===
        "percentage"
    ) {
        const raw =
            safeBasket *
            (
                coupon.value /
                100
            );

        const capped =
            coupon.maxDiscountAmount !==
                undefined
                ? Math.min(
                    raw,
                    coupon.maxDiscountAmount,
                )
                : raw;

        return roundMoney(
            Math.min(
                safeBasket,
                Math.max(
                    0,
                    capped,
                ),
            ),
        );
    }

    const available =
        coupon.redemptionPolicy ===
            "partial_balance"
            ? (
                coupon.remainingAmount ??
                coupon.value
            )
            : coupon.value;

    return roundMoney(
        Math.min(
            safeBasket,
            Math.max(
                0,
                available,
            ),
        ),
    );
}

export type RedeemCouponInput = {
    code: string;

    basketAmount: number;

    transactionId?: string;

    customerGroupId?: string;

    branchId?: string;

    channelId?: string;
};

export function redeemCoupon(
    input: RedeemCouponInput,
) {
    const validation =
        validateCoupon(
            input.code,
            {
                basketAmount:
                    input.basketAmount,
                customerGroupId:
                    input.customerGroupId,
                branchId:
                    input.branchId,
                channelId:
                    input.channelId,
            },
        );

    if (!validation.valid) {
        throw new Error(
            `Coupon cannot be redeemed: ${validation.reason}`,
        );
    }

    const coupon =
        validation.coupon;

    const discountApplied =
        calculateCouponDiscount(
            coupon,
            input.basketAmount,
        );

    if (
        discountApplied <= 0
    ) {
        throw new Error(
            "Coupon discount is zero",
        );
    }

    const now =
        new Date().toISOString();

    let balanceBefore:
        | number
        | undefined;

    let balanceAfter:
        | number
        | undefined;

    let burnedAmount:
        | number
        | undefined;

    let updatedCoupon:
        Coupon;

    if (
        coupon.valueType ===
        "fixed_amount" &&
        coupon.redemptionPolicy ===
        "partial_balance"
    ) {
        balanceBefore =
            roundMoney(
                coupon.remainingAmount ??
                coupon.value,
            );

        balanceAfter =
            roundMoney(
                Math.max(
                    0,
                    balanceBefore -
                    discountApplied,
                ),
            );

        updatedCoupon = {
            ...coupon,

            remainingAmount:
                balanceAfter,

            status:
                balanceAfter <= 0
                    ? "depleted"
                    : "active",

            updatedAt: now,
        };
    } else {
        /*
         * single_use_burn:
         * ₪100 coupon on an ₪80 transaction applies ₪80,
         * burns the remaining ₪20 and leaves no balance/credit.
         */
        if (
            coupon.valueType ===
            "fixed_amount"
        ) {
            balanceBefore =
                roundMoney(
                    coupon.value,
                );

            balanceAfter = 0;

            burnedAmount =
                roundMoney(
                    Math.max(
                        0,
                        coupon.value -
                        discountApplied,
                    ),
                );
        }

        updatedCoupon = {
            ...coupon,

            remainingAmount:
                coupon.valueType ===
                    "fixed_amount"
                    ? 0
                    : coupon.remainingAmount,

            status:
                "redeemed",

            updatedAt: now,
        };
    }

    saveCoupon(
        updatedCoupon,
    );

    const redemption:
        CouponRedemption = {
        id:
            crypto.randomUUID(),

        couponId:
            coupon.id,

        couponCode:
            coupon.code,

        transactionId:
            input.transactionId,

        originalValue:
            coupon.value,

        discountApplied,

        balanceBefore,

        balanceAfter,

        burnedAmount,

        createdAt: now,
    };

    saveCouponRedemption(
        redemption,
    );

    return {
        coupon:
            updatedCoupon,

        redemption,

        discountApplied,
    };
}