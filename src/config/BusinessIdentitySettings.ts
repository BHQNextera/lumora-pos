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
    BusinessOperatingProfile,
} from "./BusinessOperatingProfile";

export type BranchIdentityOverride = {
    branchName: string;
    phone: string;
    address: string;
};

export type BusinessIdentitySettings = {
    businessName: string;
    tradingName: string;

    businessNumber: string;
    vatNumber: string;

    phone: string;
    address: string;

    branchesByStore:
        Record<
            string,
            BranchIdentityOverride
        >;
};

const STORAGE_KEY =
    "lumora.business-identity-settings";

let currentSettings:
    BusinessIdentitySettings = {
    businessName:
        "",

    tradingName:
        "",

    businessNumber:
        "",

    vatNumber:
        "",

    phone:
        "",

    address:
        "",

    branchesByStore:
        {},
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

function normalizeText(
    value: unknown,
    maxLength:
        number,
): string {
    if (
        typeof value !==
        "string"
    ) {
        return "";
    }

    return value.slice(
        0,
        maxLength,
    );
}

function normalizeBranch(
    value:
        Partial<BranchIdentityOverride> | undefined,
): BranchIdentityOverride {
    return {
        branchName:
            normalizeText(
                value?.branchName,
                120,
            ),

        phone:
            normalizeText(
                value?.phone,
                60,
            ),

        address:
            normalizeText(
                value?.address,
                220,
            ),
    };
}

function normalizeSettings(
    value:
        Partial<BusinessIdentitySettings>,
): BusinessIdentitySettings {
    const branches:
        Record<
            string,
            BranchIdentityOverride
        > = {};

    if (
        value.branchesByStore &&
        typeof value.branchesByStore ===
            "object" &&
        !Array.isArray(
            value.branchesByStore,
        )
    ) {
        for (
            const [
                storeCode,
                branch,
            ]
            of Object.entries(
                value.branchesByStore,
            )
        ) {
            const normalizedStoreCode =
                storeCode.trim();

            if (
                !normalizedStoreCode
            ) {
                continue;
            }

            branches[
                normalizedStoreCode
            ] = normalizeBranch(
                branch,
            );
        }
    }

    return {
        businessName:
            normalizeText(
                value.businessName,
                160,
            ),

        tradingName:
            normalizeText(
                value.tradingName,
                160,
            ),

        businessNumber:
            normalizeText(
                value.businessNumber,
                80,
            ),

        vatNumber:
            normalizeText(
                value.vatNumber,
                80,
            ),

        phone:
            normalizeText(
                value.phone,
                60,
            ),

        address:
            normalizeText(
                value.address,
                220,
            ),

        branchesByStore:
            branches,
    };
}

function parseSettings(
    raw: string | null,
): BusinessIdentitySettings | null {
    if (!raw) {
        return null;
    }

    try {
        return normalizeSettings(
            JSON.parse(
                raw,
            ) as
                Partial<BusinessIdentitySettings>,
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

export async function hydrateBusinessIdentitySettings():
Promise<void> {
    const storage =
        await getStorage();

    currentSettings =
        parseSettings(
            await readStoredSettings(
                storage,
            ),
        ) ?? {
            businessName:
                "",

            tradingName:
                "",

            businessNumber:
                "",

            vatNumber:
                "",

            phone:
                "",

            address:
                "",

            branchesByStore:
                {},
        };

    notify();
}

export function subscribeBusinessIdentitySettings(
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

export function getBusinessIdentitySettings(
    profile:
        BusinessOperatingProfile,
    storeCode:
        string,
): {
    businessName: string;
    tradingName: string;
    businessNumber: string;
    vatNumber: string;
    phone: string;
    address: string;
    branchName: string;
    branchPhone: string;
    branchAddress: string;
} {
    const branch =
        currentSettings
            .branchesByStore[
                storeCode
            ];

    return {
        businessName:
            currentSettings
                .businessName ||
            profile.identity
                .businessName,

        tradingName:
            currentSettings
                .tradingName ||
            profile.identity
                .tradingName ||
            profile.identity
                .businessName,

        businessNumber:
            currentSettings
                .businessNumber ||
            profile.identity
                .businessNumber ||
            "",

        vatNumber:
            currentSettings
                .vatNumber ||
            profile.identity
                .vatNumber ||
            "",

        phone:
            currentSettings
                .phone ||
            profile.identity
                .phone ||
            "",

        address:
            currentSettings
                .address ||
            profile.identity
                .address ||
            "",

        branchName:
            branch?.branchName ||
            profile.identity
                .branchName ||
            "",

        branchPhone:
            branch?.phone ??
            "",

        branchAddress:
            branch?.address ??
            "",
    };
}

export function saveBusinessIdentitySettings(
    patch: {
        businessName?: string;
        tradingName?: string;
        businessNumber?: string;
        vatNumber?: string;
        phone?: string;
        address?: string;
        branchName?: string;
        branchPhone?: string;
        branchAddress?: string;
    },
    storeCode:
        string,
): BusinessIdentitySettings {
    const currentBranch =
        currentSettings
            .branchesByStore[
                storeCode
            ] ?? {
                branchName:
                    "",

                phone:
                    "",

                address:
                    "",
            };

    const nextBranch =
        normalizeBranch({
            branchName:
                patch.branchName ??
                currentBranch
                    .branchName,

            phone:
                patch.branchPhone ??
                currentBranch
                    .phone,

            address:
                patch.branchAddress ??
                currentBranch
                    .address,
        });

    currentSettings =
        normalizeSettings({
            ...currentSettings,

            businessName:
                patch.businessName ??
                currentSettings
                    .businessName,

            tradingName:
                patch.tradingName ??
                currentSettings
                    .tradingName,

            businessNumber:
                patch.businessNumber ??
                currentSettings
                    .businessNumber,

            vatNumber:
                patch.vatNumber ??
                currentSettings
                    .vatNumber,

            phone:
                patch.phone ??
                currentSettings
                    .phone,

            address:
                patch.address ??
                currentSettings
                    .address,

            branchesByStore: {
                ...currentSettings
                    .branchesByStore,

                [storeCode]:
                    nextBranch,
            },
        });

    notify();
    persist();

    return {
        ...currentSettings,

        branchesByStore: {
            ...currentSettings
                .branchesByStore,
        },
    };
}

export function applyBusinessIdentitySettingsToProfile(
    profile:
        BusinessOperatingProfile,
    storeCode:
        string,
): BusinessOperatingProfile {
    const resolved =
        getBusinessIdentitySettings(
            profile,
            storeCode,
        );

    return {
        ...profile,

        identity: {
            ...profile.identity,

            businessName:
                resolved
                    .businessName,

            tradingName:
                resolved
                    .tradingName,

            branchName:
                resolved
                    .branchName ||
                undefined,

            businessNumber:
                resolved
                    .businessNumber ||
                undefined,

            vatNumber:
                resolved
                    .vatNumber ||
                undefined,

            /**
             * Operational identity uses branch contact details when
             * supplied; otherwise it falls back to the business details.
             */
            phone:
                resolved
                    .branchPhone ||
                resolved
                    .phone ||
                undefined,

            address:
                resolved
                    .branchAddress ||
                resolved
                    .address ||
                undefined,
        },
    };
}

export function flushBusinessIdentitySettingsPersistence():
Promise<void> {
    return persistenceQueue;
}
