export const PricingEvent = {
    CartChanged: "cart_changed",

    ProductAdded: "product_added",
    ProductRemoved: "product_removed",

    QuantityChanged: "quantity_changed",

    PriceChanged: "price_changed",

    DescriptionChanged: "description_changed",

    CustomerChanged: "customer_changed",

    PriceListChanged: "price_list_changed",

    CouponAdded: "coupon_added",
    CouponRemoved: "coupon_removed",

    PromotionAdded: "promotion_added",
    PromotionRemoved: "promotion_removed",

    TransactionDiscountAdded:
        "transaction_discount_added",

    TransactionDiscountRemoved:
        "transaction_discount_removed",

    ReturnAdded: "return_added",
    ReturnRemoved: "return_removed",
} as const;

export type PricingEvent =
    (typeof PricingEvent)[keyof typeof PricingEvent];