import {
    getActiveBusinessConfiguration,
} from "../../config/ActiveBusinessConfiguration";
import type {
    DocumentType,
} from "./Document";
import {
    documentPolicy,
} from "./DocumentPolicy";

const SEQUENCE_PREFIX = "lumora.document.sequence";
const DEFAULT_START_NUMBER = 10000;

function getCurrentRegister() {
    const configuration = getActiveBusinessConfiguration();

    return {
        storeCode: configuration.storeCode,
        registerCode: configuration.registerCode,
    };
}

function getSequenceKey(documentType: DocumentType) {
    const register = getCurrentRegister();

    return [
        SEQUENCE_PREFIX,
        register.storeCode,
        register.registerCode,
        documentType,
    ].join(".");
}

function readCurrentSequence(documentType: DocumentType) {
    const key = getSequenceKey(documentType);
    const stored = localStorage.getItem(key);

    if (!stored) {
        return DEFAULT_START_NUMBER;
    }

    const value = Number(stored);

    if (!Number.isFinite(value) || value < DEFAULT_START_NUMBER) {
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
    const register = getCurrentRegister();
    const definition = documentPolicy.documentTypes[documentType];
    const runningNumber = readCurrentSequence(documentType);
    const key = getSequenceKey(documentType);

    localStorage.setItem(
        key,
        String(runningNumber + 1),
    );

    const runningPart = runningNumber
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
        storeCode: register.storeCode,
        registerCode: register.registerCode,
        documentTypeCode: definition.code,
    };
}

export function peekNextDocumentNumber(
    documentType: DocumentType,
) {
    const register = getCurrentRegister();
    const definition = documentPolicy.documentTypes[documentType];
    const runningNumber = readCurrentSequence(documentType);

    return (
        `${register.storeCode}` +
        `${register.registerCode}` +
        `${definition.code}` +
        runningNumber.toString().padStart(5, "0")
    );
}