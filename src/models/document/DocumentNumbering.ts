import type {
    DocumentType,
} from "./Document";
import {
    currentRegister,
    documentPolicy,
} from "./DocumentPolicy";

const SEQUENCE_PREFIX =
    "lumora.document.sequence";

const DEFAULT_START_NUMBER =
    10000;

function getSequenceKey(
    documentType: DocumentType,
) {
    return [
        SEQUENCE_PREFIX,
        currentRegister.storeCode,
        currentRegister.registerCode,
        documentType,
    ].join(".");
}

function readCurrentSequence(
    documentType: DocumentType,
) {
    const key =
        getSequenceKey(documentType);

    const stored =
        localStorage.getItem(key);

    if (!stored) {
        return DEFAULT_START_NUMBER;
    }

    const value =
        Number(stored);

    if (
        !Number.isFinite(value) ||
        value < DEFAULT_START_NUMBER
    ) {
        return DEFAULT_START_NUMBER;
    }

    return Math.floor(value);
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

    localStorage.setItem(
        key,
        String(
            runningNumber + 1,
        ),
    );

    const runningPart =
        runningNumber
            .toString()
            .padStart(5, "0");

    const documentNumber =
        `${currentRegister.storeCode}` +
        `${currentRegister.registerCode}` +
        `${definition.code}` +
        `${runningPart}`;

    return {
        documentNumber,

        runningNumber,

        storeCode:
            currentRegister.storeCode,

        registerCode:
            currentRegister.registerCode,

        documentTypeCode:
            definition.code,
    };
}

export function peekNextDocumentNumber(
    documentType: DocumentType,
) {
    const definition =
        documentPolicy.documentTypes[
        documentType
        ];

    const runningNumber =
        readCurrentSequence(
            documentType,
        );

    return (
        `${currentRegister.storeCode}` +
        `${currentRegister.registerCode}` +
        `${definition.code}` +
        runningNumber
            .toString()
            .padStart(5, "0")
    );
}