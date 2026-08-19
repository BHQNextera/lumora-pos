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
        label: "אחוז הנחה על פריטים",
    },
    {
        value: "fixed_amount_discount",
        label: "סכום הנחה קבוע",
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
    quantity: string;
    getQuantity: string;
    bundlePrice: string;
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
        quantity: "2",
        getQuantity: "1",
        bundlePrice: "20",
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
            promotion.type,

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
                10,
            ),

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
            if (
                !validPercentage(
                    draft.value,
                )
            ) {
                return "אחוז ההנחה חייב להיות בין 0 ל־100.";
            }
            break;

        case "fixed_amount_discount":
            if (
                !positiveNumber(
                    draft.value,
                )
            ) {
                return "סכום ההנחה חייב להיות גדול מ־0.";
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
                !validPercentage(
                    draft.value,
                )
            ) {
                return "אחוז ההנחה חייב להיות בין 0 ל־100.";
            }
            break;

        case "bundle_price":
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
                !validPercentage(
                    draft.value,
                )
            ) {
                return "אחוז ההנחה על פריט ההטבה חייב להיות בין 0 ל־100.";
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
                !validPercentage(
                    draft.value,
                )
            ) {
                return "אחוז ההנחה חייב להיות בין 0 ל־100.";
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
            draft.targetPopulation,
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
            promotion.discountPercentage =
                value;
            break;

        case "fixed_amount_discount":
            promotion.discountAmount =
                value;
            break;

        case "quantity_discount":
            promotion.minimumQuantity =
                quantity;

            promotion.discountPercentage =
                value;
            break;

        case "bundle_price":
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

            promotion.rewardDiscountPercentage =
                value;
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

            promotion.rewardDiscountPercentage =
                value;
            break;

        case "basket_discount":
            promotion.basketMinimumAmount =
                basketMinimumAmount;

            promotion.discountPercentage =
                value;
            break;

        case "basket_tier_discount":
            break;
    }

    return promotion;
}
