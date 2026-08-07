import type { PricingRule } from "./PricingRule";

export const DefaultPricingRules = {
    transactionPercentage(
        percentage: number,
    ): PricingRule {
        return {
            id: "transaction-percentage",
            name: `הנחת עסקה ${percentage}%`,
            scope: "transaction",
            discountType: "percentage",
            value: percentage,
            saleLinesOnly: true,
        };
    },

    transactionAmount(
        amount: number,
    ): PricingRule {
        return {
            id: "transaction-amount",
            name: `הנחת עסקה ₪${amount}`,
            scope: "transaction",
            discountType: "fixed_amount",
            value: amount,
            saleLinesOnly: true,
        };
    },

    linePercentage(
        lineId: string,
        percentage: number,
    ): PricingRule {
        return {
            id: `line-discount-${lineId}`,
            name: `הנחת פריט ${percentage}%`,
            scope: "line",
            discountType: "percentage",
            value: percentage,
            saleLinesOnly: true,
            targetLineId: lineId,
        };
    },

    lineAmount(
        lineId: string,
        amount: number,
    ): PricingRule {
        return {
            id: `line-discount-${lineId}`,
            name: `הנחת פריט ₪${amount}`,
            scope: "line",
            discountType: "fixed_amount",
            value: amount,
            saleLinesOnly: true,
            targetLineId: lineId,
        };
    },
};