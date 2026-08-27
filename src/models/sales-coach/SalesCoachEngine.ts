import type { CartLine } from "../sale/CartLine";
import type { Product } from "../../types/product";

export type SalesCoachSuggestion = {
    id: string;
    title: string;
    message: string;
    product: Product;
    confidence: number;
};

type PairRule = {
    id: string;
    triggerProductIds?: string[];
    triggerCategories?: string[];
    suggestedProductId: string;
    message: string;
    confidence: number;
};

const TEST_RULES: PairRule[] = [];

/*
 * Truth V1:
 * Demo recommendation rules are intentionally disabled.
 * Until Lumora has a real recommendation source, the engine
 * returns no suggestion and the Sales Coach stays hidden.
 */

function getCoachTitle() {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
        return "בוקר טוב ☀️";
    }

    if (hour >= 12 && hour < 17) {
        return "רעיון קטן לעסקה ✦";
    }

    if (hour >= 17 && hour < 22) {
        return "אולי נפנק אותו קצת? ✨";
    }

    return "יש לי רעיון קטן ✦";
}

function cartContainsProduct(
    cartLines: CartLine[],
    productId: string,
) {
    return cartLines.some(
        (line) =>
            line.kind === "sale" &&
            line.product.id === productId,
    );
}

function ruleMatches(
    rule: PairRule,
    cartLines: CartLine[],
) {
    const productMatch =
        !rule.triggerProductIds ||
        rule.triggerProductIds.some(
            (productId) =>
                cartContainsProduct(
                    cartLines,
                    productId,
                ),
        );

    const categoryMatch =
        !rule.triggerCategories ||
        rule.triggerCategories.some(
            (category) =>
                cartLines.some(
                    (line) =>
                        line.kind === "sale" &&
                        line.product.category ===
                        category,
                ),
        );

    return productMatch && categoryMatch;
}

function getTriggerLineIds(
    rule: PairRule,
    cartLines: CartLine[],
) {
    return cartLines
        .filter((line) => {
            if (line.kind !== "sale") {
                return false;
            }

            const matchesProduct =
                rule.triggerProductIds?.includes(
                    line.product.id,
                ) ?? false;

            const matchesCategory =
                rule.triggerCategories?.includes(
                    line.product.category,
                ) ?? false;

            return (
                matchesProduct ||
                matchesCategory
            );
        })
        .map((line) => line.id)
        .sort();
}

export function getSalesCoachSuggestion(
    cartLines: CartLine[],
    products: Product[],
): SalesCoachSuggestion | null {
    const candidates = TEST_RULES
        .filter((rule) =>
            ruleMatches(
                rule,
                cartLines,
            ),
        )
        .filter(
            (rule) =>
                !cartContainsProduct(
                    cartLines,
                    rule.suggestedProductId,
                ),
        )
        .map((rule) => {
            const product =
                products.find(
                    (item) =>
                        item.id ===
                        rule.suggestedProductId &&
                        item.isActive,
                );

            if (!product) {
                return null;
            }

            const triggerLineIds =
                getTriggerLineIds(
                    rule,
                    cartLines,
                );

            return {
                id: [
                    "sales-coach",
                    rule.id,
                    triggerLineIds.join("-"),
                    rule.suggestedProductId,
                ].join(":"),

                title: getCoachTitle(),
                message: rule.message,
                product,
                confidence:
                    rule.confidence,
            };
        })
        .filter(
            (
                item,
            ): item is SalesCoachSuggestion =>
                item !== null,
        )
        .sort(
            (a, b) =>
                b.confidence -
                a.confidence,
        );

    return candidates[0] ?? null;
}