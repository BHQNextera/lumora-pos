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
    CashMovement,
    CashMovementReason,
    CashMovementType,
} from "./CashMovement";

const STORAGE_KEY =
    "lumora.cash-movements";

let movements:
    CashMovement[] = [];

let cashMovementStoragePromise:
    Promise<RuntimeStorage> | null =
        null;

function getCashMovementStorage():
Promise<RuntimeStorage> {
    if (!cashMovementStoragePromise) {
        cashMovementStoragePromise =
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

    return cashMovementStoragePromise;
}

let persistenceQueue:
    Promise<void> =
        Promise.resolve();

function parseMovements(
    raw: string | null,
): CashMovement[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? parsed as CashMovement[]
            : [];
    }
    catch {
        return [];
    }
}

export async function hydrateCashMovements():
Promise<void> {
    const storage =
        await getCashMovementStorage();

    const raw =
        await storage.getItem(
            STORAGE_KEY,
        );

    movements =
        parseMovements(
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
                 * Keep later writes usable after
                 * a failed persistence operation.
                 */
            })
            .then(operation);

    void persistenceQueue.catch(
        (error) => {
            console.error(
                "LUMORA_CASH_MOVEMENT_PERSISTENCE_FAILED",
                error,
            );
        },
    );
}

function persist(
    nextMovements:
        CashMovement[],
): void {
    const serialized =
        JSON.stringify(
            nextMovements,
        );

    enqueuePersistence(
        async () => {
            const storage =
                await getCashMovementStorage();

            await storage.setItem(
                STORAGE_KEY,
                serialized,
            );
        },
    );
}

export function createCashMovement(
    input: {
        tenantId: string;
        storeCode: string;
        registerCode: string;
        shiftId: string;

        type:
            CashMovementType;

        amount: number;

        reason:
            CashMovementReason;

        note?: string;

        employee: {
            employeeId: string;
            employeeName: string;
        };
    },
): CashMovement {
    if (
        !Number.isFinite(
            input.amount,
        ) ||
        input.amount <= 0
    ) {
        throw new Error(
            "INVALID_CASH_MOVEMENT_AMOUNT",
        );
    }

    const movement:
        CashMovement = {
        id:
            crypto.randomUUID(),

        tenantId:
            input.tenantId,

        storeCode:
            input.storeCode,

        registerCode:
            input.registerCode,

        shiftId:
            input.shiftId,

        type:
            input.type,

        amount:
            Math.round(
                (
                    input.amount +
                    Number.EPSILON
                ) * 100,
            ) / 100,

        reason:
            input.reason,

        note:
            input.note?.trim() ||
            undefined,

        employee: {
            ...input.employee,
        },

        createdAt:
            new Date()
                .toISOString(),
    };

    movements = [
        movement,
        ...movements,
    ];

    persist(
        movements,
    );

    return movement;
}

export function getCashMovementsForShift(
    shiftId: string,
) {
    return movements
        .filter(
            (movement) =>
                movement.shiftId ===
                shiftId,
        )
        .sort(
            (a, b) =>
                a.createdAt.localeCompare(
                    b.createdAt,
                ),
        );
}

export function getAllCashMovements() {
    return [
        ...movements,
    ];
}

export async function flushCashMovementPersistence():
Promise<void> {
    await persistenceQueue;
}
