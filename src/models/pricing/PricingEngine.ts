import type { CartLine } from "../sale/CartLine";
import type { PricingRule } from "./PricingRule";

export type AppliedPromotion = {
    id: string;
    name: string;
    discountAmount: number;
};

export type PricedCartLine = CartLine & {
    calculatedLineDiscountAmount: number;
    calculatedTransactionDiscountAmount: number;
    calculatedNetAmount: number;

    appliedPromotions: AppliedPromotion[];
};

export type PricingResult = {
    lines: PricedCartLine[];

    subtotal: number;

    lineDiscountTotal: number;

    transactionDiscountTotal: number;

    totalDiscount: number;

    total: number;
};

function roundMoney(
    value: number,
) {
    return (
        Math.round(
            (value + Number.EPSILON) * 100,
        ) / 100
    );
}

function isEligibleSaleLine(
    line: CartLine,
) {
    return line.kind === "sale";
}

function calculateRuleAmount(
    rule: PricingRule,
    gross: number,
) {
    if (
        rule.discountType ===
        "percentage"
    ) {
        return roundMoney(
            gross *
            (rule.value / 100),
        );
    }

    return roundMoney(
        rule.value,
    );
}

export function calculatePricing(
    lines: CartLine[],
    rules: PricingRule[],
): PricingResult {
    const lineRules =
        rules.filter(
            (rule) =>
                rule.scope === "line",
        );

    const transactionRules =
        rules.filter(
            (rule) =>
                rule.scope ===
                "transaction",
        );

    const baseLines =
        lines.map((line) => {
            const sign =
                line.kind === "return"
                    ? -1
                    : 1;

            const gross =
                roundMoney(
                    line.unitPrice *
                    line.quantity,
                );

            let lineDiscount = 0;

            const appliedPromotions:
                AppliedPromotion[] = [];

            if (line.kind === "sale") {
                for (const rule of lineRules) {
                    if (
                        rule.targetLineId &&
                        rule.targetLineId !==
                        line.id
                    ) {
                        continue;
                    }

                    if (
                        rule.saleLinesOnly &&
                        line.kind !== "sale"
                    ) {
                        continue;
                    }

                    const ruleAmount =
                        calculateRuleAmount(
                            rule,
                            gross,
                        );

                    lineDiscount +=
                        ruleAmount;

                    if (
                        rule.source ===
                        "promotion" &&
                        rule.promotionId
                    ) {
                        const existing =
                            appliedPromotions.find(
                                (promotion) =>
                                    promotion.id ===
                                    rule.promotionId,
                            );

                        if (existing) {
                            existing.discountAmount =
                                roundMoney(
                                    existing.discountAmount +
                                    ruleAmount,
                                );
                        } else {
                            appliedPromotions.push(
                                {
                                    id:
                                        rule.promotionId,

                                    name:
                                        rule.name,

                                    discountAmount:
                                        ruleAmount,
                                },
                            );
                        }
                    }
                }
            }

            lineDiscount =
                roundMoney(
                    Math.min(
                        gross,
                        Math.max(
                            0,
                            lineDiscount,
                        ),
                    ),
                );

            const netBeforeTransaction =
                roundMoney(
                    gross -
                    lineDiscount,
                );

            return {
                line,
                sign,
                gross,
                lineDiscount,
                appliedPromotions,
                netBeforeTransaction,
            };
        });

    const eligibleBase =
        baseLines.reduce(
            (sum, item) =>
                isEligibleSaleLine(
                    item.line,
                )
                    ? sum +
                    item.netBeforeTransaction
                    : sum,
            0,
        );

    let transactionDiscountTotal =
        0;

    for (
        const rule of transactionRules
    ) {
        if (eligibleBase <= 0) {
            break;
        }

        if (
            rule.discountType ===
            "percentage"
        ) {
            transactionDiscountTotal +=
                eligibleBase *
                (rule.value / 100);
        }

        if (
            rule.discountType ===
            "fixed_amount"
        ) {
            transactionDiscountTotal +=
                rule.value;
        }
    }

    transactionDiscountTotal =
        roundMoney(
            Math.min(
                eligibleBase,
                Math.max(
                    0,
                    transactionDiscountTotal,
                ),
            ),
        );

    let allocatedSoFar = 0;

    const eligibleItems =
        baseLines.filter(
            (item) =>
                isEligibleSaleLine(
                    item.line,
                ),
        );

    const lastEligibleId =
        eligibleItems.at(-1)
            ?.line.id;

    const pricedLines =
        baseLines.map((item) => {
            let transactionDiscount =
                0;

            if (
                isEligibleSaleLine(
                    item.line,
                ) &&
                eligibleBase > 0
            ) {
                if (
                    item.line.id ===
                    lastEligibleId
                ) {
                    transactionDiscount =
                        roundMoney(
                            transactionDiscountTotal -
                            allocatedSoFar,
                        );
                } else {
                    transactionDiscount =
                        roundMoney(
                            transactionDiscountTotal *
                            (
                                item.netBeforeTransaction /
                                eligibleBase
                            ),
                        );

                    allocatedSoFar =
                        roundMoney(
                            allocatedSoFar +
                            transactionDiscount,
                        );
                }
            }

            const net =
                roundMoney(
                    item.netBeforeTransaction -
                    transactionDiscount,
                );

            return {
                ...item.line,

                calculatedLineDiscountAmount:
                    item.line.kind === "sale"
                        ? item.lineDiscount
                        : 0,

                calculatedTransactionDiscountAmount:
                    item.line.kind === "sale"
                        ? transactionDiscount
                        : 0,

                calculatedNetAmount:
                    roundMoney(
                        net * item.sign,
                    ),

                appliedPromotions:
                    item.line.kind === "sale"
                        ? item.appliedPromotions
                        : [],
            };
        });

    const subtotal =
        roundMoney(
            baseLines.reduce(
                (sum, item) =>
                    sum +
                    item.gross *
                    item.sign,
                0,
            ),
        );

    const lineDiscountTotal =
        roundMoney(
            pricedLines.reduce(
                (sum, line) =>
                    sum +
                    line.calculatedLineDiscountAmount,
                0,
            ),
        );

    const totalDiscount =
        roundMoney(
            lineDiscountTotal +
            transactionDiscountTotal,
        );

    const total =
        roundMoney(
            pricedLines.reduce(
                (sum, line) =>
                    sum +
                    line.calculatedNetAmount,
                0,
            ),
        );

    return {
        lines: pricedLines,

        subtotal,

        lineDiscountTotal,

        transactionDiscountTotal,

        totalDiscount,

        total,
    };
}