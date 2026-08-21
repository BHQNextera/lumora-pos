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
    HeldSale,
} from "./HeldSale";

const STORAGE_KEY =
    "lumora.held-sales";

let heldSales: HeldSale[] = [];

let storagePromise:
    Promise<RuntimeStorage> | null =
    null;

let persistenceQueue:
    Promise<void> =
    Promise.resolve();

function getStorage():
Promise<RuntimeStorage> {
    if (!storagePromise) {
        storagePromise =
            (async () => {
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

    return storagePromise;
}

function parseHeldSales(
    raw: string | null,
): HeldSale[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? parsed as HeldSale[]
            : [];
    }
    catch {
        return [];
    }
}

function enqueuePersistence(
    operation: () => Promise<void>,
): void {
    persistenceQueue =
        persistenceQueue
            .catch(() => {
                // Keep queue operational after failure.
            })
            .then(operation);

    void persistenceQueue.catch(
        (error) => {
            console.error(
                "LUMORA_HELD_SALE_PERSISTENCE_FAILED",
                error,
            );
        },
    );
}

function persistHeldSales(): void {
    const serialized =
        JSON.stringify(
            heldSales,
        );

    enqueuePersistence(
        async () => {
            const storage =
                await getStorage();

            await storage.setItem(
                STORAGE_KEY,
                serialized,
            );
        },
    );
}

export async function hydrateHeldSales():
Promise<void> {
    const storage =
        await getStorage();

    heldSales =
        parseHeldSales(
            await storage.getItem(
                STORAGE_KEY,
            ),
        );
}

export function getHeldSales():
HeldSale[] {
    return [
        ...heldSales,
    ].sort(
        (a, b) =>
            new Date(
                b.heldAt,
            ).getTime() -
            new Date(
                a.heldAt,
            ).getTime(),
    );
}

export function saveHeldSale(
    heldSale: HeldSale,
): HeldSale {
    const exists =
        heldSales.some(
            (item) =>
                item.id ===
                heldSale.id,
        );

    heldSales =
        exists
            ? heldSales.map(
                (item) =>
                    item.id ===
                    heldSale.id
                        ? heldSale
                        : item,
            )
            : [
                heldSale,
                ...heldSales,
            ];

    persistHeldSales();

    return heldSale;
}

export function deleteHeldSale(
    id: string,
): void {
    heldSales =
        heldSales.filter(
            (item) =>
                item.id !== id,
        );

    persistHeldSales();
}

export async function flushHeldSalePersistence():
Promise<void> {
    await persistenceQueue;
}
