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

import type {
    Product,
} from "../../types/product";

import type {
    Supplier,
    SupplierInput,
} from "./Supplier";

const STORAGE_KEY =
    "lumora.suppliers.v1";

let suppliers: Supplier[] = [];
let storagePromise: Promise<RuntimeStorage> | null = null;
let persistenceQueue: Promise<void> = Promise.resolve();
let hydrationPromise: Promise<void> | null = null;

type Listener = () => void;
const listeners = new Set<Listener>();

function getStorage(): Promise<RuntimeStorage> {
    if (!storagePromise) {
        storagePromise = (async (): Promise<RuntimeStorage> => {
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

    return storagePromise;
}

function normalize(value: string): string {
    return value.trim().toLocaleLowerCase();
}

function cloneSupplier(supplier: Supplier): Supplier {
    return {
        ...supplier,
    };
}

function parseSuppliers(raw: string | null): Supplier[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
            ? parsed as Supplier[]
            : [];
    }
    catch {
        return [];
    }
}

async function readStoredValue(
    storage: RuntimeStorage,
): Promise<string | null> {
    let raw = await storage.getItem(STORAGE_KEY);

    if (raw === null && isTauri()) {
        const legacy =
            window.localStorage.getItem(STORAGE_KEY);

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

function notify() {
    for (const listener of listeners) {
        listener();
    }
}

function persist() {
    const snapshot =
        JSON.stringify(suppliers);

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

export function hydrateSuppliers(): Promise<void> {
    if (!hydrationPromise) {
        hydrationPromise = (async () => {
            const storage =
                await getStorage();

            suppliers = parseSuppliers(
                await readStoredValue(storage),
            );

            notify();
        })();
    }

    return hydrationPromise;
}

export function subscribeSuppliers(
    listener: Listener,
): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

export function getSuppliers(): Supplier[] {
    const configuration =
        getActiveBusinessConfiguration();

    return suppliers
        .filter(
            (supplier) =>
                supplier.tenantId ===
                    configuration.tenantId,
        )
        .sort(
            (left, right) =>
                left.name.localeCompare(
                    right.name,
                    "he",
                ),
        )
        .map(cloneSupplier);
}

export function getSupplier(
    supplierId: string,
): Supplier | undefined {
    const configuration =
        getActiveBusinessConfiguration();

    const supplier = suppliers.find(
        (current) =>
            current.id === supplierId &&
            current.tenantId ===
                configuration.tenantId,
    );

    return supplier
        ? cloneSupplier(supplier)
        : undefined;
}

export function supplierIdentityExists(
    name: string,
    businessNumber: string,
    ignoreSupplierId?: string,
): boolean {
    const configuration =
        getActiveBusinessConfiguration();

    const normalizedName = normalize(name);
    const normalizedBusinessNumber =
        normalize(businessNumber);

    return suppliers.some(
        (supplier) =>
            supplier.id !== ignoreSupplierId &&
            supplier.tenantId ===
                configuration.tenantId &&
            (
                (
                    normalizedName &&
                    normalize(supplier.name) ===
                        normalizedName
                ) ||
                (
                    normalizedBusinessNumber &&
                    normalize(
                        supplier.businessNumber,
                    ) ===
                        normalizedBusinessNumber
                )
            ),
    );
}

export function createSupplier(
    input: SupplierInput,
): Supplier {
    const configuration =
        getActiveBusinessConfiguration();

    const name =
        input.name.trim();
    const businessNumber =
        input.businessNumber.trim();

    if (!name) {
        throw new Error(
            "Supplier name is required.",
        );
    }

    if (!businessNumber) {
        throw new Error(
            "Supplier business number is required.",
        );
    }

    const now =
        new Date().toISOString();

    const supplier: Supplier = {
        id: crypto.randomUUID(),
        tenantId:
            configuration.tenantId,
        name,
        businessNumber,
        contactName:
            input.contactName?.trim() ?? "",
        phone:
            input.phone?.trim() ?? "",
        email:
            input.email?.trim() ?? "",
        address:
            input.address?.trim() ?? "",
        paymentTerms:
            input.paymentTerms?.trim() ?? "",
        note:
            input.note?.trim() ?? "",
        isActive: true,
        createdAt: now,
        updatedAt: now,
    };

    suppliers = [
        supplier,
        ...suppliers,
    ];

    notify();
    persist();

    return cloneSupplier(supplier);
}

export function updateSupplier(
    supplierId: string,
    input: SupplierInput,
): Supplier {
    const configuration =
        getActiveBusinessConfiguration();

    const existing = suppliers.find(
        (supplier) =>
            supplier.id === supplierId &&
            supplier.tenantId ===
                configuration.tenantId,
    );

    if (!existing) {
        throw new Error(
            "Supplier not found.",
        );
    }

    const name =
        input.name.trim();
    const businessNumber =
        input.businessNumber.trim();

    if (!name) {
        throw new Error(
            "Supplier name is required.",
        );
    }

    if (!businessNumber) {
        throw new Error(
            "Supplier business number is required.",
        );
    }

    const updated: Supplier = {
        ...existing,
        name,
        businessNumber,
        contactName:
            input.contactName?.trim() ?? "",
        phone:
            input.phone?.trim() ?? "",
        email:
            input.email?.trim() ?? "",
        address:
            input.address?.trim() ?? "",
        paymentTerms:
            input.paymentTerms?.trim() ?? "",
        note:
            input.note?.trim() ?? "",
        updatedAt:
            new Date().toISOString(),
    };

    suppliers = suppliers.map(
        (supplier) =>
            supplier.id === supplierId
                ? updated
                : supplier,
    );

    notify();
    persist();

    return cloneSupplier(updated);
}

export function setSupplierActive(
    supplierId: string,
    isActive: boolean,
): Supplier {
    const configuration =
        getActiveBusinessConfiguration();

    const existing = suppliers.find(
        (supplier) =>
            supplier.id === supplierId &&
            supplier.tenantId ===
                configuration.tenantId,
    );

    if (!existing) {
        throw new Error(
            "Supplier not found.",
        );
    }

    const updated: Supplier = {
        ...existing,
        isActive,
        updatedAt:
            new Date().toISOString(),
    };

    suppliers = suppliers.map(
        (supplier) =>
            supplier.id === supplierId
                ? updated
                : supplier,
    );

    notify();
    persist();

    return cloneSupplier(updated);
}

export function ensureSuppliersFromProducts(
    products: Product[],
): Supplier[] {
    const configuration =
        getActiveBusinessConfiguration();

    let changed = false;

    for (const product of products) {
        const productSupplier =
            product.supplier;

        const name =
            productSupplier?.name.trim() ?? "";

        if (!name) {
            continue;
        }

        const existing = suppliers.find(
            (supplier) =>
                supplier.tenantId ===
                    configuration.tenantId &&
                normalize(supplier.name) ===
                    normalize(name),
        );

        if (existing) {
            continue;
        }

        let id =
            productSupplier?.id?.trim() ||
            crypto.randomUUID();

        if (
            suppliers.some(
                (supplier) =>
                    supplier.id === id,
            )
        ) {
            id = crypto.randomUUID();
        }

        const now =
            new Date().toISOString();

        suppliers.push({
            id,
            tenantId:
                configuration.tenantId,
            name,
            businessNumber: "",
            contactName: "",
            phone: "",
            email: "",
            address: "",
            paymentTerms: "",
            note: "",
            isActive: true,
            createdAt: now,
            updatedAt: now,
        });

        changed = true;
    }

    if (changed) {
        notify();
        persist();
    }

    return getSuppliers();
}

export async function flushSupplierPersistence():
Promise<void> {
    await persistenceQueue;
}
