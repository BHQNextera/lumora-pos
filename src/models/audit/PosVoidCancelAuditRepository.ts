import {
    isTauri,
} from "@tauri-apps/api/core";

import type {
    PosActionAuthorization,
} from "../employee/PosActionAuthorization";

import {
    BrowserLocalStorageAdapter,
} from "../../runtime/storage/BrowserLocalStorageAdapter";

import type {
    RuntimeStorage,
} from "../../runtime/storage/RuntimeStorage";

const STORAGE_KEY =
    "lumora.pos-void-cancel-audit";

const MAX_EVENTS = 500;

export type PosVoidCancelAuditEvent = {
    id: string;
    action:
        "open_transaction_cancelled";
    authorization:
        PosActionAuthorization;
    lineCount: number;
    total: number;
    customerId?: string;
    customerName?: string;
    createdAt: string;
};

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

    return storagePromise;
}

function parseEvents(
    raw: string | null,
): PosVoidCancelAuditEvent[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed =
            JSON.parse(raw) as unknown;

        return Array.isArray(parsed)
            ? parsed as PosVoidCancelAuditEvent[]
            : [];
    }
    catch {
        return [];
    }
}

export async function recordPosVoidCancelAudit(
    input: {
        authorization:
            PosActionAuthorization;
        lineCount: number;
        total: number;
        customerId?: string;
        customerName?: string;
    },
): Promise<void> {
    const event:
        PosVoidCancelAuditEvent = {
            id:
                crypto.randomUUID(),
            action:
                "open_transaction_cancelled",
            authorization:
                input.authorization,
            lineCount:
                input.lineCount,
            total:
                input.total,
            customerId:
                input.customerId,
            customerName:
                input.customerName,
            createdAt:
                new Date().toISOString(),
        };

    persistenceQueue =
        persistenceQueue
            .catch(() => {
                /*
                 * Keep the queue usable after
                 * a failed write.
                 */
            })
            .then(
                async () => {
                    const storage =
                        await getStorage();

                    const raw =
                        await storage.getItem(
                            STORAGE_KEY,
                        );

                    const current =
                        parseEvents(
                            raw,
                        );

                    const next = [
                        event,
                        ...current,
                    ].slice(
                        0,
                        MAX_EVENTS,
                    );

                    await storage.setItem(
                        STORAGE_KEY,
                        JSON.stringify(
                            next,
                        ),
                    );
                },
            );

    await persistenceQueue;
}
