import { useContext } from "react";

import {
    PricingContext,
} from "./PricingContext";

export function usePricing() {
    const context =
        useContext(PricingContext);

    if (!context) {
        throw new Error(
            "usePricing must be used inside PricingProvider",
        );
    }

    return context;
}