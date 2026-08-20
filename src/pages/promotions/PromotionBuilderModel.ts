import type {
    Promotion,
    PromotionType,
} from "../../models/promotion/Promotion";

import {
    createEmptyPromotionPopulation,
    promotionPopulationFromTarget,
    promotionPopulationHasSelection,
    promotionPopulationToTarget,
} from "./PromotionPopulationBuilder";

import type {
    PromotionPopulationDraft,
} from "./PromotionPopulationEditor";

export type PromotionTypeOption = {
    value: PromotionType;
    label: string;
    disabled?: boolean;
};

export const promotionTypeOptions:
PromotionTypeOption[] = [
    {
        value: "category_discount",
        label: "הנחה על פריטים",
    },
    {
        value: "quantity_discount",
        label: "הנחת כמות",
    },
    {
        value: "bundle_price",
        label: "מחיר חבילה",
    },
    {
        value: "mix_and_match",
        label: "Mix & Match",
    },
    {
        value: "buy_x_get_y",
        label: "קנה X קבל Y",
    },
    {
        value: "buy_a_get_b",
        label: "קנה A קבל B",
    },
    {
        value: "basket_discount",
        label: "הנחה מעל סכום סל",
    },
    {
        value: "basket_tier_discount",
        label: "מדרגות סל — בהמשך",
        disabled: true,
    },
];

export type PromotionBundleComponentDraft = {
    id: string;
    quantity: string;
    population:
        PromotionPopulationDraft;
};

export function createEmptyBundleComponentDraft():
PromotionBundleComponentDraft {
    return {
        id: crypto.randomUUID(),
        quantity: "1",
        population:
            createEmptyPromotionPopulation(),
    };
}

export type PromotionDraft = {
    name: string;

    type: PromotionType;

    targetPopulation:
        PromotionPopulationDraft;

    rewardPopulation:
        PromotionPopulationDraft;

    allowedCustomerGroupIds:
        string[];

    value: string;
    valueType:
        | "percentage"
        | "fixed_amount";

    quantity: string;
    getQuantity: string;
    bundlePrice: string;
    bundleComponents:
        PromotionBundleComponentDraft[];
    basketMinimumAmount: string;

    priority: string;

    startsAt: string;
    endsAt: string;

    daysOfWeek: number[];
    startTime: string;
    endTime: string;

    isActive: boolean;
    allowStacking: boolean;
};

function toLocalInput(
    value:
        | string
        | undefined,
) {
    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return "";
    }

    const offset =
        date.getTimezoneOffset();

    const local =
        new Date(
            date.getTime() -
            offset * 60000,
        );

    return local
        .toISOString()
        .slice(0, 16);
}

export function createEmptyPromotionDraft():
PromotionDraft {
    return {
        name: "",

        type:
            "category_discount",

        targetPopulation:
            createEmptyPromotionPopulation(),

        rewardPopulation:
            createEmptyPromotionPopulation(),

        allowedCustomerGroupIds: [],

        value: "10",
        valueType: "percentage",
        quantity: "2",
        getQuantity: "1",
        bundlePrice: "20",
        bundleComponents: [
            createEmptyBundleComponentDraft(),
            createEmptyBundleComponentDraft(),
        ],
        basketMinimumAmount: "100",

        priority: "100",

        startsAt: "",
        endsAt: "",

        daysOfWeek: [],
        startTime: "",
        endTime: "",

        isActive: true,
        allowStacking: false,
    };
}

export function promotionDraftFromPromotion(
    promotion: Promotion,
): PromotionDraft {
    return {
        name:
            promotion.name,

        type:
            promotion.type ===
            "fixed_amount_discount"
                ? "category_discount"
                : promotion.type,

        targetPopulation:
            promotionPopulationFromTarget(
                promotion.target,
                promotion.excludedProductIds ??
                    [],
                promotion.excludedCategoryIds ??
                    [],
            ),

        rewardPopulation:
            promotion.rewardTarget
                ? promotionPopulationFromTarget(
                      promotion.rewardTarget,
                      promotion.excludedProductIds ??
                          [],
                      promotion.excludedCategoryIds ??
                          [],
                  )
                : createEmptyPromotionPopulation(),

        allowedCustomerGroupIds:
            promotion.allowedCustomerGroupIds ??
            [],

        value:
            String(
                promotion.discountPercentage ??
                promotion.discountAmount ??
                promotion.rewardDiscountPercentage ??
                promotion.rewardDiscountAmount ??
                10,
            ),

        valueType:
            promotion.discountAmount !==
                undefined ||
            promotion.rewardDiscountAmount !==
                undefined ||
            promotion.type ===
                "fixed_amount_discount"
                ? "fixed_amount"
                : "percentage",

        quantity:
            String(
                promotion.bundleQuantity ??
                promotion.minimumQuantity ??
                promotion.buyQuantity ??
                2,
            ),

        getQuantity:
            String(
                promotion.getQuantity ??
                1,
            ),

        bundlePrice:
            String(
                promotion.bundlePrice ??
                20,
            ),

        bundleComponents:
            promotion.bundleComponents
                ?.map(
                    (component) => ({
                        id:
                            component.id,
                        quantity:
                            String(
                                component.quantity,
                            ),
                        population:
                            promotionPopulationFromTarget(
                                component.target,
                            ),
                    }),
                ) ??
            (
                promotion.type ===
                    "bundle_price"
                    ? [
                          {
                              id:
                                  crypto.randomUUID(),
                              quantity:
                                  String(
                                      promotion.bundleQuantity ??
                                      1,
                                  ),
                              population:
                                  promotionPopulationFromTarget(
                                      promotion.target,
                                      promotion.excludedProductIds ??
                                          [],
                                      promotion.excludedCategoryIds ??
                                          [],
                                  ),
                          },
                      ]
                    : [
                          createEmptyBundleComponentDraft(),
                          createEmptyBundleComponentDraft(),
                      ]
            ),

        basketMinimumAmount:
            String(
                promotion.basketMinimumAmount ??
                100,
            ),

        priority:
            String(
                promotion.priority,
            ),

        startsAt:
            toLocalInput(
                promotion.startsAt,
            ),

        endsAt:
            toLocalInput(
                promotion.endsAt,
            ),

        daysOfWeek:
            promotion.schedule
                ?.daysOfWeek ??
            [],

        startTime:
            promotion.schedule
                ?.startTime ??
            "",

        endTime:
            promotion.schedule
                ?.endTime ??
            "",

        isActive:
            promotion.isActive,

        allowStacking:
            promotion.allowStacking,
    };
}

function positiveNumber(
    value: string,
) {
    const number =
        Number(value);

    return (
        Number.isFinite(number) &&
        number > 0
    );
}

function validPercentage(
    value: string,
) {
    const number =
        Number(value);

    return (
        Number.isFinite(number) &&
        number > 0 &&
        number <= 100
    );
}

function validDiscountValue(
    value: string,
    valueType:
        | "percentage"
        | "fixed_amount",
) {
    return valueType ===
        "percentage"
        ? validPercentage(value)
        : positiveNumber(value);
}

function positiveInteger(
    value: string,
) {
    const number =
        Number(value);

    return (
        Number.isInteger(number) &&
        number > 0
    );
}

export function validatePromotionDraft(
    draft: PromotionDraft,
): string | null {
    if (!draft.name.trim()) {
        return "יש להזין שם מבצע.";
    }

    if (
        draft.type !==
            "bundle_price" &&
        !promotionPopulationHasSelection(
            draft.targetPopulation,
        )
    ) {
        return "יש לבחור לפחות פריט או קטגוריה אחת באוכלוסיית המבצע.";
    }

    if (
        draft.type ===
            "buy_a_get_b" &&
        !promotionPopulationHasSelection(
            draft.rewardPopulation,
        )
    ) {
        return "במבצע קנה A קבל B יש להגדיר גם את אוכלוסיית ההטבה.";
    }

    switch (draft.type) {
        case "category_discount":
        case "fixed_amount_discount":
            if (
                !validDiscountValue(
                    draft.value,
                    draft.valueType,
                )
            ) {
                return draft.valueType ===
                    "percentage"
                    ? "אחוז ההנחה חייב להיות בין 0 ל־100."
                    : "סכום ההנחה חייב להיות גדול מ־0.";
            }
            break;

        case "quantity_discount":
            if (
                !positiveInteger(
                    draft.quantity,
                )
            ) {
                return "כמות המינימום חייבת להיות מספר שלם גדול מ־0.";
            }

            if (
                !validDiscountValue(
                    draft.value,
                    draft.valueType,
                )
            ) {
                return draft.valueType ===
                    "percentage"
                    ? "אחוז ההנחה חייב להיות בין 0 ל־100."
                    : "סכום ההנחה חייב להיות גדול מ־0.";
            }
            break;

        case "bundle_price":
            if (
                draft.bundleComponents.length <
                2
            ) {
                return "מחיר חבילה דורש לפחות שני רכיבים.";
            }

            for (
                const [
                    index,
                    component,
                ] of
                    draft.bundleComponents
                        .entries()
            ) {
                if (
                    !positiveInteger(
                        component.quantity,
                    )
                ) {
                    return `כמות רכיב ${index + 1} חייבת להיות מספר שלם גדול מ־0.`;
                }

                if (
                    !promotionPopulationHasSelection(
                        component.population,
                    )
                ) {
                    return `יש לבחור אוכלוסייה לרכיב ${index + 1}.`;
                }
            }

            if (
                !positiveNumber(
                    draft.bundlePrice,
                )
            ) {
                return "מחיר החבילה חייב להיות גדול מ־0.";
            }
            break;

        case "mix_and_match":
            if (
                !positiveInteger(
                    draft.quantity,
                )
            ) {
                return "כמות הפריטים בחבילה חייבת להיות מספר שלם גדול מ־0.";
            }

            if (
                !positiveNumber(
                    draft.bundlePrice,
                )
            ) {
                return "מחיר החבילה חייב להיות גדול מ־0.";
            }
            break;

        case "buy_x_get_y":
        case "buy_a_get_b":
            if (
                !positiveInteger(
                    draft.quantity,
                ) ||
                !positiveInteger(
                    draft.getQuantity,
                )
            ) {
                return "כמויות X ו־Y חייבות להיות מספרים שלמים גדולים מ־0.";
            }

            if (
                !validDiscountValue(
                    draft.value,
                    draft.valueType,
                )
            ) {
                return draft.valueType ===
                    "percentage"
                    ? "אחוז ההנחה על פריט ההטבה חייב להיות בין 0 ל־100."
                    : "סכום ההנחה על פריט ההטבה חייב להיות גדול מ־0.";
            }
            break;

        case "basket_discount":
            if (
                !positiveNumber(
                    draft.basketMinimumAmount,
                )
            ) {
                return "סכום הסל המינימלי חייב להיות גדול מ־0.";
            }

            if (
                !validDiscountValue(
                    draft.value,
                    draft.valueType,
                )
            ) {
                return draft.valueType ===
                    "percentage"
                    ? "אחוז ההנחה חייב להיות בין 0 ל־100."
                    : "סכום ההנחה חייב להיות גדול מ־0.";
            }
            break;

        case "basket_tier_discount":
            return "מדרגות סל עדיין אינן זמינות ב־Builder V1.";
    }

    return null;
}

export function promotionFromDraft(
    draft: PromotionDraft,
    current?: Promotion,
): Promotion {
    const target =
        promotionPopulationToTarget(
            draft.type ===
                "bundle_price"
                ? draft.bundleComponents[0]
                      .population
                : draft.targetPopulation,
        );

    const priority =
        Number(draft.priority);

    const promotion: Promotion = {
        id:
            current?.id ??
            crypto.randomUUID(),

        name:
            draft.name.trim(),

        type:
            draft.type,

        isActive:
            draft.isActive,

        priority:
            Number.isFinite(priority)
                ? priority
                : 100,

        allowStacking:
            draft.allowStacking,

        target,

        allowedCustomerGroupIds:
            draft.allowedCustomerGroupIds
                .length > 0
                ? draft.allowedCustomerGroupIds
                : undefined,

        startsAt:
            draft.startsAt
                ? new Date(
                      draft.startsAt,
                  ).toISOString()
                : undefined,

        endsAt:
            draft.endsAt
                ? new Date(
                      draft.endsAt,
                  ).toISOString()
                : undefined,

        schedule:
            draft.daysOfWeek.length > 0 ||
            draft.startTime ||
            draft.endTime
                ? {
                      daysOfWeek:
                          draft.daysOfWeek,

                      startTime:
                          draft.startTime ||
                          undefined,

                      endTime:
                          draft.endTime ||
                          undefined,
                  }
                : undefined,
    };

    const value =
        Number(draft.value);

    const quantity =
        Number(draft.quantity);

    const getQuantity =
        Number(
            draft.getQuantity,
        );

    const bundlePrice =
        Number(
            draft.bundlePrice,
        );

    const basketMinimumAmount =
        Number(
            draft.basketMinimumAmount,
        );

    switch (draft.type) {
        case "category_discount":
        case "fixed_amount_discount":
            if (
                draft.valueType ===
                "fixed_amount"
            ) {
                promotion.type =
                    "fixed_amount_discount";
                promotion.discountAmount =
                    value;
            }
            else {
                promotion.type =
                    "category_discount";
                promotion.discountPercentage =
                    value;
            }
            break;

        case "quantity_discount":
            promotion.minimumQuantity =
                quantity;

            if (
                draft.valueType ===
                "fixed_amount"
            ) {
                promotion.discountAmount =
                    value;
            }
            else {
                promotion.discountPercentage =
                    value;
            }
            break;

        case "bundle_price":
            promotion.bundleComponents =
                draft.bundleComponents.map(
                    (component) => ({
                        id:
                            component.id,
                        quantity:
                            Number(
                                component.quantity,
                            ),
                        target:
                            promotionPopulationToTarget(
                                component.population,
                            ),
                    }),
                );

            promotion.bundleQuantity =
                promotion.bundleComponents
                    .reduce(
                        (sum, component) =>
                            sum +
                            component.quantity,
                        0,
                    );

            promotion.bundlePrice =
                bundlePrice;
            break;

        case "mix_and_match":
            promotion.bundleQuantity =
                quantity;

            promotion.bundlePrice =
                bundlePrice;
            break;

        case "buy_x_get_y":
            promotion.buyQuantity =
                quantity;

            promotion.getQuantity =
                getQuantity;

            if (
                draft.valueType ===
                "fixed_amount"
            ) {
                promotion.rewardDiscountAmount =
                    value;
            }
            else {
                promotion.rewardDiscountPercentage =
                    value;
            }
            break;

        case "buy_a_get_b":
            promotion.buyQuantity =
                quantity;

            promotion.getQuantity =
                getQuantity;

            promotion.rewardTarget =
                promotionPopulationToTarget(
                    draft.rewardPopulation,
                );

            if (
                draft.valueType ===
                "fixed_amount"
            ) {
                promotion.rewardDiscountAmount =
                    value;
            }
            else {
                promotion.rewardDiscountPercentage =
                    value;
            }
            break;

        case "basket_discount":
            promotion.basketMinimumAmount =
                basketMinimumAmount;

            if (
                draft.valueType ===
                "fixed_amount"
            ) {
                promotion.discountAmount =
                    value;
            }
            else {
                promotion.discountPercentage =
                    value;
            }
            break;

        case "basket_tier_discount":
            break;
    }

    return promotion;
}
