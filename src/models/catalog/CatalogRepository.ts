import {
    isTauri,
} from "@tauri-apps/api/core";

import {
    BrowserLocalStorageAdapter,
} from "../../runtime/storage/BrowserLocalStorageAdapter";

import type {
    RuntimeStorage,
} from "../../runtime/storage/RuntimeStorage";

import {
    products as productSeed,
} from "../../data/products";

import type {
    Product,
} from "../../types/product";

const STORAGE_KEY =
    "lumora.catalog.products.v1";

let products:
    Product[] = [
        ...productSeed,
    ];

let catalogStoragePromise:
    Promise<RuntimeStorage> | null =
        null;

function getCatalogStorage():
Promise<RuntimeStorage> {
    if (!catalogStoragePromise) {
        catalogStoragePromise =
            (async (): Promise<RuntimeStorage> => {
                if (!isTauri()) {
                    return new BrowserLocalStorageAdapter();
                }

                const {
                    SQLiteRuntimeStorageAdapter,
                } = await import(
                    "../../runtime/storage/SQLiteRuntimeStorageAdapter"
                );

                return new SQLiteRuntimeStorageAdapter();
            })();
    }

    return catalogStoragePromise;
}

let persistenceQueue:
    Promise<void> =
        Promise.resolve();

function parseProducts(
    raw: string | null,
): Product[] {
    if (!raw) {
        return [
            ...productSeed,
        ];
    }

    try {
        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? parsed as Product[]
            : [
                ...productSeed,
            ];
    }
    catch {
        return [
            ...productSeed,
        ];
    }
}

async function readStoredCatalog(
    storage: RuntimeStorage,
): Promise<string | null> {
    let raw =
        await storage.getItem(
            STORAGE_KEY,
        );

    if (
        raw === null &&
        isTauri()
    ) {
        const legacy =
            window.localStorage.getItem(
                STORAGE_KEY,
            );

        if (legacy !== null) {
            await storage.setItem(
                STORAGE_KEY,
                legacy,
            );

            window.localStorage.removeItem(
                STORAGE_KEY,
            );

            raw = legacy;
        }
    }

    return raw;
}

export async function hydrateCatalog():
Promise<void> {
    const storage =
        await getCatalogStorage();

    const raw =
        await readStoredCatalog(
            storage,
        );

    products =
        parseProducts(
            raw,
        );
}

function persistProducts() {
    const snapshot =
        JSON.stringify(
            products,
        );

    persistenceQueue =
        persistenceQueue.then(
            async () => {
                const storage =
                    await getCatalogStorage();

                await storage.setItem(
                    STORAGE_KEY,
                    snapshot,
                );
            },
        );
}

export function getCatalogProducts():
Product[] {
    return [
        ...products,
    ];
}

export function saveCatalogProducts(
    nextProducts: Product[],
): Product[] {
    products = [
        ...nextProducts,
    ];

    persistProducts();

    return getCatalogProducts();
}

export function resetCatalogProducts():
Product[] {
    products = [
        ...productSeed,
    ];

    persistProducts();

    return getCatalogProducts();
}

export function flushCatalogPersistence():
Promise<void> {
    return persistenceQueue;
}