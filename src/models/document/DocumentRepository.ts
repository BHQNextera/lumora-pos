import type {
    DocumentOutputEvent,
    SaleDocument,
} from "./Document";

const DOCUMENTS_STORAGE_KEY =
    "lumora.documents";

const OUTPUT_EVENTS_STORAGE_KEY =
    "lumora.document.outputs";

function loadArray<T>(
    key: string,
): T[] {
    try {
        const raw =
            localStorage.getItem(key);

        if (!raw) {
            return [];
        }

        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? (parsed as T[])
            : [];
    } catch {
        return [];
    }
}

let documents =
    loadArray<SaleDocument>(
        DOCUMENTS_STORAGE_KEY,
    );

let outputEvents =
    loadArray<DocumentOutputEvent>(
        OUTPUT_EVENTS_STORAGE_KEY,
    );

function persistDocuments() {
    localStorage.setItem(
        DOCUMENTS_STORAGE_KEY,
        JSON.stringify(documents),
    );
}

function persistOutputEvents() {
    localStorage.setItem(
        OUTPUT_EVENTS_STORAGE_KEY,
        JSON.stringify(
            outputEvents,
        ),
    );
}

export function saveDocument(
    document: SaleDocument,
) {
    const exists =
        documents.some(
            (item) =>
                item.id === document.id,
        );

    if (exists) {
        documents =
            documents.map(
                (item) =>
                    item.id === document.id
                        ? document
                        : item,
            );
    } else {
        documents = [
            document,
            ...documents,
        ];
    }

    persistDocuments();

    return document;
}

export function getDocuments() {
    return [...documents];
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