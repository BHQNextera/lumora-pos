import {
    isTauri,
} from "@tauri-apps/api/core";

import {
    BrowserLocalStorageAdapter,
} from "../../runtime/storage/BrowserLocalStorageAdapter";

import type {
    RuntimeStorage,
} from "../../runtime/storage/RuntimeStorage";

import {
    getActiveBusinessConfiguration,
} from "../../config/ActiveBusinessConfiguration";

import type {
    DocumentType,
} from "./Document";

import {
    documentPolicy,
} from "./DocumentPolicy";

const SEQUENCE_PREFIX =
    "lumora.document.sequence";

const DEFAULT_START_NUMBER =
    10000;

const sequences =
    new Map<string, number>();

let documentNumberStoragePromise:
    Promise<RuntimeStorage> | null =
        null;

function getDocumentNumberStorage():
Promise<RuntimeStorage> {
    if (!documentNumberStoragePromise) {
        documentNumberStoragePromise =
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

    return documentNumberStoragePromise;
}

let persistenceQueue:
    Promise<void> =
        Promise.resolve();

function getCurrentRegister() {
    const configuration =
        getActiveBusinessConfiguration();

    return {
        storeCode:
            configuration.storeCode,

        registerCode:
            configuration.registerCode,
    };
}

function getSequenceKey(
    documentType: DocumentType,
) {
    const register =
        getCurrentRegister();

    return [
        SEQUENCE_PREFIX,
        register.storeCode,
        register.registerCode,
        documentType,
    ].join(".");
}

function parseSequence(
    raw: string | null,
): number {
    if (!raw) {
        return DEFAULT_START_NUMBER;
    }

    const value =
        Number(raw);

    if (
        !Number.isFinite(value) ||
        value < DEFAULT_START_NUMBER
    ) {
        return DEFAULT_START_NUMBER;
    }

    return Math.floor(value);
}

async function readStoredSequence(
    storage: RuntimeStorage,
    key: string,
): Promise<string | null> {
    let raw =
        await storage.getItem(
            key,
        );

    // One-time compatibility path from the old
    // Tauri WebView localStorage implementation.
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

export async function hydrateDocumentNumbering():
Promise<void> {
    const storage =
        await getDocumentNumberStorage();

    sequences.clear();

    const documentTypes =
        Object.keys(
            documentPolicy.documentTypes,
        ) as DocumentType[];

    await Promise.all(
        documentTypes.map(
            async (documentType) => {
                const key =
                    getSequenceKey(
                        documentType,
                    );

                const raw =
                    await readStoredSequence(
                        storage,
                        key,
                    );

                sequences.set(
                    key,
                    parseSequence(
                        raw,
                    ),
                );
            },
        ),
    );
}

function readCurrentSequence(
    documentType: DocumentType,
) {
    const key =
        getSequenceKey(
            documentType,
        );

    return (
        sequences.get(key) ??
        DEFAULT_START_NUMBER
    );
}

function persistSequence(
    key: string,
    value: number,
) {
    persistenceQueue =
        persistenceQueue.then(
            async () => {
                const storage =
                    await getDocumentNumberStorage();

                await storage.setItem(
                    key,
                    String(value),
                );
            },
        );
}

export type AllocatedDocumentNumber = {
    documentNumber: string;
    runningNumber: number;
    storeCode: string;
    registerCode: string;
    documentTypeCode: string;
};

export function allocateDocumentNumber(
    documentType: DocumentType,
): AllocatedDocumentNumber {
    const register =
        getCurrentRegister();

    const definition =
        documentPolicy.documentTypes[
            documentType
        ];

    const runningNumber =
        readCurrentSequence(
            documentType,
        );

    const key =
        getSequenceKey(
            documentType,
        );

    const nextNumber =
        runningNumber + 1;

    sequences.set(
        key,
        nextNumber,
    );

    persistSequence(
        key,
        nextNumber,
    );

    const runningPart =
        runningNumber
            .toString()
            .padStart(5, "0");

    const documentNumber =
        `${register.storeCode}` +
        `${register.registerCode}` +
        `${definition.code}` +
        `${runningPart}`;

    return {
        documentNumber,
        runningNumber,
        storeCode:
            register.storeCode,
        registerCode:
            register.registerCode,
        documentTypeCode:
            definition.code,
    };
}

export function peekNextDocumentNumber(
    documentType: DocumentType,
) {
    const register =
        getCurrentRegister();

    const definition =
        documentPolicy.documentTypes[
            documentType
        ];

    const runningNumber =
        readCurrentSequence(
            documentType,
        );

    return (
        `${register.storeCode}` +
        `${register.registerCode}` +
        `${definition.code}` +
        runningNumber
            .toString()
            .padStart(5, "0")
    );
}

export function flushDocumentNumberPersistence():
Promise<void> {
    return persistenceQueue;
}