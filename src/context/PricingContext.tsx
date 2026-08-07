import {
    createContext,
} from "react";

import type { CartLine } from "../models/sale/CartLine";
import type {
    PricingResult,
} from "../models/pricing/PricingEngine";
import type {
    PricingRule,
} from "../models/pricing/PricingRule";

export type PricingContextValue = {
    cartLines: CartLine[];

    pricingRules: PricingRule[];

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

    recalculate: () => void;
};

export const PricingContext =
    createContext<
        PricingContextValue | undefined
    >(undefined);