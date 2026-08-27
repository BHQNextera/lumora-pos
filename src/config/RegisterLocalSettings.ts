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

export type RegisterLocalSettings = {
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
    registerName: string;
    scannerEnabled: boolean;
    paymentTerminalEnabled: boolean;
} {
    return {
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
        storeCode,
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
