import {
    isTauri,
} from "@tauri-apps/api/core";

import {
    BrowserLocalStorageAdapter,
} from "../../runtime/storage/BrowserLocalStorageAdapter";

import type {
    RuntimeStorage,
} from "../../runtime/storage/RuntimeStorage";

import type {
    ReturnDocument,
} from "../sale/Return";

const STORAGE_KEY =
    "lumora.returns";

let returns:
    ReturnDocument[] = [];

let returnStoragePromise:
    Promise<RuntimeStorage> | null =
        null;

function getReturnStorage():
Promise<RuntimeStorage> {
    if (!returnStoragePromise) {
        returnStoragePromise =
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

    return returnStoragePromise;
}

let persistenceQueue:
    Promise<void> =
        Promise.resolve();

function parseReturns(
    raw: string | null,
): ReturnDocument[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? parsed as ReturnDocument[]
            : [];
    }
    catch {
        return [];
    }
}

export async function hydrateReturns():
Promise<void> {
    const storage =
        await getReturnStorage();

    let raw =
        await storage.getItem(
            STORAGE_KEY,
        );

    if (
        raw === null &&
        isTauri()
    ) {
        const legacy =
            localStorage.getItem(
                STORAGE_KEY,
            );

        if (legacy !== null) {
            raw = legacy;

            await storage.setItem(
                STORAGE_KEY,
                legacy,
            );
        }
    }

    returns =
        parseReturns(
            raw,
        );
}

function persistReturns() {
    const snapshot =
        JSON.stringify(
            returns,
        );

    persistenceQueue =
        persistenceQueue.then(
            async () => {
                const storage =
                    await getReturnStorage();

                await storage.setItem(
                    STORAGE_KEY,
                    snapshot,
                );
            },
        );
}

export function flushReturnPersistence():
Promise<void> {
    return persistenceQueue;
}

export function saveReturn(
    returnDocument: ReturnDocument,
) {
    const existingIndex =
        returns.findIndex(
            (item) =>
                item.id ===
                returnDocument.id,
        );

    if (existingIndex >= 0) {
        returns =
            returns.map(
                (item) =>
                    item.id ===
                    returnDocument.id
                        ? returnDocument
                        : item,
            );
    }
    else {
        returns = [
            returnDocument,
            ...returns,
        ];
    }

    persistReturns();
}

export function getReturns() {
    return [
        ...returns,
    ];
}

export function getReturnsForSale(
    saleId: string,
) {
    return returns.filter(
        (item) =>
            item.originalSaleId ===
            saleId,
    );
}

export function clearReturns() {
    returns = [];

    persistenceQueue =
        persistenceQueue.then(
            async () => {
                const storage =
                    await getReturnStorage();

                await storage.removeItem(
                    STORAGE_KEY,
                );
            },
        );
}