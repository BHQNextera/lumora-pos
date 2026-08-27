import {
    isTauri,
} from "@tauri-apps/api/core";

import {
    getActiveBusinessConfiguration,
} from "../../config/ActiveBusinessConfiguration";

import {
    getActiveRegisterShift,
} from "../shift/RegisterShiftRepository";

import {
    BrowserLocalStorageAdapter,
} from "../../runtime/storage/BrowserLocalStorageAdapter";

import type {
    RuntimeStorage,
} from "../../runtime/storage/RuntimeStorage";

import type {
    InventoryAdjustment,
    InventoryAdjustmentDocument,
    InventoryAdjustmentDocumentFilters,
    InventoryAdjustmentDocumentLine,
    InventoryAdjustmentReason,
} from "./InventoryAdjustment";

const STORAGE_KEY =
    "lumora.inventory-adjustments.v1";

const DOCUMENT_STORAGE_KEY =
    "lumora.inventory-adjustment-documents.v1";

let adjustments:
    InventoryAdjustment[] = [];

let documents:
    InventoryAdjustmentDocument[] = [];

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
                        "../../runtime/storage/SQLiteRuntimeStorageAdapter"
                    );

                    return new SQLiteRuntimeStorageAdapter();
                }
            )();
    }

    return storagePromise;
}

function cloneAdjustment(
    adjustment:
        InventoryAdjustment,
): InventoryAdjustment {
    return {
        ...adjustment,

        product: {
            ...adjustment.product,
        },

        performedBy:
            adjustment.performedBy
                ? {
                      ...adjustment.performedBy,
                  }
                : undefined,
    };
}

function cloneDocumentLine(
    line:
        InventoryAdjustmentDocumentLine,
): InventoryAdjustmentDocumentLine {
    return {
        ...line,

        product: {
            ...line.product,
        },
    };
}

function cloneDocument(
    document:
        InventoryAdjustmentDocument,
): InventoryAdjustmentDocument {
    return {
        ...document,

        filters: {
            ...document.filters,
        },

        performedBy:
            document.performedBy
                ? {
                      ...document.performedBy,
                  }
                : undefined,

        lines:
            document.lines.map(
                cloneDocumentLine,
            ),
    };
}

function parseAdjustments(
    raw: string | null,
): InventoryAdjustment[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed =
            JSON.parse(
                raw,
            );

        return Array.isArray(
            parsed,
        )
            ? parsed as InventoryAdjustment[]
            : [];
    }
    catch {
        return [];
    }
}

function parseDocuments(
    raw: string | null,
): InventoryAdjustmentDocument[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed =
            JSON.parse(
                raw,
            );

        return Array.isArray(
            parsed,
        )
            ? parsed as InventoryAdjustmentDocument[]
            : [];
    }
    catch {
        return [];
    }
}

async function readStoredValue(
    storage:
        RuntimeStorage,
    key:
        string,
): Promise<string | null> {
    let raw =
        await storage.getItem(
            key,
        );

    if (
        raw === null &&
        isTauri()
    ) {
        const legacy =
            window.localStorage.getItem(
                key,
            );

        if (legacy !== null) {
            await storage.setItem(
                key,
                legacy,
            );

            window.localStorage.removeItem(
                key,
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
    const adjustmentsSnapshot =
        JSON.stringify(
            adjustments,
        );

    const documentsSnapshot =
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
                    adjustmentsSnapshot,
                );

                await storage.setItem(
                    DOCUMENT_STORAGE_KEY,
                    documentsSnapshot,
                );
            },
        );
}

function emptyFilters():
InventoryAdjustmentDocumentFilters {
    return {
        name: "",
        sku: "",
        barcode: "",
        supplier: "",
        department: "",
        category: "",
        subcategory: "",
    };
}

function sameLegacyBatch(
    left:
        InventoryAdjustment,
    right:
        InventoryAdjustment,
): boolean {
    if (
        left.tenantId !==
            right.tenantId ||
        left.storeCode !==
            right.storeCode ||
        left.registerCode !==
            right.registerCode ||
        left.reason !==
            right.reason ||
        left.note !==
            right.note ||
        left.performedBy
            ?.employeeId !==
            right.performedBy
                ?.employeeId
    ) {
        return false;
    }

    const leftTime =
        new Date(
            left.createdAt,
        ).getTime();

    const rightTime =
        new Date(
            right.createdAt,
        ).getTime();

    if (
        Number.isNaN(
            leftTime,
        ) ||
        Number.isNaN(
            rightTime,
        )
    ) {
        return false;
    }

    return Math.abs(
        rightTime -
        leftTime,
    ) <= 2000;
}

function nextDocumentNumber(
    tenantId:
        string,
    storeCode:
        string,
): string {
    let maxNumber =
        0;

    for (
        const document
        of documents
    ) {
        if (
            document.tenantId !==
                tenantId ||
            document.storeCode !==
                storeCode ||
            !document.documentNumber
        ) {
            continue;
        }

        const match =
            /^IA-(\d{6})$/.exec(
                document.documentNumber,
            );

        if (!match) {
            continue;
        }

        maxNumber =
            Math.max(
                maxNumber,
                Number(
                    match[1],
                ),
            );
    }

    return `IA-${String(
        maxNumber + 1,
    ).padStart(
        6,
        "0",
    )}`;
}

function migrateOrphanAdjustments():
boolean {
    const orphanAdjustments =
        adjustments
            .filter(
                (adjustment) =>
                    !adjustment.documentId,
            )
            .sort(
                (
                    left,
                    right,
                ) =>
                    new Date(
                        left.createdAt,
                    ).getTime() -
                    new Date(
                        right.createdAt,
                    ).getTime(),
            );

    if (
        orphanAdjustments.length ===
        0
    ) {
        return false;
    }

    const batches:
        InventoryAdjustment[][] = [];

    for (
        const adjustment
        of orphanAdjustments
    ) {
        const lastBatch =
            batches[
                batches.length - 1
            ];

        const previous =
            lastBatch?.[
                lastBatch.length - 1
            ];

        if (
            previous &&
            sameLegacyBatch(
                previous,
                adjustment,
            )
        ) {
            lastBatch.push(
                adjustment,
            );
        }
        else {
            batches.push(
                [
                    adjustment,
                ],
            );
        }
    }

    const documentIdentityByAdjustmentId =
        new Map<
            string,
            {
                documentId:
                    string;
                documentNumber:
                    string;
            }
        >();

    for (
        const batch
        of batches
    ) {
        const first =
            batch[0];

        if (!first) {
            continue;
        }

        const documentId =
            crypto.randomUUID();

        const documentNumber =
            nextDocumentNumber(
                first.tenantId,
                first.storeCode,
            );

        const createdAt =
            batch
                .map(
                    (
                        adjustment,
                    ) =>
                        adjustment.createdAt,
                )
                .sort()[0] ??
            first.createdAt;

        const sortedCreatedAt =
            batch
                .map(
                    (
                        adjustment,
                    ) =>
                        adjustment.createdAt,
                )
                .sort();

        const postedAt =
            sortedCreatedAt[
                sortedCreatedAt.length - 1
            ] ??
            first.createdAt;

        const document:
            InventoryAdjustmentDocument = {
            id:
                documentId,

            documentNumber,

            status:
                "posted",

            tenantId:
                first.tenantId,

            storeCode:
                first.storeCode,

            registerCode:
                first.registerCode,

            createdAt,
            updatedAt:
                postedAt,
            postedAt,

            filters:
                emptyFilters(),

            reason:
                first.reason,

            note:
                first.note,

            performedBy:
                first.performedBy
                    ? {
                          ...first.performedBy,
                      }
                    : undefined,

            lines:
                batch.map(
                    (
                        adjustment,
                    ) => ({
                        key:
                            adjustment.product
                                .variantId
                                ? `${adjustment.product.id}::${adjustment.product.variantId}`
                                : adjustment.product.id,

                        product: {
                            ...adjustment.product,
                        },

                        previousQuantity:
                            adjustment.previousQuantity,

                        resultingQuantity:
                            adjustment.resultingQuantity,

                        enteredQuantity:
                            String(
                                adjustment.resultingQuantity,
                            ),

                        difference:
                            adjustment.difference,
                    }),
                ),
        };

        documents = [
            document,
            ...documents,
        ];

        for (
            const adjustment
            of batch
        ) {
            documentIdentityByAdjustmentId.set(
                adjustment.id,
                {
                    documentId,
                    documentNumber,
                },
            );
        }
    }

    adjustments =
        adjustments.map(
            (
                adjustment,
            ) => {
                const identity =
                    documentIdentityByAdjustmentId.get(
                        adjustment.id,
                    );

                return identity
                    ? {
                          ...adjustment,
                          ...identity,
                      }
                    : adjustment;
            },
        );

    return true;
}

export async function hydrateInventoryAdjustments():
Promise<void> {
    const storage =
        await getStorage();

    adjustments =
        parseAdjustments(
            await readStoredValue(
                storage,
                STORAGE_KEY,
            ),
        );

    documents =
        parseDocuments(
            await readStoredValue(
                storage,
                DOCUMENT_STORAGE_KEY,
            ),
        );

    if (
        migrateOrphanAdjustments()
    ) {
        await storage.setItem(
            STORAGE_KEY,
            JSON.stringify(
                adjustments,
            ),
        );

        await storage.setItem(
            DOCUMENT_STORAGE_KEY,
            JSON.stringify(
                documents,
            ),
        );
    }

    notify();
}

export function subscribeInventoryAdjustments(
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

export type CreateInventoryAdjustmentInput = {
    documentId?: string;
    documentNumber?: string;

    product: {
        id: string;
        name: string;
        sku: string;
        variantId?: string;
        variantLabel?: string;
    };

    previousQuantity: number;
    resultingQuantity: number;

    reason:
        InventoryAdjustmentReason;

    note?: string;

    performedBy?: {
        employeeId: string;
        employeeName: string;
    };
};

export function createInventoryAdjustment(
    input:
        CreateInventoryAdjustmentInput,
): InventoryAdjustment {
    const configuration =
        getActiveBusinessConfiguration();

    const shift =
        getActiveRegisterShift();

    const performedBy =
        input.performedBy ??
        shift?.openedBy;

    const adjustment:
        InventoryAdjustment = {
        id:
            crypto.randomUUID(),

        tenantId:
            configuration.tenantId,

        storeCode:
            configuration.storeCode,

        registerCode:
            configuration.registerCode,

        createdAt:
            new Date()
                .toISOString(),

        documentId:
            input.documentId,

        documentNumber:
            input.documentNumber,

        product: {
            ...input.product,
        },

        previousQuantity:
            input.previousQuantity,

        resultingQuantity:
            input.resultingQuantity,

        difference:
            input.resultingQuantity -
            input.previousQuantity,

        reason:
            input.reason,

        note:
            input.note
                ?.trim() ??
            "",

        performedBy:
            performedBy
                ? {
                      ...performedBy,
                  }
                : undefined,
    };

    adjustments = [
        adjustment,
        ...adjustments,
    ];

    notify();
    persist();

    return cloneAdjustment(
        adjustment,
    );
}

export type SaveInventoryAdjustmentDraftDocumentInput = {
    documentId?: string;

    filters:
        InventoryAdjustmentDocumentFilters;

    reason:
        InventoryAdjustmentReason;

    note?: string;

    performedBy?: {
        employeeId: string;
        employeeName: string;
    };

    lines:
        InventoryAdjustmentDocumentLine[];
};

export function saveInventoryAdjustmentDraftDocument(
    input:
        SaveInventoryAdjustmentDraftDocumentInput,
): InventoryAdjustmentDocument {
    const configuration =
        getActiveBusinessConfiguration();

    const performedBy =
        input.performedBy;

    const now =
        new Date()
            .toISOString();

    const existing =
        input.documentId
            ? documents.find(
                  (
                      document,
                  ) =>
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
        InventoryAdjustmentDocument = {
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

        filters: {
            ...input.filters,
        },

        reason:
            input.reason,

        note:
            input.note
                ?.trim() ??
            "",

        performedBy:
            performedBy
                ? {
                      ...performedBy,
                  }
                : undefined,

        lines:
            input.lines.map(
                cloneDocumentLine,
            ),
    };

    documents =
        existing
            ? documents.map(
                  (
                      current,
                  ) =>
                      current.id ===
                          existing.id
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

export type PostInventoryAdjustmentDocumentInput = {
    documentId?: string;

    filters:
        InventoryAdjustmentDocumentFilters;

    reason:
        InventoryAdjustmentReason;

    note?: string;

    performedBy?: {
        employeeId: string;
        employeeName: string;
    };

    lines:
        InventoryAdjustmentDocumentLine[];
};

export function postInventoryAdjustmentDocument(
    input:
        PostInventoryAdjustmentDocumentInput,
): InventoryAdjustmentDocument {
    const configuration =
        getActiveBusinessConfiguration();

    const shift =
        getActiveRegisterShift();

    const performedBy =
        input.performedBy ??
        shift?.openedBy;

    const now =
        new Date()
            .toISOString();

    const existingDraft =
        input.documentId
            ? documents.find(
                  (
                      document,
                  ) =>
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

    const documentNumber =
        nextDocumentNumber(
            configuration.tenantId,
            configuration.storeCode,
        );

    const document:
        InventoryAdjustmentDocument = {
        id:
            existingDraft?.id ??
            crypto.randomUUID(),

        documentNumber,

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

        filters: {
            ...input.filters,
        },

        reason:
            input.reason,

        note:
            input.note
                ?.trim() ??
            "",

        performedBy:
            performedBy
                ? {
                      ...performedBy,
                  }
                : undefined,

        lines:
            input.lines.map(
                cloneDocumentLine,
            ),
    };

    documents =
        existingDraft
            ? documents.map(
                  (
                      current,
                  ) =>
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

export function getInventoryAdjustments():
InventoryAdjustment[] {
    const configuration =
        getActiveBusinessConfiguration();

    return adjustments
        .filter(
            (adjustment) =>
                adjustment.tenantId ===
                    configuration.tenantId &&
                adjustment.storeCode ===
                    configuration.storeCode,
        )
        .map(
            cloneAdjustment,
        );
}

export function getInventoryAdjustmentDocuments():
InventoryAdjustmentDocument[] {
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
            (
                left,
                right,
            ) =>
                new Date(
                    right.updatedAt,
                ).getTime() -
                new Date(
                    left.updatedAt,
                ).getTime(),
        )
        .map(
            cloneDocument,
        );
}

export function getInventoryAdjustmentDocument(
    documentId:
        string,
): InventoryAdjustmentDocument | undefined {
    const configuration =
        getActiveBusinessConfiguration();

    const document =
        documents.find(
            (
                current,
            ) =>
                current.id ===
                    documentId &&
                current.tenantId ===
                    configuration.tenantId &&
                current.storeCode ===
                    configuration.storeCode,
        );

    return document
        ? cloneDocument(
              document,
          )
        : undefined;
}

export function flushInventoryAdjustmentPersistence():
Promise<void> {
    return persistenceQueue;
}
