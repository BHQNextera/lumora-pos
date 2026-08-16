import type {
    ProductVariant,
} from "../models/catalog/ProductVariantIdentity";

export type ProductCategory =
    | "all"
    | "hot-drinks"
    | "cold-drinks"
    | "pastries"
    | "sandwiches"
    | "desserts"
    | "manual"
    | "fashion";

export type ProductHierarchy = {
    department?: string;
    category?: string;
    subcategory?: string;
};

export type ProductSupplier = {
    id?: string;
    name: string;
    supplierSku?: string;
};

export type ProductLocalizedNames = {
    he?: string;
    en?: string;
    el?: string;
};

export type Product = {
    id: string;

    /*
     * name remains the current display/fallback value so existing
     * sale flows remain backward compatible.
     *
     * names carries the multilingual master-data values.
     */
    name: string;
    names?: ProductLocalizedNames;

    price: number;

    costPrice?: number;

    category:
        Exclude<
            ProductCategory,
            "all"
        >;

    hierarchy?: ProductHierarchy;

    supplier?: ProductSupplier;

    stockOnHand?: number;

    imageUrl: string;
    barcode: string;
    sku: string;

    /*
     * Optional Style/Model identity.
     *
     * Used by segment models such as Fashion.
     * Standard Retail products do not need this field.
     */
    styleCode?: string;

    /*
     * Optional variants belonging to the same product master.
     *
     * Fashion example:
     *
     * Product:
     * SHIRT-101
     *
     * Variants:
     * Black / S
     * Black / M
     * White / S
     * White / M
     *
     * SKU, barcode, stock and optional variant price belong
     * to the exact variant.
     */
    variants?: ProductVariant[];

    isActive: boolean;
};