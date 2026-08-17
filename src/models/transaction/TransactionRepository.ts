import {
    isTauri,
} from "@tauri-apps/api/core";

import type {
    Sale,
} from "../sale/Sale";

import {
    BrowserLocalStorageAdapter,
} from "../../runtime/storage/BrowserLocalStorageAdapter";

import type {
    RuntimeStorage,
} from "../../runtime/storage/RuntimeStorage";

const STORAGE_KEY =
    "lumora.transactions";

/*
 * Runtime cache.
 *
 * Reads remain synchronous for the existing POS domain/UI.
 * The cache is hydrated before React renders.
 */
let transactions:
    Sale[] = [];

/*
 * Transactions use platform-specific persistence:
 *
 * Browser development:
 *     localStorage
 *
 * Tauri desktop runtime:
 *     SQLite
 *
 * Customers and register shifts are intentionally
 * NOT moved to SQLite yet.
 */
let transactionStoragePromise:
    Promise<RuntimeStorage> | null =
        null;

function getTransactionStorage():
Promise<RuntimeStorage> {
    if (!transactionStoragePromise) {
        transactionStoragePromise =
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

    return transactionStoragePromise;
}

/*
 * Persistence writes are serialized so a later write cannot
 * overtake an earlier asynchronous SQLite write.
 */
let persistenceQueue:
    Promise<void> =
        Promise.resolve();

function parseTransactions(
    raw: string | null,
): Sale[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? parsed as Sale[]
            : [];
    }
    catch {
        return [];
    }
}

export async function hydrateTransactions():
Promise<void> {
    const storage =
        await getTransactionStorage();

    const raw =
        await storage.getItem(
            STORAGE_KEY,
        );

    transactions =
        parseTransactions(
            raw,
        );
}

function enqueuePersistence(
    operation: () => Promise<void>,
): void {
    persistenceQueue =
        persistenceQueue
            .catch(() => {
                /*
                 * Keep the queue usable after a failed write.
                 */
            })
            .then(operation);

    void persistenceQueue.catch(
        (error) => {
            console.error(
                "LUMORA_TRANSACTION_PERSISTENCE_FAILED",
                error,
            );
        },
    );
}

function persistTransactions(
    nextTransactions: Sale[],
): void {
    const serialized =
        JSON.stringify(
            nextTransactions,
        );

    enqueuePersistence(
        async () => {
            const storage =
                await getTransactionStorage();

            await storage.setItem(
                STORAGE_KEY,
                serialized,
            );
        },
    );
}

export function saveSale(
    sale: Sale,
) {
    const existingIndex =
        transactions.findIndex(
            (item) =>
                item.id ===
                sale.id,
        );

    if (existingIndex >= 0) {
        transactions =
            transactions.map(
                (item) =>
                    item.id ===
                    sale.id
                        ? sale
                        : item,
            );
    }
    else {
        transactions = [
            sale,
            ...transactions,
        ];
    }

    persistTransactions(
        transactions,
    );
}

export function getTransactions() {
    return [
        ...transactions,
    ];
}

export function getTransaction(
    id: string,
) {
    return transactions.find(
        (sale) =>
            sale.id === id,
    );
}

export function clearTransactions() {
    transactions = [];

    enqueuePersistence(
        async () => {
            const storage =
                await getTransactionStorage();

            await storage.removeItem(
                STORAGE_KEY,
            );
        },
    );
}

export async function flushTransactionPersistence():
Promise<void> {
    await persistenceQueue;
}
