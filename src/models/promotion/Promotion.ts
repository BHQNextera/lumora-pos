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

type PromotionPopulationBase = {
    excludedProductIds?: string[];
    excludedCategoryIds?: string[];
};

export type PromotionTarget =
    | (
        PromotionPopulationBase & {
            type: "product";
            productIds: string[];
            categoryIds?: string[];
        }
    )
    | (
        PromotionPopulationBase & {
            type: "category";
            categoryIds: string[];
            productIds?: string[];
        }
    )
    | (
        PromotionPopulationBase & {
            type: "mixed";
            productIds: string[];
            categoryIds: string[];
        }
    );

export type PromotionRewardTarget =
    PromotionTarget;

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
     * If endTime is earlier than startTime,
     * the window crosses midnight.
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
     * Legacy/global exclusions.
     * Kept for backward compatibility with existing promotions.
     * New promotion populations can keep exclusions directly
     * on target / rewardTarget.
     */
    excludedProductIds?: string[];

    excludedCategoryIds?: string[];

    /**
     * When present, the promotion applies only when
     * the current customer belongs to at least one group.
     */
    allowedCustomerGroupIds?: string[];

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
     */
    schedule?: PromotionSchedule;

    /**
     * Optional absolute campaign dates/times.
     */
    startsAt?: string;
    endsAt?: string;
};
