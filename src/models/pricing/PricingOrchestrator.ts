import type { Promotion } from "../promotion/Promotion";
import type {
    PromotionEvaluationContext,
} from "../promotion/PromotionEngine";
import {
    evaluatePromotions,
} from "../promotion/PromotionEngine";
import type { CartLine } from "../sale/CartLine";
import {
    calculatePricing,
} from "./PricingEngine";
import type {
    PricingEvent,
} from "./PricingEvents";
import type {
    PricingRule,
} from "./PricingRule";

export function reprice(
    _event: PricingEvent,
    cart: CartLine[],
    rules: PricingRule[],
    promotions: Promotion[] = [],
    promotionContext:
        PromotionEvaluationContext = {},
) {
    const promotionRules =
        evaluatePromotions(
            cart,
            promotions,
            promotionContext,
        );

    return calculatePricing(
        cart,
        [
            ...promotionRules,
            ...rules,
        ],
    );
}