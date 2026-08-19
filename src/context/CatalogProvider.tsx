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
    getCatalogProducts,
    resetCatalogProducts,
    saveCatalogProducts,
} from "../models/catalog/CatalogRepository";

import type {
    Product,
} from "../types/product";

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
            () =>
                getCatalogProducts(),
        );

    const commit =
        useCallback(
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

                        saveCatalogProducts(
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
        useCallback(
            () => {
                setProducts(
                    resetCatalogProducts(),
                );
            },
            [],
        );

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