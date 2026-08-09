import {
    defaultPromotions,
} from "./DefaultPromotions";
import type {
    Promotion,
} from "./Promotion";
import {
    getPromotions,
    savePromotions,
} from "./PromotionRepository";

const clubTestPromotion: Promotion = {
    id: "test-club-hot-drinks-10",
    name: "10% לחברי מועדון על משקאות חמים",
    type: "category_discount",
    isActive: true,
    priority: 50,
    allowStacking: false,
    target: {
        type: "category",
        categoryIds: [
            "hot-drinks",
        ],
    },
    allowedCustomerGroupIds: [
        "club",
    ],
    discountPercentage: 10,
};

export function seedPromotionsIfEmpty() {
    const current =
        getPromotions();

    const base =
        current.length > 0
            ? current
            : defaultPromotions;

    const hasClubTestPromotion =
        base.some(
            (promotion) =>
                promotion.id ===
                clubTestPromotion.id,
        );

    const next =
        hasClubTestPromotion
            ? base
            : [
                ...base,
                clubTestPromotion,
            ];

    if (
        current.length === 0 ||
        !hasClubTestPromotion
    ) {
        savePromotions(
            next,
        );
    }

    return next;
}