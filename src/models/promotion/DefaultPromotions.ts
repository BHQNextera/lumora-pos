import type {
    Promotion,
} from "./Promotion";

export const defaultPromotions: Promotion[] =
    [
        {
            id: "demo-desserts-2-shekel-off",

            name: "₪2 הנחה על כל קינוח",

            type: "fixed_amount_discount",

            isActive: true,

            priority: 10,

            allowStacking: false,

            target: {
                type: "category",

                categoryIds: [
                    "desserts",
                ],
            },

            discountAmount: 2,
        },
    ];