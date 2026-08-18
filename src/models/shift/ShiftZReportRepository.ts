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
    RegisterShift,
} from "./RegisterShift";

import {
    generateShiftXReport,
} from "./ShiftReportService";

import type {
    ShiftZReport,
} from "./ShiftZReport";

const STORAGE_KEY =
    "lumora.shift-z-reports";

const SEQUENCE_KEY =
    "lumora.shift-z-report.sequence";

let reports:
    ShiftZReport[] = [];

let nextSequence =
    1;

let shiftZStoragePromise:
    Promise<RuntimeStorage> | null =
        null;

function getShiftZStorage():
Promise<RuntimeStorage> {
    if (!shiftZStoragePromise) {
        shiftZStoragePromise =
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

    return shiftZStoragePromise;
}

let persistenceQueue:
    Promise<void> =
        Promise.resolve();

function roundMoney(
    value: number,
) {
    return (
        Math.round(
            (value + Number.EPSILON) *
                100,
        ) / 100
    );
}

function parseReports(
    raw: string | null,
): ShiftZReport[] {
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
            ? parsed as ShiftZReport[]
            : [];
    }
    catch {
        return [];
    }
}

function parseSequence(
    raw: string | null,
) {
    const value =
        Number(
            raw ?? "1",
        );

    return (
        Number.isFinite(
            value,
        ) &&
        value > 0
    )
        ? Math.floor(
              value,
          )
        : 1;
}

export async function hydrateShiftZReports():
Promise<void> {
    const storage =
        await getShiftZStorage();

    const [
        rawReports,
        rawSequence,
    ] =
        await Promise.all([
            storage.getItem(
                STORAGE_KEY,
            ),
            storage.getItem(
                SEQUENCE_KEY,
            ),
        ]);

    reports =
        parseReports(
            rawReports,
        );

    nextSequence =
        parseSequence(
            rawSequence,
        );
}

function enqueuePersistence(
    operation: () => Promise<void>,
): void {
    persistenceQueue =
        persistenceQueue
            .catch(() => {
                /*
                 * Keep later writes usable after
                 * a failed persistence operation.
                 */
            })
            .then(operation);

    void persistenceQueue.catch(
        (error) => {
            console.error(
                "LUMORA_SHIFT_Z_PERSISTENCE_FAILED",
                error,
            );
        },
    );
}

function persistState(): void {
    const serializedReports =
        JSON.stringify(
            reports,
        );

    const serializedSequence =
        String(
            nextSequence,
        );

    enqueuePersistence(
        async () => {
            const storage =
                await getShiftZStorage();

            await storage.setItem(
                STORAGE_KEY,
                serializedReports,
            );

            await storage.setItem(
                SEQUENCE_KEY,
                serializedSequence,
            );
        },
    );
}

function getNextSequence() {
    const current =
        nextSequence;

    nextSequence +=
        1;

    return current;
}

function createZNumber() {
    const configuration =
        getActiveBusinessConfiguration();

    const sequence =
        String(
            getNextSequence(),
        ).padStart(
            6,
            "0",
        );

    return [
        "Z",
        configuration.storeCode,
        configuration.registerCode,
        sequence,
    ].join("-");
}

export function getShiftZReports() {
    return [
        ...reports,
    ];
}

export function getShiftZReportById(
    id: string,
) {
    return (
        reports.find(
            (report) =>
                report.id === id,
        ) ?? null
    );
}

export function getShiftZReportByShiftId(
    shiftId: string,
) {
    return (
        reports.find(
            (report) =>
                report.shiftId ===
                    shiftId,
        ) ?? null
    );
}

export function createShiftZReport(
    shift: RegisterShift,
): ShiftZReport {
    /*
     * Z is immutable.
     * A shift may produce one and only one Z.
     */
    const existing =
        getShiftZReportByShiftId(
            shift.id,
        );

    if (existing) {
        return existing;
    }

    if (
        shift.status !== "closed" ||
        !shift.closedAt ||
        !shift.closedBy ||
        shift.closingCash ===
            undefined
    ) {
        throw new Error(
            "SHIFT_MUST_BE_CLOSED_BEFORE_Z",
        );
    }

    const summary =
        generateShiftXReport(
            shift,
        );

    const report:
        ShiftZReport = {
        id:
            crypto.randomUUID(),

        number:
            createZNumber(),

        shiftId:
            shift.id,

        tenantId:
            shift.tenantId,

        storeCode:
            shift.storeCode,

        registerCode:
            shift.registerCode,

        openedAt:
            shift.openedAt,

        closedAt:
            shift.closedAt,

        generatedAt:
            new Date()
                .toISOString(),

        openedBy: {
            ...shift.openedBy,
        },

        closedBy: {
            ...shift.closedBy,
        },

        openingCash:
            shift.openingCash,

        openingCashDeclaration:
            shift.openingCashDeclaration,

        closingCash:
            shift.closingCash,

        closingCashDeclaration:
            shift.closingCashDeclaration,

        transactionCount:
            summary.transactionCount,

        saleCount:
            summary.saleCount,

        returnCount:
            summary.returnCount,

        exchangeCount:
            summary.exchangeCount,

        grossSales:
            summary.grossSales,

        returnsTotal:
            summary.returnsTotal,

        netSales:
            summary.netSales,

        discountTotal:
            summary.discountTotal,

        paymentTotals:
            summary.paymentTotals.map(
                (payment) => ({
                    ...payment,
                }),
            ),

        cashPayments:
            summary.cashPayments,

        cashIn:
            summary.cashIn,

        cashOut:
            summary.cashOut,

        netCashMovement:
            summary.netCashMovement,

        expectedCash:
            summary.expectedCash,

        cashVariance:
            roundMoney(
                shift.closingCash -
                    summary.expectedCash,
            ),
    };

    reports = [
        report,
        ...reports,
    ];

    persistState();

    return report;
}

export async function flushShiftZReportPersistence():
Promise<void> {
    await persistenceQueue;
}
