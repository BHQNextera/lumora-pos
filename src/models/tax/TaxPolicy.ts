import {
    isTauri,
} from "@tauri-apps/api/core";

import {
    BrowserLocalStorageAdapter,
} from "../../runtime/storage/BrowserLocalStorageAdapter";

import type {
    RuntimeStorage,
} from "../../runtime/storage/RuntimeStorage";

import {
    getActiveBusinessConfiguration,
} from "../../config/ActiveBusinessConfiguration";

import type {
    ProductTaxClass,
} from "../../types/product";

export type TaxMode =
    | "included"
    | "excluded";

export type BranchTaxProfileId =
    | "israel_standard"
    | "eilat_free_trade_zone";

export type TaxTreatment =
    | "standard"
    | "exempt"
    | "zero_rate"
    | "eilat_relief";

export type TaxPolicy = {
    countryCode: string;

    /**
     * Normal/base VAT rate.
     * Example: 0.18 = 18%.
     */
    rate: number;

    mode: TaxMode;

    /**
     * Branch tax profile is keyed by storeCode.
     *
     * Missing entries default to israel_standard, which preserves
     * compatibility for existing installations.
     */
    branchProfilesByStore:
        Record<
            string,
            BranchTaxProfileId
        >;
};

export type SaleLineTaxSnapshot = {
    countryCode: string;

    storeCode: string;

    branchProfileId:
        BranchTaxProfileId;

    taxClass:
        ProductTaxClass;

    treatment:
        TaxTreatment;

    rate: number;

    /**
     * Signed amount on which tax was resolved after transaction-level
     * allocations such as a coupon.
     */
    taxableAmount: number;

    /**
     * Signed tax amount included in taxableAmount.
     */
    taxAmount: number;
};

const STORAGE_KEY =
    "lumora.tax-policy";

const defaultTaxPolicy:
    TaxPolicy = {
    countryCode:
        "IL",

    rate:
        0.18,

    mode:
        "included",

    branchProfilesByStore:
        {},
};

/**
 * Shared live tax policy object.
 *
 * Existing Lumora modules read currentTaxPolicy.rate directly.
 * Hydration/save therefore mutates this stable object instead of
 * replacing the reference.
 */
export const currentTaxPolicy:
    TaxPolicy = {
    ...defaultTaxPolicy,

    branchProfilesByStore:
        {},
};

type TaxPolicyListener =
    () => void;

const listeners =
    new Set<TaxPolicyListener>();

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

function normalizeRate(
    value: number,
) {
    if (
        !Number.isFinite(
            value,
        )
    ) {
        return defaultTaxPolicy.rate;
    }

    return Math.min(
        1,
        Math.max(
            0,
            value,
        ),
    );
}

function isBranchTaxProfileId(
    value: unknown,
): value is BranchTaxProfileId {
    return (
        value ===
            "israel_standard" ||
        value ===
            "eilat_free_trade_zone"
    );
}

function normalizeBranchProfiles(
    value: unknown,
):
Record<
    string,
    BranchTaxProfileId
> {
    if (
        !value ||
        typeof value !==
            "object" ||
        Array.isArray(
            value,
        )
    ) {
        return {};
    }

    const result:
        Record<
            string,
            BranchTaxProfileId
        > = {};

    for (
        const [
            storeCode,
            profileId,
        ]
        of Object.entries(
            value,
        )
    ) {
        if (
            storeCode.trim() &&
            isBranchTaxProfileId(
                profileId,
            )
        ) {
            result[
                storeCode.trim()
            ] = profileId;
        }
    }

    return result;
}

function parseTaxPolicy(
    raw: string | null,
): TaxPolicy | null {
    if (!raw) {
        return null;
    }

    try {
        const parsed =
            JSON.parse(
                raw,
            ) as
                Partial<TaxPolicy>;

        if (
            typeof parsed.countryCode !==
                "string" ||
            !parsed.countryCode.trim() ||
            typeof parsed.rate !==
                "number" ||
            (
                parsed.mode !==
                    "included" &&
                parsed.mode !==
                    "excluded"
            )
        ) {
            return null;
        }

        return {
            countryCode:
                parsed.countryCode
                    .trim()
                    .toUpperCase(),

            rate:
                normalizeRate(
                    parsed.rate,
                ),

            mode:
                parsed.mode,

            branchProfilesByStore:
                normalizeBranchProfiles(
                    parsed.branchProfilesByStore,
                ),
        };
    }
    catch {
        return null;
    }
}

function applyTaxPolicy(
    policy:
        TaxPolicy,
) {
    currentTaxPolicy.countryCode =
        policy.countryCode;

    currentTaxPolicy.rate =
        normalizeRate(
            policy.rate,
        );

    currentTaxPolicy.mode =
        policy.mode;

    currentTaxPolicy.branchProfilesByStore = {
        ...policy.branchProfilesByStore,
    };
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
            currentTaxPolicy,
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

async function readStoredTaxPolicy(
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

export async function hydrateTaxPolicy():
Promise<void> {
    const storage =
        await getStorage();

    const stored =
        parseTaxPolicy(
            await readStoredTaxPolicy(
                storage,
            ),
        );

    applyTaxPolicy(
        stored ??
        defaultTaxPolicy,
    );

    notify();
}

export function subscribeTaxPolicy(
    listener:
        TaxPolicyListener,
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

export function getTaxPolicy():
TaxPolicy {
    return {
        ...currentTaxPolicy,

        branchProfilesByStore: {
            ...currentTaxPolicy
                .branchProfilesByStore,
        },
    };
}

export function saveTaxPolicy(
    patch:
        Partial<TaxPolicy>,
): TaxPolicy {
    const next:
        TaxPolicy = {
        countryCode:
            patch.countryCode
                ?.trim()
                .toUpperCase() ||
            currentTaxPolicy
                .countryCode,

        rate:
            patch.rate ===
                undefined
                ? currentTaxPolicy
                      .rate
                : normalizeRate(
                    patch.rate,
                ),

        mode:
            patch.mode ===
                "included" ||
            patch.mode ===
                "excluded"
                ? patch.mode
                : currentTaxPolicy
                      .mode,

        branchProfilesByStore:
            patch.branchProfilesByStore ===
                undefined
                ? {
                      ...currentTaxPolicy
                          .branchProfilesByStore,
                  }
                : normalizeBranchProfiles(
                      patch.branchProfilesByStore,
                  ),
    };

    applyTaxPolicy(
        next,
    );

    notify();
    persist();

    return getTaxPolicy();
}

export function getBranchTaxProfile(
    storeCode?: string,
):
BranchTaxProfileId {
    const resolvedStoreCode =
        storeCode ??
        getActiveBusinessConfiguration()
            .storeCode;

    return (
        currentTaxPolicy
            .branchProfilesByStore[
            resolvedStoreCode
        ] ??
        "israel_standard"
    );
}

export function saveBranchTaxProfile(
    storeCode: string,
    profileId:
        BranchTaxProfileId,
): TaxPolicy {
    const normalizedStoreCode =
        storeCode.trim();

    if (
        !normalizedStoreCode
    ) {
        return getTaxPolicy();
    }

    return saveTaxPolicy({
        branchProfilesByStore: {
            ...currentTaxPolicy
                .branchProfilesByStore,

            [normalizedStoreCode]:
                profileId,
        },
    });
}

export function getActiveBranchTaxProfile():
BranchTaxProfileId {
    return getBranchTaxProfile();
}

export function flushTaxPolicyPersistence():
Promise<void> {
    return persistenceQueue;
}

function roundMoney(
    value: number,
) {
    return (
        Math.round(
            (
                value +
                Number.EPSILON
            ) *
                100,
        ) / 100
    );
}

export function calculateIncludedTax(
    totalIncludingTax: number,
    rate: number =
        currentTaxPolicy.rate,
) {
    if (
        !Number.isFinite(
            totalIncludingTax,
        ) ||
        !Number.isFinite(
            rate,
        ) ||
        rate <= 0
    ) {
        return 0;
    }

    return roundMoney(
        totalIncludingTax *
            (
                rate /
                (
                    1 +
                    rate
                )
            ),
    );
}

function resolveTreatment(
    taxClass:
        ProductTaxClass,
    branchProfileId:
        BranchTaxProfileId,
): {
    treatment:
        TaxTreatment;
    rate: number;
} {
    switch (taxClass) {
        case "exempt":
            return {
                treatment:
                    "exempt",
                rate:
                    0,
            };

        case "zero_rate":
            return {
                treatment:
                    "zero_rate",
                rate:
                    0,
            };

        case "standard_rate_always":
            return {
                treatment:
                    "standard",
                rate:
                    currentTaxPolicy.rate,
            };

        case "standard":
        default:
            if (
                branchProfileId ===
                    "eilat_free_trade_zone"
            ) {
                return {
                    treatment:
                        "eilat_relief",
                    rate:
                        0,
                };
            }

            return {
                treatment:
                    "standard",
                rate:
                    currentTaxPolicy.rate,
            };
    }
}

export function resolveProductTaxRate(
    taxClass:
        ProductTaxClass =
        "standard",
    storeCode?: string,
) {
    const branchProfileId =
        getBranchTaxProfile(
            storeCode,
        );

    return resolveTreatment(
        taxClass,
        branchProfileId,
    ).rate;
}

export function resolveSaleLineTax(
    taxableAmount: number,
    taxClass:
        ProductTaxClass =
        "standard",
    storeCode?: string,
):
SaleLineTaxSnapshot {
    const resolvedStoreCode =
        storeCode ??
        getActiveBusinessConfiguration()
            .storeCode;

    const branchProfileId =
        getBranchTaxProfile(
            resolvedStoreCode,
        );

    const {
        treatment,
        rate,
    } =
        resolveTreatment(
            taxClass,
            branchProfileId,
        );

    return {
        countryCode:
            currentTaxPolicy
                .countryCode,

        storeCode:
            resolvedStoreCode,

        branchProfileId,

        taxClass,

        treatment,

        rate,

        taxableAmount:
            roundMoney(
                taxableAmount,
            ),

        taxAmount:
            calculateIncludedTax(
                taxableAmount,
                rate,
            ),
    };
}

export function deriveTaxSnapshotFromOriginal(
    taxableAmount: number,
    original:
        SaleLineTaxSnapshot,
):
SaleLineTaxSnapshot {
    return {
        ...original,

        taxableAmount:
            roundMoney(
                taxableAmount,
            ),

        taxAmount:
            calculateIncludedTax(
                taxableAmount,
                original.rate,
            ),
    };
}
