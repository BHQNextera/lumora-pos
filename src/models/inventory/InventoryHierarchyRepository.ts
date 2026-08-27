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
    InventoryHierarchyLevel,
    InventoryHierarchyNode,
    InventoryHierarchyNodeInput,
} from "./InventoryHierarchy";

const STORAGE_KEY =
    "lumora.inventory-hierarchy.v1";

let nodes: InventoryHierarchyNode[] = [];
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

function cloneNode(
    node: InventoryHierarchyNode,
): InventoryHierarchyNode {
    return {
        ...node,
    };
}

function parseNodes(
    raw: string | null,
): InventoryHierarchyNode[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
            ? parsed as InventoryHierarchyNode[]
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
    const snapshot = JSON.stringify(nodes);

    persistenceQueue =
        persistenceQueue.then(async () => {
            const storage = await getStorage();
            await storage.setItem(
                STORAGE_KEY,
                snapshot,
            );
        });
}

function tenantId(): string {
    return getActiveBusinessConfiguration().tenantId;
}

function siblingExists(
    input: InventoryHierarchyNodeInput,
    ignoreId?: string,
): boolean {
    const normalizedName = normalize(input.name);
    const currentTenantId = tenantId();

    return nodes.some(
        (node) =>
            node.id !== ignoreId &&
            node.tenantId === currentTenantId &&
            node.level === input.level &&
            (node.parentId ?? "") ===
                (input.parentId ?? "") &&
            normalize(node.name) === normalizedName,
    );
}

function validateParent(
    level: InventoryHierarchyLevel,
    parentId?: string,
) {
    if (level === "department") {
        if (parentId) {
            throw new Error("למחלקה לא יכול להיות אב בהיררכיה.");
        }
        return;
    }

    if (!parentId) {
        throw new Error("יש לבחור רמת אב.");
    }

    const parent = nodes.find(
        (node) =>
            node.id === parentId &&
            node.tenantId === tenantId(),
    );

    if (!parent) {
        throw new Error("רמת האב שנבחרה אינה קיימת.");
    }

    if (
        level === "category" &&
        parent.level !== "department"
    ) {
        throw new Error("קטגוריה חייבת להיות תחת מחלקה.");
    }

    if (
        level === "subcategory" &&
        parent.level !== "category"
    ) {
        throw new Error("תת־קטגוריה חייבת להיות תחת קטגוריה.");
    }
}

export async function hydrateInventoryHierarchy(): Promise<void> {
    if (!hydrationPromise) {
        hydrationPromise = (async () => {
            const storage = await getStorage();
            nodes = parseNodes(
                await readStoredValue(storage),
            );
            notify();
        })();
    }

    return hydrationPromise;
}

export function subscribeInventoryHierarchy(
    listener: Listener,
): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function getInventoryHierarchyNodes():
InventoryHierarchyNode[] {
    const currentTenantId = tenantId();

    return nodes
        .filter(
            (node) =>
                node.tenantId === currentTenantId,
        )
        .sort((left, right) => {
            const levelOrder = {
                department: 0,
                category: 1,
                subcategory: 2,
            } as const;

            const byLevel =
                levelOrder[left.level] -
                levelOrder[right.level];

            if (byLevel !== 0) {
                return byLevel;
            }

            return left.name.localeCompare(
                right.name,
                "he",
            );
        })
        .map(cloneNode);
}

export function createInventoryHierarchyNode(
    input: InventoryHierarchyNodeInput,
): InventoryHierarchyNode {
    const name = input.name.trim();

    if (!name) {
        throw new Error("יש להזין שם.");
    }

    validateParent(
        input.level,
        input.parentId,
    );

    if (
        siblingExists({
            ...input,
            name,
        })
    ) {
        throw new Error("השם כבר קיים באותה רמה.");
    }

    const now = new Date().toISOString();
    const node: InventoryHierarchyNode = {
        id: crypto.randomUUID(),
        tenantId: tenantId(),
        level: input.level,
        name,
        parentId:
            input.level === "department"
                ? undefined
                : input.parentId,
        isActive: true,
        createdAt: now,
        updatedAt: now,
    };

    nodes = [
        ...nodes,
        node,
    ];
    persist();
    notify();

    return cloneNode(node);
}

export function setInventoryHierarchyNodeActive(
    nodeId: string,
    isActive: boolean,
): InventoryHierarchyNode {
    const currentTenantId = tenantId();
    const current = nodes.find(
        (node) =>
            node.id === nodeId &&
            node.tenantId === currentTenantId,
    );

    if (!current) {
        throw new Error("רמת ההיררכיה לא נמצאה.");
    }

    if (!isActive) {
        const hasActiveChildren = nodes.some(
            (node) =>
                node.tenantId === currentTenantId &&
                node.parentId === nodeId &&
                node.isActive,
        );

        if (hasActiveChildren) {
            throw new Error("יש להשבית קודם את רמות הבת.");
        }
    }

    const updated: InventoryHierarchyNode = {
        ...current,
        isActive,
        updatedAt: new Date().toISOString(),
    };

    nodes = nodes.map(
        (node) =>
            node.id === nodeId
                ? updated
                : node,
    );
    persist();
    notify();

    return cloneNode(updated);
}

function findNodeByName(
    level: InventoryHierarchyLevel,
    name: string,
    parentId?: string,
): InventoryHierarchyNode | undefined {
    const currentTenantId = tenantId();
    const normalizedName = normalize(name);

    return nodes.find(
        (node) =>
            node.tenantId === currentTenantId &&
            node.level === level &&
            (node.parentId ?? "") ===
                (parentId ?? "") &&
            normalize(node.name) === normalizedName,
    );
}

export function seedInventoryHierarchyFromProducts(
    products: Product[],
) {
    let changed = false;
    const now = new Date().toISOString();
    const currentTenantId = tenantId();

    const ensureNode = (
        level: InventoryHierarchyLevel,
        name: string,
        parentId?: string,
    ): InventoryHierarchyNode | undefined => {
        const trimmed = name.trim();
        if (!trimmed) {
            return undefined;
        }

        const existing = findNodeByName(
            level,
            trimmed,
            parentId,
        );

        if (existing) {
            return existing;
        }

        const node: InventoryHierarchyNode = {
            id: crypto.randomUUID(),
            tenantId: currentTenantId,
            level,
            name: trimmed,
            parentId,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        };

        nodes = [
            ...nodes,
            node,
        ];
        changed = true;
        return node;
    };

    for (const product of products) {
        const department =
            ensureNode(
                "department",
                product.hierarchy?.department ?? "",
            );

        const category =
            ensureNode(
                "category",
                product.hierarchy?.category ?? "",
                department?.id,
            );

        ensureNode(
            "subcategory",
            product.hierarchy?.subcategory ?? "",
            category?.id,
        );
    }

    if (changed) {
        persist();
        notify();
    }
}

export async function flushInventoryHierarchyPersistence():
Promise<void> {
    await persistenceQueue;
}
