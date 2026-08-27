import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    getDocumentsForTransaction,
} from "../../models/document/DocumentRepository";
import type { CartLine } from "../../models/sale/CartLine";
import type { Sale } from "../../models/sale/Sale";
import {
    filterTransactions,
} from "../../models/transaction/TransactionFilters";
import {
    getTransaction,
    getTransactions,
} from "../../models/transaction/TransactionRepository";
import ReturnsPage from "../returns/ReturnsPage";
import TransactionDetailsPage from "./TransactionDetailsPage";
import {
    formatMoney,
} from "../../utils/MoneyFormatter";

import "./transactions-page.css";

type TransactionsPageProps = {
    onReturnToSale: (
        lines: CartLine[],
    ) => void;

    scannedSale?: Sale;
    scanId?: number;


    customerFilter?: {
        id: string;
        name: string;
    } | null;

    onClearCustomerFilter?: () => void;
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
    | "sale"
    | "return";

type SalePayment =
    Sale["payments"][number];

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

        case "tax_invoice":
            return "חשבונית מס";

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
            return "קבלת כרטיס מתנה";

        default:
            return "ללא מסמך";
    }
}

function isCreditDocument(
    type?: string,
) {
    return (
        type === "tax_credit_invoice" ||
        type === "credit_receipt" ||
        type === "credit_voucher"
    );
}

function formatMoneyCompact(
    amount: number,
) {
    return formatMoney(
        Math.abs(
            amount,
        ),
    );
}

function getPaymentMethodLabel(
    payment: SalePayment,
) {
    switch (payment.method) {
        case "cash":
            return "מזומן";

        case "card_terminal": {
            const brand =
                payment.cardBrand
                    ?.trim();

            const last4 =
                payment.cardLast4
                    ?.trim();

            if (brand && last4) {
                return `${brand} •••• ${last4}`;
            }

            if (last4) {
                return `אשראי •••• ${last4}`;
            }

            if (brand) {
                return brand;
            }

            return "אשראי";
        }

        case "store_credit":
            return "הקפה";

        case "echo":
            return "Echo";

        case "credit_voucher":
            return "שובר זיכוי";

        case "gift_card":
            return "כרטיס מתנה";

        case "bit":
            return "Bit";

        case "paybox":
            return "PayBox";

        case "bank_transfer":
            return "העברה";

        case "cheque":
            return "המחאה";

        case "external_credit":
            return "אשראי חיצוני";

        case "custom":
            return "תשלום אחר";

        default:
            return payment.method;
    }
}

function getPaymentSummary(
    sale: Sale,
) {
    const payments =
        sale.payments;

    if (
        payments.length === 0
    ) {
        return {
            primary: "ללא תשלום",
            secondary: null,
        };
    }

    if (
        payments.length === 1
    ) {
        return {
            primary:
                getPaymentMethodLabel(
                    payments[0],
                ),
            secondary: null,
        };
    }

    const visiblePayments =
        payments.slice(0, 2);

    const detail =
        visiblePayments
            .map(
                (payment) =>
                    `${formatMoneyCompact(
                        payment.amount,
                    )} ${getPaymentMethodLabel(
                        payment,
                    )}`,
            )
            .join(" · ");

    const hiddenCount =
        payments.length -
        visiblePayments.length;

    return {
        primary:
            `משולב · ${payments.length}`,
        secondary:
            hiddenCount > 0
                ? `${detail} · +${hiddenCount}`
                : detail,
    };
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

function matchesTypeFilter(
    sale: Sale,
    filter: TypeFilter,
) {
    if (filter === "all") {
        return true;
    }

    const type =
        sale.transactionType ??
        "sale";

    if (filter === "sale") {
        return (
            type === "sale" ||
            type === "exchange"
        );
    }

    return (
        type === "return" ||
        type === "exchange"
    );
}

function TransactionsPage({
    onReturnToSale,
    scannedSale,
    scanId,
    customerFilter,
    onClearCustomerFilter,
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

    useEffect(() => {
        if (!scannedSale) {
            return;
        }

        setView({
            type: "details",
            sale: scannedSale,
        });
    }, [
        scannedSale,
        scanId,
    ]);

    const transactions =
        useMemo(() => {
            const source =
                getTransactions();

            const query =
                search
                    .trim()
                    .toLocaleLowerCase(
                        "he-IL",
                    );

            let base = source;

            if (query) {
                const genericMatches =
                    filterTransactions(
                        source,
                        {
                            text: search,
                        },
                    );

                const matchingIds =
                    new Set(
                        genericMatches.map(
                            (sale) =>
                                sale.id,
                        ),
                    );

                source.forEach(
                    (sale) => {
                        const documents =
                            getDocumentsForTransaction(
                                sale.id,
                            );

                        const documentMatch =
                            documents.some(
                                (document) =>
                                    document.number
                                        .toLocaleLowerCase(
                                            "he-IL",
                                        )
                                        .includes(
                                            query,
                                        ),
                            );

                        const transactionMatch =
                            sale.number
                                .toLocaleLowerCase(
                                    "he-IL",
                                )
                                .includes(
                                    query,
                                );

                        const originalDocumentNumber =
                            getOriginalDocumentNumber(
                                sale,
                            );

                        const originalMatch =
                            originalDocumentNumber
                                ?.toLocaleLowerCase(
                                    "he-IL",
                                )
                                .includes(
                                    query,
                                ) ??
                            false;

                        if (
                            documentMatch ||
                            transactionMatch ||
                            originalMatch
                        ) {
                            matchingIds.add(
                                sale.id,
                            );
                        }
                    },
                );

                base =
                    source.filter(
                        (sale) =>
                            matchingIds.has(
                                sale.id,
                            ),
                    );
            }

            return base.filter(
                (sale) =>
                    matchesTypeFilter(
                        sale,
                        typeFilter,
                    ),
            );
        }, [
            search,
            typeFilter,
            view,
        ]);

    const customerScopedTransactions =
        customerFilter
            ? transactions.filter(
                  (sale) =>
                      sale.customer?.id ===
                      customerFilter.id,
              )
            : transactions;


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
                <div className="transactions-page__title">
                    <p className="transactions-page__eyebrow">
                        עסקאות
                    </p>

                    <h1>
                        עסקאות אחרונות
                    </h1>

                    {customerFilter && (
                        <div className="transactions-page__customer-filter">
                            <span>
                                לקוח:
                                {" "}
                                <strong>
                                    {customerFilter.name}
                                </strong>
                            </span>

                            {onClearCustomerFilter && (
                                <button
                                    type="button"
                                    onClick={
                                        onClearCustomerFilter
                                    }
                                >
                                    הצג את כל העסקאות
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="transactions-page__search-wrap">
                    <span aria-hidden="true">
                        ⌕
                    </span>

                    <input
                        type="search"
                        placeholder="מספר מסמך, לקוח, מוצר, SKU או ברקוד"
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
                            aria-label="נקה חיפוש"
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
                        className={`transactions-page__filter ${
                            typeFilter ===
                            "all"
                                ? "transactions-page__filter--active"
                                : ""
                        }`}
                        onClick={() =>
                            setTypeFilter(
                                "all",
                            )
                        }
                    >
                        הכול
                    </button>

                    <button
                        type="button"
                        className={`transactions-page__filter ${
                            typeFilter ===
                            "sale"
                                ? "transactions-page__filter--active"
                                : ""
                        }`}
                        onClick={() =>
                            setTypeFilter(
                                "sale",
                            )
                        }
                    >
                        מכירות
                    </button>

                    <button
                        type="button"
                        className={`transactions-page__filter ${
                            typeFilter ===
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
                        החזרות
                    </button>
                </div>

                <div className="transactions-page__count">
                    <strong>
                        {customerScopedTransactions.length}
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
                                סוג פעולה
                            </th>

                            <th>
                                לקוח
                            </th>

                            <th>
                                מועד
                            </th>

                            <th>
                                סכום
                            </th>

                            <th>
                                תשלום
                            </th>

                            <th
                                aria-label="פעולות"
                            />
                        </tr>
                    </thead>

                    <tbody>
                        {customerScopedTransactions.map(
                            (sale) => {
                                const document =
                                    getDocumentsForTransaction(
                                        sale.id,
                                    )[0];

                                const originalDocumentNumber =
                                    getOriginalDocumentNumber(
                                        sale,
                                    );

                                const paymentSummary =
                                    getPaymentSummary(
                                        sale,
                                    );

                                const documentType =
                                    document?.type;

                                const transactionType =
                                    sale.transactionType ??
                                    "sale";

                                return (
                                    <tr
                                        key={sale.id}
                                        className={`transactions-table__row transactions-table__row--${transactionType}`}
                                        onDoubleClick={() =>
                                            setView({
                                                type: "details",
                                                sale,
                                            })
                                        }
                                    >
                                        <td>
                                            <div className="transactions-table__document">
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
                                                        ללא מסמך
                                                    </span>
                                                )}

                                                <span className="transactions-table__internal-number">
                                                    עסקה {sale.number}
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            <span
                                                className={`transactions-table__document-badge ${
                                                    isCreditDocument(
                                                        documentType,
                                                    )
                                                        ? "transactions-table__document-badge--credit"
                                                        : "transactions-table__document-badge--sale"
                                                }`}
                                            >
                                                {getDocumentLabel(
                                                    documentType,
                                                )}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="transactions-table__operation">
                                                <strong>
                                                    {getTransactionTypeLabel(
                                                        sale,
                                                    )}
                                                </strong>

                                                {originalDocumentNumber && (
                                                    <span>
                                                        מקור{" "}
                                                        {
                                                            originalDocumentNumber
                                                        }
                                                    </span>
                                                )}
                                            </div>
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
                                            <strong
                                                className={`lumora-money-value ${
                                                    sale.total <
                                                    0
                                                        ? "transactions-table__amount transactions-table__amount--negative"
                                                        : "transactions-table__amount"
                                                }`}
                                            >
                                                {formatMoney(
                                                    sale.total,
                                                )}
                                            </strong>
                                        </td>

                                        <td>
                                            <div
                                                className="transactions-table__payment"
                                                title={
                                                    paymentSummary.secondary ??
                                                    paymentSummary.primary
                                                }
                                            >
                                                <strong>
                                                    {
                                                        paymentSummary.primary
                                                    }
                                                </strong>

                                                {paymentSummary.secondary && (
                                                    <span>
                                                        {
                                                            paymentSummary.secondary
                                                        }
                                                    </span>
                                                )}
                                            </div>
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
                                                aria-label={`פתח מסמך ${
                                                    document?.number ??
                                                    sale.number
                                                }`}
                                            >
                                                ←
                                            </button>
                                        </td>
                                    </tr>
                                );
                            },
                        )}

                        {customerScopedTransactions.length ===
                            0 && (
                                <tr>
                                    <td
                                        colSpan={8}
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
