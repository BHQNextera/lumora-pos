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
    saveMonetaryValue,
    saveMonetaryValueMovement,
} from "../../models/monetary-value/MonetaryValueRepository";
import {
    issueMonetaryValue,
} from "../../models/monetary-value/MonetaryValueService";

import "./stored-value-management-page.css";

type IssueDraft = {
    type:
        | "credit_voucher"
        | "store_credit";
    amount: string;
    customerId: string;
    expiresAt: string;
};

const emptyDraft: IssueDraft = {
    type:
        "credit_voucher",
    amount:
        "",
    customerId:
        "",
    expiresAt:
        "",
};

const typeLabels = {
    credit_voucher:
        "זיכוי",
    store_credit:
        "יתרת לקוח",
} as const;

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

function StoredValueManagementPage() {
    const [
        values,
        setValues,
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

    const [
        showIssue,
        setShowIssue,
    ] =
        useState(false);

    const [
        draft,
        setDraft,
    ] =
        useState<IssueDraft>(
            emptyDraft,
        );

    const [
        error,
        setError,
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
                        value.type !==
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
                            ) ||
                        typeLabels[
                            value.type as
                                | "credit_voucher"
                                | "store_credit"
                        ]
                            .toLowerCase()
                            .includes(
                                normalized,
                            ),
                );
        }, [
            values,
            query,
        ]);

    const refresh = () => {
        setValues(
            getMonetaryValues(),
        );
    };

    const issue = () => {
        const amount =
            Number(
                draft.amount,
            );

        if (
            !Number.isFinite(
                amount,
            ) ||
            amount <= 0
        ) {
            setError(
                "יש להזין סכום תקין.",
            );
            return;
        }

        issueMonetaryValue({
            type:
                draft.type,

            amount,

            customerId:
                draft.customerId.trim() ||
                undefined,

            expiresAt:
                draft.expiresAt
                    ? new Date(
                          draft.expiresAt,
                      ).toISOString()
                    : undefined,
        });

        refresh();
        setDraft(
            emptyDraft,
        );
        setError(
            null,
        );
        setShowIssue(
            false,
        );
    };

    const toggleBlock = (
        value: MonetaryValue,
    ) => {
        if (
            value.status !==
                "active" &&
            value.status !==
                "blocked"
        ) {
            return;
        }

        const now =
            new Date().toISOString();

        const nextStatus =
            value.status ===
            "blocked"
                ? "active"
                : "blocked";

        saveMonetaryValue({
            ...value,
            status:
                nextStatus,
            updatedAt:
                now,
        });

        saveMonetaryValueMovement({
            id:
                crypto.randomUUID(),
            monetaryValueId:
                value.id,
            type:
                "adjustment",
            amount:
                0,
            balanceBefore:
                value.remainingAmount,
            balanceAfter:
                value.remainingAmount,
            reason:
                nextStatus ===
                "blocked"
                    ? "blocked from Lumora"
                    : "unblocked from Lumora",
            createdAt:
                now,
        });

        refresh();
    };

    return (
        <section
            className="stored-value-management"
            dir="rtl"
        >
            <header className="stored-value-management__header">
                <div>
                    <p>
                        CREDIT
                    </p>

                    <h1>
                        זיכויים ויתרות לקוח
                    </h1>

                    <span>
                        זיכויים ויתרות לקוח מנוהלים כאן. Gift Cards נמצאים במסך נפרד.
                    </span>
                </div>

                <button
                    type="button"
                    className="stored-value-management__primary"
                    onClick={() => {
                        setDraft(
                            emptyDraft,
                        );
                        setError(
                            null,
                        );
                        setShowIssue(
                            true,
                        );
                    }}
                >
                    + זיכוי חדש
                </button>
            </header>

            <div className="stored-value-management__toolbar">
                <input
                    type="search"
                    placeholder="חיפוש לפי מספר, לקוח או סוג"
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
                    רשומות
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
                                    סוג
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
                                    סטטוס
                                </th>
                                <th>
                                    פעולות
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
                                            {
                                                typeLabels[
                                                    value.type as
                                                        | "credit_voucher"
                                                        | "store_credit"
                                                ]
                                            }
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
                                            {
                                                statusLabels[
                                                    value.status
                                                ]
                                            }
                                        </td>

                                        <td>
                                            {value.status ===
                                                "active" ||
                                            value.status ===
                                                "blocked" ? (
                                                <button
                                                    type="button"
                                                    onClick={(
                                                        event,
                                                    ) => {
                                                        event.stopPropagation();
                                                        toggleBlock(
                                                            value,
                                                        );
                                                    }}
                                                >
                                                    {value.status ===
                                                    "blocked"
                                                        ? "שחרור"
                                                        : "חסימה"}
                                                </button>
                                            ) : (
                                                <span>
                                                    צפייה
                                                </span>
                                            )}
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
                            בחר רשומה להצגת היסטוריה.
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
                                    {selected.type ===
                                    "credit_voucher"
                                        ? "זיכוי"
                                        : "יתרת לקוח"}
                                </span>

                                <strong>
                                    ₪
                                    {selected.remainingAmount.toFixed(
                                        2,
                                    )}
                                </strong>
                            </div>

                            {selected.replacementMonetaryValueId && (
                                <p>
                                    לזיכוי זה הונפק זיכוי המשך לאחר מימוש חלקי.
                                </p>
                            )}

                            {selected.previousMonetaryValueId && (
                                <p>
                                    זיכוי זה נוצר מיתרה של זיכוי קודם.
                                </p>
                            )}

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

            {showIssue && (
                <div className="stored-value-management__overlay">
                    <div className="stored-value-management__dialog">
                        <header>
                            <h2>
                                זיכוי חדש
                            </h2>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowIssue(
                                        false,
                                    )
                                }
                            >
                                ×
                            </button>
                        </header>

                        <div className="stored-value-management__form">
                            <label>
                                סוג
                                <select
                                    value={
                                        draft.type
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setDraft(
                                            (
                                                current,
                                            ) => ({
                                                ...current,
                                                type:
                                                    event
                                                        .target
                                                        .value as IssueDraft["type"],
                                            }),
                                        )
                                    }
                                >
                                    <option value="credit_voucher">
                                        זיכוי
                                    </option>

                                    <option value="store_credit">
                                        יתרת לקוח
                                    </option>
                                </select>
                            </label>

                            <label>
                                סכום
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={
                                        draft.amount
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setDraft(
                                            (
                                                current,
                                            ) => ({
                                                ...current,
                                                amount:
                                                    event
                                                        .target
                                                        .value,
                                            }),
                                        )
                                    }
                                />
                            </label>

                            <label>
                                מזהה לקוח
                                <input
                                    value={
                                        draft.customerId
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setDraft(
                                            (
                                                current,
                                            ) => ({
                                                ...current,
                                                customerId:
                                                    event
                                                        .target
                                                        .value,
                                            }),
                                        )
                                    }
                                />
                            </label>

                            <label>
                                תוקף
                                <input
                                    type="datetime-local"
                                    value={
                                        draft.expiresAt
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setDraft(
                                            (
                                                current,
                                            ) => ({
                                                ...current,
                                                expiresAt:
                                                    event
                                                        .target
                                                        .value,
                                            }),
                                        )
                                    }
                                />
                            </label>

                            {error && (
                                <div className="stored-value-management__error">
                                    {
                                        error
                                    }
                                </div>
                            )}
                        </div>

                        <footer>
                            <button
                                type="button"
                                onClick={() =>
                                    setShowIssue(
                                        false,
                                    )
                                }
                            >
                                ביטול
                            </button>

                            <button
                                type="button"
                                className="stored-value-management__primary"
                                onClick={
                                    issue
                                }
                            >
                                הנפקה
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </section>
    );
}

export default StoredValueManagementPage;
