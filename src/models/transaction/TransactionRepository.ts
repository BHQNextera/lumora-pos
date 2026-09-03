import type { SaleDocument } from "../document/Document";
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
/*
 * LUMORA_NEXTERA_OUTBOX_V1
 *
 * Durable local replication queue for Lumora -> Nextera.
 *
 * The sale itself remains the source of truth and is committed first.
 * Nextera availability must never be required to complete a POS sale.
 *
 * V1 stores an immutable sale snapshot. Delivery/acknowledgement is added
 * separately so network failures cannot contaminate the sale commit path.
 */
const LUMORA_NEXTERA_OUTBOX_STORAGE_KEY =
    "lumora:nextera:outbox:v1";

export type LumoraNexteraOutboxStatus =
    | "pending"
    | "sending"
    | "delivered"
    | "failed";

export type LumoraNexteraOutboxEvent = {
    id: string;
    idempotencyKey: string;
    eventName: "lumora.transaction.completed";
    schemaVersion: "lumora.transaction.v1";
    saleId: string;
    saleNumber?: string;
    status: LumoraNexteraOutboxStatus;
    attemptCount: number;
    createdAt: string;
    updatedAt: string;
    lastAttemptAt?: string;
    lastError?: string;
    saleSnapshot: Sale;
    documentSnapshots?: SaleDocument[];
};

function parseLumoraNexteraOutbox(
    raw: string | null,
): LumoraNexteraOutboxEvent[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(
            raw,
        ) as unknown;

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(
            (
                item,
            ): item is LumoraNexteraOutboxEvent =>
                typeof item === "object" &&
                item !== null &&
                typeof (
                    item as Partial<LumoraNexteraOutboxEvent>
                ).id === "string" &&
                typeof (
                    item as Partial<LumoraNexteraOutboxEvent>
                ).saleId === "string",
        );
    }
    catch (error) {
        console.error(
            "LUMORA_NEXTERA_OUTBOX_PARSE_FAILED",
            error,
        );

        return [];
    }
}

export function enqueueLumoraNexteraSale(
    sale: Sale,
    documents: SaleDocument[] = [],
): void {
    const now =
        new Date().toISOString();

    const eventId =
        `lumora-sale-${sale.id}`;

    const idempotencyKey =
        `lumora:transaction:${sale.id}`;

    const saleSnapshot =
        JSON.parse(
            JSON.stringify(
                sale,
            ),
        ) as Sale;

    const documentSnapshots =
        JSON.parse(
            JSON.stringify(
                documents,
            ),
        ) as SaleDocument[];

    enqueuePersistence(
        async () => {
            const storage =
                await getTransactionStorage();

            const raw =
                await storage.getItem(
                    LUMORA_NEXTERA_OUTBOX_STORAGE_KEY,
                );

            const current =
                parseLumoraNexteraOutbox(
                    raw,
                );

            const existing =
                current.find(
                    (event) =>
                        event.saleId ===
                        sale.id,
                );

            if (existing) {
                /*
                 * Re-saving an already queued sale must not create
                 * another outbound event. The receiver has a second
                 * idempotency barrier, but the local queue should also
                 * remain one-event-per-sale.
                 */
                return;
            }

            const event:
                LumoraNexteraOutboxEvent = {
                    id:
                        eventId,
                    idempotencyKey,
                    eventName:
                        "lumora.transaction.completed",
                    schemaVersion:
                        "lumora.transaction.v1",
                    saleId:
                        sale.id,
                    saleNumber:
                        (
                            sale as Sale & {
                                number?: string;
                                transactionNumber?: string;
                            }
                        ).number ??
                        (
                            sale as Sale & {
                                transactionNumber?: string;
                            }
                        ).transactionNumber,
                    status:
                        "pending",
                    attemptCount:
                        0,
                    createdAt:
                        now,
                    updatedAt:
                        now,
                    saleSnapshot,
                    documentSnapshots,
                };

            await storage.setItem(
                LUMORA_NEXTERA_OUTBOX_STORAGE_KEY,
                JSON.stringify(
                    [
                        ...current,
                        event,
                    ],
                ),
            );
        },
    );
}

export async function getLumoraNexteraOutbox():
Promise<LumoraNexteraOutboxEvent[]> {
    await persistenceQueue;

    const storage =
        await getTransactionStorage();

    const raw =
        await storage.getItem(
            LUMORA_NEXTERA_OUTBOX_STORAGE_KEY,
        );

    return parseLumoraNexteraOutbox(
        raw,
    );
}

export async function getPendingLumoraNexteraOutbox():
Promise<LumoraNexteraOutboxEvent[]> {
    const events =
        await getLumoraNexteraOutbox();

    return events
        .filter(
            (event) =>
                event.status === "pending" ||
                event.status === "failed" ||
                event.status === "sending",
        )
        .sort(
            (
                left,
                right,
            ) => {
                const createdOrder =
                    left.createdAt.localeCompare(
                        right.createdAt,
                    );

                if (createdOrder !== 0) {
                    return createdOrder;
                }

                return left.id.localeCompare(
                    right.id,
                );
            },
        );
}

async function updateLumoraNexteraOutboxEvent(
    eventId: string,
    updater: (
        event: LumoraNexteraOutboxEvent,
    ) => LumoraNexteraOutboxEvent,
): Promise<void> {
    enqueuePersistence(
        async () => {
            const storage =
                await getTransactionStorage();

            const raw =
                await storage.getItem(
                    LUMORA_NEXTERA_OUTBOX_STORAGE_KEY,
                );

            const current =
                parseLumoraNexteraOutbox(
                    raw,
                );

            const next =
                current.map(
                    (event) =>
                        event.id === eventId
                            ? updater(
                                  event,
                              )
                            : event,
                );

            await storage.setItem(
                LUMORA_NEXTERA_OUTBOX_STORAGE_KEY,
                JSON.stringify(
                    next,
                ),
            );
        },
    );

    await persistenceQueue;
}

export async function markLumoraNexteraOutboxSending(
    eventId: string,
): Promise<void> {
    const now =
        new Date().toISOString();

    await updateLumoraNexteraOutboxEvent(
        eventId,
        (event) => ({
            ...event,
            status:
                "sending",
            attemptCount:
                event.attemptCount + 1,
            lastAttemptAt:
                now,
            lastError:
                undefined,
            updatedAt:
                now,
        }),
    );
}

export async function markLumoraNexteraOutboxDelivered(
    eventId: string,
): Promise<void> {
    const now =
        new Date().toISOString();

    await updateLumoraNexteraOutboxEvent(
        eventId,
        (event) => ({
            ...event,
            status:
                "delivered",
            lastError:
                undefined,
            updatedAt:
                now,
        }),
    );
}

export async function markLumoraNexteraOutboxFailed(
    eventId: string,
    errorMessage: string,
): Promise<void> {
    const now =
        new Date().toISOString();

    await updateLumoraNexteraOutboxEvent(
        eventId,
        (event) => ({
            ...event,
            status:
                "failed",
            lastError:
                errorMessage,
            updatedAt:
                now,
        }),
    );
}

export async function flushLumoraNexteraOutboxPersistence():
Promise<void> {
    await persistenceQueue;
}