import type {
    Coupon,
} from "./Coupon";
import {
    getCoupons,
    saveCoupon,
} from "./CouponRepository";

const now =
    new Date().toISOString();

const testCoupons: Coupon[] = [
    {
        id: "test-coupon-100-burn",

        code: "TEST100",

        name: "₪100 הנחה חד־פעמית",

        status: "active",

        valueType:
            "fixed_amount",

        value: 100,

        redemptionPolicy:
            "single_use_burn",

        remainingAmount: 100,

        createdAt: now,
        updatedAt: now,
    },

    {
        id: "test-coupon-100-balance",

        code: "BALANCE100",

        name: "₪100 עם יתרה",

        status: "active",

        valueType:
            "fixed_amount",

        value: 100,

        redemptionPolicy:
            "partial_balance",

        remainingAmount: 100,

        createdAt: now,
        updatedAt: now,
    },

    {
        id: "test-coupon-20-percent",

        code: "SAVE20",

        name: "20% הנחה",

        status: "active",

        valueType:
            "percentage",

        value: 20,

        maxDiscountAmount: 100,

        redemptionPolicy:
            "single_use_burn",

        createdAt: now,
        updatedAt: now,
    },
];

export function seedCouponsIfEmpty() {
    const current =
        getCoupons();

    if (
        current.length > 0
    ) {
        return current;
    }

    for (
        const coupon of
        testCoupons
    ) {
        saveCoupon(
            coupon,
        );
    }

    return getCoupons();
}