// LUMORA REPORTS OUTPUT V1
import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    invoke,
    isTauri,
} from "@tauri-apps/api/core";

import {
    builtInReports,
    generateAttendanceEmployeeDetail,
    generateReport,
} from "../../models/report/ReportEngine";
import type {
    ReportId,
    ReportResult,
} from "../../models/report/Report";
import type {
    ReportFilters,
} from "../../models/report/ReportFilters";
import {
    createTodayReportFilters,
} from "../../models/report/ReportFilters";
import {
    buildReportPdf,
    reportPdfToBase64,
} from "../../models/report/ReportPdfExport";
import {
    getReportEmailDeliveryAdapter,
} from "../../models/report/ReportEmailDelivery";
import {
    getActiveSellers,
} from "../../models/employee/EmployeeSeed";
import {
    defaultPaymentMethods,
} from "../../models/PaymentMethod";
import {
    getActiveBusinessConfiguration,
} from "../../config/ActiveBusinessConfiguration";
import {
    addManualAttendanceEntry,
    correctAttendanceEntry,
    getAttendance,
    subscribeAttendance,
} from "../../models/attendance/AttendanceRepository";
import {
    getAttendanceCorrectionAvailability,
} from "../../models/attendance/AttendanceManagerApprovalService";

import ShiftZHistory from "../../components/shift/ShiftZHistory";

import "./reports-page.css";
import "./reports-output.css";

type ReportMode =
    | "standard"
    | "z-history";

type DatePreset =
    | "today"
    | "week"
    | "month";

function toLocalDateInput(
    date: Date,
) {
    const year = date.getFullYear();
    const month = String(
        date.getMonth() + 1,
    ).padStart(2, "0");
    const day = String(
        date.getDate(),
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function createDatePresetFilters(
    preset: DatePreset,
): ReportFilters {
    const now = new Date();
    const toDate =
        toLocalDateInput(now);

    if (preset === "today") {
        return {
            ...createTodayReportFilters(),
            fromDate: toDate,
            toDate,
        };
    }

    if (preset === "week") {
        const from = new Date(now);
        from.setDate(
            from.getDate() - 6,
        );

        return {
            ...createTodayReportFilters(),
            fromDate:
                toLocalDateInput(from),
            toDate,
        };
    }

    const from = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
    );

    return {
        ...createTodayReportFilters(),
        fromDate:
            toLocalDateInput(from),
        toDate,
    };
}

function escapeCsvCell(
    value: unknown,
) {
    const normalized = String(
        value ?? "",
    ).replace(/"/g, '""');

    return `"${normalized}"`;
}

function escapeHtml(
    value: unknown,
) {
    return String(
        value ?? "",
    )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function safeFilePart(
    value: string,
) {
    return value.replace(
        /[^a-zA-Z0-9_-]+/g,
        "-",
    );
}

async function saveExportFile(
    contents: string,
    filename: string,
    mimeType: string,
): Promise<string> {
    if (isTauri()) {
        return invoke<string>(
            "export_report_file",
            {
                filename,
                contents,
            },
        );
    }

    const blob =
        new Blob(
            [contents],
            {
                type: mimeType,
            },
        );

    const url =
        URL.createObjectURL(
            blob,
        );

    const anchor =
        document.createElement(
            "a",
        );

    anchor.href = url;
    anchor.download = filename;
    anchor.style.display =
        "none";

    document.body.appendChild(
        anchor,
    );

    anchor.click();
    anchor.remove();

    window.setTimeout(
        () => {
            URL.revokeObjectURL(
                url,
            );
        },
        1500,
    );

    return filename;
}

function buildExportFilename(
    report: ReportResult,
    filters: ReportFilters,
    extension: string,
) {
    const exportScope =
        report.id ===
            "inventory-valuation"
            ? filters.toDate
            : [
                filters.fromDate,
                filters.toDate,
            ].join("-");

    return [
        "lumora",
        safeFilePart(
            report.id,
        ),
        exportScope,
    ].join("-") +
        `.${extension}`;
}

async function downloadCsv(
    report: ReportResult,
    filters: ReportFilters,
) {
    const rows = [
        report.columns
            .map(
                (column) =>
                    escapeCsvCell(
                        column.label,
                    ),
            )
            .join(","),
        ...report.rows.map(
            (row) =>
                report.columns
                    .map(
                        (column) =>
                            escapeCsvCell(
                                row.values[
                                    column.id
                                ] ?? "",
                            ),
                    )
                    .join(","),
        ),
    ];

    const contents =
        "\uFEFF" +
        rows.join(
            "\r\n",
        );

    return saveExportFile(
        contents,
        buildExportFilename(
            report,
            filters,
            "csv",
        ),
        "text/csv;charset=utf-8",
    );
}

async function downloadExcel(
    report: ReportResult,
    filters: ReportFilters,
) {
    const header =
        report.columns
            .map(
                (column) =>
                    `<th>${escapeHtml(
                        column.label,
                    )}</th>`,
            )
            .join("");

    const body =
        report.rows
            .map(
                (row) =>
                    `<tr>${report.columns
                        .map(
                            (column) =>
                                `<td>${escapeHtml(
                                    row.values[
                                        column.id
                                    ] ?? "",
                                )}</td>`,
                        )
                        .join("")}</tr>`,
            )
            .join("");

    const html = `<!doctype html>
<html dir="rtl">
<head>
<meta charset="utf-8" />
<style>
body { font-family: Arial, sans-serif; direction: rtl; }
table { border-collapse: collapse; }
th, td { border: 1px solid #bbb; padding: 6px 9px; white-space: nowrap; }
th { font-weight: 700; }
</style>
</head>
<body>
<h2>${escapeHtml(
        report.title,
    )}</h2>
<table>
<thead><tr>${header}</tr></thead>
<tbody>${body}</tbody>
</table>
</body>
</html>`;

    return saveExportFile(
        "\uFEFF" + html,
        buildExportFilename(
            report,
            filters,
            "xls",
        ),
        "application/vnd.ms-excel;charset=utf-8",
    );
}

function toDateTimeLocalValue(
    value?: string,
) {
    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (
        !Number.isFinite(
            date.getTime(),
        )
    ) {
        return "";
    }

    const local =
        new Date(
            date.getTime() -
            date.getTimezoneOffset() *
                60000,
        );

    return local
        .toISOString()
        .slice(0, 16);
}

function attendanceCorrectionErrorMessage(
    error: unknown,
) {
    const message =
        error instanceof Error
            ? error.message
            : String(error);

    if (
        message.includes(
            "SELF_CORRECTION",
        )
    ) {
        return "עובד לא יכול לתקן את הנוכחות של עצמו.";
    }

    if (
        message.includes(
            "MANAGER_ROLE_REQUIRED",
        ) ||
        message.includes(
            "NO_ACTIVE_SHIFT",
        )
    ) {
        return "נדרש מנהל מורשה לצורך תיקון הנוכחות.";
    }

    if (
        message.includes(
            "CLOCK_OUT_BEFORE_CLOCK_IN",
        )
    ) {
        return "שעת היציאה חייבת להיות מאוחרת משעת הכניסה.";
    }

    if (
        message.includes(
            "REASON_REQUIRED",
        )
    ) {
        return "חובה להזין סיבת תיקון.";
    }

    return "לא ניתן לשמור את התיקון. בדוק את הנתונים ונסה שוב.";
}

function getAttendancePermissionMessage(
    availability:
        ReturnType<
            typeof getAttendanceCorrectionAvailability
        > | null,
) {
    if (
        !availability ||
        availability.canCorrect
    ) {
        return "";
    }

    return availability.reason ===
        "self_correction_not_allowed"
        ? "עובד לא יכול לתקן או להוסיף לעצמו נוכחות. נדרש מנהל אחר."
        : "נדרש מנהל מורשה.";
}

type ReportsPageProps = {
    onOpenXReport: () => void;
};

function ReportsPage({
    onOpenXReport,
}: ReportsPageProps) {
    const [
        selectedReportId,
        setSelectedReportId,
    ] =
        useState<ReportId>(
            "sales-summary",
        );

    const [
        reportMode,
        setReportMode,
    ] =
        useState<ReportMode>(
            "standard",
        );

    const [
        filters,
        setFilters,
    ] =
        useState<ReportFilters>(
            createTodayReportFilters,
        );

    const [
        exportStatus,
        setExportStatus,
    ] =
        useState<string | null>(
            null,
        );

    const [
        showEmailDialog,
        setShowEmailDialog,
    ] =
        useState(false);

    const [
        emailTo,
        setEmailTo,
    ] =
        useState("");

    const [
        emailSubject,
        setEmailSubject,
    ] =
        useState("");

    const [
        emailMessage,
        setEmailMessage,
    ] =
        useState("");

    const [
        emailSending,
        setEmailSending,
    ] =
        useState(false);

    const [
        emailError,
        setEmailError,
    ] =
        useState<string | null>(
            null,
        );

    const [
        attendanceDetailEmployeeId,
        setAttendanceDetailEmployeeId,
    ] =
        useState<string | null>(
            null,
        );

    const [
        attendanceRevision,
        setAttendanceRevision,
    ] =
        useState(0);

    const [
        correctionEntryId,
        setCorrectionEntryId,
    ] =
        useState<string | null>(
            null,
        );

    const [
        correctionClockIn,
        setCorrectionClockIn,
    ] =
        useState("");

    const [
        correctionClockOut,
        setCorrectionClockOut,
    ] =
        useState("");

    const [
        correctionReason,
        setCorrectionReason,
    ] =
        useState("");

    const [
        correctionError,
        setCorrectionError,
    ] =
        useState<string | null>(
            null,
        );

    const [
        showManualAttendanceEntry,
        setShowManualAttendanceEntry,
    ] =
        useState(false);

    const [
        manualClockIn,
        setManualClockIn,
    ] =
        useState("");

    const [
        manualClockOut,
        setManualClockOut,
    ] =
        useState("");

    const [
        manualReason,
        setManualReason,
    ] =
        useState("");

    const [
        manualEntryError,
        setManualEntryError,
    ] =
        useState<string | null>(
            null,
        );

    useEffect(
        () =>
            subscribeAttendance(
                () =>
                    setAttendanceRevision(
                        (current) =>
                            current + 1,
                    ),
            ),
        [],
    );

    const activeSellers =
        getActiveSellers();

    const activeConfiguration =
        getActiveBusinessConfiguration();

    const paymentMethods =
        defaultPaymentMethods.filter(
            (method) =>
                method.isActive,
        );

    const attendanceEmployees =
        useMemo(
            () => {
                const byId =
                    new Map<
                        string,
                        string
                    >();

                for (
                    const entry of
                    getAttendance()
                ) {
                    if (
                        entry.tenantId !==
                            activeConfiguration.tenantId ||
                        entry.storeCode !==
                            activeConfiguration.storeCode
                    ) {
                        continue;
                    }

                    byId.set(
                        entry.employeeId,
                        entry.employeeName,
                    );
                }

                return Array.from(
                    byId.entries(),
                )
                    .map(
                        ([id, name]) => ({
                            id,
                            name,
                        }),
                    )
                    .sort(
                        (a, b) =>
                            a.name.localeCompare(
                                b.name,
                                "he",
                            ),
                    );
            },
            [
                activeConfiguration.tenantId,
                activeConfiguration.storeCode,
                attendanceRevision,
            ],
        );

    const isAttendanceReport =
        selectedReportId ===
        "attendance";

    const isInventoryValuationReport =
        selectedReportId ===
        "inventory-valuation";

    const report =
        useMemo(
            () =>
                generateReport(
                    selectedReportId,
                    filters,
                ),
            [
                selectedReportId,
                filters,
                attendanceRevision,
            ],
        );

    const attendanceDetailReport =
        useMemo(
            () =>
                isAttendanceReport &&
                attendanceDetailEmployeeId
                    ? generateAttendanceEmployeeDetail(
                        attendanceDetailEmployeeId,
                        filters,
                    )
                    : null,
            [
                isAttendanceReport,
                attendanceDetailEmployeeId,
                filters,
                attendanceRevision,
            ],
        );

    const correctionEntry =
        correctionEntryId
            ? getAttendance()
                .find(
                    (entry) =>
                        entry.id ===
                        correctionEntryId,
                ) ?? null
            : null;

    const correctionAvailability =
        correctionEntry
            ? getAttendanceCorrectionAvailability(
                correctionEntry.employeeId,
            )
            : null;

    const attendanceDetailEmployee =
        attendanceDetailEmployeeId
            ? attendanceEmployees.find(
                (employee) =>
                    employee.id ===
                    attendanceDetailEmployeeId,
            ) ?? null
            : null;

    const manualEntryAvailability =
        attendanceDetailEmployeeId
            ? getAttendanceCorrectionAvailability(
                attendanceDetailEmployeeId,
            )
            : null;

    const openManualAttendanceEntry = () => {
        if (
            !attendanceDetailEmployee ||
            !manualEntryAvailability?.canCorrect
        ) {
            setManualEntryError(
                getAttendancePermissionMessage(
                    manualEntryAvailability,
                ) ||
                    "נדרש מנהל מורשה לצורך הוספת רישום נוכחות.",
            );
            return;
        }

        setManualClockIn("");
        setManualClockOut("");
        setManualReason("");
        setManualEntryError(null);
        setShowManualAttendanceEntry(
            true,
        );
    };

    const closeManualAttendanceEntry = () => {
        setShowManualAttendanceEntry(
            false,
        );
        setManualClockIn("");
        setManualClockOut("");
        setManualReason("");
        setManualEntryError(null);
    };

    const saveManualAttendanceEntry = () => {
        if (
            !attendanceDetailEmployee ||
            !manualEntryAvailability?.canCorrect
        ) {
            return;
        }

        try {
            addManualAttendanceEntry({
                employeeId:
                    attendanceDetailEmployee.id,
                employeeName:
                    attendanceDetailEmployee.name,
                clockedInAt:
                    new Date(
                        manualClockIn,
                    ).toISOString(),
                clockedOutAt:
                    new Date(
                        manualClockOut,
                    ).toISOString(),
                reason:
                    manualReason,
            });

            closeManualAttendanceEntry();
        }
        catch (error) {
            setManualEntryError(
                attendanceCorrectionErrorMessage(
                    error,
                ),
            );
        }
    };

    const openAttendanceCorrection = (
        entryId: string,
    ) => {
        const entry =
            getAttendance()
                .find(
                    (item) =>
                        item.id ===
                        entryId,
                );

        if (!entry) {
            return;
        }

        const availability =
            getAttendanceCorrectionAvailability(
                entry.employeeId,
            );

        if (!availability.canCorrect) {
            setCorrectionError(
                availability.reason ===
                    "self_correction_not_allowed"
                    ? "עובד לא יכול לתקן את הנוכחות של עצמו."
                    : "נדרש מנהל מורשה לצורך תיקון הנוכחות.",
            );
            return;
        }

        setCorrectionEntryId(
            entry.id,
        );
        setCorrectionClockIn(
            toDateTimeLocalValue(
                entry.clockedInAt,
            ),
        );
        setCorrectionClockOut(
            toDateTimeLocalValue(
                entry.clockedOutAt,
            ),
        );
        setCorrectionReason("");
        setCorrectionError(null);
    };

    const closeAttendanceCorrection = () => {
        setCorrectionEntryId(null);
        setCorrectionClockIn("");
        setCorrectionClockOut("");
        setCorrectionReason("");
        setCorrectionError(null);
    };

    const saveAttendanceCorrection = () => {
        if (
            !correctionEntry ||
            !correctionAvailability?.canCorrect
        ) {
            return;
        }

        try {
            correctAttendanceEntry({
                entryId:
                    correctionEntry.id,
                correctedClockedInAt:
                    new Date(
                        correctionClockIn,
                    ).toISOString(),
                correctedClockedOutAt:
                    correctionClockOut
                        ? new Date(
                            correctionClockOut,
                        ).toISOString()
                        : undefined,
                reason:
                    correctionReason,
            });

            closeAttendanceCorrection();
        }
        catch (error) {
            setCorrectionError(
                attendanceCorrectionErrorMessage(
                    error,
                ),
            );
        }
    };

    const activeDefinition =
        builtInReports.find(
            (definition) =>
                definition.id ===
                selectedReportId,
        );

    const resetFilters = () => {
        setFilters(
            createDatePresetFilters(
                "today",
            ),
        );
    };

    const applyDatePreset = (
        preset: DatePreset,
    ) => {
        setFilters(
            (current) => ({
                ...current,
                ...createDatePresetFilters(
                    preset,
                ),
            }),
        );
    };

    const periodLabel =
        isInventoryValuationReport
            ? `נכון ל־${filters.toDate}`
            : filters.fromDate ===
                filters.toDate
                ? filters.fromDate
                : `${filters.fromDate} — ${filters.toDate}`;

    const createPdfContext = () => ({
        businessName:
            "LUMORA",
        storeCode:
            activeConfiguration.storeCode,
        registerCode:
            activeConfiguration.registerCode,
        periodLabel,
    });

    const exportPdf = async () => {
        if (
            reportMode !== "standard"
        ) {
            return;
        }

        setExportStatus(
            "מייצא PDF...",
        );

        try {
            const pdf =
                await buildReportPdf(
                    report,
                    createPdfContext(),
                );

            const savedTo =
                await saveExportFile(
                    pdf,
                    buildExportFilename(
                        report,
                        filters,
                        "pdf",
                    ),
                    "application/pdf",
                );

            setExportStatus(
                isTauri()
                    ? `קובץ ה־PDF נשמר: ${savedTo}`
                    : "קובץ PDF הורד בהצלחה.",
            );
        }
        catch (error) {
            setExportStatus(
                error instanceof Error
                    ? `יצוא PDF נכשל: ${error.message}`
                    : "יצוא PDF נכשל.",
            );
        }
    };

    const openEmailDialog = () => {
        if (
            reportMode !== "standard"
        ) {
            return;
        }

        setEmailSubject(
            `${report.title} — ${periodLabel}`,
        );
        setEmailMessage(
            "מצורף דוח Lumora בקובץ PDF.",
        );
        setEmailError(null);
        setShowEmailDialog(true);
    };

    const closeEmailDialog = () => {
        if (emailSending) {
            return;
        }

        setShowEmailDialog(false);
        setEmailError(null);
    };

    const sendReportEmail = async () => {
        const normalizedEmail =
            emailTo.trim();

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                normalizedEmail,
            )
        ) {
            setEmailError(
                "יש להזין כתובת מייל תקינה.",
            );
            return;
        }

        const adapter =
            getReportEmailDeliveryAdapter();

        if (!adapter.isConfigured()) {
            setEmailError(
                "שירות שליחת המייל עדיין לא הוגדר. יצוא PDF זמין כבר עכשיו; את ספק המייל נחבר דרך ה־Email Delivery Adapter.",
            );
            return;
        }

        setEmailSending(true);
        setEmailError(null);

        try {
            const pdf =
                await buildReportPdf(
                    report,
                    createPdfContext(),
                );
            const filename =
                buildExportFilename(
                    report,
                    filters,
                    "pdf",
                );

            await adapter.send({
                to:
                    normalizedEmail,
                subject:
                    emailSubject.trim() ||
                    `${report.title} — ${periodLabel}`,
                message:
                    emailMessage.trim(),
                filename,
                pdfBase64:
                    reportPdfToBase64(
                        pdf,
                    ),
                tenantId:
                    activeConfiguration.tenantId,
                storeCode:
                    activeConfiguration.storeCode,
                registerCode:
                    activeConfiguration.registerCode,
            });

            setShowEmailDialog(false);
            setExportStatus(
                `הדוח נשלח בהצלחה ל־${normalizedEmail}.`,
            );
        }
        catch (error) {
            setEmailError(
                error instanceof Error
                    ? `שליחת המייל נכשלה: ${error.message}`
                    : "שליחת המייל נכשלה.",
            );
        }
        finally {
            setEmailSending(false);
        }
    };

    const exportCsv = async () => {
        if (
            reportMode !== "standard"
        ) {
            return;
        }

        setExportStatus(
            "מייצא CSV...",
        );

        try {
            const savedTo =
                await downloadCsv(
                    report,
                    filters,
                );

            setExportStatus(
                isTauri()
                    ? `הקובץ נשמר: ${savedTo}`
                    : "קובץ CSV הורד בהצלחה.",
            );
        }
        catch (error) {
            setExportStatus(
                error instanceof Error
                    ? `היצוא נכשל: ${error.message}`
                    : "היצוא נכשל.",
            );
        }
    };

    const exportExcel = async () => {
        if (
            reportMode !== "standard"
        ) {
            return;
        }

        setExportStatus(
            "מייצא Excel...",
        );

        try {
            const savedTo =
                await downloadExcel(
                    report,
                    filters,
                );

            setExportStatus(
                isTauri()
                    ? `הקובץ נשמר: ${savedTo}`
                    : "קובץ Excel הורד בהצלחה.",
            );
        }
        catch (error) {
            setExportStatus(
                error instanceof Error
                    ? `היצוא נכשל: ${error.message}`
                    : "היצוא נכשל.",
            );
        }
    };

    return (
        <section
            className="reports-page"
            dir="rtl"
        >
            <header className="reports-page__header">
                <div className="reports-page__heading">
                    <p>
                        REPORTS
                    </p>

                    <div>
                        <h1>
                            דוחות
                        </h1>

                        <span>
                            תמונת מצב עסקית, ניתוח מכירות ונתוני קופה
                        </span>
                    </div>
                </div>

                <div className="reports-page__header-actions">
                    <button
                        type="button"
                        className="reports-page__secondary-action"
                        onClick={
                            onOpenXReport
                        }
                    >
                        {"\u05d3\u05d5\u05d7 X"}
                    </button>
                    <button
                        type="button"
                        className="reports-page__secondary-action"
                        onClick={() => {
                            void exportCsv();
                        }}
                        disabled={
                            reportMode !==
                            "standard"
                        }
                    >
                        יצוא CSV
                    </button>

                    <button
                        type="button"
                        className="reports-page__secondary-action"
                        onClick={() => {
                            void exportExcel();
                        }}
                        disabled={
                            reportMode !==
                            "standard"
                        }
                    >
                        יצוא Excel
                    </button>

                    <button
                        type="button"
                        className="reports-page__secondary-action"
                        onClick={() => {
                            void exportPdf();
                        }}
                        disabled={
                            reportMode !==
                            "standard"
                        }
                    >
                        יצוא PDF
                    </button>

                    <button
                        type="button"
                        className="reports-page__secondary-action"
                        onClick={
                            openEmailDialog
                        }
                        disabled={
                            reportMode !==
                            "standard"
                        }
                    >
                        שליחה במייל
                    </button>

                    <button
                        type="button"
                        className="reports-page__primary-action"
                        onClick={() =>
                            window.print()
                        }
                    >
                        הדפסה
                    </button>
                </div>
            </header>

            {exportStatus && (
                <div
                    className="reports-page__export-status"
                    role="status"
                >
                    {exportStatus}
                </div>
            )}

            {showEmailDialog && (
                <div
                    className="reports-page__email-backdrop"
                    onMouseDown={
                        closeEmailDialog
                    }
                >
                    <section
                        className="reports-page__email-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="reports-email-title"
                        onMouseDown={(event) => {
                            event.stopPropagation();
                        }}
                    >
                        <header className="reports-page__email-header">
                            <strong id="reports-email-title">
                                שליחת דוח במייל
                            </strong>

                            <button
                                type="button"
                                className="reports-page__email-close"
                                onClick={
                                    closeEmailDialog
                                }
                                disabled={
                                    emailSending
                                }
                                aria-label="סגירה"
                            >
                                ×
                            </button>
                        </header>

                        <div className="reports-page__email-body">
                            <label>
                                כתובת מייל
                                <input
                                    type="email"
                                    value={
                                        emailTo
                                    }
                                    onChange={(event) => {
                                        setEmailTo(
                                            event.target.value,
                                        );
                                    }}
                                    autoFocus
                                    placeholder="name@example.com"
                                />
                            </label>

                            <label>
                                נושא
                                <input
                                    type="text"
                                    value={
                                        emailSubject
                                    }
                                    onChange={(event) => {
                                        setEmailSubject(
                                            event.target.value,
                                        );
                                    }}
                                />
                            </label>

                            <label>
                                הודעה
                                <textarea
                                    value={
                                        emailMessage
                                    }
                                    onChange={(event) => {
                                        setEmailMessage(
                                            event.target.value,
                                        );
                                    }}
                                />
                            </label>

                            <div className="reports-page__email-attachment">
                                מצורף אוטומטית:{" "}
                                {buildExportFilename(
                                    report,
                                    filters,
                                    "pdf",
                                )}
                            </div>

                            {emailError && (
                                <div
                                    className="reports-page__email-error"
                                    role="alert"
                                >
                                    {emailError}
                                </div>
                            )}
                        </div>

                        <footer className="reports-page__email-footer">
                            <button
                                type="button"
                                className="reports-page__email-send"
                                onClick={() => {
                                    void sendReportEmail();
                                }}
                                disabled={
                                    emailSending
                                }
                            >
                                {emailSending
                                    ? "שולח..."
                                    : "שלח PDF במייל"}
                            </button>

                            <button
                                type="button"
                                className="reports-page__email-cancel"
                                onClick={
                                    closeEmailDialog
                                }
                                disabled={
                                    emailSending
                                }
                            >
                                ביטול
                            </button>
                        </footer>
                    </section>
                </div>
            )}

            <section className="reports-page__catalog-shell">
                <div className="reports-page__section-heading">
                    <div>
                        <strong>
                            ספריית דוחות
                        </strong>
                        <span>
                            בחר דוח להצגה
                        </span>
                    </div>

                    <small>
                        {builtInReports.length + 1} דוחות זמינים
                    </small>
                </div>

                <div className="reports-page__catalog">
                    {builtInReports.map(
                        (
                            definition,
                            index,
                        ) => (
                            <button
                                key={
                                    definition.id
                                }
                                type="button"
                                className={
                                    reportMode ===
                                        "standard" &&
                                    definition.id ===
                                        selectedReportId
                                        ? "reports-page__report-button reports-page__report-button--active"
                                        : "reports-page__report-button"
                                }
                                onClick={() => {
                                    setReportMode(
                                        "standard",
                                    );

                                    setSelectedReportId(
                                        definition.id,
                                    );

                                    setAttendanceDetailEmployeeId(
                                        null,
                                    );
                                }}
                            >
                                <span className="reports-page__report-index">
                                    {String(
                                        index + 1,
                                    ).padStart(
                                        2,
                                        "0",
                                    )}
                                </span>

                                <span className="reports-page__report-copy">
                                    <strong>
                                        {
                                            definition.title
                                        }
                                    </strong>

                                    <small>
                                        {
                                            definition.description
                                        }
                                    </small>
                                </span>
                            </button>
                        ),
                    )}

                    <button
                        type="button"
                        className={
                            reportMode ===
                            "z-history"
                                ? "reports-page__report-button reports-page__report-button--active"
                                : "reports-page__report-button"
                        }
                        onClick={() =>
                            setReportMode(
                                "z-history",
                            )
                        }
                    >
                        <span className="reports-page__report-index">
                            Z
                        </span>

                        <span className="reports-page__report-copy">
                            <strong>
                                היסטוריית Z
                            </strong>

                            <small>
                                דוחות סגירת קופה קודמים והדפסה חוזרת
                            </small>
                        </span>
                    </button>
                </div>
            </section>

            {reportMode ===
                "standard" &&
                isInventoryValuationReport && (
                <section className="reports-page__filters">
                    <div className="reports-page__section-heading reports-page__section-heading--filters">
                        <div>
                            <strong>
                                מלאי נכון לתאריך
                            </strong>
                            <span>
                                בחר את היום שאליו יש לשחזר את יתרת המלאי והעלות האחרונה הידועה
                            </span>
                        </div>

                        <div className="reports-page__preset-actions">
                            <button
                                type="button"
                                onClick={() =>
                                    setFilters(
                                        (current) => {
                                            const today =
                                                toLocalDateInput(
                                                    new Date(),
                                                );

                                            return {
                                                ...current,
                                                fromDate:
                                                    today,
                                                toDate:
                                                    today,
                                            };
                                        },
                                    )
                                }
                            >
                                היום
                            </button>
                        </div>
                    </div>

                    <div className="reports-page__filter-grid reports-page__filter-grid--attendance">
                        <label>
                            <span>
                                נכון לתאריך
                            </span>
                            <input
                                type="date"
                                max={
                                    toLocalDateInput(
                                        new Date(),
                                    )
                                }
                                value={
                                    filters.toDate
                                }
                                onChange={(event) => {
                                    const value =
                                        event.target.value;

                                    if (!value) {
                                        return;
                                    }

                                    setFilters(
                                        (current) => ({
                                            ...current,
                                            fromDate:
                                                value,
                                            toDate:
                                                value,
                                        }),
                                    );
                                }}
                            />
                        </label>
                    </div>
                </section>
            )}

            {reportMode ===
                "standard" &&
                !isInventoryValuationReport && (
                <section className="reports-page__filters">
                    <div className="reports-page__section-heading reports-page__section-heading--filters">
                        <div>
                            <strong>
                                סינון הדוח
                            </strong>
                            <span>
                                {isAttendanceReport
                                    ? "תקופה ועובד"
                                    : "תקופה, קופה, מוכרן וסוג עסקה"}
                            </span>
                        </div>

                        <div className="reports-page__preset-actions">
                            <button
                                type="button"
                                onClick={() =>
                                    applyDatePreset(
                                        "today",
                                    )
                                }
                            >
                                היום
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    applyDatePreset(
                                        "week",
                                    )
                                }
                            >
                                7 ימים
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    applyDatePreset(
                                        "month",
                                    )
                                }
                            >
                                החודש
                            </button>
                        </div>
                    </div>

                    <div
                        className={
                            isAttendanceReport
                                ? "reports-page__filter-grid reports-page__filter-grid--attendance"
                                : "reports-page__filter-grid"
                        }
                    >
                        <label>
                            <span>
                                מתאריך
                            </span>
                            <input
                                type="date"
                                value={
                                    filters.fromDate
                                }
                                onChange={(event) =>
                                    setFilters(
                                        (current) => ({
                                            ...current,
                                            fromDate:
                                                event.target.value,
                                        }),
                                    )
                                }
                            />
                        </label>

                        <label>
                            <span>
                                עד תאריך
                            </span>
                            <input
                                type="date"
                                value={
                                    filters.toDate
                                }
                                onChange={(event) =>
                                    setFilters(
                                        (current) => ({
                                            ...current,
                                            toDate:
                                                event.target.value,
                                        }),
                                    )
                                }
                            />
                        </label>

                        {isAttendanceReport ? (
                            <label>
                                <span>
                                    עובד
                                </span>
                                <select
                                    value={
                                        filters.employeeId ??
                                        ""
                                    }
                                    onChange={(event) => {
                                        setFilters(
                                            (current) => ({
                                                ...current,
                                                employeeId:
                                                    event.target.value ||
                                                    undefined,
                                            }),
                                        );

                                        setAttendanceDetailEmployeeId(
                                            null,
                                        );
                                    }}
                                >
                                    <option value="">
                                        כל העובדים
                                    </option>

                                    {attendanceEmployees.map(
                                        (employee) => (
                                            <option
                                                key={
                                                    employee.id
                                                }
                                                value={
                                                    employee.id
                                                }
                                            >
                                                {
                                                    employee.name
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>
                        ) : (
                            <>
                                <label>
                                    <span>
                                        קופה
                                    </span>
                                    <select
                                        value={
                                            filters.registerCode ??
                                            ""
                                        }
                                        onChange={(event) =>
                                            setFilters(
                                                (current) => ({
                                                    ...current,
                                                    registerCode:
                                                        event.target.value ||
                                                        undefined,
                                                }),
                                            )
                                        }
                                    >
                                        <option value="">
                                            כל הקופות
                                        </option>

                                        <option
                                            value={
                                                activeConfiguration.registerCode
                                            }
                                        >
                                            קופה{" "}
                                            {
                                                activeConfiguration.registerCode
                                            }
                                        </option>
                                    </select>
                                </label>

                                <label>
                                    <span>
                                        מוכרן
                                    </span>
                                    <select
                                        value={
                                            filters.sellerId ??
                                            ""
                                        }
                                        onChange={(event) =>
                                            setFilters(
                                                (current) => ({
                                                    ...current,
                                                    sellerId:
                                                        event.target.value ||
                                                        undefined,
                                                }),
                                            )
                                        }
                                    >
                                        <option value="">
                                            כל המוכרנים
                                        </option>

                                        {activeSellers.map(
                                            (seller) => (
                                                <option
                                                    key={
                                                        seller.id
                                                    }
                                                    value={
                                                        seller.id
                                                    }
                                                >
                                                    {
                                                        seller.name
                                                    }
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </label>

                                <label>
                                    <span>
                                        אמצעי תשלום
                                    </span>
                                    <select
                                        value={
                                            filters.paymentMethod ??
                                            ""
                                        }
                                        onChange={(event) =>
                                            setFilters(
                                                (current) => ({
                                                    ...current,
                                                    paymentMethod:
                                                        event.target.value
                                                            ? event.target.value as ReportFilters["paymentMethod"]
                                                            : undefined,
                                                }),
                                            )
                                        }
                                    >
                                        <option value="">
                                            כל אמצעי התשלום
                                        </option>

                                        {paymentMethods.map(
                                            (method) => (
                                                <option
                                                    key={
                                                        method.code
                                                    }
                                                    value={
                                                        method.code
                                                    }
                                                >
                                                    {
                                                        method.name
                                                    }
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </label>

                                <label>
                                    <span>
                                        סוג עסקה
                                    </span>
                                    <select
                                        value={
                                            filters.transactionType ??
                                            ""
                                        }
                                        onChange={(event) =>
                                            setFilters(
                                                (current) => ({
                                                    ...current,
                                                    transactionType:
                                                        event.target.value
                                                            ? event.target.value as ReportFilters["transactionType"]
                                                            : undefined,
                                                }),
                                            )
                                        }
                                    >
                                        <option value="">
                                            כל סוגי העסקאות
                                        </option>
                                        <option value="sale">
                                            מכירה
                                        </option>
                                        <option value="return">
                                            החזרה
                                        </option>
                                        <option value="exchange">
                                            החלפה
                                        </option>
                                    </select>
                                </label>
                            </>
                        )}

                        <button
                            type="button"
                            className="reports-page__reset-filter"
                            onClick={
                                resetFilters
                            }
                        >
                            איפוס סינון
                        </button>
                    </div>                </section>
            )}

            {reportMode ===
                "z-history" ? (
                <article className="reports-page__report reports-page__report--z">
                    <div className="reports-page__report-heading">
                        <div>
                            <p>
                                REGISTER CLOSING
                            </p>
                            <h2>
                                היסטוריית Z
                            </h2>
                            <span>
                                צפייה בדוחות סגירת קופה והדפסה חוזרת
                            </span>
                        </div>
                    </div>

                    <ShiftZHistory />
                </article>
            ) : (
                <article className="reports-page__report">
                    <div className="reports-page__report-heading">
                        <div>
                            <p>
                                ACTIVE REPORT
                            </p>
                            <h2>
                                {
                                    report.title
                                }
                            </h2>
                            <span>
                                {
                                    activeDefinition?.description
                                }
                            </span>
                        </div>

                        <div className="reports-page__report-meta">
                            <span>
                                {isInventoryValuationReport
                                    ? "נכון לתאריך"
                                    : "תקופה"}
                            </span>
                            <strong dir="ltr">
                                {
                                    periodLabel
                                }
                            </strong>
                            <small>
                                הופק {new Date(
                                    report.generatedAt,
                                ).toLocaleString(
                                    "he-IL",
                                )}
                            </small>
                        </div>
                    </div>

                    <div className="reports-page__metrics">
                        <div className="reports-page__metric-card">
                            <span>
                                שורות בדוח
                            </span>
                            <strong>
                                {
                                    report.rows.length
                                }
                            </strong>
                        </div>

                        {report.totals
                            ?.slice(
                                0,
                                3,
                            )
                            .map(
                                (total) => (
                                    <div
                                        key={
                                            total.label
                                        }
                                        className="reports-page__metric-card"
                                    >
                                        <span>
                                            {
                                                total.label
                                            }
                                        </span>
                                        <strong>
                                            {
                                                total.value
                                            }
                                        </strong>
                                    </div>
                                ),
                            )}
                    </div>

                    <div className="reports-page__table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    {report.columns.map(
                                        (
                                            column,
                                        ) => (
                                            <th
                                                key={
                                                    column.id
                                                }
                                                style={{
                                                    textAlign:
                                                        column.align ??
                                                        "start",
                                                }}
                                            >
                                                {
                                                    column.label
                                                }
                                            </th>
                                        ),
                                    )}
                                </tr>
                            </thead>

                            <tbody>
                                {report.rows.map(
                                    (
                                        row,
                                    ) => (
                                        <tr
                                            key={
                                                row.id
                                            }
                                        >
                                            {report.columns.map(
                                                (
                                                    column,
                                                ) => (
                                                    <td
                                                        key={
                                                            column.id
                                                        }
                                                        style={{
                                                            textAlign:
                                                                column.align ??
                                                                "start",
                                                        }}
                                                    >
                                                        {isAttendanceReport &&
                                                        column.id ===
                                                            "details" ? (
                                                            <button
                                                                type="button"
                                                                className="reports-page__attendance-detail-button"
                                                                onClick={() =>
                                                                    setAttendanceDetailEmployeeId(
                                                                        row.id,
                                                                    )
                                                                }
                                                            >
                                                                פירוט
                                                            </button>
                                                        ) : (
                                                            row.values[
                                                                column.id
                                                            ] ??
                                                            ""
                                                        )}
                                                    </td>
                                                ),
                                            )}
                                        </tr>
                                    ),
                                )}

                                {report.rows.length ===
                                    0 && (
                                    <tr>
                                        <td
                                            className="reports-page__empty-state"
                                            colSpan={
                                                report.columns.length
                                            }
                                        >
                                            אין נתונים להצגה בתקופה ובסינון שנבחרו
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {isAttendanceReport &&
                        attendanceDetailReport && (
                        <section className="reports-page__attendance-detail">
                            <header className="reports-page__attendance-detail-header">
                                <div>
                                    <strong>
                                        {attendanceDetailReport.title}
                                    </strong>
                                    <span>
                                        {attendanceDetailReport.subtitle}
                                    </span>
                                </div>

                                <div className="reports-page__attendance-detail-actions">
                                    <button
                                        type="button"
                                        className="reports-page__attendance-add-button"
                                        disabled={
                                            !manualEntryAvailability?.canCorrect
                                        }
                                        title={
                                            manualEntryAvailability?.canCorrect
                                                ? "הוסף יום או מקטע נוכחות שחסר בדוח"
                                                : getAttendancePermissionMessage(
                                                    manualEntryAvailability,
                                                )
                                        }
                                        onClick={
                                            openManualAttendanceEntry
                                        }
                                    >
                                        + הוסף רישום נוכחות
                                    </button>

                                    {!manualEntryAvailability?.canCorrect && (
                                        <span
                                            className="reports-page__attendance-no-permission"
                                        >
                                            {getAttendancePermissionMessage(
                                                manualEntryAvailability,
                                            )}
                                        </span>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setAttendanceDetailEmployeeId(
                                                null,
                                            )
                                        }
                                    >
                                        סגור פירוט
                                    </button>
                                </div>
                            </header>

                            <div className="reports-page__table-wrap reports-page__table-wrap--attendance-detail">
                                <table>
                                    <thead>
                                        <tr>
                                            {attendanceDetailReport.columns.map(
                                                (column) => (
                                                    <th
                                                        key={column.id}
                                                        style={{
                                                            textAlign:
                                                                column.align ??
                                                                "start",
                                                        }}
                                                    >
                                                        {column.label}
                                                    </th>
                                                ),
                                            )}
                                            <th
                                                style={{
                                                    textAlign:
                                                        "center",
                                                }}
                                            >
                                                פעולה
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {attendanceDetailReport.rows.map(
                                            (row) => {
                                                const entryId =
                                                    String(
                                                        row.values[
                                                            "correctionEntryId"
                                                        ] ??
                                                        "",
                                                    );

                                                const employeeId =
                                                    String(
                                                        row.values[
                                                            "employeeId"
                                                        ] ??
                                                        "",
                                                    );

                                                const availability =
                                                    employeeId
                                                        ? getAttendanceCorrectionAvailability(
                                                            employeeId,
                                                        )
                                                        : null;

                                                const wasCorrected =
                                                    row.values[
                                                        "hasManualCorrection"
                                                    ] ===
                                                    "yes";

                                                return (
                                                    <tr key={row.id}>
                                                        {attendanceDetailReport.columns.map(
                                                            (column) => (
                                                                <td
                                                                    key={column.id}
                                                                    style={{
                                                                        textAlign:
                                                                            column.align ??
                                                                            "start",
                                                                    }}
                                                                >
                                                                    {row.values[
                                                                        column.id
                                                                    ] ?? ""}
                                                                </td>
                                                            ),
                                                        )}
                                                        <td
                                                            className="reports-page__attendance-correction-cell"
                                                        >
                                                            {entryId &&
                                                            availability?.canCorrect ? (
                                                                <button
                                                                    type="button"
                                                                    className="reports-page__attendance-correct-button"
                                                                    onClick={() =>
                                                                        openAttendanceCorrection(
                                                                            entryId,
                                                                        )
                                                                    }
                                                                >
                                                                    {wasCorrected
                                                                        ? "תיקון נוסף"
                                                                        : "תקן"}
                                                                </button>
                                                            ) : entryId ? (
                                                                <span
                                                                    className="reports-page__attendance-no-permission"
                                                                    title={
                                                                        getAttendancePermissionMessage(
                                                                            availability,
                                                                        )
                                                                    }
                                                                >
                                                                    ללא הרשאה
                                                                </span>
                                                            ) : (
                                                                <span>
                                                                    —
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            },
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {report.totals &&
                        report.totals.length >
                            3 && (
                        <footer className="reports-page__totals">
                            {report.totals
                                .slice(3)
                                .map(
                                    (
                                        total,
                                    ) => (
                                        <div
                                            key={
                                                total.label
                                            }
                                        >
                                            <span>
                                                {
                                                    total.label
                                                }
                                            </span>
                                            <strong>
                                                {
                                                    total.value
                                                }
                                            </strong>
                                        </div>
                                    ),
                                )}
                        </footer>
                    )}
                </article>
            )}

            {showManualAttendanceEntry &&
                attendanceDetailEmployee && (
                <div
                    className="reports-page__attendance-correction-backdrop"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeManualAttendanceEntry();
                        }
                    }}
                >
                    <section
                        className="reports-page__attendance-correction-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-label="הוספת נוכחות ידנית"
                    >
                        <header>
                            <div>
                                <span>
                                    הוספת רישום ידני
                                </span>
                                <h2>
                                    {attendanceDetailEmployee.name}
                                </h2>
                            </div>

                            <button
                                type="button"
                                aria-label="סגור"
                                onClick={
                                    closeManualAttendanceEntry
                                }
                            >
                                ×
                            </button>
                        </header>

                        <div className="reports-page__attendance-correction-manager">
                            <span>
                                מאשר
                            </span>
                            <strong>
                                {manualEntryAvailability?.canCorrect
                                    ? manualEntryAvailability.managerEmployeeName
                                    : "מנהל נדרש"}
                            </strong>
                        </div>

                        <div className="reports-page__attendance-manual-note">
                            הרישום יתווסף כרישום חדש ויסומן
                            {" "}
                            <strong>
                                נוסף ידנית
                            </strong>
                            .
                        </div>

                        <div className="reports-page__attendance-correction-grid">
                            <label>
                                <span>
                                    כניסה *
                                </span>
                                <input
                                    type="datetime-local"
                                    value={
                                        manualClockIn
                                    }
                                    onChange={(event) =>
                                        setManualClockIn(
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>

                            <label>
                                <span>
                                    יציאה *
                                </span>
                                <input
                                    type="datetime-local"
                                    value={
                                        manualClockOut
                                    }
                                    onChange={(event) =>
                                        setManualClockOut(
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                        </div>

                        <label className="reports-page__attendance-correction-reason">
                            <span>
                                סיבת ההוספה *
                            </span>
                            <textarea
                                rows={3}
                                value={
                                    manualReason
                                }
                                placeholder="לדוגמה: העובד שכח להחתים כניסה ויציאה"
                                onChange={(event) =>
                                    setManualReason(
                                        event.target.value,
                                    )
                                }
                            />
                        </label>

                        {manualEntryError && (
                            <div className="reports-page__attendance-correction-error">
                                {manualEntryError}
                            </div>
                        )}

                        <footer>
                            <button
                                type="button"
                                onClick={
                                    closeManualAttendanceEntry
                                }
                            >
                                ביטול
                            </button>

                            <button
                                type="button"
                                className="reports-page__attendance-correction-save"
                                disabled={
                                    !manualClockIn ||
                                    !manualClockOut ||
                                    !manualReason.trim() ||
                                    !manualEntryAvailability?.canCorrect
                                }
                                onClick={
                                    saveManualAttendanceEntry
                                }
                            >
                                הוסף רישום
                            </button>
                        </footer>
                    </section>
                </div>
            )}

            {correctionEntry && (
                <div
                    className="reports-page__attendance-correction-backdrop"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeAttendanceCorrection();
                        }
                    }}
                >
                    <section
                        className="reports-page__attendance-correction-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-label="תיקון נוכחות"
                    >
                        <header>
                            <div>
                                <span>
                                    תיקון נוכחות
                                </span>
                                <h2>
                                    {correctionEntry.employeeName}
                                </h2>
                            </div>

                            <button
                                type="button"
                                aria-label="סגור"
                                onClick={
                                    closeAttendanceCorrection
                                }
                            >
                                ×
                            </button>
                        </header>

                        <div className="reports-page__attendance-correction-manager">
                            <span>
                                מאשר
                            </span>
                            <strong>
                                {correctionAvailability?.canCorrect
                                    ? correctionAvailability.managerEmployeeName
                                    : "מנהל נדרש"}
                            </strong>
                        </div>

                        <div className="reports-page__attendance-correction-grid">
                            <label>
                                <span>
                                    כניסה
                                </span>
                                <input
                                    type="datetime-local"
                                    value={
                                        correctionClockIn
                                    }
                                    onChange={(event) =>
                                        setCorrectionClockIn(
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>

                            <label>
                                <span>
                                    יציאה
                                </span>
                                <input
                                    type="datetime-local"
                                    value={
                                        correctionClockOut
                                    }
                                    onChange={(event) =>
                                        setCorrectionClockOut(
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                        </div>

                        <label className="reports-page__attendance-correction-reason">
                            <span>
                                סיבת התיקון *
                            </span>
                            <textarea
                                rows={3}
                                value={
                                    correctionReason
                                }
                                placeholder="לדוגמה: העובד שכח לבצע יציאה"
                                onChange={(event) =>
                                    setCorrectionReason(
                                        event.target.value,
                                    )
                                }
                            />
                        </label>

                        {correctionEntry.corrections?.length ? (
                            <small className="reports-page__attendance-correction-history-note">
                                לרישום זה קיימים {correctionEntry.corrections.length} תיקונים קודמים. ההיסטוריה נשמרת.
                            </small>
                        ) : null}

                        {correctionError && (
                            <div className="reports-page__attendance-correction-error">
                                {correctionError}
                            </div>
                        )}

                        <footer>
                            <button
                                type="button"
                                onClick={
                                    closeAttendanceCorrection
                                }
                            >
                                ביטול
                            </button>

                            <button
                                type="button"
                                className="reports-page__attendance-correction-save"
                                disabled={
                                    !correctionClockIn ||
                                    !correctionReason.trim() ||
                                    !correctionAvailability?.canCorrect
                                }
                                onClick={
                                    saveAttendanceCorrection
                                }
                            >
                                שמור תיקון
                            </button>
                        </footer>
                    </section>
                </div>
            )}
        </section>
    );
}

export default ReportsPage;
