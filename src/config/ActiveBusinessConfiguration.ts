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
    getBusinessOperatingProfile,
} from "./BusinessOperatingProfiles";

import type {
    BusinessOperatingProfile,
} from "./BusinessOperatingProfile";

import type {
    BusinessOperatingProfileId,
} from "./BusinessOperatingProfiles";

export type ConfigurationSource =
    | "local"
    | "nextera";

export type ActiveBusinessConfiguration = {
    tenantId: string;

    storeCode: string;
    registerCode: string;

    profileId:
        BusinessOperatingProfileId;

    source:
        ConfigurationSource;
};

const STORAGE_KEY =
    "lumora.active-business-configuration";

const defaultConfiguration:
    ActiveBusinessConfiguration = {
        tenantId:
            "coffee-time-demo",

        storeCode:
            "01",

        registerCode:
            "02",

        profileId:
            "retail",

        source:
            "local",
    };

let activeConfiguration:
    ActiveBusinessConfiguration = {
        ...defaultConfiguration,
    };

let configurationStoragePromise:
    Promise<RuntimeStorage> | null =
        null;

function getConfigurationStorage():
Promise<RuntimeStorage> {
    if (!configurationStoragePromise) {
        configurationStoragePromise =
            (async (): Promise<RuntimeStorage> => {
                if (!isTauri()) {
                    return new BrowserLocalStorageAdapter();
                }

                const {
                    SQLiteRuntimeStorageAdapter,
                } = await import(
                    "../runtime/storage/SQLiteRuntimeStorageAdapter"
                );

                return new SQLiteRuntimeStorageAdapter();
            })();
    }

    return configurationStoragePromise;
}

let persistenceQueue:
    Promise<void> =
        Promise.resolve();

function parseConfiguration(
    raw: string | null,
): ActiveBusinessConfiguration {
    if (!raw) {
        return {
            ...defaultConfiguration,
        };
    }

    try {
        const parsed =
            JSON.parse(
                raw,
            ) as Partial<ActiveBusinessConfiguration>;

        if (
            !parsed.tenantId ||
            !parsed.storeCode ||
            !parsed.registerCode ||
            !parsed.profileId ||
            !parsed.source
        ) {
            return {
                ...defaultConfiguration,
            };
        }

        return {
            tenantId:
                parsed.tenantId,

            storeCode:
                parsed.storeCode,

            registerCode:
                parsed.registerCode,

            profileId:
                parsed.profileId,

            source:
                parsed.source,
        };
    }
    catch {
        return {
            ...defaultConfiguration,
        };
    }
}

export async function hydrateActiveBusinessConfiguration():
Promise<void> {
    const storage =
        await getConfigurationStorage();

    let raw =
        await storage.getItem(
            STORAGE_KEY,
        );

    // One-time compatibility path from the
    // previous Tauri WebView localStorage storage.
    if (
        raw === null &&
        isTauri()
    ) {
        const legacy =
            window.localStorage.getItem(
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

    activeConfiguration =
        parseConfiguration(
            raw,
        );
}

function persistConfiguration() {
    const snapshot =
        JSON.stringify(
            activeConfiguration,
        );

    persistenceQueue =
        persistenceQueue.then(
            async () => {
                const storage =
                    await getConfigurationStorage();

                await storage.setItem(
                    STORAGE_KEY,
                    snapshot,
                );
            },
        );
}

export function flushActiveBusinessConfigurationPersistence():
Promise<void> {
    return persistenceQueue;
}

export function getActiveBusinessConfiguration():
ActiveBusinessConfiguration {
    return {
        ...activeConfiguration,
    };
}

export function saveActiveBusinessConfiguration(
    configuration:
        ActiveBusinessConfiguration,
) {
    activeConfiguration = {
        ...configuration,
    };

    persistConfiguration();

    return getActiveBusinessConfiguration();
}

export function resetActiveBusinessConfiguration() {
    activeConfiguration = {
        ...defaultConfiguration,
    };

    if (isTauri()) {
        window.localStorage.removeItem(
            STORAGE_KEY,
        );
    }

    persistenceQueue =
        persistenceQueue.then(
            async () => {
                const storage =
                    await getConfigurationStorage();

                await storage.removeItem(
                    STORAGE_KEY,
                );
            },
        );

    return getActiveBusinessConfiguration();
}

export function getActiveBusinessOperatingProfile():
BusinessOperatingProfile {
    return getBusinessOperatingProfile(
        activeConfiguration.profileId,
    );
}

export function getActiveRegisterProfile() {
    const profile =
        getActiveBusinessOperatingProfile();

    return profile.registers.find(
        (register) =>
            register.storeCode ===
                activeConfiguration.storeCode &&
            register.registerCode ===
                activeConfiguration.registerCode,
    );
}