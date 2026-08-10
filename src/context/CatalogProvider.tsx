import {
    useCallback,
    useMemo,
    useState,
} from "react";
import type {
    ReactNode,
} from "react";

import {
    CatalogContext,
} from "./CatalogContext";
import {
    products as productSeed,
} from "../data/products";
import type {
    Product,
} from "../types/product";

const STORAGE_KEY =
    "lumora.catalog.products.v1";

function loadProducts(): Product[] {
    try {
        const raw =
            window.localStorage.getItem(
                STORAGE_KEY,
            );

        if (!raw) {
            return productSeed;
        }

        const parsed =
            JSON.parse(raw);

        if (!Array.isArray(parsed)) {
            return productSeed;
        }

        return parsed as Product[];
    } catch {
        return productSeed;
    }
}

function persistProducts(
    products: Product[],
) {
    window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(products),
    );
}

type CatalogProviderProps = {
    children: ReactNode;
};

function CatalogProvider({
    children,
}: CatalogProviderProps) {
    const [
        products,
        setProducts,
    ] =
        useState<Product[]>(
            loadProducts,
        );

    const commit = useCallback(
        (
            updater:
                | Product[]
                | ((
                      current: Product[],
                  ) => Product[]),
        ) => {
            setProducts(
                (current) => {
                    const next =
                        typeof updater ===
                        "function"
                            ? updater(
                                  current,
                              )
                            : updater;

                    persistProducts(
                        next,
                    );

                    return next;
                },
            );
        },
        [],
    );

    const addProduct =
        useCallback(
            (product: Product) => {
                commit(
                    (current) => [
                        ...current,
                        product,
                    ],
                );
            },
            [commit],
        );

    const updateProduct =
        useCallback(
            (product: Product) => {
                commit(
                    (current) =>
                        current.map(
                            (item) =>
                                item.id ===
                                product.id
                                    ? product
                                    : item,
                        ),
                );
            },
            [commit],
        );

    const setProductActive =
        useCallback(
            (
                productId: string,
                isActive: boolean,
            ) => {
                commit(
                    (current) =>
                        current.map(
                            (item) =>
                                item.id ===
                                productId
                                    ? {
                                          ...item,
                                          isActive,
                                      }
                                    : item,
                        ),
                );
            },
            [commit],
        );

    const resetCatalog =
        useCallback(() => {
            commit(productSeed);
        }, [commit]);

    const value =
        useMemo(
            () => ({
                products,
                addProduct,
                updateProduct,
                setProductActive,
                resetCatalog,
            }),
            [
                products,
                addProduct,
                updateProduct,
                setProductActive,
                resetCatalog,
            ],
        );

    return (
        <CatalogContext.Provider
            value={value}
        >
            {children}
        </CatalogContext.Provider>
    );
}

export default CatalogProvider;