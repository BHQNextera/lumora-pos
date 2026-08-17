import type {
    Sale,
} from "../sale/Sale";

import {
    getRuntimeStorage,
} from "../../runtime/storage";

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
 * Persistence writes are serialized so a later write cannot
 * overtake an earlier one when the runtime adapter becomes
 * truly asynchronous (SQLite, filesystem, etc.).
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
        getRuntimeStorage();

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
                 * The original failure is logged below.
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
    /*
     * Snapshot now, not when the async operation later runs.
     */
    const serialized =
        JSON.stringify(
            nextTransactions,
        );

    enqueuePersistence(
        async () => {
            await getRuntimeStorage()
                .setItem(
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
            await getRuntimeStorage()
                .removeItem(
                    STORAGE_KEY,
                );
        },
    );
}

/*
 * Critical flows will use this later before declaring
 * durable completion when SQLite becomes the active adapter.
 */
export async function flushTransactionPersistence():
Promise<void> {
    await persistenceQueue;
}