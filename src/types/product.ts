export type ProductCategory =
    | "all"
    | "hot-drinks"
    | "cold-drinks"
    | "pastries"
    | "sandwiches"
    | "desserts";

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

    category: Exclude<ProductCategory, "all">;

    hierarchy?: ProductHierarchy;

    supplier?: ProductSupplier;

    stockOnHand?: number;

    imageUrl: string;
    barcode: string;
    sku: string;

    isActive: boolean;
};