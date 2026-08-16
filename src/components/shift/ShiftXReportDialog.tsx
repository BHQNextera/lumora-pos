import {
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
    openThermalPrintPreview,
} from "../../models/printing/ThermalReportRenderer";

import {
    thermalPrintProfiles,
} from "../../models/printing/ThermalPrintProfile";

import type {
    ThermalPaperProfileId,
} from "../../models/printing/ThermalPrintProfile";

import type {
    ThermalPrintDocument,
} from "../../models/printing/ThermalPrintDocument";

type ShiftXReportDialogProps = {
    shift: RegisterShift;
    onClose: () => void;
};

function money(
    value: number,
) {
    return `₪${value.toFixed(2)}`;
}

function ShiftXReportDialog({
    shift,
    onClose,
}: ShiftXReportDialogProps) {
    const report =
        generateShiftXReport(
            shift,
        );

    const [
        printProfileId,
        setPrintProfileId,
    ] =
        useState<ThermalPaperProfileId>(
            "thermal-80",
        );

    const paymentName = (
        method: string,
    ) =>
        defaultPaymentMethods.find(
            (item) =>
                item.code === method,
        )?.name ?? method;

    const createPrintDocument =
        (): ThermalPrintDocument => ({
            id:
                `x-${report.shiftId}-${report.generatedAt}`,

            documentType:
                "shift-x",

            title:
                `דוח X קופה ${report.registerCode}`,

            direction:
                "rtl",

            blocks: [
                {
                    type: "text",
                    value: "LUMORA",
                    bold: true,
                    alignment: "center",
                },
                {
                    type: "text",
                    value: "דוח X",
                    bold: true,
                    alignment: "center",
                },
                {
                    type: "text",
                    value:
                        new Date(
                            report.generatedAt,
                        ).toLocaleString(
                            "he-IL",
                        ),
                    alignment: "center",
                },

                {
                    type: "separator",
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
                        new Date(
                            report.openedAt,
                        ).toLocaleString(
                            "he-IL",
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
                    type: "row",
                    label: "עסקאות",
                    value:
                        String(
                            report.transactionCount,
                        ),
                },
                {
                    type: "row",
                    label: "מספר מכירות",
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
                    type: "row",
                    label: "סה״כ מכירות",
                    value:
                        money(
                            report.grossSales,
                        ),
                },
                {
                    type: "row",
                    label:
                        "החזרות / זיכויים",
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

                ...report.paymentTotals.flatMap(
                    (payment) => [
                        {
                            type:
                                "row" as const,
                            label:
                                paymentName(
                                    payment.method,
                                ),
                            value:
                                money(
                                    payment.amount,
                                ),
                        },
                        {
                            type:
                                "text" as const,
                            value:
                                `מספר עסקאות: ${payment.paymentCount}`,
                        },
                    ],
                ),

                {
                    type: "separator",
                },

                {
                    type: "row",
                    label:
                        "יתרת פתיחה",
                    value:
                        money(
                            report.openingCash,
                        ),
                },
                {
                    type: "row",
                    label:
                        "תקבולי מזומן",
                    value:
                        money(
                            report.cashPayments,
                        ),
                },
                {
                    type: "row",
                    label:
                        "הפקדות לקופה",
                    value:
                        money(
                            report.cashIn,
                        ),
                },
                {
                    type: "row",
                    label:
                        "משיכות מהקופה",
                    value:
                        money(
                            report.cashOut,
                        ),
                },
                {
                    type: "row",
                    label:
                        "תנועת מזומן נטו",
                    value:
                        money(
                            report.netCashMovement,
                        ),
                },
                {
                    type: "row",
                    label:
                        "מזומן צפוי בקופה",
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
                        "סוף דוח X",
                    alignment:
                        "center",
                },
            ],
        });

    const openPrintPreview =
        () => {
            openThermalPrintPreview(
                createPrintDocument(),
                thermalPrintProfiles[
                    printProfileId
                ],
            );
        };

    return (
        <div
            dir="rtl"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 14000,
                display: "grid",
                placeItems: "center",
                padding: "24px",
                background:
                    "rgba(15,23,42,.42)",
            }}
        >
            <section
                style={{
                    width:
                        "min(720px, 95vw)",
                    maxHeight:
                        "88vh",
                    overflow:
                        "auto",
                    padding:
                        "26px",
                    borderRadius:
                        "18px",
                    background:
                        "#fff",
                }}
            >
                <header
                    style={{
                        display: "flex",
                        justifyContent:
                            "space-between",
                        gap: "20px",
                        marginBottom:
                            "22px",
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize:
                                    "12px",
                                fontWeight:
                                    800,
                            }}
                        >
                            X REPORT
                        </div>

                        <h2
                            style={{
                                margin:
                                    "4px 0",
                            }}
                        >
                            דוח X
                        </h2>

                        <div>
                            קופה{" "}
                            {
                                report.registerCode
                            }
                            {" · "}
                            נפתחה{" "}
                            {
                                new Date(
                                    report.openedAt,
                                ).toLocaleString(
                                    "he-IL",
                                )
                            }
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                    >
                        ✕
                    </button>
                </header>

                <table
                    style={{
                        width:
                            "100%",
                        borderCollapse:
                            "collapse",
                    }}
                >
                    <tbody>
                        <tr>
                            <td>
                                עסקאות
                            </td>
                            <td>
                                {
                                    report.transactionCount
                                }
                            </td>
                        </tr>

                        <tr>
                            <td>
                                מספר מכירות
                            </td>
                            <td>
                                {
                                    report.saleCount
                                }
                            </td>
                        </tr>

                        <tr>
                            <td>
                                החזרות
                            </td>
                            <td>
                                {
                                    report.returnCount
                                }
                            </td>
                        </tr>

                        <tr>
                            <td>
                                החלפות
                            </td>
                            <td>
                                {
                                    report.exchangeCount
                                }
                            </td>
                        </tr>

                        <tr>
                            <td>
                                סה״כ מכירות
                            </td>
                            <td>
                                {
                                    money(
                                        report.grossSales,
                                    )
                                }
                            </td>
                        </tr>

                        <tr>
                            <td>
                                החזרות / זיכויים
                            </td>
                            <td>
                                {
                                    money(
                                        report.returnsTotal,
                                    )
                                }
                            </td>
                        </tr>

                        <tr>
                            <td>
                                מחזור נטו
                            </td>
                            <td>
                                <strong>
                                    {
                                        money(
                                            report.netSales,
                                        )
                                    }
                                </strong>
                            </td>
                        </tr>

                        <tr>
                            <td>
                                הנחות
                            </td>
                            <td>
                                {
                                    money(
                                        report.discountTotal,
                                    )
                                }
                            </td>
                        </tr>

                        <tr>
                            <td>
                                יתרת פתיחה
                            </td>
                            <td>
                                {
                                    money(
                                        report.openingCash,
                                    )
                                }
                            </td>
                        </tr>

                        <tr>
                            <td>
                                תקבולי מזומן
                            </td>
                            <td>
                                {
                                    money(
                                        report.cashPayments,
                                    )
                                }
                            </td>
                        </tr>

                        <tr>
                            <td>
                                הפקדות לקופה
                            </td>
                            <td>
                                {
                                    money(
                                        report.cashIn,
                                    )
                                }
                            </td>
                        </tr>

                        <tr>
                            <td>
                                משיכות מהקופה
                            </td>
                            <td>
                                {
                                    money(
                                        report.cashOut,
                                    )
                                }
                            </td>
                        </tr>

                        <tr>
                            <td>
                                תנועת מזומן נטו
                            </td>
                            <td>
                                <strong>
                                    {
                                        money(
                                            report.netCashMovement,
                                        )
                                    }
                                </strong>
                            </td>
                        </tr>

                        <tr>
                            <td>
                                מזומן צפוי בקופה
                            </td>
                            <td>
                                <strong>
                                    {
                                        money(
                                            report.expectedCash,
                                        )
                                    }
                                </strong>
                            </td>
                        </tr>
                    </tbody>
                </table>

                <h3
                    style={{
                        marginTop:
                            "26px",
                    }}
                >
                    אמצעי תשלום
                </h3>

                <table
                    style={{
                        width:
                            "100%",
                        borderCollapse:
                            "collapse",
                    }}
                >
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
                        {report.paymentTotals.map(
                            (payment) => (
                                <tr
                                    key={
                                        payment.method
                                    }
                                >
                                    <td>
                                        {
                                            paymentName(
                                                payment.method,
                                            )
                                        }
                                    </td>

                                    <td>
                                        {
                                            payment.paymentCount
                                        }
                                    </td>

                                    <td>
                                        {
                                            money(
                                                payment.amount,
                                            )
                                        }
                                    </td>
                                </tr>
                            ),
                        )}
                    </tbody>
                </table>

                <div
                    style={{
                        marginTop:
                            "24px",
                        padding:
                            "14px",
                        border:
                            "1px solid #dfe4e2",
                        borderRadius:
                            "10px",
                    }}
                >
                    <strong>
                        תצורת הדפסה
                    </strong>

                    <div
                        style={{
                            display:
                                "flex",
                            alignItems:
                                "center",
                            gap:
                                "10px",
                            marginTop:
                                "10px",
                        }}
                    >
                        <label
                            htmlFor="x-paper-profile"
                        >
                            רוחב נייר
                        </label>

                        <select
                            id="x-paper-profile"
                            value={
                                printProfileId
                            }
                            onChange={(
                                event,
                            ) =>
                                setPrintProfileId(
                                    event.target
                                        .value as ThermalPaperProfileId,
                                )
                            }
                        >
                            <option
                                value="thermal-58"
                            >
                                57 / 58 מ״מ
                            </option>

                            <option
                                value="thermal-80"
                            >
                                80 / 88 מ״מ
                            </option>
                        </select>
                    </div>
                </div>

                <div
                    style={{
                        display:
                            "flex",
                        gap:
                            "8px",
                        marginTop:
                            "24px",
                    }}
                >
                    <button
                        type="button"
                        onClick={
                            openPrintPreview
                        }
                    >
                        תצוגה מקדימה להדפסה
                    </button>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                    >
                        סגור
                    </button>
                </div>
            </section>
        </div>
    );
}

export default ShiftXReportDialog;