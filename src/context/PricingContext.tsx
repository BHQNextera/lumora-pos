import {
    createContext,
} from "react";

import type {
    PricingResult,
} from "../models/pricing/PricingEngine";
import type {
    PricingRule,
} from "../models/pricing/PricingRule";
import type {
    Promotion,
} from "../models/promotion/Promotion";
import type {
    CartLine,
} from "../models/sale/CartLine";
import type {
    Coupon,
} from "../models/coupon/Coupon";

export type PricingContextValue = {
    cartLines: CartLine[];

    pricingRules: PricingRule[];

    promotions: Promotion[];

    appliedCoupon: Coupon | null;

    couponDiscountAmount: number;

    totalAfterCoupon: number;

    pricing: PricingResult;

    setCartLines: (
        lines: CartLine[],
    ) => void;

    updateCartLines: (
        updater: (
            current: CartLine[],
        ) => CartLine[],
    ) => void;

    setPricingRules: (
        rules: PricingRule[],
    ) => void;

    addPricingRule: (
        rule: PricingRule,
    ) => void;

    removePricingRule: (
        ruleId: string,
    ) => void;

    clearPricingRules: () => void;

    setPromotions: (
        promotions: Promotion[],
    ) => void;

    addPromotion: (
        promotion: Promotion,
    ) => void;

    removePromotion: (
        promotionId: string,
    ) => void;

    togglePromotion: (
        promotionId: string,
        isActive: boolean,
    ) => void;

    applyCoupon: (
        code: string,
    ) => {
        success: boolean;
        reason?: string;
    };

    removeCoupon: () => void;

    recalculate: () => void;
};

export const PricingContext =
    createContext<
        PricingContextValue | undefined
    >(undefined);