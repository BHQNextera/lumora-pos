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
    DEFAULT_LOCALE,
    getDirection,
    supportedLocales,
} from "./index";

import type {
    SupportedLocale,
} from "./types";

const STORAGE_KEY =
    "lumora.app-locale";

let currentLocale:
    SupportedLocale =
        DEFAULT_LOCALE;

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

function normalizeLocale(
    value: unknown,
): SupportedLocale {
    return typeof value === "string" &&
        supportedLocales.includes(
            value as SupportedLocale,
        )
        ? value as SupportedLocale
        : DEFAULT_LOCALE;
}

function applyLocaleToDocument() {
    if (
        typeof document ===
        "undefined"
    ) {
        return;
    }

    document.documentElement.lang =
        currentLocale;

    document.documentElement.dir =
        getDirection(
            currentLocale,
        );
}

function notify() {
    for (
        const listener
        of listeners
    ) {
        listener();
    }
}

async function readStoredLocale(
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

export async function hydrateAppLocaleSettings():
Promise<void> {
    const storage =
        await getStorage();

    currentLocale =
        normalizeLocale(
            await readStoredLocale(
                storage,
            ),
        );

    applyLocaleToDocument();
    notify();
}

export function getAppLocale():
SupportedLocale {
    return currentLocale;
}

export function subscribeAppLocale(
    listener: Listener,
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

export function saveAppLocale(
    locale: SupportedLocale,
): SupportedLocale {
    currentLocale =
        normalizeLocale(
            locale,
        );

    applyLocaleToDocument();
    notify();

    const snapshot =
        currentLocale;

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

    return currentLocale;
}

export function flushAppLocalePersistence():
Promise<void> {
    return persistenceQueue;
}
