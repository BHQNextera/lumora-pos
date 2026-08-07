import {
    useMemo,
    useState,
} from "react";

import {
    getDocumentsForTransaction,
} from "../../models/document/DocumentRepository";
import type { CartLine } from "../../models/sale/CartLine";
import type {
    Sale,
    TransactionType,
} from "../../models/sale/Sale";
import {
    filterTransactions,
} from "../../models/transaction/TransactionFilters";
import {
    getTransaction,
    getTransactions,
} from "../../models/transaction/TransactionRepository";
import ReturnsPage from "../returns/ReturnsPage";
import TransactionDetailsPage from "./TransactionDetailsPage";

import "./transactions-page.css";

type TransactionsPageProps = {
    onReturnToSale: (
        lines: CartLine[],
    ) => void;
};

type TransactionsView =
    | {
        type: "list";
    }
    | {
        type: "details";
        sale: Sale;
    }
    | {
        type: "return";
        sale: Sale;
    };

type TypeFilter =
    | "all"
    | TransactionType;

function getTransactionTypeLabel(
    sale: Sale,
) {
    switch (
    sale.transactionType
    ) {
        case "return":
            return "החזרה";

        case "exchange":
            return "החלפה";

        default:
            return "מכירה";
    }
}

function getDocumentLabel(
    type?: string,
) {
    switch (type) {
        case "tax_invoice_receipt":
            return "חשבונית מס / קבלה";

        case "receipt":
            return "קבלה";

        case "tax_credit_invoice":
            return "חשבונית מס זיכוי";

        case "credit_receipt":
            return "זיכוי";

        case "exchange_note":
            return "פתק החלפה";

        case "credit_voucher":
            return "שובר זיכוי";

        case "gift_card_receipt":
            return "קבלת Gift Card";

        default:
            return "ללא מסמך";
    }
}

function getPaymentLabel(
    sale: Sale,
) {
    if (
        sale.payments.length === 0
    ) {
        return "ללא תשלום";
    }

    const methods = [
        ...new Set(
            sale.payments.map(
                (payment) =>
                    payment.method,
            ),
        ),
    ];

    return methods
        .map((method) => {
            switch (method) {
                case "cash":
                    return "מזומן";

                case "card_terminal":
                    return "אשראי";

                case "echo":
                    return "Echo";

                case "credit_voucher":
                    return "שובר זיכוי";

                case "bit":
                    return "Bit";

                case "paybox":
                    return "PayBox";

                case "bank_transfer":
                    return "העברה";

                case "cheque":
                    return "המחאה";

                default:
                    return method;
            }
        })
        .join(" + ");
}

function getOriginalDocumentNumber(
    sale: Sale,
) {
    const linkedReturnLine =
        sale.lines.find(
            (line) =>
                line.kind === "return" &&
                line.originalSaleId,
        );

    if (
        !linkedReturnLine
            ?.originalSaleId
    ) {
        return null;
    }

    const originalSale =
        getTransaction(
            linkedReturnLine.originalSaleId,
        );

    if (!originalSale) {
        return null;
    }

    const originalDocument =
        getDocumentsForTransaction(
            originalSale.id,
        )[0];

    return (
        originalDocument?.number ??
        originalSale.number
    );
}

function TransactionsPage({
    onReturnToSale,
}: TransactionsPageProps) {
    const [
        search,
        setSearch,
    ] = useState("");

    const [
        typeFilter,
        setTypeFilter,
    ] =
        useState<TypeFilter>(
            "all",
        );

    const [view, setView] =
        useState<TransactionsView>({
            type: "list",
        });

    const transactions =
        useMemo(() => {
            const base =
                filterTransactions(
                    getTransactions(),
                    {
                        text: search,
                    },
                );

            if (
                typeFilter === "all"
            ) {
                return base;
            }

            return base.filter(
                (sale) =>
                    (sale.transactionType ??
                        "sale") ===
                    typeFilter,
            );
        }, [
            search,
            typeFilter,
            view,
        ]);

    if (
        view.type === "details"
    ) {
        return (
            <TransactionDetailsPage
                sale={view.sale}
                onBack={() =>
                    setView({
                        type: "list",
                    })
                }
                onOpenReturn={(sale) =>
                    setView({
                        type: "return",
                        sale,
                    })
                }
            />
        );
    }

    if (
        view.type === "return"
    ) {
        return (
            <ReturnsPage
                sale={view.sale}
                onBack={() =>
                    setView({
                        type: "details",
                        sale: view.sale,
                    })
                }
                onContinue={
                    onReturnToSale
                }
            />
        );
    }

    return (
        <section className="transactions-page">
            <header className="transactions-page__header">
                <div>
                    <p className="transactions-page__eyebrow">
                        עסקאות
                    </p>

                    <h1>
                        עסקאות אחרונות
                    </h1>
                </div>

                <div className="transactions-page__search-wrap">
                    <span aria-hidden="true">
                        ⌕
                    </span>

                    <input
                        type="search"
                        placeholder="מספר מסמך, עסקה, מוצר, לקוח, SKU או ברקוד"
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value,
                            )
                        }
                    />

                    {search && (
                        <button
                            type="button"
                            onClick={() =>
                                setSearch("")
                            }
                        >
                            ×
                        </button>
                    )}
                </div>
            </header>

            <div className="transactions-page__toolbar">
                <div className="transactions-page__filters">
                    <button
                        type="button"
                        className={`transactions-page__filter ${typeFilter === "all"
                                ? "transactions-page__filter--active"
                                : ""
                            }`}
                        onClick={() =>
                            setTypeFilter("all")
                        }
                    >
                        הכול
                    </button>

                    <button
                        type="button"
                        className={`transactions-page__filter ${typeFilter === "sale"
                                ? "transactions-page__filter--active"
                                : ""
                            }`}
                        onClick={() =>
                            setTypeFilter("sale")
                        }
                    >
                        מכירות
                    </button>

                    <button
                        type="button"
                        className={`transactions-page__filter ${typeFilter ===
                                "exchange"
                                ? "transactions-page__filter--active"
                                : ""
                            }`}
                        onClick={() =>
                            setTypeFilter(
                                "exchange",
                            )
                        }
                    >
                        החלפות
                    </button>

                    <button
                        type="button"
                        className={`transactions-page__filter ${typeFilter ===
                                "return"
                                ? "transactions-page__filter--active"
                                : ""
                            }`}
                        onClick={() =>
                            setTypeFilter(
                                "return",
                            )
                        }
                    >
                        זיכויים
                    </button>
                </div>

                <div className="transactions-page__count">
                    <strong>
                        {transactions.length}
                    </strong>
                    <span>
                        תוצאות
                    </span>
                </div>
            </div>

            <div className="transactions-page__table-wrap">
                <table className="transactions-table">
                    <thead>
                        <tr>
                            <th>
                                מספר מסמך
                            </th>

                            <th>
                                סוג מסמך
                            </th>

                            <th>
                                עסקה
                            </th>

                            <th>
                                סוג
                            </th>

                            <th>
                                מסמך מקור
                            </th>

                            <th>
                                לקוח
                            </th>

                            <th>
                                תאריך ושעה
                            </th>

                            <th>
                                תשלום
                            </th>

                            <th>
                                סה״כ
                            </th>

                            <th>
                                סטטוס
                            </th>

                            <th />
                        </tr>
                    </thead>

                    <tbody>
                        {transactions.map(
                            (sale) => {
                                const document =
                                    getDocumentsForTransaction(
                                        sale.id,
                                    )[0];

                                const originalDocumentNumber =
                                    getOriginalDocumentNumber(
                                        sale,
                                    );

                                return (
                                    <tr
                                        key={sale.id}
                                        onDoubleClick={() =>
                                            setView({
                                                type: "details",
                                                sale,
                                            })
                                        }
                                    >
                                        <td>
                                            {document ? (
                                                <button
                                                    type="button"
                                                    className="transactions-table__document-number"
                                                    onClick={() =>
                                                        setView({
                                                            type: "details",
                                                            sale,
                                                        })
                                                    }
                                                >
                                                    {
                                                        document.number
                                                    }
                                                </button>
                                            ) : (
                                                <span className="transactions-table__muted">
                                                    —
                                                </span>
                                            )}
                                        </td>

                                        <td>
                                            <span
                                                className={`transactions-table__document-badge transactions-table__document-badge--${sale.total < 0
                                                        ? "credit"
                                                        : "sale"
                                                    }`}
                                            >
                                                {getDocumentLabel(
                                                    document?.type,
                                                )}
                                            </span>
                                        </td>

                                        <td>
                                            <span className="transactions-table__transaction-number">
                                                {sale.number}
                                            </span>
                                        </td>

                                        <td>
                                            {getTransactionTypeLabel(
                                                sale,
                                            )}
                                        </td>

                                        <td>
                                            {originalDocumentNumber ? (
                                                <span className="transactions-table__origin">
                                                    {
                                                        originalDocumentNumber
                                                    }
                                                </span>
                                            ) : (
                                                <span className="transactions-table__muted">
                                                    —
                                                </span>
                                            )}
                                        </td>

                                        <td>
                                            <strong className="transactions-table__customer">
                                                {sale.customer
                                                    ?.name ??
                                                    "לקוח מזדמן"}
                                            </strong>
                                        </td>

                                        <td>
                                            <div className="transactions-table__date">
                                                <strong>
                                                    {new Date(
                                                        sale.completedAt ??
                                                        sale.createdAt,
                                                    ).toLocaleDateString(
                                                        "he-IL",
                                                    )}
                                                </strong>

                                                <span>
                                                    {new Date(
                                                        sale.completedAt ??
                                                        sale.createdAt,
                                                    ).toLocaleTimeString(
                                                        "he-IL",
                                                        {
                                                            hour:
                                                                "2-digit",
                                                            minute:
                                                                "2-digit",
                                                        },
                                                    )}
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            {getPaymentLabel(
                                                sale,
                                            )}
                                        </td>

                                        <td>
                                            <strong
                                                className={
                                                    sale.total < 0
                                                        ? "transactions-table__amount transactions-table__amount--negative"
                                                        : "transactions-table__amount"
                                                }
                                            >
                                                {sale.total < 0
                                                    ? "‎-"
                                                    : ""}
                                                ₪
                                                {Math.abs(
                                                    sale.total,
                                                ).toFixed(
                                                    2,
                                                )}
                                            </strong>
                                        </td>

                                        <td>
                                            <span className="transactions-table__status">
                                                הושלמה
                                            </span>
                                        </td>

                                        <td>
                                            <button
                                                type="button"
                                                className="transactions-table__open"
                                                onClick={() =>
                                                    setView({
                                                        type: "details",
                                                        sale,
                                                    })
                                                }
                                                aria-label="פתח עסקה"
                                            >
                                                ←
                                            </button>
                                        </td>
                                    </tr>
                                );
                            },
                        )}

                        {transactions.length ===
                            0 && (
                                <tr>
                                    <td
                                        colSpan={11}
                                        className="transactions-table__empty"
                                    >
                                        <strong>
                                            לא נמצאו עסקאות
                                        </strong>

                                        <span>
                                            נסה לשנות את
                                            החיפוש או הסינון
                                        </span>
                                    </td>
                                </tr>
                            )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

export default TransactionsPage;