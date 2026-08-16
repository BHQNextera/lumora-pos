import type {
    Product,
} from "../types/product";

export const fashionProductSeed:
    Product = {
    id:
        "fashion-shirt-101",

    name:
        "חולצת Oxford",

    names: {
        he:
            "חולצת Oxford",
        en:
            "Oxford Shirt",
    },

    styleCode:
        "SHIRT-101",

    price:
        149.9,

    costPrice:
        62,

    category:
        "fashion",

    hierarchy: {
        department:
            "אופנה",
        category:
            "חולצות",
        subcategory:
            "חולצות מכופתרות",
    },

    stockOnHand:
        34,

    imageUrl:
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80",

    barcode:
        "STYLE-SHIRT-101",

    sku:
        "SHIRT-101",

    variants: [
        {
            variantId:
                "shirt-101-black-s",

            styleCode:
                "SHIRT-101",

            color: {
                code:
                    "BLK",
                name:
                    "שחור",
            },

            size: {
                code:
                    "S",
                name:
                    "S",
            },

            sku:
                "SHIRT-101-BLK-S",

            barcode:
                "7291000101011",

            stockOnHand:
                6,

            isActive:
                true,
        },

        {
            variantId:
                "shirt-101-black-m",

            styleCode:
                "SHIRT-101",

            color: {
                code:
                    "BLK",
                name:
                    "שחור",
            },

            size: {
                code:
                    "M",
                name:
                    "M",
            },

            sku:
                "SHIRT-101-BLK-M",

            barcode:
                "7291000101028",

            stockOnHand:
                8,

            isActive:
                true,
        },

        {
            variantId:
                "shirt-101-black-l",

            styleCode:
                "SHIRT-101",

            color: {
                code:
                    "BLK",
                name:
                    "שחור",
            },

            size: {
                code:
                    "L",
                name:
                    "L",
            },

            sku:
                "SHIRT-101-BLK-L",

            barcode:
                "7291000101035",

            stockOnHand:
                5,

            isActive:
                true,
        },

        {
            variantId:
                "shirt-101-white-s",

            styleCode:
                "SHIRT-101",

            color: {
                code:
                    "WHT",
                name:
                    "לבן",
            },

            size: {
                code:
                    "S",
                name:
                    "S",
            },

            sku:
                "SHIRT-101-WHT-S",

            barcode:
                "7291000101042",

            stockOnHand:
                4,

            isActive:
                true,
        },

        {
            variantId:
                "shirt-101-white-m",

            styleCode:
                "SHIRT-101",

            color: {
                code:
                    "WHT",
                name:
                    "לבן",
            },

            size: {
                code:
                    "M",
                name:
                    "M",
            },

            sku:
                "SHIRT-101-WHT-M",

            barcode:
                "7291000101059",

            stockOnHand:
                7,

            isActive:
                true,
        },

        {
            variantId:
                "shirt-101-white-l",

            styleCode:
                "SHIRT-101",

            color: {
                code:
                    "WHT",
                name:
                    "לבן",
            },

            size: {
                code:
                    "L",
                name:
                    "L",
            },

            sku:
                "SHIRT-101-WHT-L",

            barcode:
                "7291000101066",

            stockOnHand:
                4,

            isActive:
                true,
        },
    ],

    isActive:
        true,
};