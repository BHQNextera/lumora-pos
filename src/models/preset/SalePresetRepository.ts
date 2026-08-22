import {
    isTauri,
} from "@tauri-apps/api/core";

import {
    getActiveBusinessConfiguration,
} from "../../config/ActiveBusinessConfiguration";

import {
    BrowserLocalStorageAdapter,
} from "../../runtime/storage/BrowserLocalStorageAdapter";

import type {
    RuntimeStorage,
} from "../../runtime/storage/RuntimeStorage";

import {
    MAX_SALE_PRESETS,
} from "./SalePreset";

import type {
    SalePreset,
    SalePresetKind,
} from "./SalePreset";

const STORAGE_KEY =
    "lumora.sale-presets.v1";

type PresetScope = {
    tenantId: string;
    storeCode: string;
    presets: SalePreset[];
};

type PresetListener =
    () => void;

let scopes:
    PresetScope[] = [];

const listeners =
    new Set<PresetListener>();

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
                        "../../runtime/storage/SQLiteRuntimeStorageAdapter"
                    );

                    return new SQLiteRuntimeStorageAdapter();
                }
            )();
    }

    return storagePromise;
}

function notify() {
    listeners.forEach(
        (listener) =>
            listener(),
    );
}

function isPresetKind(
    value: unknown,
): value is SalePresetKind {
    return (
        value === "product" ||
        value === "category" ||
        value === "action"
    );
}

function isSalePreset(
    value: unknown,
): value is SalePreset {
    if (
        !value ||
        typeof value !== "object"
    ) {
        return false;
    }

    const candidate =
        value as Partial<SalePreset>;

    return (
        typeof candidate.id ===
            "string" &&
        candidate.id.length > 0 &&
        isPresetKind(
            candidate.kind,
        ) &&
        typeof candidate.targetId ===
            "string" &&
        candidate.targetId.length > 0
    );
}

function parseScopes(
    raw: string | null,
): PresetScope[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed =
            JSON.parse(raw);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .filter(
                (
                    value,
                ): value is PresetScope =>
                    Boolean(
                        value &&
                        typeof value ===
                            "object" &&
                        typeof value
                            .tenantId ===
                            "string" &&
                        typeof value
                            .storeCode ===
                            "string" &&
                        Array.isArray(
                            value.presets,
                        ),
                    ),
            )
            .map(
                (scope) => ({
                    tenantId:
                        scope.tenantId,
                    storeCode:
                        scope.storeCode,
                    presets:
                        scope.presets
                            .filter(
                                isSalePreset,
                            )
                            .slice(
                                0,
                                MAX_SALE_PRESETS,
                            ),
                }),
            );
    }
    catch {
        return [];
    }
}

async function readStoredScopes(
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

function persist() {
    const snapshot =
        JSON.stringify(
            scopes,
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

function getCurrentScopeIdentity() {
    const configuration =
        getActiveBusinessConfiguration();

    return {
        tenantId:
            configuration.tenantId,
        storeCode:
            configuration.storeCode,
    };
}

export function subscribeSalePresets(
    listener: PresetListener,
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

export async function hydrateSalePresets():
Promise<void> {
    const storage =
        await getStorage();

    scopes =
        parseScopes(
            await readStoredScopes(
                storage,
            ),
        );

    notify();
}

export function getSalePresets():
SalePreset[] {
    const identity =
        getCurrentScopeIdentity();

    const scope =
        scopes.find(
            (candidate) =>
                candidate.tenantId ===
                    identity.tenantId &&
                candidate.storeCode ===
                    identity.storeCode,
        );

    return scope
        ? scope.presets.map(
              (preset) => ({
                  ...preset,
              }),
          )
        : [];
}

export function saveSalePresets(
    presets: SalePreset[],
) {
    const identity =
        getCurrentScopeIdentity();

    const normalized =
        presets
            .filter(
                isSalePreset,
            )
            .slice(
                0,
                MAX_SALE_PRESETS,
            )
            .map(
                (preset) => ({
                    ...preset,
                }),
            );

    const existingIndex =
        scopes.findIndex(
            (candidate) =>
                candidate.tenantId ===
                    identity.tenantId &&
                candidate.storeCode ===
                    identity.storeCode,
        );

    const scope:
        PresetScope = {
        ...identity,
        presets:
            normalized,
    };

    if (existingIndex >= 0) {
        scopes = scopes.map(
            (
                candidate,
                index,
            ) =>
                index ===
                existingIndex
                    ? scope
                    : candidate,
        );
    }
    else {
        scopes = [
            ...scopes,
            scope,
        ];
    }

    notify();
    persist();
}

export function flushSalePresetPersistence():
Promise<void> {
    return persistenceQueue;
}
