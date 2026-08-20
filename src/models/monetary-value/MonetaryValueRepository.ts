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
    MonetaryValue,
    MonetaryValueMovement,
} from "./MonetaryValue";

const VALUES_KEY =
    "lumora.monetary-values";

const MOVEMENTS_KEY =
    "lumora.monetary-value-movements";

let monetaryValues:
    MonetaryValue[] = [];

let monetaryValueMovements:
    MonetaryValueMovement[] = [];

let monetaryValueStoragePromise:
    Promise<RuntimeStorage> | null =
        null;

let persistenceQueue:
    Promise<void> =
        Promise.resolve();

function getMonetaryValueStorage():
Promise<RuntimeStorage> {
    if (!monetaryValueStoragePromise) {
        monetaryValueStoragePromise =
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

    return monetaryValueStoragePromise;
}

function parseArray<T>(
    raw: string | null,
): T[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? parsed as T[]
            : [];
    }
    catch {
        return [];
    }
}

async function readStoredValue(
    storage: RuntimeStorage,
    key: string,
): Promise<string | null> {
    let raw =
        await storage.getItem(
            key,
        );

    if (
        raw === null &&
        isTauri()
    ) {
        const legacy =
            window.localStorage.getItem(
                key,
            );

        if (legacy !== null) {
            await storage.setItem(
                key,
                legacy,
            );

            window.localStorage.removeItem(
                key,
            );

            raw = legacy;
        }
    }

    return raw;
}

export async function hydrateMonetaryValues():
Promise<void> {
    const storage =
        await getMonetaryValueStorage();

    const [
        valuesRaw,
        movementsRaw,
    ] =
        await Promise.all([
            readStoredValue(
                storage,
                VALUES_KEY,
            ),
            readStoredValue(
                storage,
                MOVEMENTS_KEY,
            ),
        ]);

    monetaryValues =
        parseArray<MonetaryValue>(
            valuesRaw,
        );

    monetaryValueMovements =
        parseArray<MonetaryValueMovement>(
            movementsRaw,
        );
}

function persistMonetaryValues() {
    const snapshot =
        JSON.stringify(
            monetaryValues,
        );

    persistenceQueue =
        persistenceQueue.then(
            async () => {
                const storage =
                    await getMonetaryValueStorage();

                await storage.setItem(
                    VALUES_KEY,
                    snapshot,
                );
            },
        );
}

function persistMonetaryValueMovements() {
    const snapshot =
        JSON.stringify(
            monetaryValueMovements,
        );

    persistenceQueue =
        persistenceQueue.then(
            async () => {
                const storage =
                    await getMonetaryValueStorage();

                await storage.setItem(
                    MOVEMENTS_KEY,
                    snapshot,
                );
            },
        );
}

export function flushMonetaryValuePersistence():
Promise<void> {
    return persistenceQueue;
}

export function getMonetaryValues() {
    return [
        ...monetaryValues,
    ];
}

export function getMonetaryValue(
    id: string,
) {
    return monetaryValues.find(
        (item) =>
            item.id === id,
    );
}

export function getMonetaryValueByNumber(
    number: string,
) {
    const normalized =
        number
            .trim()
            .toLowerCase();

    return monetaryValues.find(
        (item) =>
            item.number
                .trim()
                .toLowerCase() ===
            normalized,
    );
}

export function saveMonetaryValue(
    value: MonetaryValue,
) {
    const exists =
        monetaryValues.some(
            (item) =>
                item.id === value.id,
        );

    monetaryValues =
        exists
            ? monetaryValues.map(
                (item) =>
                    item.id === value.id
                        ? value
                        : item,
            )
            : [
                value,
                ...monetaryValues,
            ];

    persistMonetaryValues();

    return value;
}

export function getMonetaryValueMovements() {
    return [
        ...monetaryValueMovements,
    ];
}

export function getMovementsForMonetaryValue(
    monetaryValueId: string,
) {
    return monetaryValueMovements
        .filter(
            (movement) =>
                movement.monetaryValueId ===
                monetaryValueId,
        )
        .sort(
            (a, b) =>
                new Date(
                    b.createdAt,
                ).getTime() -
                new Date(
                    a.createdAt,
                ).getTime(),
        );
}

export function saveMonetaryValueMovement(
    movement: MonetaryValueMovement,
) {
    monetaryValueMovements = [
        movement,
        ...monetaryValueMovements,
    ];

    persistMonetaryValueMovements();

    return movement;
}
