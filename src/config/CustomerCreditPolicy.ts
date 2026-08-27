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

export type CustomerCreditPolicy = {
    customerClubEnabled: boolean;

    requireCustomerId: boolean;
    requireCustomerBirthDate: boolean;

    uniqueActivePhone: boolean;
    uniqueActiveCustomerId: boolean;

    requireManagerApprovalReason: boolean;

    /**
     * Positive account balance = customer debt.
     * Negative account balance = customer credit with the business.
     *
     * When false, refund/store-credit movements may not cross
     * from debt/zero into a negative customer-credit balance.
     */
    allowCustomerCreditBalance: boolean;
};

const STORAGE_KEY =
    "lumora.customer-credit-policy";

const defaultPolicy:
    CustomerCreditPolicy = {
    customerClubEnabled:
        true,

    requireCustomerId:
        true,

    requireCustomerBirthDate:
        false,

    uniqueActivePhone:
        true,

    uniqueActiveCustomerId:
        true,

    requireManagerApprovalReason:
        false,

    allowCustomerCreditBalance:
        true,
};

let currentPolicy:
    CustomerCreditPolicy = {
        ...defaultPolicy,
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

function normalizePolicy(
    value:
        Partial<CustomerCreditPolicy>,
): CustomerCreditPolicy {
    return {
        customerClubEnabled:
            value.customerClubEnabled ??
            defaultPolicy
                .customerClubEnabled,

        requireCustomerId:
            value.requireCustomerId ??
            defaultPolicy
                .requireCustomerId,

        requireCustomerBirthDate:
            value.requireCustomerBirthDate ??
            defaultPolicy
                .requireCustomerBirthDate,

        uniqueActivePhone:
            value.uniqueActivePhone ??
            defaultPolicy
                .uniqueActivePhone,

        uniqueActiveCustomerId:
            value.uniqueActiveCustomerId ??
            defaultPolicy
                .uniqueActiveCustomerId,

        requireManagerApprovalReason:
            value.requireManagerApprovalReason ??
            defaultPolicy
                .requireManagerApprovalReason,

        allowCustomerCreditBalance:
            value.allowCustomerCreditBalance ??
            defaultPolicy
                .allowCustomerCreditBalance,
    };
}

function parsePolicy(
    raw: string | null,
): CustomerCreditPolicy | null {
    if (!raw) {
        return null;
    }

    try {
        return normalizePolicy(
            JSON.parse(
                raw,
            ) as
                Partial<CustomerCreditPolicy>,
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
            currentPolicy,
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

async function readStoredPolicy(
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

export async function hydrateCustomerCreditPolicy():
Promise<void> {
    const storage =
        await getStorage();

    currentPolicy =
        parsePolicy(
            await readStoredPolicy(
                storage,
            ),
        ) ?? {
            ...defaultPolicy,
        };

    notify();
}

export function getCustomerCreditPolicy():
CustomerCreditPolicy {
    return {
        ...currentPolicy,
    };
}

export function subscribeCustomerCreditPolicy(
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

export function saveCustomerCreditPolicy(
    patch:
        Partial<CustomerCreditPolicy>,
): CustomerCreditPolicy {
    currentPolicy =
        normalizePolicy({
            ...currentPolicy,
            ...patch,
        });

    notify();
    persist();

    return getCustomerCreditPolicy();
}

export function flushCustomerCreditPolicyPersistence():
Promise<void> {
    return persistenceQueue;
}

/**
 * Existing customer validation and store-credit services already read
 * getActiveBusinessOperatingProfile(). This adapter projects the locally
 * persisted settings into that established runtime contract.
 */
export function applyCustomerCreditPolicyToBusinessOperatingProfile(
    profile:
        BusinessOperatingProfile,
): BusinessOperatingProfile {
    const policy =
        currentPolicy;

    return {
        ...profile,

        features: {
            ...profile.features,

            customerClub:
                policy
                    .customerClubEnabled,
        },

        customerPolicy: {
            ...profile.customerPolicy,

            requireCustomerId:
                policy
                    .requireCustomerId,

            requireCustomerBirthDate:
                policy
                    .requireCustomerBirthDate,

            uniqueActivePhone:
                policy
                    .uniqueActivePhone,

            uniqueActiveCustomerId:
                policy
                    .uniqueActiveCustomerId,
        },

        storeCreditPolicy: {
            ...profile
                .storeCreditPolicy,

            requireManagerApprovalReason:
                policy
                    .requireManagerApprovalReason,

            allowCustomerCreditBalance:
                policy
                    .allowCustomerCreditBalance,
        },
    };
}
