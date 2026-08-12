import type {
    DocumentCopyType,
    DocumentOutputEvent,
} from "./Document";
import {
    getDocument,
    getDocumentOutputEvents,
    saveDocument,
    saveDocumentOutputEvent,
} from "./DocumentRepository";

export type ProducedDocumentChannel =
    | "print"
    | "whatsapp"
    | "email";

function getProducedEvents(documentId: string) {
    return getDocumentOutputEvents(documentId).filter(
        (event) => event.channel !== "screen",
    );
}

export function getNextDocumentCopyType(
    documentId: string,
): DocumentCopyType {
    return getProducedEvents(documentId).length === 0
        ? "original"
        : "copy";
}

export function recordDocumentScreenView(
    documentId: string,
    employeeId?: string,
): DocumentOutputEvent | null {
    const document = getDocument(documentId);
    if (!document) {
        return null;
    }

    const event: DocumentOutputEvent = {
        id: crypto.randomUUID(),
        documentId: document.id,
        copyType: getNextDocumentCopyType(document.id),
        channel: "screen",
        employeeId,
        registerCode: document.registerCode,
        createdAt: new Date().toISOString(),
    };

    saveDocumentOutputEvent(event);
    return event;
}

export function registerDocumentOutput(
    documentId: string,
    channel: ProducedDocumentChannel,
    employeeId?: string,
): DocumentOutputEvent {
    const document = getDocument(documentId);
    if (!document) {
        throw new Error(`Document ${documentId} not found`);
    }

    const copyType = getNextDocumentCopyType(document.id);

    const event: DocumentOutputEvent = {
        id: crypto.randomUUID(),
        documentId: document.id,
        copyType,
        channel,
        employeeId,
        registerCode: document.registerCode,
        createdAt: new Date().toISOString(),
    };

    saveDocumentOutputEvent(event);

    saveDocument({
        ...document,
        outputCount: document.outputCount + 1,
        status:
            copyType === "original"
                ? "issued_original"
                : "reissued_copy",
    });

    return event;
}
