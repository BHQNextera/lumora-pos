export type PromotionType =
    | "buy_x_get_y"
    | "buy_a_get_b"
    | "bundle_price"
    | "mix_and_match"
    | "quantity_discount"
    | "category_discount"
    | "fixed_amount_discount"
    | "basket_discount"
    | "basket_tier_discount";

export type PromotionTarget =
    | {
        type: "product";
        productIds: string[];
    }
    | {
        type: "category";
        categoryIds: string[];
    };

export type PromotionRewardTarget =
    | {
        type: "product";
        productIds: string[];
    }
    | {
        type: "category";
        categoryIds: string[];
    };

export type PromotionTier = {
    minimumAmount: number;
    discountType:
    | "percentage"
    | "fixed_amount";
    value: number;
};


export type PromotionSchedule = {
    /**
     * JavaScript day numbers:
     * 0 = Sunday, 1 = Monday ... 6 = Saturday.
     *
     * Omit / empty array = every day.
     */
    daysOfWeek?: number[];

    /**
     * Local store time in HH:mm.
     * Example: "10:00".
     */
    startTime?: string;

    /**
     * Local store time in HH:mm.
     * Example: "12:00".
     *
     * If endTime is earlier than startTime, the window crosses midnight.
     * Example: 22:00-02:00.
     */
    endTime?: string;
};

export type Promotion = {
    id: string;

    name: string;

    type: PromotionType;

    isActive: boolean;

    priority: number;

    allowStacking: boolean;

    target: PromotionTarget;

    /**
     * Optional exclusions inside the target population.
     * Useful for category-wide promotions with specific products excluded.
     */
    excludedProductIds?: string[];

    excludedCategoryIds?: string[];

    buyQuantity?: number;
    getQuantity?: number;

    rewardTarget?: PromotionRewardTarget;
    rewardDiscountPercentage?: number;

    bundleQuantity?: number;
    bundlePrice?: number;

    minimumQuantity?: number;
    discountPercentage?: number;
    discountAmount?: number;

    basketMinimumAmount?: number;

    tiers?: PromotionTier[];

    /**
     * Optional recurring weekly/hourly restriction.
     * Example:
     * Sunday-Thursday, 10:00-12:00.
     */
    schedule?: PromotionSchedule;

    /**
     * Optional absolute campaign dates/times.
     */
    startsAt?: string;
    endsAt?: string;
};