import type { Promotion } from "../promotion/Promotion";
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
) {
    const promotionRules =
        evaluatePromotions(
            cart,
            promotions,
        );

    return calculatePricing(
        cart,
        [
            ...promotionRules,
            ...rules,
        ],
    );
}