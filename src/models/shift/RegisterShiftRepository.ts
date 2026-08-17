import {
    isTauri,
} from "@tauri-apps/api/core";

import type {
    CashDeclaration,
} from "../cash/CashDeclaration";

import {
    getActiveBusinessConfiguration,
} from "../../config/ActiveBusinessConfiguration";

import {
    BrowserLocalStorageAdapter,
} from "../../runtime/storage/BrowserLocalStorageAdapter";

import type {
    RuntimeStorage,
} from "../../runtime/storage/RuntimeStorage";

import type {
    RegisterShift,
} from "./RegisterShift";

const STORAGE_KEY =
    "lumora.register-shifts";

let shifts:
    RegisterShift[] = [];

/*
 * Register Shift platform persistence:
 *
 * Browser development:
 *     localStorage
 *
 * Tauri desktop runtime:
 *     SQLite
 *
 * Customers remain intentionally outside this
 * SQLite migration step.
 */
let registerShiftStoragePromise:
    Promise<RuntimeStorage> | null =
        null;

function getRegisterShiftStorage():
Promise<RuntimeStorage> {
    if (!registerShiftStoragePromise) {
        registerShiftStoragePromise =
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

    return registerShiftStoragePromise;
}

let persistenceQueue:
    Promise<void> =
        Promise.resolve();

function parseShifts(
    raw: string | null,
): RegisterShift[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? parsed as RegisterShift[]
            : [];
    }
    catch {
        return [];
    }
}

export async function hydrateRegisterShifts():
Promise<void> {
    const storage =
        await getRegisterShiftStorage();

    const raw =
        await storage.getItem(
            STORAGE_KEY,
        );

    shifts =
        parseShifts(
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
                 * Keep later writes usable if
                 * one persistence operation fails.
                 */
            })
            .then(operation);

    void persistenceQueue.catch(
        (error) => {
            console.error(
                "LUMORA_REGISTER_SHIFT_PERSISTENCE_FAILED",
                error,
            );
        },
    );
}

function persist(
    nextShifts: RegisterShift[],
): void {
    const serialized =
        JSON.stringify(
            nextShifts,
        );

    enqueuePersistence(
        async () => {
            const storage =
                await getRegisterShiftStorage();

            await storage.setItem(
                STORAGE_KEY,
                serialized,
            );
        },
    );
}

export function getRegisterShifts() {
    return [
        ...shifts,
    ];
}

export function getActiveRegisterShift() {
    const configuration =
        getActiveBusinessConfiguration();

    return shifts.find(
        (shift) =>
            shift.status ===
                "open" &&
            shift.tenantId ===
                configuration.tenantId &&
            shift.storeCode ===
                configuration.storeCode &&
            shift.registerCode ===
                configuration.registerCode,
    );
}

export type OpenRegisterShiftInput = {
    employeeId: string;
    employeeName: string;

    openingCash: number;
    openingCashDeclaration?: CashDeclaration;
};

export function openRegisterShift(
    input:
        OpenRegisterShiftInput,
) {
    const existing =
        getActiveRegisterShift();

    if (existing) {
        return existing;
    }

    if (
        !Number.isFinite(
            input.openingCash,
        ) ||
        input.openingCash < 0
    ) {
        throw new Error(
            "INVALID_OPENING_CASH",
        );
    }

    const configuration =
        getActiveBusinessConfiguration();

    const shift:
        RegisterShift = {
        id:
            crypto.randomUUID(),

        tenantId:
            configuration.tenantId,

        storeCode:
            configuration.storeCode,

        registerCode:
            configuration.registerCode,

        status:
            "open",

        openedAt:
            new Date()
                .toISOString(),

        openedBy: {
            employeeId:
                input.employeeId,

            employeeName:
                input.employeeName,
        },

        openingCash:
            input.openingCash,

        openingCashDeclaration:
            input.openingCashDeclaration,
    };

    shifts = [
        shift,
        ...shifts,
    ];

    persist(
        shifts,
    );

    return shift;
}

export type CloseRegisterShiftInput = {
    employeeId: string;
    employeeName: string;

    closingCash: number;
    closingCashDeclaration?: CashDeclaration;
};

export function closeRegisterShift(
    input:
        CloseRegisterShiftInput,
) {
    if (
        !Number.isFinite(
            input.closingCash,
        ) ||
        input.closingCash < 0
    ) {
        throw new Error(
            "INVALID_CLOSING_CASH",
        );
    }

    const activeShift =
        getActiveRegisterShift();

    if (!activeShift) {
        throw new Error(
            "NO_ACTIVE_REGISTER_SHIFT",
        );
    }

    const now =
        new Date()
            .toISOString();

    const closedShift:
        RegisterShift = {
        ...activeShift,

        status:
            "closed",

        closedAt:
            now,

        closedBy: {
            employeeId:
                input.employeeId,

            employeeName:
                input.employeeName,
        },

        closingCash:
            input.closingCash,

        closingCashDeclaration:
            input.closingCashDeclaration,
    };

    shifts =
        shifts.map(
            (shift) =>
                shift.id ===
                    activeShift.id
                    ? closedShift
                    : shift,
        );

    persist(
        shifts,
    );

    return closedShift;
}

export async function flushRegisterShiftPersistence():
Promise<void> {
    await persistenceQueue;
}
