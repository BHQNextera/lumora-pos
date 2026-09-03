import {
    isTauri,
} from "@tauri-apps/api/core";

import type {
    Customer,
} from "./Customer";

import {
    enqueueLumoraCustomerSync,
} from "../../integrations/nextera/CustomerNexteraOutbox";

import {
    testCustomers,
} from "./CustomerSeed";

import {
    BrowserLocalStorageAdapter,
} from "../../runtime/storage/BrowserLocalStorageAdapter";

import type {
    RuntimeStorage,
} from "../../runtime/storage/RuntimeStorage";

import {
    normalizeIsraeliId,
    normalizeIsraeliPhone,
    validateCustomerForSave,
} from "./CustomerValidation";

const STORAGE_KEY =
    "lumora.customers.v1";

/**
 * STORE CREDIT TEST ENABLEMENT V1
 *
 * Non-destructive local/demo backfill for the existing vip-test
 * customer. Existing persisted credit values always win.
 * Remove when customer credit administration is available.
 */
function applyStoreCreditTestDefaults(
    source: Customer[],
): Customer[] {
    return source.map(
        (customer) => {
            if (
                customer.id !==
                "vip-test"
            ) {
                return customer;
            }

            return {
                ...customer,

                storeCreditEnabled:
                    customer.storeCreditEnabled ??
                    true,

                creditLimit:
                    customer.creditLimit ??
                    5000,

                accountBalance:
                    customer.accountBalance ??
                    1200,
            };
        },
    );
}

let customers:
    Customer[] = [];

type CustomerListener =
    () => void;

const customerListeners =
    new Set<CustomerListener>();

function notifyCustomers() {
    for (
        const listener
        of customerListeners
    ) {
        listener();
    }
}

export function subscribeCustomers(
    listener:
        CustomerListener,
): () => void {
    customerListeners.add(
        listener,
    );

    return () => {
        customerListeners.delete(
            listener,
        );
    };
}

/*
 * Customer platform persistence:
 *
 * Browser development:
 *     localStorage
 *
 * Tauri desktop runtime:
 *     SQLite
 */
let customerStoragePromise:
    Promise<RuntimeStorage> | null =
        null;

function getCustomerStorage():
Promise<RuntimeStorage> {
    if (!customerStoragePromise) {
        customerStoragePromise =
            (async (): Promise<RuntimeStorage> => {
                if (!isTauri()) {
                    return new BrowserLocalStorageAdapter();
                }

                const {
                    SQLiteRuntimeStorageAdapter,
                } = await import(
                    "../../runtime/storage/SQLiteRuntimeStorageAdapter"
                );

                return new SQLiteRuntimeStorageAdapter();
            })();
    }

    return customerStoragePromise;
}

let persistenceQueue:
    Promise<void> =
        Promise.resolve();

function parseCustomers(
    raw: string | null,
): Customer[] {
    if (!raw) {
        return applyStoreCreditTestDefaults(
            [
                ...testCustomers,
            ],
        );
    }

    try {
        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? applyStoreCreditTestDefaults(
                  parsed as Customer[],
              )
            : applyStoreCreditTestDefaults(
                  [
                      ...testCustomers,
                  ],
              );
    }
    catch {
        return applyStoreCreditTestDefaults(
            [
                ...testCustomers,
            ],
        );
    }
}

export async function hydrateCustomers():
Promise<void> {
    const storage =
        await getCustomerStorage();

    const raw =
        await storage.getItem(
            STORAGE_KEY,
        );

    customers =
        parseCustomers(
            raw,
        );

    notifyCustomers();
}

function enqueuePersistence(
    operation: () => Promise<void>,
): void {
    persistenceQueue =
        persistenceQueue
            .catch(() => {
                /*
                 * Keep the queue available
                 * after a failed write.
                 */
            })
            .then(operation);

    void persistenceQueue.catch(
        (error) => {
            console.error(
                "LUMORA_CUSTOMER_PERSISTENCE_FAILED",
                error,
            );
        },
    );
}

function persistCustomers(
    nextCustomers:
        Customer[],
): void {
    const serialized =
        JSON.stringify(
            nextCustomers,
        );

    enqueuePersistence(
        async () => {
            const storage =
                await getCustomerStorage();

            await storage.setItem(
                STORAGE_KEY,
                serialized,
            );
        },
    );
}

function customerIdentityChanged(
    previous:
        Customer | undefined,
    next:
        Customer,
): boolean {
    if (!previous) {
        return true;
    }

    return (
        previous.name !==
            next.name ||
        previous.phone !==
            next.phone ||
        previous.email !==
            next.email ||
        previous.externalId !==
            next.externalId ||
        previous.birthDate !==
            next.birthDate ||
        previous.address !==
            next.address ||
        previous.notes !==
            next.notes ||
        (
            previous.isActive !==
            false
        ) !==
        (
            next.isActive !==
            false
        )
    );
}

export type NexteraCustomerSnapshot = {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    externalId?: string;
    birthDate?: string;
    address?: string;
    notes?: string;
    isActive: boolean;
    updatedAt: string;
};

export function getCustomers() {
    return [
        ...customers,
    ];
}

export function getWalkInCustomer(): Customer {
    const walkInCustomer =
        customers.find(
            (customer) =>
                customer.id === "walk-in",
        ) ??
        testCustomers.find(
            (customer) =>
                customer.id === "walk-in",
        );

    if (!walkInCustomer) {
        throw new Error(
            "LUMORA_WALK_IN_CUSTOMER_MISSING",
        );
    }

    return {
        ...walkInCustomer,
        groupIds: [
            ...walkInCustomer.groupIds,
        ],
    };
}

export function saveCustomer(
    customer: Customer,
) {
    validateCustomerForSave(
        customer,
        customers,
    );

    const normalizedCustomer:
        Customer = {
        ...customer,

        phone:
            customer.id ===
                "walk-in"
                ? customer.phone
                : normalizeIsraeliPhone(
                      customer.phone!,
                  ),

        externalId:
            customer.id ===
                "walk-in"
                ? customer.externalId
                : customer.externalId
                      ?.trim()
                    ? normalizeIsraeliId(
                          customer.externalId,
                      )
                    : undefined,
    };

    const previousCustomer =
        customers.find(
            (item) =>
                item.id ===
                normalizedCustomer.id,
        );

    const exists =
        previousCustomer !==
        undefined;

    customers =
        exists
            ? customers.map(
                  (item) =>
                      item.id ===
                      normalizedCustomer.id
                          ? normalizedCustomer
                          : item,
              )
            : [
                  ...customers,
                  normalizedCustomer,
              ];

    notifyCustomers();

    persistCustomers(
        customers,
    );

    if (
        customerIdentityChanged(
            previousCustomer,
            normalizedCustomer,
        )
    ) {
        enqueueLumoraCustomerSync(
            normalizedCustomer,
        );
    }

    return normalizedCustomer;
}

export function applyNexteraCustomerSnapshot(
    snapshot:
        NexteraCustomerSnapshot,
): Customer {
    const existing =
        customers.find(
            (customer) =>
                customer.id ===
                snapshot.id,
        );

    const projected:
        Customer = {
        id:
            snapshot.id,

        name:
            snapshot.name,

        phone:
            snapshot.phone,

        email:
            snapshot.email,

        externalId:
            snapshot.externalId,

        birthDate:
            snapshot.birthDate,

        address:
            snapshot.address,

        notes:
            snapshot.notes,

        groupIds:
            existing
                ? [
                    ...existing.groupIds,
                ]
                : [],

        isClubMember:
            existing?.isClubMember ??
            false,

        storeCreditEnabled:
            existing?.storeCreditEnabled,

        creditLimit:
            existing?.creditLimit,

        accountBalance:
            existing?.accountBalance,

        isActive:
            snapshot.isActive,

        createdAt:
            existing?.createdAt ??
            snapshot.updatedAt,

        updatedAt:
            snapshot.updatedAt,
    };

    customers =
        existing
            ? customers.map(
                (customer) =>
                    customer.id ===
                        projected.id
                        ? projected
                        : customer,
            )
            : [
                ...customers,
                projected,
            ];

    notifyCustomers();

    persistCustomers(
        customers,
    );

    return projected;
}

export function removeCustomer(
    customerId: string,
) {
    customers =
        customers.filter(
            (customer) =>
                customer.id !==
                customerId,
        );

    notifyCustomers();

    persistCustomers(
        customers,
    );
}

export async function flushCustomerPersistence():
Promise<void> {
    await persistenceQueue;
}
