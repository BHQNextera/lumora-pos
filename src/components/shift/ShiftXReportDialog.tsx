import { formatMoney as money } from "../../utils/MoneyFormatter";

// LUMORA SHIFT X REPORT DIALOG V2.2

import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    defaultPaymentMethods,
} from "../../models/PaymentMethod";

import type {
    RegisterShift,
} from "../../models/shift/RegisterShift";

import {
    generateShiftXReport,
} from "../../models/shift/ShiftReportService";

import {
    renderThermalDocumentHtml,
} from "../../models/printing/ThermalReportRenderer";

import {
    thermalPrintProfiles,
} from "../../models/printing/ThermalPrintProfile";

import type {
    ThermalPrintDocument,
} from "../../models/printing/ThermalPrintDocument";

import {
    getRegisterPrinterConfig,
} from "../../config/RegisterPrinterConfig";

import {
    getActiveBusinessOperatingProfile,
} from "../../config/ActiveBusinessConfiguration";

import {
    getBusinessIdentitySettings,
} from "../../config/BusinessIdentitySettings";

import {
    useLocale,
} from "../../i18n/useLocale";

import "./shift-x-report-dialog.css";

type ShiftXReportDialogProps = {
    shift: RegisterShift;
    onClose: () => void;
};


function ShiftXReportDialog({
    shift,
    onClose,
}: ShiftXReportDialogProps) {
    const {
        direction,
        locale,
    } = useLocale();

    const report =
        useMemo(
            () =>
                generateShiftXReport(
                    shift,
                ),
            [shift],
        );

    const [
        printPreviewHtml,
        setPrintPreviewHtml,
    ] = useState<string | null>(
        null,
    );

    const previewFrameRef =
        useRef<HTMLIFrameElement>(
            null,
        );

    const printerConfig =
        useMemo(
            () =>
                getRegisterPrinterConfig(
                    shift.storeCode,
                    shift.registerCode,
                ),
            [
                shift.registerCode,
                shift.storeCode,
            ],
        );

    const printProfileId =
        printerConfig.paperFormat ===
            "thermal57"
            ? "thermal-58"
            : "thermal-80";

    const printProfile =
        thermalPrintProfiles[
            printProfileId
        ];

    const businessProfile =
        useMemo(
            () =>
                getActiveBusinessOperatingProfile(),
            [],
        );

    const businessIdentity =
        useMemo(
            () =>
                getBusinessIdentitySettings(
                    businessProfile,
                    shift.storeCode,
                ),
            [
                businessProfile,
                shift.storeCode,
            ],
        );

    const reportBusinessName =
        businessIdentity.tradingName ||
        businessIdentity.businessName ||
        "Lumora";

    const reportBranchName =
        businessIdentity.branchName ||
        `סניף ${shift.storeCode}`;

    useEffect(
        () => {
            const handleKeyDown = (
                event: KeyboardEvent,
            ) => {
                if (
                    event.key ===
                    "Escape"
                ) {
                    if (
                        printPreviewHtml !==
                        null
                    ) {
                        setPrintPreviewHtml(
                            null,
                        );
                    }
                    else {
                        onClose();
                    }
                }
            };

            window.addEventListener(
                "keydown",
                handleKeyDown,
            );

            return () => {
                window.removeEventListener(
                    "keydown",
                    handleKeyDown,
                );
            };
        },
        [
            onClose,
            printPreviewHtml,
        ],
    );

    const dateTimeFormatter =
        useMemo(
            () =>
                new Intl.DateTimeFormat(
                    locale,
                    {
                        dateStyle:
                            "short",
                        timeStyle:
                            "short",
                    },
                ),
            [locale],
        );

    const paymentName = (
        method: string,
    ) =>
        defaultPaymentMethods.find(
            (item) =>
                item.code === method,
        )?.name ?? method;

    const createPrintDocument =
        (): ThermalPrintDocument => {
            const blocks:
                ThermalPrintDocument[
                    "blocks"
                ] = [
                    {
                        type: "text",
                        value:
                            reportBusinessName,
                        bold: true,
                        alignment:
                            "center",
                    },
                ];

            if (
                businessIdentity.businessName &&
                businessIdentity.businessName !==
                    reportBusinessName
            ) {
                blocks.push({
                    type: "text",
                    value:
                        businessIdentity.businessName,
                    alignment:
                        "center",
                });
            }

            if (
                businessIdentity.vatNumber
            ) {
                blocks.push({
                    type: "text",
                    value:
                        `ע.מ. ${businessIdentity.vatNumber}`,
                    alignment:
                        "center",
                });
            }

            if (
                businessIdentity.businessNumber &&
                businessIdentity.businessNumber !==
                    businessIdentity.vatNumber
            ) {
                blocks.push({
                    type: "text",
                    value:
                        `מספר עסק ${businessIdentity.businessNumber}`,
                    alignment:
                        "center",
                });
            }

            blocks.push({
                type: "text",
                value:
                    reportBranchName,
                alignment:
                    "center",
            });

            const branchContact = [
                businessIdentity.branchAddress ||
                    businessIdentity.address,
                businessIdentity.branchPhone ||
                    businessIdentity.phone,
            ]
                .filter(Boolean)
                .join(" · ");

            if (branchContact) {
                blocks.push({
                    type: "text",
                    value:
                        branchContact,
                    alignment:
                        "center",
                });
            }

            blocks.push(
                {
                    type: "separator",
                },
                {
                    type: "text",
                    value: "דוח X",
                    bold: true,
                    alignment:
                        "center",
                },
                {
                    type: "text",
                    value:
                        "דוח ביניים — אינו סוגר משמרת",
                    alignment:
                        "center",
                },
                {
                    type: "row",
                    label: "הופק",
                    value:
                        dateTimeFormatter.format(
                            new Date(
                                report.generatedAt,
                            ),
                        ),
                },
                {
                    type: "separator",
                },
                {
                    type: "text",
                    value:
                        "פרטי משמרת",
                    bold: true,
                },
                {
                    type: "row",
                    label: "סניף",
                    value:
                        businessIdentity.branchName
                            ? `${businessIdentity.branchName} · ${shift.storeCode}`
                            : shift.storeCode,
                },
                {
                    type: "row",
                    label: "קופה",
                    value:
                        report.registerCode,
                },
                {
                    type: "row",
                    label: "נפתחה",
                    value:
                        dateTimeFormatter.format(
                            new Date(
                                report.openedAt,
                            ),
                        ),
                },
                {
                    type: "row",
                    label: "פותח",
                    value:
                        report.openedBy.employeeName,
                },
                {
                    type: "separator",
                },
                {
                    type: "text",
                    value:
                        "ספירת עסקאות",
                    bold: true,
                },
                {
                    type: "row",
                    label: "עסקאות",
                    value:
                        String(
                            report.transactionCount,
                        ),
                },
                {
                    type: "row",
                    label: "מכירות",
                    value:
                        String(
                            report.saleCount,
                        ),
                },
                {
                    type: "row",
                    label: "החזרות",
                    value:
                        String(
                            report.returnCount,
                        ),
                },
                {
                    type: "row",
                    label: "החלפות",
                    value:
                        String(
                            report.exchangeCount,
                        ),
                },
                {
                    type: "separator",
                },
                {
                    type: "text",
                    value:
                        "סיכום מכירות",
                    bold: true,
                },
                {
                    type: "row",
                    label: "סה״כ מכירות",
                    value:
                        money(
                            report.grossSales,
                        ),
                },
                {
                    type: "row",
                    label: "החזרות / זיכויים",
                    value:
                        money(
                            report.returnsTotal,
                        ),
                },
                {
                    type: "row",
                    label: "מחזור נטו",
                    value:
                        money(
                            report.netSales,
                        ),
                    bold: true,
                },
                {
                    type: "row",
                    label: "הנחות",
                    value:
                        money(
                            report.discountTotal,
                        ),
                },
                {
                    type: "separator",
                },
                {
                    type: "text",
                    value:
                        "מזומן בקופה",
                    bold: true,
                },
                {
                    type: "row",
                    label: "יתרת פתיחה",
                    value:
                        money(
                            report.openingCash,
                        ),
                },
                {
                    type: "row",
                    label: "תקבולי מזומן",
                    value:
                        money(
                            report.cashPayments,
                        ),
                },
                {
                    type: "row",
                    label: "הפקדות לקופה",
                    value:
                        money(
                            report.cashIn,
                        ),
                },
                {
                    type: "row",
                    label: "משיכות מהקופה",
                    value:
                        money(
                            -Math.abs(
                                report.cashOut,
                            ),
                        ),
                },
                {
                    type: "row",
                    label: "תנועת מזומן נטו",
                    value:
                        money(
                            report.netCashMovement,
                        ),
                },
                {
                    type: "row",
                    label: "מזומן צפוי בקופה",
                    value:
                        money(
                            report.expectedCash,
                        ),
                    bold: true,
                },
                {
                    type: "separator",
                },
                {
                    type: "text",
                    value:
                        "אמצעי תשלום",
                    bold: true,
                },
            );

            for (
                const payment
                of report.paymentTotals
            ) {
                blocks.push({
                    type: "row",
                    label:
                        `${paymentName(
                            payment.method,
                        )} (${payment.paymentCount})`,
                    value:
                        money(
                            payment.amount,
                        ),
                });
            }

            blocks.push(
                {
                    type: "separator",
                },
                {
                    type: "text",
                    value:
                        "דוח X אינו סוגר את המשמרת",
                    bold: true,
                    alignment:
                        "center",
                },
                {
                    type: "text",
                    value:
                        "הופק באמצעות Lumora",
                    alignment:
                        "center",
                },
            );

            return {
                id:
                    `x-${report.shiftId}-${report.generatedAt}`,

                documentType:
                    "shift-x",

                title:
                    `דוח X — ${reportBusinessName}`,

                direction:
                    "rtl",

                blocks,
            };
        };

    const openPrintPreview = () => {
        setPrintPreviewHtml(
            renderThermalDocumentHtml(
                createPrintDocument(),
                printProfile,
            ),
        );
    };

    const summaryRows = [
        {
            label: "סה״כ מכירות",
            value: report.grossSales,
        },
        {
            label: "החזרות / זיכויים",
            value: report.returnsTotal,
        },
        {
            label: "מחזור נטו",
            value: report.netSales,
            strong: true,
        },
        {
            label: "הנחות",
            value: report.discountTotal,
        },
    ];

    const cashRows = [
        {
            label: "יתרת פתיחה",
            value: report.openingCash,
        },
        {
            label: "תקבולי מזומן",
            value: report.cashPayments,
        },
        {
            label: "הפקדות לקופה",
            value: report.cashIn,
        },
        {
            label: "משיכות מהקופה",
            value: -Math.abs(
                report.cashOut,
            ),
        },
        {
            label: "תנועת מזומן נטו",
            value: report.netCashMovement,
        },
    ];

    return (
        <div
            className="shift-x-report__backdrop"
            dir={direction}
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    onClose();
                }
            }}
        >
            <section
                aria-labelledby="shift-x-report-title"
                aria-modal="true"
                className="shift-x-report"
                role="dialog"
            >
                <header className="shift-x-report__header">
                    <div>
                        <div className="shift-x-report__eyebrow">
                            LUMORA X REPORT
                        </div>

                        <h2 id="shift-x-report-title">
                            דוח X
                        </h2>

                        <p>
                            {reportBusinessName}
                            {" · "}
                            {reportBranchName}
                            {" · "}
                            קופה {report.registerCode}
                            {" · "}
                            נפתחה {dateTimeFormatter.format(
                                new Date(
                                    report.openedAt,
                                ),
                            )}
                        </p>
                    </div>

                    <button
                        aria-label="סגירת דוח X"
                        className="shift-x-report__close"
                        onClick={onClose}
                        type="button"
                    >
                        ×
                    </button>
                </header>

                <div className="shift-x-report__body">
                    <section
                        aria-label="ספירת עסקאות"
                        className="shift-x-report__stats"
                    >
                        <div>
                            <span>
                                עסקאות
                            </span>
                            <strong>
                                {report.transactionCount}
                            </strong>
                        </div>

                        <div>
                            <span>
                                מכירות
                            </span>
                            <strong>
                                {report.saleCount}
                            </strong>
                        </div>

                        <div>
                            <span>
                                החזרות
                            </span>
                            <strong>
                                {report.returnCount}
                            </strong>
                        </div>

                        <div>
                            <span>
                                החלפות
                            </span>
                            <strong>
                                {report.exchangeCount}
                            </strong>
                        </div>
                    </section>

                    <div className="shift-x-report__columns">
                        <section className="shift-x-report__card">
                            <h3>
                                סיכום מכירות
                            </h3>

                            <div className="shift-x-report__rows">
                                {summaryRows.map(
                                    (row) => (
                                        <div
                                            className={
                                                row.strong
                                                    ? "shift-x-report__row shift-x-report__row--strong"
                                                    : "shift-x-report__row"
                                            }
                                            key={row.label}
                                        >
                                            <span>
                                                {row.label}
                                            </span>

                                            <strong
                                                className={
                                                    row.value < 0
                                                        ? "shift-x-report__money shift-x-report__money--negative"
                                                        : "shift-x-report__money"
                                                }
                                                dir="ltr"
                                            >
                                                {money(
                                                    row.value,
                                                )}
                                            </strong>
                                        </div>
                                    ),
                                )}
                            </div>
                        </section>

                        <section className="shift-x-report__card">
                            <h3>
                                מזומן בקופה
                            </h3>

                            <div className="shift-x-report__rows">
                                {cashRows.map(
                                    (row) => (
                                        <div
                                            className="shift-x-report__row"
                                            key={row.label}
                                        >
                                            <span>
                                                {row.label}
                                            </span>

                                            <strong
                                                className={
                                                    row.value < 0
                                                        ? "shift-x-report__money shift-x-report__money--negative"
                                                        : "shift-x-report__money"
                                                }
                                                dir="ltr"
                                            >
                                                {money(
                                                    row.value,
                                                )}
                                            </strong>
                                        </div>
                                    ),
                                )}
                            </div>

                            <div className="shift-x-report__expected">
                                <span>
                                    מזומן צפוי בקופה
                                </span>

                                <strong
                                    className="shift-x-report__money"
                                    dir="ltr"
                                >
                                    {money(
                                        report.expectedCash,
                                    )}
                                </strong>
                            </div>
                        </section>
                    </div>

                    <section className="shift-x-report__card">
                        <h3>
                            אמצעי תשלום
                        </h3>

                        <div className="shift-x-report__table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>
                                            אמצעי תשלום
                                        </th>
                                        <th>
                                            מספר עסקאות
                                        </th>
                                        <th>
                                            סכום
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {report.paymentTotals.length === 0 ? (
                                        <tr>
                                            <td
                                                className="shift-x-report__empty"
                                                colSpan={3}
                                            >
                                                אין תשלומים במשמרת
                                            </td>
                                        </tr>
                                    ) : (
                                        report.paymentTotals.map(
                                            (payment) => (
                                                <tr
                                                    key={payment.method}
                                                >
                                                    <td>
                                                        {paymentName(
                                                            payment.method,
                                                        )}
                                                    </td>
                                                    <td>
                                                        {payment.paymentCount}
                                                    </td>
                                                    <td
                                                        className={
                                                            payment.amount < 0
                                                                ? "shift-x-report__money shift-x-report__money--negative"
                                                                : "shift-x-report__money"
                                                        }
                                                        dir="ltr"
                                                    >
                                                        {money(
                                                            payment.amount,
                                                        )}
                                                    </td>
                                                </tr>
                                            ),
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                </div>

                <footer className="shift-x-report__footer">
                    <button
                        className="shift-x-report__secondary"
                        onClick={onClose}
                        type="button"
                    >
                        סגור
                    </button>

                    <button
                        className="shift-x-report__print"
                        onClick={openPrintPreview}
                        type="button"
                    >
                        תצוגה מקדימה להדפסה
                    </button>
                </footer>
            </section>

            {printPreviewHtml !== null && (
                <div
                    className="shift-x-report__preview-backdrop"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setPrintPreviewHtml(
                                null,
                            );
                        }
                    }}
                >
                    <section
                        aria-labelledby="shift-x-report-preview-title"
                        aria-modal="true"
                        className="shift-x-report__preview"
                        role="dialog"
                    >
                        <header className="shift-x-report__preview-header">
                            <div>
                                <h3 id="shift-x-report-preview-title">
                                    תצוגה מקדימה להדפסה
                                </h3>

                                <p>
                                    מדפסת הקופה · {printProfile.label}
                                </p>
                            </div>

                            <button
                                aria-label="סגירת תצוגה מקדימה"
                                className="shift-x-report__close"
                                onClick={() =>
                                    setPrintPreviewHtml(
                                        null,
                                    )
                                }
                                type="button"
                            >
                                ×
                            </button>
                        </header>

                        <div className="shift-x-report__preview-body">
                            <iframe
                                ref={previewFrameRef}
                                srcDoc={printPreviewHtml}
                                title="תצוגה מקדימה של דוח X"
                            />
                        </div>

                        <footer className="shift-x-report__preview-footer">
                            <button
                                className="shift-x-report__secondary"
                                onClick={() =>
                                    setPrintPreviewHtml(
                                        null,
                                    )
                                }
                                type="button"
                            >
                                סגור
                            </button>

                            <button
                                className="shift-x-report__print"
                                onClick={() =>
                                    previewFrameRef.current
                                        ?.contentWindow
                                        ?.print()
                                }
                                type="button"
                            >
                                הדפס
                            </button>
                        </footer>
                    </section>
                </div>
            )}
        </div>
    );
}

export default ShiftXReportDialog;
