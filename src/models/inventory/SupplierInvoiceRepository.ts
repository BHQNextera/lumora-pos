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
    SupplierInvoiceDocument,
    SupplierInvoiceDocumentLine,
} from "./SupplierInvoice";

const STORAGE_KEY =
    "lumora.supplier-invoices.v1";

let documents:
    SupplierInvoiceDocument[] = [];

let storagePromise:
    Promise<RuntimeStorage> | null =
        null;

let persistenceQueue:
    Promise<void> =
        Promise.resolve();

type Listener =
    () => void;

const listeners =
    new Set<Listener>();

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

function cloneLine(
    line:
        SupplierInvoiceDocumentLine,
): SupplierInvoiceDocumentLine {
    return {
        ...line,
        product: {
            ...line.product,
        },
    };
}

function cloneDocument(
    document:
        SupplierInvoiceDocument,
): SupplierInvoiceDocument {
    return {
        ...document,
        supplier: {
            ...document.supplier,
        },
        receivedBy:
            document.receivedBy
                ? {
                      ...document.receivedBy,
                  }
                : undefined,
        lines:
            document.lines.map(
                cloneLine,
            ),
        attachments:
            (document.attachments ?? []).map(
                (attachment) => ({
                    ...attachment,
                }),
            ),
        totals: {
            ...document.totals,
        },
    };
}

function parseDocuments(
    raw: string | null,
): SupplierInvoiceDocument[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? (parsed as SupplierInvoiceDocument[]).map(
                  (document) => ({
                      ...document,
                      attachments:
                          document.attachments ?? [],
                  }),
              )
            : [];
    }
    catch {
        return [];
    }
}

async function readStoredValue(
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
            documents,
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

function normalizeReference(
    value: string,
): string {
    return value
        .trim()
        .toLocaleLowerCase();
}

function nextDocumentNumber(
    tenantId: string,
    storeCode: string,
): string {
    let maxNumber = 0;

    for (
        const document
        of documents
    ) {
        if (
            document.tenantId !== tenantId ||
            document.storeCode !== storeCode ||
            !document.documentNumber
        ) {
            continue;
        }

        const match =
            /^SI-(\d{6})$/.exec(
                document.documentNumber,
            );

        if (!match) {
            continue;
        }

        maxNumber =
            Math.max(
                maxNumber,
                Number(match[1]),
            );
    }

    return `SI-${String(
        maxNumber + 1,
    ).padStart(
        6,
        "0",
    )}`;
}

export async function hydrateSupplierInvoices():
Promise<void> {
    const storage =
        await getStorage();

    documents =
        parseDocuments(
            await readStoredValue(
                storage,
            ),
        );

    notify();
}

export function subscribeSupplierInvoices(
    listener: Listener,
): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

export function getSupplierInvoices():
SupplierInvoiceDocument[] {
    const configuration =
        getActiveBusinessConfiguration();

    return documents
        .filter(
            (document) =>
                document.tenantId ===
                    configuration.tenantId &&
                document.storeCode ===
                    configuration.storeCode,
        )
        .sort(
            (left, right) =>
                new Date(
                    right.updatedAt,
                ).getTime() -
                new Date(
                    left.updatedAt,
                ).getTime(),
        )
        .map(cloneDocument);
}

export function getSupplierInvoice(
    documentId: string,
): SupplierInvoiceDocument | undefined {
    const configuration =
        getActiveBusinessConfiguration();

    const document =
        documents.find(
            (current) =>
                current.id === documentId &&
                current.tenantId ===
                    configuration.tenantId &&
                current.storeCode ===
                    configuration.storeCode,
        );

    return document
        ? cloneDocument(document)
        : undefined;
}

export function supplierInvoiceReferenceExists(
    supplierName: string,
    supplierInvoiceNumber: string,
    ignoreDocumentId?: string,
): boolean {
    const configuration =
        getActiveBusinessConfiguration();

    const normalizedSupplier =
        normalizeReference(
            supplierName,
        );

    const normalizedNumber =
        normalizeReference(
            supplierInvoiceNumber,
        );

    if (
        !normalizedSupplier ||
        !normalizedNumber
    ) {
        return false;
    }

    return documents.some(
        (document) =>
            document.id !== ignoreDocumentId &&
            document.tenantId ===
                configuration.tenantId &&
            document.storeCode ===
                configuration.storeCode &&
            document.status !== "cancelled" &&
            normalizeReference(
                document.supplier.name,
            ) === normalizedSupplier &&
            normalizeReference(
                document.supplierInvoiceNumber,
            ) === normalizedNumber,
    );
}

export type SaveSupplierInvoiceDraftInput = {
    documentId?: string;
    supplier: {
        id?: string;
        name: string;
    };
    supplierInvoiceNumber: string;
    invoiceDate: string;
    note?: string;
    attachments?:
        SupplierInvoiceDocument["attachments"];
    receivedBy?: {
        employeeId: string;
        employeeName: string;
    };
    lines:
        SupplierInvoiceDocumentLine[];
    totals:
        SupplierInvoiceDocument["totals"];
};

export function saveSupplierInvoiceDraft(
    input:
        SaveSupplierInvoiceDraftInput,
): SupplierInvoiceDocument {
    const configuration =
        getActiveBusinessConfiguration();

    const now =
        new Date()
            .toISOString();

    const existing =
        input.documentId
            ? documents.find(
                  (document) =>
                      document.id ===
                          input.documentId &&
                      document.tenantId ===
                          configuration.tenantId &&
                      document.storeCode ===
                          configuration.storeCode &&
                      document.status ===
                          "draft",
              )
            : undefined;

    const document:
        SupplierInvoiceDocument = {
        id:
            existing?.id ??
            crypto.randomUUID(),

        status:
            "draft",

        tenantId:
            configuration.tenantId,

        storeCode:
            configuration.storeCode,

        registerCode:
            configuration.registerCode,

        createdAt:
            existing?.createdAt ??
            now,

        updatedAt:
            now,

        supplier: {
            id:
                input.supplier.id,
            name:
                input.supplier.name.trim(),
        },

        supplierInvoiceNumber:
            input.supplierInvoiceNumber.trim(),

        invoiceDate:
            input.invoiceDate,

        note:
            input.note?.trim() ?? "",

        attachments:
            (input.attachments ?? []).map(
                (attachment) => ({
                    ...attachment,
                }),
            ),

        receivedBy:
            input.receivedBy
                ? {
                      ...input.receivedBy,
                  }
                : undefined,

        lines:
            input.lines.map(
                cloneLine,
            ),

        totals: {
            ...input.totals,
        },
    };

    documents =
        existing
            ? documents.map(
                  (current) =>
                      current.id === existing.id
                          ? document
                          : current,
              )
            : [
                  document,
                  ...documents,
              ];

    notify();
    persist();

    return cloneDocument(
        document,
    );
}

export type PostSupplierInvoiceInput =
    SaveSupplierInvoiceDraftInput;

export function postSupplierInvoice(
    input:
        PostSupplierInvoiceInput,
): SupplierInvoiceDocument {
    const configuration =
        getActiveBusinessConfiguration();

    const now =
        new Date()
            .toISOString();

    const existingDraft =
        input.documentId
            ? documents.find(
                  (document) =>
                      document.id ===
                          input.documentId &&
                      document.tenantId ===
                          configuration.tenantId &&
                      document.storeCode ===
                          configuration.storeCode &&
                      document.status ===
                          "draft",
              )
            : undefined;

    const document:
        SupplierInvoiceDocument = {
        id:
            existingDraft?.id ??
            crypto.randomUUID(),

        documentNumber:
            nextDocumentNumber(
                configuration.tenantId,
                configuration.storeCode,
            ),

        status:
            "posted",

        tenantId:
            configuration.tenantId,

        storeCode:
            configuration.storeCode,

        registerCode:
            configuration.registerCode,

        createdAt:
            existingDraft?.createdAt ??
            now,

        updatedAt:
            now,

        postedAt:
            now,

        supplier: {
            id:
                input.supplier.id,
            name:
                input.supplier.name.trim(),
        },

        supplierInvoiceNumber:
            input.supplierInvoiceNumber.trim(),

        invoiceDate:
            input.invoiceDate,

        note:
            input.note?.trim() ?? "",

        attachments:
            (input.attachments ?? []).map(
                (attachment) => ({
                    ...attachment,
                }),
            ),

        receivedBy:
            input.receivedBy
                ? {
                      ...input.receivedBy,
                  }
                : undefined,

        lines:
            input.lines.map(
                cloneLine,
            ),

        totals: {
            ...input.totals,
        },
    };

    documents =
        existingDraft
            ? documents.map(
                  (current) =>
                      current.id ===
                          existingDraft.id
                          ? document
                          : current,
              )
            : [
                  document,
                  ...documents,
              ];

    notify();
    persist();

    return cloneDocument(
        document,
    );
}

export function cancelSupplierInvoiceDraft(
    documentId: string,
): SupplierInvoiceDocument {
    const configuration =
        getActiveBusinessConfiguration();

    const existing =
        documents.find(
            (document) =>
                document.id === documentId &&
                document.tenantId ===
                    configuration.tenantId &&
                document.storeCode ===
                    configuration.storeCode &&
                document.status ===
                    "draft",
        );

    if (!existing) {
        throw new Error(
            "Supplier invoice draft not found.",
        );
    }

    const cancelled:
        SupplierInvoiceDocument = {
        ...existing,
        status: "cancelled",
        updatedAt:
            new Date().toISOString(),
    };

    documents =
        documents.map(
            (document) =>
                document.id === documentId
                    ? cancelled
                    : document,
        );

    notify();
    persist();

    return cloneDocument(
        cancelled,
    );
}

export async function flushSupplierInvoicePersistence():
Promise<void> {
    await persistenceQueue;
}
