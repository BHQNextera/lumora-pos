import {
    isTauri,
} from "@tauri-apps/api/core";

import {
    BrowserLocalStorageAdapter,
} from "../runtime/storage/BrowserLocalStorageAdapter";

import type {
    RuntimeStorage,
} from "../runtime/storage/RuntimeStorage";

export type PaymentMethodCode =
    | "cash"
    | "card_terminal"
    | "echo"
    | "bit"
    | "paybox"
    | "bank_transfer"
    | "cheque"
    | "external_credit"
    | "credit_voucher"
    | "gift_card"
    | "store_credit"
    | "custom";

export type PaymentMethodKind =
    | "cash"
    | "integrated"
    | "recorded"
    | "stored_value";

export type PaymentMethod = {
    code: PaymentMethodCode;
    name: string;
    kind: PaymentMethodKind;

    isActive: boolean;
    sortOrder: number;

    requiresExternalReference: boolean;
    allowsPartialPayment: boolean;
    allowsOverpayment: boolean;
    returnsChange: boolean;
};

export type PaymentMethodConfiguration = {
    code: PaymentMethodCode;
    isActive: boolean;
    sortOrder: number;
};

export const defaultPaymentMethods: PaymentMethod[] = [
    {
        code: "cash",
        name: "מזומן",
        kind: "cash",
        isActive: true,
        sortOrder: 10,
        requiresExternalReference: false,
        allowsPartialPayment: true,
        allowsOverpayment: true,
        returnsChange: true,
    },
    {
        code: "card_terminal",
        name: "אשראי",
        kind: "integrated",
        isActive: false,
        sortOrder: 20,
        requiresExternalReference: true,
        allowsPartialPayment: true,
        allowsOverpayment: false,
        returnsChange: false,
    },
    {
        code: "echo",
        name: "Echo",
        kind: "integrated",
        isActive: true,
        sortOrder: 30,
        requiresExternalReference: true,
        allowsPartialPayment: true,
        allowsOverpayment: false,
        returnsChange: false,
    },
    {
        code: "credit_voucher",
        name: "שובר זיכוי",
        kind: "stored_value",
        isActive: true,
        sortOrder: 40,
        requiresExternalReference: true,
        allowsPartialPayment: true,
        allowsOverpayment: false,
        returnsChange: false,
    },
    {
        code: "gift_card",
        name: "כרטיס מתנה",
        kind: "stored_value",
        isActive: true,
        sortOrder: 50,
        requiresExternalReference: true,
        allowsPartialPayment: true,
        allowsOverpayment: false,
        returnsChange: false,
    },
    {
        code: "store_credit",
        name: "הקפה",
        kind: "stored_value",
        isActive: false,
        sortOrder: 60,
        requiresExternalReference: true,
        allowsPartialPayment: true,
        allowsOverpayment: false,
        returnsChange: false,
    },
    {
        code: "bit",
        name: "Bit",
        kind: "recorded",
        isActive: false,
        sortOrder: 70,
        requiresExternalReference: false,
        allowsPartialPayment: true,
        allowsOverpayment: false,
        returnsChange: false,
    },
    {
        code: "paybox",
        name: "PayBox",
        kind: "recorded",
        isActive: false,
        sortOrder: 80,
        requiresExternalReference: false,
        allowsPartialPayment: true,
        allowsOverpayment: false,
        returnsChange: false,
    },
    {
        code: "bank_transfer",
        name: "העברה בנקאית",
        kind: "recorded",
        isActive: false,
        sortOrder: 90,
        requiresExternalReference: true,
        allowsPartialPayment: true,
        allowsOverpayment: false,
        returnsChange: false,
    },
    {
        code: "cheque",
        name: "המחאה",
        kind: "recorded",
        isActive: false,
        sortOrder: 100,
        requiresExternalReference: true,
        allowsPartialPayment: true,
        allowsOverpayment: false,
        returnsChange: false,
    },
    {
        code: "external_credit",
        name: "אשראי חיצוני",
        kind: "recorded",
        isActive: true,
        sortOrder: 110,
        requiresExternalReference: true,
        allowsPartialPayment: true,
        allowsOverpayment: false,
        returnsChange: false,
    },
    {
        code: "custom",
        name: "אמצעי תשלום נוסף",
        kind: "recorded",
        isActive: false,
        sortOrder: 120,
        requiresExternalReference: false,
        allowsPartialPayment: true,
        allowsOverpayment: false,
        returnsChange: false,
    },
];

/**
 * A configured provider adapter is required before Lumora may initiate
 * a card-terminal transaction. The current Standalone Pilot supports
 * externally approved card payments as recorded payments instead.
 */
export function isPaymentMethodRuntimeAvailable(
    code:
        PaymentMethodCode,
): boolean {
    return code !==
        "card_terminal";
}

const STORAGE_KEY =
    "lumora.payment-method-configuration";

let localConfiguration:
    PaymentMethodConfiguration[] | null =
        null;

type PaymentMethodListener =
    () => void;

const listeners =
    new Set<PaymentMethodListener>();

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

function isPaymentMethodCode(
    value: unknown,
): value is PaymentMethodCode {
    return defaultPaymentMethods.some(
        (method) =>
            method.code === value,
    );
}

function normalizeConfiguration(
    configuration:
        PaymentMethodConfiguration[] | undefined,
): PaymentMethodConfiguration[] {
    const overrides =
        new Map<
            PaymentMethodCode,
            PaymentMethodConfiguration
        >();

    for (
        const item
        of configuration ?? []
    ) {
        if (
            !isPaymentMethodCode(
                item.code,
            )
        ) {
            continue;
        }

        overrides.set(
            item.code,
            {
                code:
                    item.code,
                isActive:
                    item.isActive ===
                    true,
                sortOrder:
                    Number.isFinite(
                        item.sortOrder,
                    )
                        ? item.sortOrder
                        : 9999,
            },
        );
    }

    return defaultPaymentMethods
        .map(
            (method) => {
                const override =
                    overrides.get(
                        method.code,
                    );

                return {
                    code:
                        method.code,
                    isActive:
                        override?.isActive ??
                        method.isActive,
                    sortOrder:
                        override?.sortOrder ??
                        method.sortOrder,
                };
            },
        )
        .sort(
            (a, b) =>
                a.sortOrder -
                b.sortOrder,
        )
        .map(
            (
                item,
                index,
            ) => ({
                ...item,
                sortOrder:
                    (
                        index + 1
                    ) * 10,
            }),
        );
}

function parseConfiguration(
    raw: string | null,
): PaymentMethodConfiguration[] | null {
    if (!raw) {
        return null;
    }

    try {
        const parsed =
            JSON.parse(
                raw,
            );

        if (
            !Array.isArray(
                parsed,
            )
        ) {
            return null;
        }

        return normalizeConfiguration(
            parsed as
                PaymentMethodConfiguration[],
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
        localConfiguration
            ? JSON.stringify(
                localConfiguration,
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

async function readStoredConfiguration(
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

export async function hydratePaymentMethodConfiguration():
Promise<void> {
    const storage =
        await getStorage();

    localConfiguration =
        parseConfiguration(
            await readStoredConfiguration(
                storage,
            ),
        );

    notify();
}

export function subscribePaymentMethodConfiguration(
    listener:
        PaymentMethodListener,
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

export function resolvePaymentMethods(
    configuration?:
        PaymentMethodConfiguration[],
): PaymentMethod[] {
    const resolvedConfiguration =
        normalizeConfiguration(
            localConfiguration ??
            configuration,
        );

    const overrides =
        new Map(
            resolvedConfiguration.map(
                (item) => [
                    item.code,
                    item,
                ],
            ),
        );

    return defaultPaymentMethods
        .map(
            (method) => {
                const override =
                    overrides.get(
                        method.code,
                    );

                return {
                    ...method,
                    isActive:
                        override?.isActive ??
                        method.isActive,
                    sortOrder:
                        override?.sortOrder ??
                        method.sortOrder,
                };
            },
        )
        .sort(
            (a, b) =>
                a.sortOrder -
                b.sortOrder,
        );
}

export function savePaymentMethodConfiguration(
    configuration:
        PaymentMethodConfiguration[],
): PaymentMethodConfiguration[] {
    const normalized =
        normalizeConfiguration(
            configuration,
        );

    if (
        !normalized.some(
            (item) =>
                item.isActive &&
                isPaymentMethodRuntimeAvailable(
                    item.code,
                ),
        )
    ) {
        throw new Error(
            "PAYMENT_METHOD_REQUIRED",
        );
    }

    localConfiguration =
        normalized;

    notify();
    persist();

    return normalized.map(
        (item) => ({
            ...item,
        }),
    );
}

export function setPaymentMethodActive(
    code:
        PaymentMethodCode,
    isActive:
        boolean,
    fallbackConfiguration?:
        PaymentMethodConfiguration[],
): PaymentMethodConfiguration[] {
    const current =
        resolvePaymentMethods(
            fallbackConfiguration,
        ).map(
            (method) => ({
                code:
                    method.code,
                isActive:
                    method.isActive,
                sortOrder:
                    method.sortOrder,
            }),
        );

    const next =
        current.map(
            (item) =>
                item.code ===
                    code
                    ? {
                        ...item,
                        isActive,
                    }
                    : item,
        );

    return savePaymentMethodConfiguration(
        next,
    );
}

export function movePaymentMethod(
    code:
        PaymentMethodCode,
    direction:
        "up" | "down",
    fallbackConfiguration?:
        PaymentMethodConfiguration[],
): PaymentMethodConfiguration[] {
    const current =
        resolvePaymentMethods(
            fallbackConfiguration,
        ).map(
            (method) => ({
                code:
                    method.code,
                isActive:
                    method.isActive,
                sortOrder:
                    method.sortOrder,
            }),
        );

    const index =
        current.findIndex(
            (item) =>
                item.code ===
                    code,
        );

    const targetIndex =
        direction ===
            "up"
            ? index - 1
            : index + 1;

    if (
        index < 0 ||
        targetIndex < 0 ||
        targetIndex >=
            current.length
    ) {
        return current;
    }

    const next = [
        ...current,
    ];

    [
        next[index],
        next[targetIndex],
    ] = [
        next[targetIndex],
        next[index],
    ];

    return savePaymentMethodConfiguration(
        next.map(
            (
                item,
                itemIndex,
            ) => ({
                ...item,
                sortOrder:
                    (
                        itemIndex + 1
                    ) * 10,
            }),
        ),
    );
}

export function flushPaymentMethodConfigurationPersistence():
Promise<void> {
    return persistenceQueue;
}
