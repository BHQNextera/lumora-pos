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
    SupplierReturnDocument,
    SupplierReturnDocumentLine,
} from "./SupplierReturn";

const STORAGE_KEY =
    "lumora.supplier-returns.v1";

let documents:
    SupplierReturnDocument[] = [];

let storagePromise:
    Promise<RuntimeStorage> | null =
        null;

let persistenceQueue:
    Promise<void> =
        Promise.resolve();

let hydrationPromise:
    Promise<void> | null =
        null;

type Listener = () => void;
const listeners = new Set<Listener>();

function getStorage():
Promise<RuntimeStorage> {
    if (!storagePromise) {
        storagePromise =
            (async () => {
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

function cloneLine(
    line: SupplierReturnDocumentLine,
): SupplierReturnDocumentLine {
    return {
        ...line,
        product: {
            ...line.product,
        },
    };
}

function cloneDocument(
    document: SupplierReturnDocument,
): SupplierReturnDocument {
    return {
        ...document,
        supplier: {
            ...document.supplier,
        },
        sourceSupplierInvoice:
            document.sourceSupplierInvoice
                ? {
                      ...document.sourceSupplierInvoice,
                  }
                : undefined,
        returnedBy:
            document.returnedBy
                ? {
                      ...document.returnedBy,
                  }
                : undefined,
        attachments:
            (document.attachments ?? []).map(
                (attachment) => ({
                    ...attachment,
                }),
            ),
        lines:
            document.lines.map(
                cloneLine,
            ),
        totals: {
            ...document.totals,
        },
    };
}

function parseDocuments(
    raw: string | null,
): SupplierReturnDocument[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);

        return Array.isArray(parsed)
            ? (parsed as SupplierReturnDocument[]).map(
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
    storage: RuntimeStorage,
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
    for (const listener of listeners) {
        listener();
    }
}

function persist() {
    const snapshot =
        JSON.stringify(documents);

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

function nextDocumentNumber(
    tenantId: string,
    storeCode: string,
): string {
    let maxNumber = 0;

    for (const document of documents) {
        if (
            document.tenantId !== tenantId ||
            document.storeCode !== storeCode ||
            !document.documentNumber
        ) {
            continue;
        }

        const match =
            /^SR-(\d{6})$/.exec(
                document.documentNumber,
            );

        if (match) {
            maxNumber = Math.max(
                maxNumber,
                Number(match[1]),
            );
        }
    }

    return `SR-${String(
        maxNumber + 1,
    ).padStart(6, "0")}`;
}

export function hydrateSupplierReturns():
Promise<void> {
    if (!hydrationPromise) {
        hydrationPromise =
            (async () => {
                const storage =
                    await getStorage();

                documents =
                    parseDocuments(
                        await readStoredValue(
                            storage,
                        ),
                    );

                notify();
            })();
    }

    return hydrationPromise;
}

export function subscribeSupplierReturns(
    listener: Listener,
): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

export function getSupplierReturns():
SupplierReturnDocument[] {
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

export function getSupplierReturn(
    documentId: string,
): SupplierReturnDocument | undefined {
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

export function getReturnedQuantityForSourceLine(
    sourceInvoiceId: string,
    sourceLineKey: string,
    ignoreDocumentId?: string,
): number {
    const configuration =
        getActiveBusinessConfiguration();

    return documents
        .filter(
            (document) =>
                document.id !== ignoreDocumentId &&
                document.status === "posted" &&
                document.tenantId ===
                    configuration.tenantId &&
                document.storeCode ===
                    configuration.storeCode &&
                document.sourceSupplierInvoice?.id ===
                    sourceInvoiceId,
        )
        .flatMap(
            (document) =>
                document.lines,
        )
        .filter(
            (line) =>
                line.sourceInvoiceLineKey ===
                    sourceLineKey,
        )
        .reduce(
            (total, line) =>
                total +
                (line.returnedQuantity ?? 0),
            0,
        );
}

export type SaveSupplierReturnDraftInput = {
    documentId?: string;
    supplier: {
        id?: string;
        name: string;
    };
    returnDate: string;
    supplierReferenceNumber: string;
    note?: string;
    sourceSupplierInvoice?:
        SupplierReturnDocument["sourceSupplierInvoice"];
    returnedBy?: {
        employeeId: string;
        employeeName: string;
    };
    attachments?:
        SupplierReturnDocument["attachments"];
    lines:
        SupplierReturnDocumentLine[];
    totals:
        SupplierReturnDocument["totals"];
};

export function saveSupplierReturnDraft(
    input: SaveSupplierReturnDraftInput,
): SupplierReturnDocument {
    const configuration =
        getActiveBusinessConfiguration();
    const now =
        new Date().toISOString();

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
        SupplierReturnDocument = {
        id:
            existing?.id ??
            crypto.randomUUID(),
        status: "draft",
        tenantId:
            configuration.tenantId,
        storeCode:
            configuration.storeCode,
        registerCode:
            configuration.registerCode,
        createdAt:
            existing?.createdAt ??
            now,
        updatedAt: now,
        supplier: {
            id: input.supplier.id,
            name:
                input.supplier.name.trim(),
        },
        returnDate:
            input.returnDate,
        supplierReferenceNumber:
            input.supplierReferenceNumber.trim(),
        note:
            input.note?.trim() ?? "",
        sourceSupplierInvoice:
            input.sourceSupplierInvoice
                ? {
                      ...input.sourceSupplierInvoice,
                  }
                : undefined,
        returnedBy:
            input.returnedBy
                ? {
                      ...input.returnedBy,
                  }
                : undefined,
        attachments:
            (input.attachments ?? []).map(
                (attachment) => ({
                    ...attachment,
                }),
            ),
        lines:
            input.lines.map(
                cloneLine,
            ),
        totals: {
            ...input.totals,
        },
    };

    documents = existing
        ? documents.map(
              (current) =>
                  current.id === existing.id
                      ? document
                      : current,
          )
        : [document, ...documents];

    notify();
    persist();

    return cloneDocument(document);
}

export function postSupplierReturn(
    input: SaveSupplierReturnDraftInput,
): SupplierReturnDocument {
    const configuration =
        getActiveBusinessConfiguration();
    const now =
        new Date().toISOString();

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
        SupplierReturnDocument = {
        id:
            existing?.id ??
            crypto.randomUUID(),
        documentNumber:
            nextDocumentNumber(
                configuration.tenantId,
                configuration.storeCode,
            ),
        status: "posted",
        tenantId:
            configuration.tenantId,
        storeCode:
            configuration.storeCode,
        registerCode:
            configuration.registerCode,
        createdAt:
            existing?.createdAt ??
            now,
        updatedAt: now,
        postedAt: now,
        supplier: {
            id: input.supplier.id,
            name:
                input.supplier.name.trim(),
        },
        returnDate:
            input.returnDate,
        supplierReferenceNumber:
            input.supplierReferenceNumber.trim(),
        note:
            input.note?.trim() ?? "",
        sourceSupplierInvoice:
            input.sourceSupplierInvoice
                ? {
                      ...input.sourceSupplierInvoice,
                  }
                : undefined,
        returnedBy:
            input.returnedBy
                ? {
                      ...input.returnedBy,
                  }
                : undefined,
        attachments:
            (input.attachments ?? []).map(
                (attachment) => ({
                    ...attachment,
                }),
            ),
        lines:
            input.lines.map(
                cloneLine,
            ),
        totals: {
            ...input.totals,
        },
    };

    documents = existing
        ? documents.map(
              (current) =>
                  current.id === existing.id
                      ? document
                      : current,
          )
        : [document, ...documents];

    notify();
    persist();

    return cloneDocument(document);
}

export function cancelSupplierReturnDraft(
    documentId: string,
): SupplierReturnDocument {
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
                document.status === "draft",
        );

    if (!existing) {
        throw new Error(
            "Supplier return draft not found.",
        );
    }

    const cancelled:
        SupplierReturnDocument = {
        ...existing,
        status: "cancelled",
        updatedAt:
            new Date().toISOString(),
    };

    documents = documents.map(
        (document) =>
            document.id === documentId
                ? cancelled
                : document,
    );

    notify();
    persist();

    return cloneDocument(cancelled);
}

export async function flushSupplierReturnPersistence():
Promise<void> {
    await persistenceQueue;
}
