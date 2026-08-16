import type {
    Product,
} from "../../types/product";
import type {
    ProductVariant,
} from "./ProductVariantIdentity";

export type FashionProduct =
    Product & {
        styleCode: string;
        variants: ProductVariant[];
    };

export function isFashionProduct(
    product: Product,
): product is FashionProduct {
    return Boolean(
        product.styleCode &&
        product.variants &&
        product.variants.length > 0,
    );
}

export function getFashionVariant(
    product: FashionProduct,
    variantId: string,
) {
    return product.variants.find(
        (variant) =>
            variant.variantId ===
            variantId,
    );
}

export function getFashionVariantByBarcode(
    product: FashionProduct,
    barcode: string,
) {
    return product.variants.find(
        (variant) =>
            variant.barcode ===
                barcode &&
            variant.isActive,
    );
}

export function getFashionVariantBySku(
    product: FashionProduct,
    sku: string,
) {
    return product.variants.find(
        (variant) =>
            variant.sku ===
                sku &&
            variant.isActive,
    );
}

export function getFashionVariantPrice(
    product: FashionProduct,
    variant: ProductVariant,
) {
    return (
        variant.price ??
        product.price
    );
}

export function getFashionProductStock(
    product: FashionProduct,
) {
    return product.variants.reduce(
        (
            total,
            variant,
        ) =>
            total +
            (
                variant.isActive
                    ? variant.stockOnHand ?? 0
                    : 0
            ),
        0,
    );
}