import {
    getPromotions,
    savePromotions,
} from "./PromotionRepository";
import {
    defaultPromotions,
} from "./DefaultPromotions";

export function seedPromotionsIfEmpty() {
    const current =
        getPromotions();

    if (
        current.length > 0
    ) {
        return current;
    }

    savePromotions(
        defaultPromotions,
    );

    return defaultPromotions;
}