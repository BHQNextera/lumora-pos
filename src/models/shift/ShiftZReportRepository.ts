import {
    getActiveBusinessConfiguration,
} from "../../config/ActiveBusinessConfiguration";

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

function loadReports():
ShiftZReport[] {
    try {
        const raw =
            window.localStorage.getItem(
                STORAGE_KEY,
            );

        if (!raw) {
            return [];
        }

        const parsed =
            JSON.parse(
                raw,
            );

        return Array.isArray(
            parsed,
        )
            ? parsed
            : [];
    }
    catch {
        return [];
    }
}

function persist(
    reports: ShiftZReport[],
) {
    window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
            reports,
        ),
    );
}

function getNextSequence() {
    const current =
        Number(
            window.localStorage.getItem(
                SEQUENCE_KEY,
            ) ?? "1",
        );

    const safeCurrent =
        Number.isFinite(
            current,
        ) &&
        current > 0
            ? Math.floor(
                current,
            )
            : 1;

    window.localStorage.setItem(
        SEQUENCE_KEY,
        String(
            safeCurrent + 1,
        ),
    );

    return safeCurrent;
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
        ...loadReports(),
    ];
}

export function getShiftZReportById(
    id: string,
) {
    return (
        loadReports().find(
            (report) =>
                report.id === id,
        ) ?? null
    );
}

export function getShiftZReportByShiftId(
    shiftId: string,
) {
    return (
        loadReports().find(
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

    /*
     * Reuse the proven shift aggregation
     * rules currently used by X.
     *
     * The resulting values are copied into
     * the Z snapshot and will never be
     * recalculated when viewing history.
     */
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

    persist([
        report,
        ...loadReports(),
    ]);

    return report;
}