import {
    useState,
} from "react";

import {
    getShiftZReports,
} from "../../models/shift/ShiftZReportRepository";

import type {
    ShiftZReport,
} from "../../models/shift/ShiftZReport";

import ShiftZReportDialog from "./ShiftZReportDialog";

function money(
    value: number,
) {
    return `₪${value.toFixed(2)}`;
}

function ShiftZHistory() {
    const [
        selectedReport,
        setSelectedReport,
    ] =
        useState<ShiftZReport | null>(
            null,
        );

    const reports =
        getShiftZReports()
            .slice()
            .sort(
                (a, b) =>
                    new Date(
                        b.closedAt,
                    ).getTime() -
                    new Date(
                        a.closedAt,
                    ).getTime(),
            );

    return (
        <>
            <section
                dir="rtl"
                style={{
                    display:
                        "grid",
                    gap:
                        "16px",
                }}
            >
                <header>
                    <h2
                        style={{
                            margin:
                                "0 0 4px",
                        }}
                    >
                        היסטוריית דוחות Z
                    </h2>

                    <span>
                        דוחות סגירת קופה שמורים
                    </span>
                </header>

                <div
                    style={{
                        overflowX:
                            "auto",
                    }}
                >
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
                                    מספר Z
                                </th>

                                <th>
                                    תאריך סגירה
                                </th>

                                <th>
                                    קופה
                                </th>

                                <th>
                                    סוגר
                                </th>

                                <th>
                                    עסקאות
                                </th>

                                <th>
                                    מחזור נטו
                                </th>

                                <th>
                                    הפרש מזומן
                                </th>

                                <th>
                                    פעולה
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {reports.map(
                                (
                                    report,
                                ) => (
                                    <tr
                                        key={
                                            report.id
                                        }
                                    >
                                        <td>
                                            <strong>
                                                {
                                                    report.number
                                                }
                                            </strong>
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

                                        <td>
                                            {
                                                report.registerCode
                                            }
                                        </td>

                                        <td>
                                            {
                                                report.closedBy.employeeName
                                            }
                                        </td>

                                        <td>
                                            {
                                                report.transactionCount
                                            }
                                        </td>

                                        <td>
                                            {
                                                money(
                                                    report.netSales,
                                                )
                                            }
                                        </td>

                                        <td>
                                            {
                                                money(
                                                    report.cashVariance,
                                                )
                                            }
                                        </td>

                                        <td>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSelectedReport(
                                                        report,
                                                    )
                                                }
                                            >
                                                צפייה / הדפסה
                                            </button>
                                        </td>
                                    </tr>
                                ),
                            )}

                            {reports.length ===
                                0 && (
                                <tr>
                                    <td
                                        colSpan={
                                            8
                                        }
                                    >
                                        אין דוחות Z שמורים.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {selectedReport && (
                <ShiftZReportDialog
                    report={
                        selectedReport
                    }
                    onClose={() =>
                        setSelectedReport(
                            null,
                        )
                    }
                />
            )}
        </>
    );
}

export default ShiftZHistory;