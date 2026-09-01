import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    NEXTERA_SYNC_APPLIED_EVENT,
    requestNexteraSync,
} from "../integrations/nextera/NexteraSyncCoordinator";
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

    // LUMORA_LIVE_CATALOG_SYNC_V1
    useEffect(() => {
        let cancelled = false;
        let inFlight = false;

        const refreshFromNextera =
            async () => {
                if (
                    cancelled ||
                    inFlight ||
                    (
                        typeof navigator !== "undefined" &&
                        navigator.onLine === false
                    )
                ) {
                    return;
                }

                inFlight = true;

                try {
                    await requestNexteraSync();

                    if (!cancelled) {
                        setProducts(
                            getCatalogProducts(),
                        );
                    }
                } catch (error) {
                    console.error(
                        "Background Nextera catalog sync failed:",
                        error,
                    );
                } finally {
                    inFlight = false;
                }
            };

        void refreshFromNextera();

        const intervalId =
            window.setInterval(
                () => {
                    void refreshFromNextera();
                },
                15000,
            );

        const handleOnline = () => {
            void refreshFromNextera();
        };

        const handleFocus = () => {
            void refreshFromNextera();
        };

        window.addEventListener(
            "online",
            handleOnline,
        );
        window.addEventListener(
            "focus",
            handleFocus,
        );

        const handleSyncApplied = () => {
            if (!cancelled) {
                setProducts(
                    getCatalogProducts(),
                );
            }
        };

        window.addEventListener(
            NEXTERA_SYNC_APPLIED_EVENT,
            handleSyncApplied,
        );

        return () => {
            cancelled = true;
            window.clearInterval(
                intervalId,
            );
            window.removeEventListener(
                "online",
                handleOnline,
            );
            window.removeEventListener(
                "focus",
                handleFocus,
            );

            window.removeEventListener(
                NEXTERA_SYNC_APPLIED_EVENT,
                handleSyncApplied,
            );
        };
    }, []);

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

    // NEXTERA_CATALOG_SYNC_V1
    
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