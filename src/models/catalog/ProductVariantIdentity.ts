export type ProductVariantIdentity = {
    variantId: string;

    styleCode: string;

    color: {
        code: string;
        name: string;
    };

    size: {
        code: string;
        name: string;
    };
};

export type ProductVariant =
    ProductVariantIdentity & {
        sku: string;
        barcode: string;

        price?: number;
        stockOnHand?: number;

        isActive: boolean;
    };