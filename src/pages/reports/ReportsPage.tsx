import {
    useMemo,
    useState,
} from "react";

import {
    builtInReports,
    generateReport,
} from "../../models/report/ReportEngine";
import type {
    ReportId,
} from "../../models/report/Report";
import type {
    ReportFilters,
} from "../../models/report/ReportFilters";
import {
    createTodayReportFilters,
} from "../../models/report/ReportFilters";
import {
    getActiveSellers,
} from "../../models/employee/EmployeeSeed";
import {
    defaultPaymentMethods,
} from "../../models/PaymentMethod";
import {
    getActiveBusinessConfiguration,
} from "../../config/ActiveBusinessConfiguration";

import "./reports-page.css";

function ReportsPage() {
    const [
        selectedReportId,
        setSelectedReportId,
    ] =
        useState<ReportId>(
            "sales-summary",
        );

    const [
        filters,
        setFilters,
    ] =
        useState<ReportFilters>(
            createTodayReportFilters,
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

    const resetFilters = () => {
        setFilters(
            createTodayReportFilters(),
        );
    };

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
            ],
        );

    return (
        <section
            className="reports-page"
            dir="rtl"
        >
            <header className="reports-page__header">
                <div>
                    <p>
                        REPORTS
                    </p>

                    <h1>
                        דוחות
                    </h1>

                    <span>
                        דוחות מובנים ויצוא נתונים
                    </span>
                </div>

                <button
                    type="button"
                    onClick={() =>
                        window.print()
                    }
                >
                    הדפס
                </button>
            </header>

            <div
                className="reports-page__filters"
                style={{
                    display:
                        "flex",
                    alignItems:
                        "end",
                    gap:
                        "10px",
                    flexWrap:
                        "wrap",
                    padding:
                        "12px",
                    marginBottom:
                        "16px",
                    border:
                        "1px solid #dfe4e2",
                    borderRadius:
                        "10px",
                    background:
                        "#fff",
                }}
            >
                <label>
                    מתאריך
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
                        style={{
                            display:
                                "block",
                        }}
                    />
                </label>

                <label>
                    עד תאריך
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
                        style={{
                            display:
                                "block",
                        }}
                    />
                </label>

                <label>
                    קופה
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
                        style={{
                            display:
                                "block",
                        }}
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
                    מוכרן
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
                        style={{
                            display:
                                "block",
                        }}
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
                    אמצעי תשלום
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
                        style={{
                            display:
                                "block",
                        }}
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
                    סוג עסקה
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
                        style={{
                            display:
                                "block",
                        }}
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

                <button
                    type="button"
                    onClick={
                        resetFilters
                    }
                >
                    היום
                </button>
            </div>

            <div className="reports-page__layout">
                <aside className="reports-page__catalog">
                    {builtInReports.map(
                        (
                            definition,
                        ) => (
                            <button
                                key={
                                    definition.id
                                }
                                type="button"
                                className={
                                    definition.id ===
                                    selectedReportId
                                        ? "reports-page__report-button reports-page__report-button--active"
                                        : "reports-page__report-button"
                                }
                                onClick={() =>
                                    setSelectedReportId(
                                        definition.id,
                                    )
                                }
                            >
                                <strong>
                                    {
                                        definition.title
                                    }
                                </strong>

                                <span>
                                    {
                                        definition.description
                                    }
                                </span>
                            </button>
                        ),
                    )}
                </aside>

                <article className="reports-page__report">
                    <header>
                        <div>
                            <h2>
                                {
                                    report.title
                                }
                            </h2>

                            <span>
                                הופק:{" "}
                                {new Date(
                                    report.generatedAt,
                                ).toLocaleString(
                                    "he-IL",
                                )}
                            </span>
                        </div>
                    </header>

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
                                                        {
                                                            row.values[
                                                                column.id
                                                            ] ??
                                                            ""
                                                        }
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
                                            colSpan={
                                                report.columns
                                                    .length
                                            }
                                        >
                                            אין נתונים להצגה
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {report.totals &&
                        report.totals.length >
                            0 && (
                            <footer className="reports-page__totals">
                                {report.totals.map(
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
            </div>
        </section>
    );
}

export default ReportsPage;