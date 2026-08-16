import {
    useState,
} from "react";

import {
    defaultPaymentMethods,
} from "../../models/PaymentMethod";

import type {
    ShiftZReport,
} from "../../models/shift/ShiftZReport";

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

type ShiftZReportDialogProps = {
    report: ShiftZReport;
    onClose: () => void;
};

function money(
    value: number,
) {
    return `₪${value.toFixed(2)}`;
}

function ShiftZReportDialog({
    report,
    onClose,
}: ShiftZReportDialogProps) {
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
            id: report.id,

            documentType:
                "shift-z",

            title:
                `דוח Z ${report.number}`,

            direction:
                "rtl",

            blocks: [
                {
                    type:
                        "text",
                    value:
                        "LUMORA",
                    bold:
                        true,
                    alignment:
                        "center",
                },
                {
                    type:
                        "text",
                    value:
                        "דוח Z",
                    bold:
                        true,
                    alignment:
                        "center",
                },
                {
                    type:
                        "text",
                    value:
                        report.number,
                    alignment:
                        "center",
                },

                {
                    type:
                        "separator",
                },

                {
                    type:
                        "row",
                    label:
                        "קופה",
                    value:
                        report.registerCode,
                },
                {
                    type:
                        "row",
                    label:
                        "פתיחה",
                    value:
                        new Date(
                            report.openedAt,
                        ).toLocaleString(
                            "he-IL",
                        ),
                },
                {
                    type:
                        "row",
                    label:
                        "סגירה",
                    value:
                        new Date(
                            report.closedAt,
                        ).toLocaleString(
                            "he-IL",
                        ),
                },
                {
                    type:
                        "row",
                    label:
                        "פותח",
                    value:
                        report.openedBy
                            .employeeName,
                },
                {
                    type:
                        "row",
                    label:
                        "סוגר",
                    value:
                        report.closedBy
                            .employeeName,
                },

                {
                    type:
                        "separator",
                },

                {
                    type:
                        "row",
                    label:
                        "עסקאות",
                    value:
                        String(
                            report.transactionCount,
                        ),
                },
                {
                    type:
                        "row",
                    label:
                        "מכירות",
                    value:
                        String(
                            report.saleCount,
                        ),
                },
                {
                    type:
                        "row",
                    label:
                        "החזרות",
                    value:
                        String(
                            report.returnCount,
                        ),
                },
                {
                    type:
                        "row",
                    label:
                        "החלפות",
                    value:
                        String(
                            report.exchangeCount,
                        ),
                },

                {
                    type:
                        "separator",
                },

                {
                    type:
                        "row",
                    label:
                        "מכירות",
                    value:
                        money(
                            report.grossSales,
                        ),
                },
                {
                    type:
                        "row",
                    label:
                        "החזרות / זיכויים",
                    value:
                        money(
                            report.returnsTotal,
                        ),
                },
                {
                    type:
                        "row",
                    label:
                        "מחזור נטו",
                    value:
                        money(
                            report.netSales,
                        ),
                    bold:
                        true,
                },
                {
                    type:
                        "row",
                    label:
                        "הנחות",
                    value:
                        money(
                            report.discountTotal,
                        ),
                },

                {
                    type:
                        "separator",
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
                                `${payment.paymentCount} עסקאות`,
                        },
                    ],
                ),

                {
                    type:
                        "separator",
                },

                {
                    type:
                        "row",
                    label:
                        "הצהרת פתיחה",
                    value:
                        money(
                            report.openingCash,
                        ),
                },
                {
                    type:
                        "row",
                    label:
                        "תקבולי מזומן",
                    value:
                        money(
                            report.cashPayments,
                        ),
                },
                {
                    type:
                        "row",
                    label:
                        "מזומן צפוי",
                    value:
                        money(
                            report.expectedCash,
                        ),
                },
                {
                    type:
                        "row",
                    label:
                        "הצהרת סגירה",
                    value:
                        money(
                            report.closingCash,
                        ),
                },
                {
                    type:
                        "row",
                    label:
                        "הפרש מזומן",
                    value:
                        money(
                            report.cashVariance,
                        ),
                    bold:
                        true,
                },

                {
                    type:
                        "separator",
                },

                {
                    type:
                        "text",
                    value:
                        "סוף דוח Z",
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
                position:
                    "fixed",
                inset:
                    0,
                zIndex:
                    16000,
                display:
                    "grid",
                placeItems:
                    "center",
                padding:
                    "24px",
                background:
                    "rgba(15,23,42,.46)",
            }}
        >
            <section
                style={{
                    width:
                        "min(720px, 95vw)",
                    maxHeight:
                        "90vh",
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
                        display:
                            "flex",
                        justifyContent:
                            "space-between",
                        gap:
                            "20px",
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
                            Z REPORT
                        </div>

                        <h2
                            style={{
                                margin:
                                    "4px 0",
                            }}
                        >
                            דוח Z
                        </h2>

                        <div>
                            {
                                report.number
                            }
                            {" · "}
                            קופה{" "}
                            {
                                report.registerCode
                            }
                        </div>
                    </div>
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
                                פתיחת משמרת
                            </td>
                            <td>
                                {
                                    new Date(
                                        report.openedAt,
                                    ).toLocaleString(
                                        "he-IL",
                                    )
                                }
                            </td>
                        </tr>

                        <tr>
                            <td>
                                סגירת משמרת
                            </td>
                            <td>
                                {
                                    new Date(
                                        report.closedAt,
                                    ).toLocaleString(
                                        "he-IL",
                                    )
                                }
                            </td>
                        </tr>

                        <tr>
                            <td>
                                פותח
                            </td>
                            <td>
                                {
                                    report.openedBy
                                        .employeeName
                                }
                            </td>
                        </tr>

                        <tr>
                            <td>
                                סוגר
                            </td>
                            <td>
                                {
                                    report.closedBy
                                        .employeeName
                                }
                            </td>
                        </tr>

                        <tr>
                            <td>
                                מספר עסקאות
                            </td>
                            <td>
                                {
                                    report.transactionCount
                                }
                            </td>
                        </tr>

                        <tr>
                            <td>
                                מכירות
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
                                מכירות
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
                                הצהרת פתיחה
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
                                מזומן צפוי
                            </td>
                            <td>
                                {
                                    money(
                                        report.expectedCash,
                                    )
                                }
                            </td>
                        </tr>

                        <tr>
                            <td>
                                הצהרת סגירה
                            </td>
                            <td>
                                {
                                    money(
                                        report.closingCash,
                                    )
                                }
                            </td>
                        </tr>

                        <tr>
                            <td>
                                הפרש מזומן
                            </td>
                            <td>
                                <strong>
                                    {
                                        money(
                                            report.cashVariance,
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
                            htmlFor="z-paper-profile"
                        >
                            רוחב נייר
                        </label>

                        <select
                            id="z-paper-profile"
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

export default ShiftZReportDialog;