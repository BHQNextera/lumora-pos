import {
    createContext,
} from "react";

import type {
    Product,
} from "../types/product";

export type CatalogContextValue = {
    products: Product[];

    addProduct: (
        product: Product,
    ) => void;

    updateProduct: (
        product: Product,
    ) => void;

    setProductActive: (
        productId: string,
        isActive: boolean,
    ) => void;

    resetCatalog: () => void;
};

export const CatalogContext =
    createContext<CatalogContextValue | null>(
        null,
    );