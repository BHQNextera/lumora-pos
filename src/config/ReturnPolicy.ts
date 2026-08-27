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

export type WithoutDocumentRefundMode =
    | "any_available"
    | "cash_or_credit_voucher"
    | "credit_voucher_only";

export type ReturnPolicy = {
    returnsEnabled: boolean;
    exchangesEnabled: boolean;

    /**
     * 0 = no time limit.
     */
    returnWindowDays: number;

    allowReturnWithoutDocument: boolean;

    withoutDocumentRefundMode:
        WithoutDocumentRefundMode;

    cancellationFeePercent: number;
    cancellationFeeCap: number;
};

const STORAGE_KEY =
    "lumora.return-policy";

const defaultReturnPolicy:
    ReturnPolicy = {
    returnsEnabled:
        true,

    exchangesEnabled:
        true,

    returnWindowDays:
        0,

    allowReturnWithoutDocument:
        true,

    withoutDocumentRefundMode:
        "any_available",

    cancellationFeePercent:
        5,

    cancellationFeeCap:
        100,
};

let currentReturnPolicy:
    ReturnPolicy = {
        ...defaultReturnPolicy,
    };

type ReturnPolicyListener =
    () => void;

const listeners =
    new Set<ReturnPolicyListener>();

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

function clampNumber(
    value: number,
    min: number,
    max: number,
) {
    if (!Number.isFinite(value)) {
        return min;
    }

    return Math.min(
        max,
        Math.max(
            min,
            value,
        ),
    );
}

function isWithoutDocumentRefundMode(
    value: unknown,
): value is WithoutDocumentRefundMode {
    return (
        value ===
            "any_available" ||
        value ===
            "cash_or_credit_voucher" ||
        value ===
            "credit_voucher_only"
    );
}

function normalizePolicy(
    value:
        Partial<ReturnPolicy>,
): ReturnPolicy {
    return {
        returnsEnabled:
            value.returnsEnabled ??
            defaultReturnPolicy
                .returnsEnabled,

        exchangesEnabled:
            value.exchangesEnabled ??
            defaultReturnPolicy
                .exchangesEnabled,

        returnWindowDays:
            Math.round(
                clampNumber(
                    value.returnWindowDays ??
                        defaultReturnPolicy
                            .returnWindowDays,
                    0,
                    3650,
                ),
            ),

        allowReturnWithoutDocument:
            value.allowReturnWithoutDocument ??
            defaultReturnPolicy
                .allowReturnWithoutDocument,

        withoutDocumentRefundMode:
            isWithoutDocumentRefundMode(
                value.withoutDocumentRefundMode,
            )
                ? value.withoutDocumentRefundMode
                : defaultReturnPolicy
                      .withoutDocumentRefundMode,

        cancellationFeePercent:
            clampNumber(
                value.cancellationFeePercent ??
                    defaultReturnPolicy
                        .cancellationFeePercent,
                0,
                100,
            ),

        cancellationFeeCap:
            clampNumber(
                value.cancellationFeeCap ??
                    defaultReturnPolicy
                        .cancellationFeeCap,
                0,
                100000,
            ),
    };
}

function parsePolicy(
    raw: string | null,
): ReturnPolicy | null {
    if (!raw) {
        return null;
    }

    try {
        const parsed =
            JSON.parse(
                raw,
            ) as
                Partial<ReturnPolicy>;

        return normalizePolicy(
            parsed,
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
            currentReturnPolicy,
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

export async function hydrateReturnPolicy():
Promise<void> {
    const storage =
        await getStorage();

    currentReturnPolicy =
        parsePolicy(
            await readStoredPolicy(
                storage,
            ),
        ) ?? {
            ...defaultReturnPolicy,
        };

    notify();
}

export function getReturnPolicy():
ReturnPolicy {
    return {
        ...currentReturnPolicy,
    };
}

export function subscribeReturnPolicy(
    listener:
        ReturnPolicyListener,
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

export function saveReturnPolicy(
    patch:
        Partial<ReturnPolicy>,
): ReturnPolicy {
    currentReturnPolicy =
        normalizePolicy({
            ...currentReturnPolicy,
            ...patch,
        });

    notify();
    persist();

    return getReturnPolicy();
}

export function flushReturnPolicyPersistence():
Promise<void> {
    return persistenceQueue;
}

export function isWithinReturnWindow(
    completedAt:
        string | undefined,
    createdAt:
        string,
    policy:
        ReturnPolicy =
            currentReturnPolicy,
): boolean {
    if (
        policy.returnWindowDays <=
        0
    ) {
        return true;
    }

    const timestamp =
        new Date(
            completedAt ??
            createdAt,
        ).getTime();

    if (
        !Number.isFinite(
            timestamp,
        )
    ) {
        return true;
    }

    const elapsed =
        Date.now() -
        timestamp;

    if (
        elapsed <= 0
    ) {
        return true;
    }

    return (
        elapsed <=
        policy.returnWindowDays *
            24 *
            60 *
            60 *
            1000
    );
}

/**
 * Existing POS surfaces already read BusinessOperatingProfile.
 * Return-policy overrides are projected into that existing contract,
 * so the current Sale/Return UI follows the locally saved settings
 * without introducing a second feature-switch path.
 */
export function applyReturnPolicyToBusinessOperatingProfile(
    profile:
        BusinessOperatingProfile,
): BusinessOperatingProfile {
    const policy =
        currentReturnPolicy;

    return {
        ...profile,

        features: {
            ...profile.features,

            returns:
                policy.returnsEnabled,

            exchanges:
                policy.exchangesEnabled,
        },

        pos: {
            ...profile.pos,

            allowReturnWithoutDocument:
                policy
                    .allowReturnWithoutDocument,
        },
    };
}
