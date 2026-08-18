import {
    isTauri,
} from "@tauri-apps/api/core";

import {
    BrowserLocalStorageAdapter,
} from "../../runtime/storage/BrowserLocalStorageAdapter";

import type {
    RuntimeStorage,
} from "../../runtime/storage/RuntimeStorage";

import type {
    DocumentOutputEvent,
    SaleDocument,
} from "./Document";

const DOCUMENTS_STORAGE_KEY =
    "lumora.documents";

const OUTPUT_EVENTS_STORAGE_KEY =
    "lumora.document.outputs";

let documents:
    SaleDocument[] = [];

let outputEvents:
    DocumentOutputEvent[] = [];

let documentStoragePromise:
    Promise<RuntimeStorage> | null =
        null;

function getDocumentStorage():
Promise<RuntimeStorage> {
    if (!documentStoragePromise) {
        documentStoragePromise =
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

    return documentStoragePromise;
}

let persistenceQueue:
    Promise<void> =
        Promise.resolve();

function parseArray<T>(
    raw: string | null,
): T[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? parsed as T[]
            : [];
    }
    catch {
        return [];
    }
}

async function readStoredValue(
    storage: RuntimeStorage,
    key: string,
): Promise<string | null> {
    let raw =
        await storage.getItem(
            key,
        );

    // Preserve data created by the older Tauri
    // localStorage implementation.
    if (
        raw === null &&
        isTauri()
    ) {
        const legacy =
            localStorage.getItem(
                key,
            );

        if (legacy !== null) {
            raw = legacy;

            await storage.setItem(
                key,
                legacy,
            );
        }
    }

    return raw;
}

export async function hydrateDocuments():
Promise<void> {
    const storage =
        await getDocumentStorage();

    const [
        rawDocuments,
        rawOutputEvents,
    ] = await Promise.all([
        readStoredValue(
            storage,
            DOCUMENTS_STORAGE_KEY,
        ),

        readStoredValue(
            storage,
            OUTPUT_EVENTS_STORAGE_KEY,
        ),
    ]);

    documents =
        parseArray<SaleDocument>(
            rawDocuments,
        );

    outputEvents =
        parseArray<DocumentOutputEvent>(
            rawOutputEvents,
        );
}

function persistDocuments() {
    const snapshot =
        JSON.stringify(
            documents,
        );

    persistenceQueue =
        persistenceQueue.then(
            async () => {
                const storage =
                    await getDocumentStorage();

                await storage.setItem(
                    DOCUMENTS_STORAGE_KEY,
                    snapshot,
                );
            },
        );
}

function persistOutputEvents() {
    const snapshot =
        JSON.stringify(
            outputEvents,
        );

    persistenceQueue =
        persistenceQueue.then(
            async () => {
                const storage =
                    await getDocumentStorage();

                await storage.setItem(
                    OUTPUT_EVENTS_STORAGE_KEY,
                    snapshot,
                );
            },
        );
}

export function flushDocumentPersistence():
Promise<void> {
    return persistenceQueue;
}

export function saveDocument(
    document: SaleDocument,
) {
    const exists =
        documents.some(
            (item) =>
                item.id ===
                document.id,
        );

    if (exists) {
        documents =
            documents.map(
                (item) =>
                    item.id === document.id
                        ? document
                        : item,
            );
    }
    else {
        documents = [
            document,
            ...documents,
        ];
    }

    persistDocuments();

    return document;
}

export function getDocuments() {
    return [
        ...documents,
    ];
}

export function getDocument(
    id: string,
) {
    return documents.find(
        (document) =>
            document.id === id,
    );
}

export function getDocumentsForTransaction(
    transactionId: string,
) {
    return documents.filter(
        (document) =>
            document.transactionId ===
            transactionId,
    );
}

export function saveDocumentOutputEvent(
    event: DocumentOutputEvent,
) {
    outputEvents = [
        event,
        ...outputEvents,
    ];

    persistOutputEvents();
}

export function getDocumentOutputEvents(
    documentId: string,
) {
    return outputEvents.filter(
        (event) =>
            event.documentId ===
            documentId,
    );
}