import type { CartLine } from "../sale/CartLine";
import {
    calculatePricing,
} from "./PricingEngine";
import type {
    PricingRule,
} from "./PricingRule";
import type {
    PricingEvent,
} from "./PricingEvents";

export function reprice(
    _event: PricingEvent,
    cart: CartLine[],
    rules: PricingRule[],
) {
    return calculatePricing(
        cart,
        rules,
    );
}