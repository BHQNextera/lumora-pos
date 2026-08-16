$ErrorActionPreference = "Stop"
Set-Location "C:\PROJECT\lumora-pos"
$utf8 = New-Object System.Text.UTF8Encoding($false)

$path = ".\src\models\document\DocumentNumbering.ts"
$content = @'
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
'@
[IO.File]::WriteAllText($path, $content, $utf8)
Write-Host "REPLACED $path"

$path = ".\src\config\RegisterPrinterConfig.ts"
$content = @'
import {
    getActiveBusinessConfiguration,
    getActiveRegisterProfile,
} from "./ActiveBusinessConfiguration";

export type PrinterPaperFormat =
    | "thermal80"
    | "thermal57";

export type RegisterPrinterConfig = {
    storeCode: string;
    registerCode: string;
    paperFormat: PrinterPaperFormat;
};

/**
 * Compatibility adapter.
 *
 * Register/printer configuration no longer owns
 * hard-coded register settings.
 *
 * Identity comes from ActiveBusinessConfiguration.
 * Hardware configuration comes from the active
 * Business Operating Profile register.
 */
export function getRegisterPrinterConfig(
    storeCode?: string,
    registerCode?: string,
): RegisterPrinterConfig {
    const activeConfiguration =
        getActiveBusinessConfiguration();

    const resolvedStoreCode =
        storeCode ?? activeConfiguration.storeCode;

    const resolvedRegisterCode =
        registerCode ?? activeConfiguration.registerCode;

    const activeRegister =
        resolvedStoreCode === activeConfiguration.storeCode &&
        resolvedRegisterCode === activeConfiguration.registerCode
            ? getActiveRegisterProfile()
            : undefined;

    return {
        storeCode: resolvedStoreCode,
        registerCode: resolvedRegisterCode,
        paperFormat:
            activeRegister?.printer.paperFormat ??
            "thermal80",
    };
}
'@
[IO.File]::WriteAllText($path, $content, $utf8)
Write-Host "REPLACED $path"

Write-Host "`n=== REGISTER SOURCE CHECK ==="
$matches = Get-ChildItem `
    .\src\models\document\DocumentNumbering.ts, `
    .\src\config\RegisterPrinterConfig.ts |
    Select-String -Pattern 'storeCode: "01"','registerCode: "02"'

if ($matches) {
    $matches | ForEach-Object {
        "$($_.Path):$($_.LineNumber): $($_.Line.Trim())"
    }
    throw "REGISTER HARD-CODE STILL EXISTS"
}

Write-Host "NO REGISTER HARD-CODES IN NUMBERING/PRINTER CONFIG"

Write-Host "`n=== TYPECHECK ==="
npx tsc -b --pretty false
if ($LASTEXITCODE -ne 0) { throw "TYPECHECK FAILED" }

Write-Host "`n=== BUILD ==="
npm run build
if ($LASTEXITCODE -ne 0) { throw "BUILD FAILED" }

Write-Host "`nACTIVE REGISTER SINGLE SOURCE V1 CONNECTED"
