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
    getActiveBusinessOperatingProfile,
} from "./ActiveBusinessConfiguration";

export type ZeroBalanceExchangeDocument =
    | "tax_invoice_receipt"
    | "receipt";

export type LocalDocumentSettings = {
    zeroBalanceExchangeDocument:
        ZeroBalanceExchangeDocument;

    autoPrintAccountingDocument:
        boolean;

    postTransactionTimeoutSeconds:
        number;

    exchangeSlipEnabled:
        boolean;

    exchangeSlipDefaultCopies:
        number;

    sendDocumentEnabled:
        boolean;
};

const STORAGE_KEY =
    "lumora.document-settings";

let localSettings:
    LocalDocumentSettings | null =
        null;

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

function clampCopies(
    value: number,
) {
    if (
        !Number.isFinite(
            value,
        )
    ) {
        return 1;
    }

    return Math.min(
        3,
        Math.max(
            1,
            Math.round(
                value,
            ),
        ),
    );
}

function clampTimeoutSeconds(
    value: number,
) {
    if (
        !Number.isFinite(
            value,
        )
    ) {
        return 20;
    }

    return Math.min(
        300,
        Math.max(
            5,
            Math.round(
                value,
            ),
        ),
    );
}

function getDefaults():
LocalDocumentSettings {
    const profile =
        getActiveBusinessOperatingProfile();

    return {
        zeroBalanceExchangeDocument:
            "tax_invoice_receipt",

        autoPrintAccountingDocument:
            profile
                .postTransactionPolicy
                ?.autoPrintAccountingDocument ??
            false,

        postTransactionTimeoutSeconds:
            clampTimeoutSeconds(
                profile
                    .postTransactionPolicy
                    ?.timeoutSeconds ??
                20,
            ),

        exchangeSlipEnabled:
            profile
                .postTransactionPolicy
                ?.exchangeSlipEnabled ??
            true,

        exchangeSlipDefaultCopies:
            clampCopies(
                profile
                    .postTransactionPolicy
                    ?.exchangeSlipDefaultCopies ??
                1,
            ),

        sendDocumentEnabled:
            profile
                .postTransactionPolicy
                ?.sendDocumentEnabled ??
            true,
    };
}

function parseSettings(
    raw: string | null,
): LocalDocumentSettings | null {
    if (!raw) {
        return null;
    }

    try {
        const parsed =
            JSON.parse(
                raw,
            ) as
                Partial<LocalDocumentSettings>;

        const zeroBalanceExchangeDocument =
            parsed
                .zeroBalanceExchangeDocument ===
                "receipt"
                ? "receipt"
                : parsed
                      .zeroBalanceExchangeDocument ===
                      "tax_invoice_receipt"
                  ? "tax_invoice_receipt"
                  : null;

        if (
            !zeroBalanceExchangeDocument
        ) {
            return null;
        }

        const defaults =
            getDefaults();

        return {
            zeroBalanceExchangeDocument,

            autoPrintAccountingDocument:
                typeof parsed
                    .autoPrintAccountingDocument ===
                    "boolean"
                    ? parsed
                          .autoPrintAccountingDocument
                    : defaults
                          .autoPrintAccountingDocument,

            postTransactionTimeoutSeconds:
                clampTimeoutSeconds(
                    typeof parsed
                        .postTransactionTimeoutSeconds ===
                        "number"
                        ? parsed
                              .postTransactionTimeoutSeconds
                        : defaults
                              .postTransactionTimeoutSeconds,
                ),

            exchangeSlipEnabled:
                typeof parsed
                    .exchangeSlipEnabled ===
                    "boolean"
                    ? parsed
                          .exchangeSlipEnabled
                    : defaults
                          .exchangeSlipEnabled,

            exchangeSlipDefaultCopies:
                clampCopies(
                    typeof parsed
                        .exchangeSlipDefaultCopies ===
                        "number"
                        ? parsed
                              .exchangeSlipDefaultCopies
                        : defaults
                              .exchangeSlipDefaultCopies,
                ),

            sendDocumentEnabled:
                typeof parsed
                    .sendDocumentEnabled ===
                    "boolean"
                    ? parsed
                          .sendDocumentEnabled
                    : defaults
                          .sendDocumentEnabled,
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

function persist() {
    const snapshot =
        JSON.stringify(
            getDocumentSettings(),
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

async function readStored(
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

export async function hydrateDocumentSettings():
Promise<void> {
    const storage =
        await getStorage();

    localSettings =
        parseSettings(
            await readStored(
                storage,
            ),
        );

    notify();
}

export function getDocumentSettings():
LocalDocumentSettings {
    return {
        ...(localSettings ??
            getDefaults()),
    };
}

export function subscribeDocumentSettings(
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

export function saveDocumentSettings(
    patch:
        Partial<LocalDocumentSettings>,
): LocalDocumentSettings {
    const current =
        getDocumentSettings();

    const next:
        LocalDocumentSettings = {
        ...current,
        ...patch,

        zeroBalanceExchangeDocument:
            patch
                .zeroBalanceExchangeDocument ===
                "receipt"
                ? "receipt"
                : patch
                      .zeroBalanceExchangeDocument ===
                      "tax_invoice_receipt"
                  ? "tax_invoice_receipt"
                  : current
                        .zeroBalanceExchangeDocument,

        postTransactionTimeoutSeconds:
            clampTimeoutSeconds(
                patch
                    .postTransactionTimeoutSeconds ??
                current
                    .postTransactionTimeoutSeconds,
            ),

        exchangeSlipDefaultCopies:
            clampCopies(
                patch
                    .exchangeSlipDefaultCopies ??
                current
                    .exchangeSlipDefaultCopies,
            ),
    };

    localSettings =
        next;

    notify();
    persist();

    return {
        ...next,
    };
}

export function flushDocumentSettingsPersistence():
Promise<void> {
    return persistenceQueue;
}
