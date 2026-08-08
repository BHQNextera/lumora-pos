import type {
    Promotion,
} from "./Promotion";

const STORAGE_KEY =
    "lumora.promotions";

function loadPromotions(): Promotion[] {
    try {
        const raw =
            localStorage.getItem(
                STORAGE_KEY,
            );

        if (!raw) {
            return [];
        }

        const parsed =
            JSON.parse(raw);

        if (
            !Array.isArray(
                parsed,
            )
        ) {
            return [];
        }

        return parsed as Promotion[];
    } catch {
        return [];
    }
}

function persistPromotions(
    promotions: Promotion[],
) {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
            promotions,
        ),
    );
}

let promotions: Promotion[] =
    loadPromotions();

export function getPromotions() {
    return [...promotions];
}

export function getPromotion(
    promotionId: string,
) {
    return promotions.find(
        (promotion) =>
            promotion.id ===
            promotionId,
    );
}

export function savePromotion(
    promotion: Promotion,
) {
    const existingIndex =
        promotions.findIndex(
            (item) =>
                item.id ===
                promotion.id,
        );

    if (
        existingIndex >= 0
    ) {
        promotions =
            promotions.map(
                (item) =>
                    item.id ===
                        promotion.id
                        ? promotion
                        : item,
            );
    } else {
        promotions = [
            ...promotions,
            promotion,
        ];
    }

    persistPromotions(
        promotions,
    );
}

export function savePromotions(
    nextPromotions: Promotion[],
) {
    promotions = [
        ...nextPromotions,
    ];

    persistPromotions(
        promotions,
    );
}

export function removePromotion(
    promotionId: string,
) {
    promotions =
        promotions.filter(
            (promotion) =>
                promotion.id !==
                promotionId,
        );

    persistPromotions(
        promotions,
    );
}

export function clearPromotions() {
    promotions = [];

    localStorage.removeItem(
        STORAGE_KEY,
    );
}