export type ProductCategory =
    | "all"
    | "hot-drinks"
    | "cold-drinks"
    | "pastries"
    | "sandwiches"
    | "desserts";

export type Product = {
    id: string;
    name: string;
    price: number;
    category: Exclude<ProductCategory, "all">;
    imageUrl: string;
    barcode: string;
    sku: string;
    isActive: boolean;
};