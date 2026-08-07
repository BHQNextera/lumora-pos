import type { PricingResult } from "./PricingEngine";

export type PricingSnapshot = {
    subtotal: number;

    lineDiscountTotal: number;

    transactionDiscountTotal: number;

    totalDiscount: number;

    total: number;
};

export function createPricingSnapshot(
    pricing: PricingResult,
): PricingSnapshot {
    return {
        subtotal:
            pricing.subtotal,

        lineDiscountTotal:
            pricing.lineDiscountTotal,

        transactionDiscountTotal:
            pricing.transactionDiscountTotal,

        totalDiscount:
            pricing.totalDiscount,

        total:
            pricing.total,
    };
}