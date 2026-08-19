import type {
    PromotionTarget,
} from "../../models/promotion/Promotion";

import type {
    PromotionPopulationDraft,
} from "./PromotionPopulationEditor";

function unique(
    values: string[],
) {
    return [
        ...new Set(
            values.filter(Boolean),
        ),
    ];
}

export function createEmptyPromotionPopulation():
PromotionPopulationDraft {
    return {
        productIds: [],
        categoryIds: [],
        excludedProductIds: [],
        excludedCategoryIds: [],
    };
}

export function promotionPopulationHasSelection(
    value: PromotionPopulationDraft,
) {
    return (
        value.productIds.length > 0 ||
        value.categoryIds.length > 0
    );
}

export function promotionPopulationFromTarget(
    target: PromotionTarget,
    legacyExcludedProductIds: string[] = [],
    legacyExcludedCategoryIds: string[] = [],
): PromotionPopulationDraft {
    return {
        productIds:
            unique(
                target.productIds ?? [],
            ),

        categoryIds:
            unique(
                target.categoryIds ?? [],
            ),

        excludedProductIds:
            unique([
                ...(target.excludedProductIds ?? []),
                ...legacyExcludedProductIds,
            ]),

        excludedCategoryIds:
            unique([
                ...(target.excludedCategoryIds ?? []),
                ...legacyExcludedCategoryIds,
            ]),
    };
}

export function promotionPopulationToTarget(
    value: PromotionPopulationDraft,
): PromotionTarget {
    const productIds =
        unique(
            value.productIds,
        );

    const categoryIds =
        unique(
            value.categoryIds,
        );

    const excludedProductIds =
        unique(
            value.excludedProductIds,
        );

    const excludedCategoryIds =
        unique(
            value.excludedCategoryIds,
        );

    const exclusions = {
        excludedProductIds:
            excludedProductIds.length > 0
                ? excludedProductIds
                : undefined,

        excludedCategoryIds:
            excludedCategoryIds.length > 0
                ? excludedCategoryIds
                : undefined,
    };

    if (
        productIds.length > 0 &&
        categoryIds.length > 0
    ) {
        return {
            type: "mixed",
            productIds,
            categoryIds,
            ...exclusions,
        };
    }

    if (productIds.length > 0) {
        return {
            type: "product",
            productIds,
            ...exclusions,
        };
    }

    return {
        type: "category",
        categoryIds,
        ...exclusions,
    };
}
