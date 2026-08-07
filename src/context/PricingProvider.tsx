import {
    useCallback,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import type { CartLine } from "../models/sale/CartLine";
import {
    PricingEvent,
} from "../models/pricing/PricingEvents";
import {
    reprice,
} from "../models/pricing/PricingOrchestrator";
import type {
    PricingRule,
} from "../models/pricing/PricingRule";
import {
    PricingContext,
} from "./PricingContext";

type PricingProviderProps = {
    children: ReactNode;
};

function PricingProvider({
    children,
}: PricingProviderProps) {
    const [cartLines, setCartLinesState] =
        useState<CartLine[]>([]);

    const [pricingRules, setPricingRulesState] =
        useState<PricingRule[]>([]);

    const pricing = useMemo(
        () =>
            reprice(
                PricingEvent.CartChanged,
                cartLines,
                pricingRules,
            ),
        [cartLines, pricingRules],
    );

    const setCartLines = useCallback(
        (lines: CartLine[]) => {
            setCartLinesState(lines);
        },
        [],
    );

    const updateCartLines = useCallback(
        (
            updater: (
                current: CartLine[],
            ) => CartLine[],
        ) => {
            setCartLinesState((current) =>
                updater(current),
            );
        },
        [],
    );

    const setPricingRules = useCallback(
        (rules: PricingRule[]) => {
            setPricingRulesState(rules);
        },
        [],
    );

    const addPricingRule = useCallback(
        (rule: PricingRule) => {
            setPricingRulesState((current) => [
                ...current.filter(
                    (item) => item.id !== rule.id,
                ),
                rule,
            ]);
        },
        [],
    );

    const removePricingRule = useCallback(
        (ruleId: string) => {
            setPricingRulesState((current) =>
                current.filter(
                    (rule) => rule.id !== ruleId,
                ),
            );
        },
        [],
    );

    const clearPricingRules =
        useCallback(() => {
            setPricingRulesState([]);
        }, []);

    const recalculate = useCallback(
        () => {
            setCartLinesState((current) => [
                ...current,
            ]);
        },
        [],
    );

    const value = useMemo(
        () => ({
            cartLines,
            pricingRules,
            pricing,

            setCartLines,
            updateCartLines,

            setPricingRules,
            addPricingRule,
            removePricingRule,
            clearPricingRules,

            recalculate,
        }),
        [
            cartLines,
            pricingRules,
            pricing,

            setCartLines,
            updateCartLines,

            setPricingRules,
            addPricingRule,
            removePricingRule,
            clearPricingRules,

            recalculate,
        ],
    );

    return (
        <PricingContext.Provider value={value}>
            {children}
        </PricingContext.Provider>
    );
}

export default PricingProvider;