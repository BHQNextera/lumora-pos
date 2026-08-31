import {
    isTauri,
} from "@tauri-apps/api/core";

import {
    BrowserLocalStorageAdapter,
} from "../runtime/storage/BrowserLocalStorageAdapter";

import type {
    RuntimeStorage,
} from "../runtime/storage/RuntimeStorage";

import type {
    RegisterOperatingProfile,
} from "./BusinessOperatingProfile";

import {
    getNexteraRegisters,
} from "../models/organization/RegisterRepository";

export type RegisterLocalSettings = {
    tenantId: string;
    branchId: string;
    branchCode: string;
    registerId: string;
    registerCode: string;
    registerName: string;

    scannerEnabled:
        boolean | null;

    paymentTerminalEnabled:
        boolean | null;
};

const STORAGE_KEY =
    "lumora.register-local-settings";

const defaultSettings:
    RegisterLocalSettings = {
    tenantId:
        "",

    branchId:
        "",

    branchCode:
        "",

    registerId:
        "",

    registerCode:
        "",

    registerName:
        "",

    scannerEnabled:
        null,

    paymentTerminalEnabled:
        null,
};

let currentSettings:
    RegisterLocalSettings = {
        ...defaultSettings,
    };

type Listener =
    () => void;

const listeners =
    new Set<Listener>();

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
            (
                async ():
                Promise<RuntimeStorage> => {
                    if (!isTauri()) {
                        return new BrowserLocalStorageAdapter();
                    }

                    const {
                        SQLiteRuntimeStorageAdapter,
                    } = await import(
                        "../runtime/storage/SQLiteRuntimeStorageAdapter"
                    );

                    return new SQLiteRuntimeStorageAdapter();
                }
            )();
    }

    return storagePromise;
}

function normalizeSettings(
    value:
        Partial<RegisterLocalSettings>,
): RegisterLocalSettings {
    return {
        tenantId:
            typeof value.tenantId ===
                "string"
                ? value.tenantId
                : "",

        branchId:
            typeof value.branchId ===
                "string"
                ? value.branchId
                : "",

        branchCode:
            typeof value.branchCode ===
                "string"
                ? value.branchCode.slice(0, 80)
                : "",

        registerId:
            typeof value.registerId ===
                "string"
                ? value.registerId
                : "",

        registerCode:
            typeof value.registerCode ===
                "string"
                ? value.registerCode.slice(0, 80)
                : "",

        registerName:
            typeof value.registerName ===
                "string"
                ? value.registerName.slice(
                      0,
                      120,
                  )
                : "",

        scannerEnabled:
            typeof value.scannerEnabled ===
                "boolean"
                ? value.scannerEnabled
                : null,

        paymentTerminalEnabled:
            typeof value.paymentTerminalEnabled ===
                "boolean"
                ? value.paymentTerminalEnabled
                : null,
    };
}

function parseSettings(
    raw: string | null,
): RegisterLocalSettings | null {
    if (!raw) {
        return null;
    }

    try {
        return normalizeSettings(
            JSON.parse(
                raw,
            ) as
                Partial<RegisterLocalSettings>,
        );
    }
    catch {
        return null;
    }
}

function notify() {
    for (
        const listener
        of listeners
    ) {
        listener();
    }
}

function persist() {
    const snapshot =
        JSON.stringify(
            currentSettings,
        );

    persistenceQueue =
        persistenceQueue.then(
            async () => {
                const storage =
                    await getStorage();

                await storage.setItem(
                    STORAGE_KEY,
                    snapshot,
                );
            },
        );
}

async function readStoredSettings(
    storage:
        RuntimeStorage,
): Promise<string | null> {
    let raw =
        await storage.getItem(
            STORAGE_KEY,
        );

    if (
        raw === null &&
        isTauri()
    ) {
        const legacy =
            window.localStorage.getItem(
                STORAGE_KEY,
            );

        if (legacy !== null) {
            await storage.setItem(
                STORAGE_KEY,
                legacy,
            );

            window.localStorage.removeItem(
                STORAGE_KEY,
            );

            raw = legacy;
        }
    }

    return raw;
}

export async function hydrateRegisterLocalSettings():
Promise<void> {
    const storage =
        await getStorage();

    currentSettings =
        parseSettings(
            await readStoredSettings(
                storage,
            ),
        ) ?? {
            ...defaultSettings,
        };

    notify();
}

export function subscribeRegisterLocalSettings(
    listener:
        Listener,
): () => void {
    listeners.add(
        listener,
    );

    return () => {
        listeners.delete(
            listener,
        );
    };
}

export function getRegisterLocalSettings(
    base:
        RegisterOperatingProfile | undefined,
): {
    tenantId: string;
    branchId: string;
    branchCode: string;
    registerId: string;
    registerCode: string;
    registerName: string;
    scannerEnabled: boolean;
    paymentTerminalEnabled: boolean;
} {
    return {
        tenantId:
            currentSettings
                .tenantId,

        branchId:
            currentSettings
                .branchId,

        branchCode:
            currentSettings
                .branchCode,

        registerId:
            currentSettings
                .registerId,

        registerCode:
            currentSettings
                .registerCode,

        registerName:
            currentSettings
                .registerName,

        scannerEnabled:
            currentSettings
                .scannerEnabled ??
            base?.hardware
                .scannerEnabled ??
            false,

        paymentTerminalEnabled:
            currentSettings
                .paymentTerminalEnabled ??
            base?.hardware
                .paymentTerminalEnabled ??
            false,
    };
}

export function saveRegisterLocalSettings(
    patch:
        Partial<RegisterLocalSettings>,
): RegisterLocalSettings {
    currentSettings =
        normalizeSettings({
            ...currentSettings,
            ...patch,
        });

    notify();
    persist();

    return {
        ...currentSettings,
    };
}

export function reconcileRegisterLocalBinding():
RegisterLocalSettings {
    const registers =
        getNexteraRegisters();

    const existing =
        currentSettings.registerId
            ? registers.find(
                (register) =>
                    register.id ===
                    currentSettings.registerId,
            )
            : undefined;

    const activeRegisters =
        registers.filter(
            (register) =>
                register.isActive,
        );

    const candidate =
        existing ??
        (
            !currentSettings.registerId &&
            activeRegisters.length === 1
                ? activeRegisters[0]
                : undefined
        );

    if (!candidate) {
        return {
            ...currentSettings,
        };
    }

    const next =
        normalizeSettings({
            ...currentSettings,
            tenantId:
                candidate.tenantId,
            branchId:
                candidate.branchId,
            branchCode:
                candidate.branchCode,
            registerId:
                candidate.id,
            registerCode:
                candidate.code,
            registerName:
                candidate.name,
        });

    if (
        JSON.stringify(next) ===
        JSON.stringify(currentSettings)
    ) {
        return {
            ...currentSettings,
        };
    }

    currentSettings =
        next;

    notify();
    persist();

    return {
        ...currentSettings,
    };
}

export function bindRegisterLocalSettingsToNexteraRegister(
    registerId: string,
): RegisterLocalSettings {
    const register =
        getNexteraRegisters()
            .find(
                (candidate) =>
                    candidate.id ===
                    registerId,
            );

    if (!register) {
        throw new Error(
            "Register not found in Nextera register cache.",
        );
    }

    if (!register.isActive) {
        throw new Error(
            "Inactive register cannot be bound to this Lumora device.",
        );
    }

    return saveRegisterLocalSettings({
        tenantId:
            register.tenantId,
        branchId:
            register.branchId,
        branchCode:
            register.branchCode,
        registerId:
            register.id,
        registerCode:
            register.code,
        registerName:
            register.name,
    });
}

export function applyRegisterLocalSettingsToProfile(
    base:
        RegisterOperatingProfile | undefined,
    storeCode:
        string,
    registerCode:
        string,
): RegisterOperatingProfile {
    const resolved =
        getRegisterLocalSettings(
            base,
        );

    return {
        storeCode:
            resolved.branchCode ||
            storeCode,

        registerCode:
            resolved.registerCode ||
            registerCode,

        printer: {
            paperFormat:
                base?.printer
                    .paperFormat ??
                "thermal80",
        },

        hardware: {
            scannerEnabled:
                resolved
                    .scannerEnabled,

            paymentTerminalEnabled:
                resolved
                    .paymentTerminalEnabled,
        },
    };
}

export function flushRegisterLocalSettingsPersistence():
Promise<void> {
    return persistenceQueue;
}
