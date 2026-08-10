import {
    useMemo,
    useState,
} from "react";

import type {
    MonetaryValue,
} from "../../models/monetary-value/MonetaryValue";
import {
    getMonetaryValues,
    getMovementsForMonetaryValue,
} from "../../models/monetary-value/MonetaryValueRepository";

import "./stored-value-management-page.css";

const statusLabels:
    Record<
        MonetaryValue["status"],
        string
    > = {
        active:
            "פעיל",
        depleted:
            "מומש",
        expired:
            "פג תוקף",
        blocked:
            "חסום",
        cancelled:
            "מבוטל",
    };

function GiftCardManagementPage() {
    const [
        values,
    ] =
        useState<MonetaryValue[]>(
            () =>
                getMonetaryValues(),
        );

    const [
        query,
        setQuery,
    ] = useState("");

    const [
        selectedId,
        setSelectedId,
    ] =
        useState<string | null>(
            null,
        );

    const selected =
        values.find(
            (value) =>
                value.id ===
                selectedId,
        ) ?? null;

    const movements =
        useMemo(
            () =>
                selected
                    ? getMovementsForMonetaryValue(
                          selected.id,
                      )
                    : [],
            [selected],
        );

    const visible =
        useMemo(() => {
            const normalized =
                query
                    .trim()
                    .toLowerCase();

            return values
                .filter(
                    (value) =>
                        value.type ===
                        "gift_card",
                )
                .filter(
                    (value) =>
                        !normalized ||
                        value.number
                            .toLowerCase()
                            .includes(
                                normalized,
                            ) ||
                        (
                            value.customerId ??
                            ""
                        )
                            .toLowerCase()
                            .includes(
                                normalized,
                            ),
                );
        }, [
            values,
            query,
        ]);

    return (
        <section
            className="stored-value-management"
            dir="rtl"
        >
            <header className="stored-value-management__header">
                <div>
                    <p>
                        GIFT CARDS
                    </p>

                    <h1>
                        Gift Cards
                    </h1>

                    <span>
                        מסך נפרד לצפייה ביתרות ובהיסטוריית מימוש של Gift Cards.
                    </span>
                </div>
            </header>

            <div className="stored-value-management__toolbar">
                <input
                    type="search"
                    placeholder="חיפוש לפי מספר או לקוח"
                    value={
                        query
                    }
                    onChange={(
                        event,
                    ) =>
                        setQuery(
                            event
                                .target
                                .value,
                        )
                    }
                />

                <strong>
                    {
                        visible.length
                    }{" "}
                    כרטיסים
                </strong>
            </div>

            <div className="stored-value-management__layout">
                <div className="stored-value-management__table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>
                                    מספר
                                </th>
                                <th>
                                    סכום מקורי
                                </th>
                                <th>
                                    יתרה
                                </th>
                                <th>
                                    לקוח
                                </th>
                                <th>
                                    תוקף
                                </th>
                                <th>
                                    סטטוס
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {visible.map(
                                (
                                    value,
                                ) => (
                                    <tr
                                        key={
                                            value.id
                                        }
                                        onClick={() =>
                                            setSelectedId(
                                                value.id,
                                            )
                                        }
                                    >
                                        <td>
                                            <strong>
                                                {
                                                    value.number
                                                }
                                            </strong>
                                        </td>

                                        <td>
                                            ₪
                                            {value.originalAmount.toFixed(
                                                2,
                                            )}
                                        </td>

                                        <td>
                                            ₪
                                            {value.remainingAmount.toFixed(
                                                2,
                                            )}
                                        </td>

                                        <td>
                                            {value.customerId ??
                                                "—"}
                                        </td>

                                        <td>
                                            {value.expiresAt
                                                ? new Date(
                                                      value.expiresAt,
                                                  ).toLocaleDateString(
                                                      "he-IL",
                                                  )
                                                : "ללא תוקף"}
                                        </td>

                                        <td>
                                            {
                                                statusLabels[
                                                    value.status
                                                ]
                                            }
                                        </td>
                                    </tr>
                                ),
                            )}
                        </tbody>
                    </table>
                </div>

                <aside className="stored-value-management__details">
                    {!selected ? (
                        <div className="stored-value-management__empty">
                            בחר Gift Card להצגת היסטוריה.
                        </div>
                    ) : (
                        <>
                            <h2>
                                {
                                    selected.number
                                }
                            </h2>

                            <div className="stored-value-management__summary">
                                <span>
                                    יתרה זמינה
                                </span>

                                <strong>
                                    ₪
                                    {selected.remainingAmount.toFixed(
                                        2,
                                    )}
                                </strong>
                            </div>

                            <h3>
                                תנועות
                            </h3>

                            <div className="stored-value-management__movements">
                                {movements.length ===
                                0 ? (
                                    <span>
                                        אין תנועות.
                                    </span>
                                ) : (
                                    movements.map(
                                        (
                                            movement,
                                        ) => (
                                            <div
                                                key={
                                                    movement.id
                                                }
                                            >
                                                <strong>
                                                    {
                                                        movement.type
                                                    }
                                                </strong>

                                                <span>
                                                    {movement.amount >
                                                    0
                                                        ? "+"
                                                        : ""}
                                                    ₪
                                                    {movement.amount.toFixed(
                                                        2,
                                                    )}
                                                </span>

                                                <small>
                                                    {new Date(
                                                        movement.createdAt,
                                                    ).toLocaleString(
                                                        "he-IL",
                                                    )}
                                                </small>
                                            </div>
                                        ),
                                    )
                                )}
                            </div>
                        </>
                    )}
                </aside>
            </div>
        </section>
    );
}

export default GiftCardManagementPage;
