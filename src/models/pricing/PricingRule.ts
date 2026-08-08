export type DiscountType =
    | "percentage"
    | "fixed_amount";

export type PricingRuleScope =
    | "line"
    | "transaction";

export type PricingRuleSource =
    | "manual"
    | "promotion";

export type PricingRule = {
    id: string;

    name: string;

    scope: PricingRuleScope;

    discountType: DiscountType;

    value: number;

    saleLinesOnly: boolean;

    targetLineId?: string;

    source?: PricingRuleSource;

    promotionId?: string;

    promotionParticipantLineIds?: string[];
};