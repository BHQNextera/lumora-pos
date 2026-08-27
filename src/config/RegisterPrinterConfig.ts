import {
    isTauri,
} from "@tauri-apps/api/core";

import {
    BrowserLocalStorageAdapter,
} from "../runtime/storage/BrowserLocalStorageAdapter";

import type {
    RuntimeStorage,
} from "../runtime/storage/RuntimeStorage";

import {
    getActiveBusinessConfiguration,
    getActiveRegisterProfile,
} from "./ActiveBusinessConfiguration";

export type PrinterPaperFormat =
    | "thermal80"
    | "thermal57";

export type RegisterPrinterConfig = {
    storeCode: string;
    registerCode: string;
    paperFormat: PrinterPaperFormat;
};

const STORAGE_KEY =
    "lumora.register-printer-config";

let localPrinterConfig:
    RegisterPrinterConfig | null =
        null;

type PrinterConfigListener =
    () => void;

const listeners =
    new Set<PrinterConfigListener>();

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

function isPrinterPaperFormat(
    value: unknown,
): value is PrinterPaperFormat {
    return (
        value ===
            "thermal80" ||
        value ===
            "thermal57"
    );
}

function parsePrinterConfig(
    raw: string | null,
): RegisterPrinterConfig | null {
    if (!raw) {
        return null;
    }

    try {
        const parsed =
            JSON.parse(
                raw,
            ) as
                Partial<RegisterPrinterConfig>;

        if (
            !parsed.storeCode ||
            typeof parsed.storeCode !==
                "string" ||
            !parsed.registerCode ||
            typeof parsed.registerCode !==
                "string" ||
            !isPrinterPaperFormat(
                parsed.paperFormat,
            )
        ) {
            return null;
        }

        return {
            storeCode:
                parsed.storeCode,
            registerCode:
                parsed.registerCode,
            paperFormat:
                parsed.paperFormat,
        };
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

async function readStoredPrinterConfig(
    storage: RuntimeStorage,
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

function persistPrinterConfig() {
    const snapshot =
        localPrinterConfig
            ? JSON.stringify(
                localPrinterConfig,
            )
            : null;

    persistenceQueue =
        persistenceQueue.then(
            async () => {
                const storage =
                    await getStorage();

                if (snapshot) {
                    await storage.setItem(
                        STORAGE_KEY,
                        snapshot,
                    );
                }
                else {
                    await storage.removeItem(
                        STORAGE_KEY,
                    );
                }
            },
        );
}

export async function hydrateRegisterPrinterConfig():
Promise<void> {
    const storage =
        await getStorage();

    const raw =
        await readStoredPrinterConfig(
            storage,
        );

    localPrinterConfig =
        parsePrinterConfig(
            raw,
        );

    notify();
}

export function subscribeRegisterPrinterConfig(
    listener:
        PrinterConfigListener,
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

/**
 * Standalone Lumora printer configuration.
 *
 * A local override is owned by the active register and works without Nextera.
 * If no local override exists, the active Business Operating Profile remains
 * the compatibility fallback.
 */
export function getRegisterPrinterConfig(
    storeCode?: string,
    registerCode?: string,
): RegisterPrinterConfig {
    const activeConfiguration =
        getActiveBusinessConfiguration();

    const resolvedStoreCode =
        storeCode ??
        activeConfiguration.storeCode;

    const resolvedRegisterCode =
        registerCode ??
        activeConfiguration.registerCode;

    if (
        localPrinterConfig &&
        localPrinterConfig.storeCode ===
            resolvedStoreCode &&
        localPrinterConfig.registerCode ===
            resolvedRegisterCode
    ) {
        return {
            ...localPrinterConfig,
        };
    }

    const activeRegister =
        resolvedStoreCode ===
            activeConfiguration.storeCode &&
        resolvedRegisterCode ===
            activeConfiguration.registerCode
            ? getActiveRegisterProfile()
            : undefined;

    return {
        storeCode:
            resolvedStoreCode,
        registerCode:
            resolvedRegisterCode,
        paperFormat:
            activeRegister?.printer.paperFormat ??
            "thermal80",
    };
}

export function saveRegisterPrinterPaperFormat(
    paperFormat:
        PrinterPaperFormat,
): RegisterPrinterConfig {
    const activeConfiguration =
        getActiveBusinessConfiguration();

    localPrinterConfig = {
        storeCode:
            activeConfiguration.storeCode,
        registerCode:
            activeConfiguration.registerCode,
        paperFormat,
    };

    notify();
    persistPrinterConfig();

    return {
        ...localPrinterConfig,
    };
}

export function resetRegisterPrinterConfig() {
    localPrinterConfig =
        null;

    notify();
    persistPrinterConfig();
}

export function flushRegisterPrinterConfigPersistence():
Promise<void> {
    return persistenceQueue;
}
