import {
    isTauri,
} from "@tauri-apps/api/core";

import {
    BrowserLocalStorageAdapter,
} from "../../runtime/storage/BrowserLocalStorageAdapter";

import type {
    RuntimeStorage,
} from "../../runtime/storage/RuntimeStorage";

const STORAGE_KEY =
    "lumora.sale.sequence";

const DEFAULT_SEQUENCE =
    1;

let nextSequence =
    DEFAULT_SEQUENCE;

let saleNumberStoragePromise:
    Promise<RuntimeStorage> | null =
        null;

function getSaleNumberStorage():
Promise<RuntimeStorage> {
    if (!saleNumberStoragePromise) {
        saleNumberStoragePromise =
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

    return saleNumberStoragePromise;
}

let persistenceQueue:
    Promise<void> =
        Promise.resolve();

function parseSequence(
    raw: string | null,
): number {
    if (!raw) {
        return DEFAULT_SEQUENCE;
    }

    const value =
        Number(raw);

    return (
        Number.isFinite(value) &&
        value > 0
    )
        ? Math.floor(value)
        : DEFAULT_SEQUENCE;
}

export async function hydrateSaleNumbering():
Promise<void> {
    const storage =
        await getSaleNumberStorage();

    let raw =
        await storage.getItem(
            STORAGE_KEY,
        );

    // One-time compatibility path:
    // previous Tauri builds stored this value in WebView localStorage.
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

    nextSequence =
        parseSequence(
            raw,
        );
}

function persistSequence(
    value: number,
) {
    persistenceQueue =
        persistenceQueue.then(
            async () => {
                const storage =
                    await getSaleNumberStorage();

                await storage.setItem(
                    STORAGE_KEY,
                    String(value),
                );
            },
        );
}

export function allocateSaleNumber():
string {
    const current =
        nextSequence;

    nextSequence =
        current + 1;

    persistSequence(
        nextSequence,
    );

    return `S-${current
        .toString()
        .padStart(6, "0")}`;
}

export function peekNextSaleNumber():
string {
    return `S-${nextSequence
        .toString()
        .padStart(6, "0")}`;
}

export function flushSaleNumberPersistence():
Promise<void> {
    return persistenceQueue;
}