import { useMemo, useState } from "react";

import { getTransactions } from "../../models/transaction/TransactionRepository";
import {
    filterTransactions,
} from "../../models/transaction/TransactionFilters";

import "./transactions-page.css";

function TransactionsPage() {
    const [search, setSearch] =
        useState("");

    const transactions = useMemo(
        () =>
            filterTransactions(
                getTransactions(),
                {
                    text: search,
                },
            ),
        [search],
    );

    return (
        <section className="transactions-page">
            <header className="transactions-page__header">
                <div>
                    <p>עסקאות</p>
                    <h1>היסטוריית עסקאות</h1>
                </div>

                <input
                    type="search"
                    placeholder="מספר עסקה / מוצר / SKU / ברקוד"
                    value={search}
                    onChange={(e) =>
                        setSearch(e.target.value)
                    }
                />
            </header>

            <table className="transactions-table">
                <thead>
                    <tr>
                        <th>עסקה</th>
                        <th>תאריך</th>
                        <th>פריטים</th>
                        <th>סה"כ</th>
                        <th>סטטוס</th>
                        <th></th>
                    </tr>
                </thead>

                <tbody>
                    {transactions.map((sale) => (
                        <tr key={sale.id}>
                            <td>{sale.number}</td>

                            <td>
                                {new Date(
                                    sale.completedAt ??
                                    sale.createdAt,
                                ).toLocaleString("he-IL")}
                            </td>

                            <td>{sale.lines.length}</td>

                            <td>
                                ₪{sale.total.toFixed(2)}
                            </td>

                            <td>הושלמה</td>

                            <td>
                                <button type="button">
                                    פתח
                                </button>
                            </td>
                        </tr>
                    ))}

                    {transactions.length === 0 && (
                        <tr>
                            <td
                                colSpan={6}
                                className="transactions-table__empty"
                            >
                                אין עסקאות
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </section>
    );
}

export default TransactionsPage;