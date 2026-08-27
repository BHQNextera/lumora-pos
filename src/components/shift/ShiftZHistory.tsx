import { formatMoney as money } from "../../utils/MoneyFormatter";

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


function dateOnly(
    value: string,
) {
    return new Date(
        value,
    ).toLocaleDateString(
        "he-IL",
    );
}

function timeOnly(
    value: string,
) {
    return new Date(
        value,
    ).toLocaleTimeString(
        "he-IL",
        {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        },
    );
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
                className="shift-z-history"
                dir="rtl"
            >
                <header className="shift-z-history__header">
                    <div>
                        <h2>
                            דוחות סגירת קופה
                        </h2>

                        <span>
                            פתיחה וסגירה, מחזור והפרשי מזומן לכל Z
                        </span>
                    </div>

                    <small>
                        {reports.length} דוחות
                    </small>
                </header>

                <div className="shift-z-history__table-wrap">
                    <table className="shift-z-history__table">
                        <colgroup>
                            <col className="shift-z-history__col shift-z-history__col--z" />
                            <col className="shift-z-history__col shift-z-history__col--date" />
                            <col className="shift-z-history__col shift-z-history__col--time" />
                            <col className="shift-z-history__col shift-z-history__col--time" />
                            <col className="shift-z-history__col shift-z-history__col--register" />
                            <col className="shift-z-history__col shift-z-history__col--closer" />
                            <col className="shift-z-history__col shift-z-history__col--transactions" />
                            <col className="shift-z-history__col shift-z-history__col--money" />
                            <col className="shift-z-history__col shift-z-history__col--money" />
                            <col className="shift-z-history__col shift-z-history__col--action" />
                        </colgroup>

                        <thead>
                            <tr>
                                <th>
                                    מספר Z
                                </th>

                                <th>
                                    תאריך
                                </th>

                                <th>
                                    שעת פתיחה
                                </th>

                                <th>
                                    שעת סגירה
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
                                        <td className="shift-z-history__z-number">
                                            {
                                                report.number
                                            }
                                        </td>

                                        <td className="shift-z-history__date">
                                            {
                                                dateOnly(
                                                    report.closedAt,
                                                )
                                            }
                                        </td>

                                        <td className="shift-z-history__time">
                                            {
                                                timeOnly(
                                                    report.openedAt,
                                                )
                                            }
                                        </td>

                                        <td className="shift-z-history__time">
                                            {
                                                timeOnly(
                                                    report.closedAt,
                                                )
                                            }
                                        </td>

                                        <td className="shift-z-history__numeric">
                                            {
                                                report.registerCode
                                            }
                                        </td>

                                        <td className="shift-z-history__closer">
                                            {
                                                report.closedBy.employeeName
                                            }
                                        </td>

                                        <td className="shift-z-history__numeric">
                                            {
                                                report.transactionCount
                                            }
                                        </td>

                                        <td className="shift-z-history__money">
                                            {
                                                money(
                                                    report.netSales,
                                                )
                                            }
                                        </td>

                                        <td className="shift-z-history__money">
                                            {
                                                money(
                                                    report.cashVariance,
                                                )
                                            }
                                        </td>

                                        <td className="shift-z-history__action-cell">
                                            <button
                                                className="shift-z-history__action"
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
                                        className="shift-z-history__empty"
                                        colSpan={
                                            10
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
