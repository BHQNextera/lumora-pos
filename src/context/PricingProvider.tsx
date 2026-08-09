import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import type {
    Coupon,
} from "../models/coupon/Coupon";
import {
    seedCouponsIfEmpty,
} from "../models/coupon/CouponSeed";
import {
    calculateCouponDiscount,
    validateCoupon,
} from "../models/coupon/CouponService";
import type {
    Customer,
} from "../models/customer/Customer";
import {
    testCustomers,
} from "../models/customer/CustomerSeed";
import {
    PricingEvent,
} from "../models/pricing/PricingEvents";
import {
    reprice,
} from "../models/pricing/PricingOrchestrator";
import type {
    PricingRule,
} from "../models/pricing/PricingRule";
import type {
    Promotion,
} from "../models/promotion/Promotion";
import {
    getPromotions,
    removePromotion as removePromotionFromRepository,
    savePromotion,
    savePromotions,
} from "../models/promotion/PromotionRepository";
import {
    seedPromotionsIfEmpty,
} from "../models/promotion/PromotionSeed";
import type {
    CartLine,
} from "../models/sale/CartLine";
import {
    PricingContext,
} from "./PricingContext";

type PricingProviderProps = {
    children: ReactNode;
};

function PricingProvider({
    children,
}: PricingProviderProps) {
    seedCouponsIfEmpty();

    const [
        cartLines,
        setCartLinesState,
    ] =
        useState<CartLine[]>([]);

    const [
        pricingRules,
        setPricingRulesState,
    ] =
        useState<PricingRule[]>([]);

    const [
        promotions,
        setPromotionsState,
    ] =
        useState<Promotion[]>(
            () =>
                seedPromotionsIfEmpty(),
        );

    const [
        appliedCoupon,
        setAppliedCoupon,
    ] =
        useState<Coupon | null>(
            null,
        );

    const [
        selectedCustomer,
        setSelectedCustomerState,
    ] =
        useState<Customer>(
            testCustomers[0],
        );

    const pricing = useMemo(
        () =>
            reprice(
                PricingEvent.CartChanged,
                cartLines,
                pricingRules,
                promotions,
                {
                    customerGroupIds:
                        selectedCustomer.groupIds,
                },
            ),
        [
            cartLines,
            pricingRules,
            promotions,
            selectedCustomer,
        ],
    );

    const couponDiscountAmount =
        useMemo(() => {
            if (
                !appliedCoupon ||
                pricing.total <= 0
            ) {
                return 0;
            }

            const validation =
                validateCoupon(
                    appliedCoupon.code,
                    {
                        basketAmount:
                            pricing.total,
                        customerGroupId:
                            selectedCustomer.groupIds[0],
                    },
                );

            if (!validation.valid) {
                return 0;
            }

            return calculateCouponDiscount(
                validation.coupon,
                pricing.total,
            );
        }, [
            appliedCoupon,
            pricing.total,
            selectedCustomer,
        ]);

    const totalAfterCoupon =
        useMemo(
            () =>
                Math.max(
                    0,
                    Math.round(
                        (
                            pricing.total -
                            couponDiscountAmount +
                            Number.EPSILON
                        ) *
                        100,
                    ) / 100,
                ),
            [
                pricing.total,
                couponDiscountAmount,
            ],
        );

    useEffect(() => {
        if (!appliedCoupon) {
            return;
        }

        const validation =
            validateCoupon(
                appliedCoupon.code,
                {
                    basketAmount:
                        pricing.total,
                    customerGroupId:
                        selectedCustomer.groupIds[0],
                },
            );

        if (!validation.valid) {
            setAppliedCoupon(
                null,
            );
        }
    }, [
        appliedCoupon,
        pricing.total,
        selectedCustomer,
    ]);

    const setCartLines =
        useCallback(
            (
                lines: CartLine[],
            ) => {
                setCartLinesState(
                    lines,
                );
            },
            [],
        );

    const updateCartLines =
        useCallback(
            (
                updater: (
                    current: CartLine[],
                ) => CartLine[],
            ) => {
                setCartLinesState(
                    (current) =>
                        updater(
                            current,
                        ),
                );
            },
            [],
        );

    const setPricingRules =
        useCallback(
            (
                rules: PricingRule[],
            ) => {
                setPricingRulesState(
                    rules,
                );
            },
            [],
        );

    const addPricingRule =
        useCallback(
            (
                rule: PricingRule,
            ) => {
                setPricingRulesState(
                    (current) => [
                        ...current.filter(
                            (item) =>
                                item.id !==
                                rule.id,
                        ),
                        rule,
                    ],
                );
            },
            [],
        );

    const removePricingRule =
        useCallback(
            (
                ruleId: string,
            ) => {
                setPricingRulesState(
                    (current) =>
                        current.filter(
                            (rule) =>
                                rule.id !==
                                ruleId,
                        ),
                );
            },
            [],
        );

    const clearPricingRules =
        useCallback(() => {
            setPricingRulesState(
                [],
            );
        }, []);

    const setPromotions =
        useCallback(
            (
                nextPromotions:
                    Promotion[],
            ) => {
                savePromotions(
                    nextPromotions,
                );

                setPromotionsState(
                    nextPromotions,
                );
            },
            [],
        );

    const addPromotion =
        useCallback(
            (
                promotion:
                    Promotion,
            ) => {
                savePromotion(
                    promotion,
                );

                setPromotionsState(
                    getPromotions(),
                );
            },
            [],
        );

    const removePromotion =
        useCallback(
            (
                promotionId:
                    string,
            ) => {
                removePromotionFromRepository(
                    promotionId,
                );

                setPromotionsState(
                    getPromotions(),
                );
            },
            [],
        );

    const togglePromotion =
        useCallback(
            (
                promotionId:
                    string,
                isActive:
                    boolean,
            ) => {
                const current =
                    getPromotions();

                const promotion =
                    current.find(
                        (item) =>
                            item.id ===
                            promotionId,
                    );

                if (!promotion) {
                    return;
                }

                savePromotion({
                    ...promotion,
                    isActive,
                });

                setPromotionsState(
                    getPromotions(),
                );
            },
            [],
        );

    const applyCoupon =
        useCallback(
            (
                code: string,
            ) => {
                const validation =
                    validateCoupon(
                        code,
                        {
                            basketAmount:
                                pricing.total,
                            customerGroupId:
                                selectedCustomer.groupIds[0],
                        },
                    );

                if (!validation.valid) {
                    return {
                        success: false,
                        reason:
                            validation.reason,
                    };
                }

                const discount =
                    calculateCouponDiscount(
                        validation.coupon,
                        pricing.total,
                    );

                if (discount <= 0) {
                    return {
                        success: false,
                        reason:
                            "zero_discount",
                    };
                }

                setAppliedCoupon(
                    validation.coupon,
                );

                return {
                    success: true,
                };
            },
            [
                pricing.total,
                selectedCustomer,
            ],
        );

    const setSelectedCustomer =
        useCallback(
            (customer: Customer) => {
                setSelectedCustomerState(
                    customer,
                );
            },
            [],
        );

    const removeCoupon =
        useCallback(() => {
            setAppliedCoupon(
                null,
            );
        }, []);

    const recalculate =
        useCallback(() => {
            setCartLinesState(
                (current) => [
                    ...current,
                ],
            );
        }, []);

    const value = useMemo(
        () => ({
            cartLines,
            pricingRules,
            promotions,

            selectedCustomer,

            appliedCoupon,
            couponDiscountAmount,
            totalAfterCoupon,

            pricing,

            setCartLines,
            updateCartLines,

            setPricingRules,
            addPricingRule,
            removePricingRule,
            clearPricingRules,

            setPromotions,
            addPromotion,
            removePromotion,
            togglePromotion,

            setSelectedCustomer,

            applyCoupon,
            removeCoupon,

            recalculate,
        }),
        [
            cartLines,
            pricingRules,
            promotions,

            selectedCustomer,

            appliedCoupon,
            couponDiscountAmount,
            totalAfterCoupon,

            pricing,

            setCartLines,
            updateCartLines,

            setPricingRules,
            addPricingRule,
            removePricingRule,
            clearPricingRules,

            setPromotions,
            addPromotion,
            removePromotion,
            togglePromotion,

            setSelectedCustomer,

            applyCoupon,
            removeCoupon,

            recalculate,
        ],
    );

    return (
        <PricingContext.Provider
            value={value}
        >
            {children}
        </PricingContext.Provider>
    );
}

export default PricingProvider;