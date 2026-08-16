import {
    getTransactions,
} from "../transaction/TransactionRepository";
import type {
    PaymentMethodCode,
} from "../PaymentMethod";
import type {
    ReportDefinition,
    ReportId,
    ReportResult,
} from "./Report";
import type {
    ReportFilters,
} from "./ReportFilters";
import {
    createTodayReportFilters,
} from "./ReportFilters";
import {
    getDocumentsForTransaction,
} from "../document/DocumentRepository";

export const builtInReports:
    ReportDefinition[] = [
    {
        id:
            "sales-summary",

        title:
            "סיכום מכירות",

        description:
            "מחזור, עסקאות, הנחות וממוצע לעסקה.",
    },

    {
        id:
            "payments-summary",

        title:
            "אמצעי תשלום",

        description:
            "פירוט תקבולים לפי אמצעי תשלום.",
    },

    {
        id:
            "product-sales",

        title:
            "מכירות לפי פריט",

        description:
            "כמות וערך נטו לפי מוצר ו־SKU.",
    },

    {
        id:
            "returns-summary",

        title:
            "החזרות והחלפות",

        description:
            "עסקאות החזרה והחלפה וערכן.",
    },
    {
        id:
            "seller-sales",

        title:
            "מכירות לפי מוכרן",

        description:
            "מכירות נטו לפי מוכרן, לאחר הנחות והחזרות מקושרות.",
    },
];

function money(
    value: number,
) {
    return `₪${value.toFixed(2)}`;
}

function paymentLabel(
    method:
        PaymentMethodCode,
) {
    switch (method) {
        case "cash":
            return "מזומן";

        case "card_terminal":
            return "כרטיס אשראי";

        case "echo":
            return "Echo";

        case "credit_voucher":
            return "שובר זיכוי";

        case "gift_card":
            return "Gift Card";

        case "store_credit":
            return "זיכוי לקוח";

        case "bank_transfer":
            return "העברה בנקאית";

        case "bit":
            return "Bit";

        case "paybox":
            return "PayBox";

        case "cheque":
            return "המחאה";

        case "external_credit":
            return "אשראי חיצוני";

        default:
            return method;
    }
}

function getTransactionDate(
    sale: ReturnType<
        typeof getTransactions
    >[number],
) {
    return new Date(
        sale.completedAt ??
        sale.createdAt,
    );
}

function getLocalDateKey(
    value: Date,
) {
    const year =
        value.getFullYear();

    const month =
        String(
            value.getMonth() + 1,
        ).padStart(
            2,
            "0",
        );

    const day =
        String(
            value.getDate(),
        ).padStart(
            2,
            "0",
        );

    return `${year}-${month}-${day}`;
}

function matchesRegister(
    transactionId: string,
    registerCode?: string,
) {
    if (!registerCode) {
        return true;
    }

    return getDocumentsForTransaction(
        transactionId,
    ).some(
        (document) =>
            document.registerCode ===
            registerCode,
    );
}

function completedTransactions(
    filters:
        ReportFilters =
        createTodayReportFilters(),
) {
    return getTransactions()
        .filter(
            (sale) =>
                sale.status ===
                "completed",
        )
        .filter(
            (sale) => {
                const date =
                    getLocalDateKey(
                        getTransactionDate(
                            sale,
                        ),
                    );

                return (
                    date >=
                        filters.fromDate &&
                    date <=
                        filters.toDate
                );
            },
        )
        .filter(
            (sale) =>
                !filters.transactionType ||
                sale.transactionType ===
                    filters.transactionType,
        )
        .filter(
            (sale) =>
                !filters.paymentMethod ||
                sale.payments.some(
                    (payment) =>
                        payment.method ===
                        filters.paymentMethod,
                ),
        )
        .filter(
            (sale) =>
                matchesRegister(
                    sale.id,
                    filters.registerCode,
                ),
        )
        .filter(
            (sale) =>
                !filters.sellerId ||
                sale.lines.some(
                    (line) =>
                        line.seller
                            ?.employeeId ===
                        filters.sellerId,
                ),
        );
}
function salesSummary(
    filters: ReportFilters,
):
ReportResult {
    const transactions =
        completedTransactions(filters);

    const sales =
        transactions.filter(
            (transaction) => {
                const type =
                    transaction.transactionType ??
                    "sale";

                return (
                    type === "sale" ||
                    (
                        type === "exchange" &&
                        transaction.total > 0
                    )
                );
            },
        );

    const credits =
        transactions.filter(
            (transaction) => {
                const type =
                    transaction.transactionType ??
                    "sale";

                return (
                    type === "return" ||
                    (
                        type === "exchange" &&
                        transaction.total < 0
                    )
                );
            },
        );

    const zeroExchanges =
        transactions.filter(
            (transaction) =>
                transaction.transactionType ===
                    "exchange" &&
                Math.abs(
                    transaction.total,
                ) < 0.000001,
        );

    const netRevenue =
        transactions.reduce(
            (
                sum,
                transaction,
            ) =>
                sum +
                transaction.total,
            0,
        );

    const discounts =
        transactions.reduce(
            (
                sum,
                transaction,
            ) =>
                sum +
                transaction.discount,
            0,
        );

    const average =
        transactions.length
            ? netRevenue /
              transactions.length
            : 0;

    return {
        id:
            "sales-summary",

        title:
            "סיכום מכירות",

        generatedAt:
            new Date()
                .toISOString(),

        columns: [
            {
                id:
                    "metric",
                label:
                    "מדד",
            },
            {
                id:
                    "value",
                label:
                    "ערך",
                align:
                    "end",
            },
        ],

        rows: [
            {
                id:
                    "sales",

                values: {
                    metric:
                        "מכירות",
                    value:
                        sales.length,
                },
            },

            {
                id:
                    "credits",

                values: {
                    metric:
                        "זיכויים / החזרות",
                    value:
                        credits.length,
                },
            },

            {
                id:
                    "zero-exchanges",

                values: {
                    metric:
                        "החלפות ביתרה 0",
                    value:
                        zeroExchanges.length,
                },
            },

            {
                id:
                    "transactions",

                values: {
                    metric:
                        "סה״כ עסקאות",
                    value:
                        transactions.length,
                },
            },

            {
                id:
                    "discounts",

                values: {
                    metric:
                        "הנחות",
                    value:
                        money(
                            discounts,
                        ),
                },
            },

            {
                id:
                    "average",

                values: {
                    metric:
                        "ממוצע לעסקה",
                    value:
                        money(
                            average,
                        ),
                },
            },
        ],

        totals: [
            {
                label:
                    "מחזור נטו",

                value:
                    money(
                        netRevenue,
                    ),
            },
        ],
    };
}

function paymentsSummary(
    filters: ReportFilters,
):
ReportResult {
    const totals =
        new Map<
            string,
            {
                transactionIds:
                    Set<string>;
                amount: number;
            }
        >();

    for (
        const sale of
        completedTransactions(filters)
    ) {
        for (
            const payment of
            sale.payments
        ) {
            const current =
                totals.get(
                    payment.method,
                ) ?? {
                    transactionIds:
                        new Set<string>(),
                    amount:
                        0,
                };

            current.transactionIds.add(
                sale.id,
            );

            current.amount +=
                payment.amount;

            totals.set(
                payment.method,
                current,
            );
        }
    }

    const rows =
        Array.from(
            totals.entries(),
        )
            .sort(
                (
                    a,
                    b,
                ) =>
                    b[1].amount -
                    a[1].amount,
            )
            .map(
                (
                    [
                        method,
                        value,
                    ],
                ) => ({
                    id:
                        method,

                    values: {
                        method:
                            paymentLabel(
                                method as PaymentMethodCode,
                            ),

                        count:
                            value.transactionIds
                                .size,

                        amount:
                            money(
                                value.amount,
                            ),
                    },
                }),
            );

    const total =
        Array.from(
            totals.values(),
        ).reduce(
            (
                sum,
                item,
            ) =>
                sum +
                item.amount,
            0,
        );

    return {
        id:
            "payments-summary",

        title:
            "אמצעי תשלום",

        generatedAt:
            new Date()
                .toISOString(),

        columns: [
            {
                id:
                    "method",
                label:
                    "אמצעי תשלום",
            },
            {
                id:
                    "count",
                label:
                    "מספר עסקאות",
                align:
                    "end",
            },
            {
                id:
                    "amount",
                label:
                    "סכום",
                align:
                    "end",
            },
        ],

        rows,

        totals: [
            {
                label:
                    "סה״כ",

                value:
                    money(
                        total,
                    ),
            },
        ],
    };
}

function productSales(
    filters: ReportFilters,
):
ReportResult {
    const products =
        new Map<
            string,
            {
                name: string;
                sku: string;
                quantity: number;
                net: number;
            }
        >();

    for (
        const sale of
        completedTransactions(filters)
    ) {
        for (
            const line of
            sale.lines
        ) {
            if (
                filters.sellerId &&
                line.seller
                    ?.employeeId !==
                    filters.sellerId
            ) {
                continue;
            }
            const key =
                [
                    line.productId,
                    line.variant
                        ?.variantId ??
                        "",
                    line.sku,
                ].join(
                    "::",
                );

            const current =
                products.get(
                    key,
                ) ?? {
                    name:
                        line.productName,
                    sku:
                        line.sku,
                    quantity:
                        0,
                    net:
                        0,
                };

            const signedQuantity =
                line.kind ===
                "return"
                    ? -line.quantity
                    : line.quantity;

            current.quantity +=
                signedQuantity;

            current.net +=
                line.netAmount;

            products.set(
                key,
                current,
            );
        }
    }

    const rows =
        Array.from(
            products.entries(),
        )
            .sort(
                (
                    a,
                    b,
                ) =>
                    b[1].net -
                    a[1].net,
            )
            .map(
                (
                    [
                        id,
                        value,
                    ],
                ) => ({
                    id,

                    values: {
                        product:
                            value.name,

                        sku:
                            value.sku,

                        quantity:
                            value.quantity,

                        net:
                            money(
                                value.net,
                            ),
                    },
                }),
            );

    const total =
        Array.from(
            products.values(),
        ).reduce(
            (
                sum,
                item,
            ) =>
                sum +
                item.net,
            0,
        );

    return {
        id:
            "product-sales",

        title:
            "מכירות לפי פריט",

        generatedAt:
            new Date()
                .toISOString(),

        columns: [
            {
                id:
                    "product",
                label:
                    "פריט",
            },
            {
                id:
                    "sku",
                label:
                    "SKU",
            },
            {
                id:
                    "quantity",
                label:
                    "כמות נטו",
                align:
                    "end",
            },
            {
                id:
                    "net",
                label:
                    "מכירות נטו",
                align:
                    "end",
            },
        ],

        rows,

        totals: [
            {
                label:
                    "סה״כ מכירות נטו",

                value:
                    money(
                        total,
                    ),
            },
        ],
    };
}

function returnsSummary(
    filters: ReportFilters,
):
ReportResult {
    const rows =
        completedTransactions(filters)
            .filter(
                (sale) =>
                    sale.transactionType ===
                        "return" ||
                    sale.transactionType ===
                        "exchange",
            )
            .sort(
                (
                    a,
                    b,
                ) =>
                    b.createdAt
                        .localeCompare(
                            a.createdAt,
                        ),
            )
            .map(
                (sale) => ({
                    id:
                        sale.id,

                    values: {
                        transaction:
                            sale.number,

                        type:
                            sale.transactionType ===
                            "exchange"
                                ? "החלפה"
                                : "החזרה",

                        customer:
                            sale.customer
                                .name,

                        date:
                            new Date(
                                sale.completedAt ??
                                sale.createdAt,
                            )
                                .toLocaleString(
                                    "he-IL",
                                ),

                        total:
                            money(
                                sale.total,
                            ),
                    },
                }),
            );

    return {
        id:
            "returns-summary",

        title:
            "החזרות והחלפות",

        generatedAt:
            new Date()
                .toISOString(),

        columns: [
            {
                id:
                    "transaction",
                label:
                    "עסקה",
            },
            {
                id:
                    "type",
                label:
                    "סוג",
            },
            {
                id:
                    "customer",
                label:
                    "לקוח",
            },
            {
                id:
                    "date",
                label:
                    "תאריך",
            },
            {
                id:
                    "total",
                label:
                    "יתרה",
                align:
                    "end",
            },
        ],

        rows,
    };
}

function sellerSales(
    filters: ReportFilters,
):
ReportResult {
    const sellers =
        new Map<
            string,
            {
                name: string;
                soldQuantity: number;
                returnedQuantity: number;
                grossSales: number;
                returns: number;
                netSales: number;
            }
        >();

    for (
        const transaction of
        completedTransactions(filters)
    ) {
        for (
            const line of
            transaction.lines
        ) {
            if (!line.seller) {
                continue;
            }

            if (
                filters.sellerId &&
                line.seller
                    .employeeId !==
                    filters.sellerId
            ) {
                continue;
            }

            const key =
                line.seller.employeeId;

            const current =
                sellers.get(
                    key,
                ) ?? {
                    name:
                        line.seller
                            .employeeName,
                    soldQuantity:
                        0,
                    returnedQuantity:
                        0,
                    grossSales:
                        0,
                    returns:
                        0,
                    netSales:
                        0,
                };

            const amount =
                Math.abs(
                    line.netAmount,
                );

            if (
                line.kind ===
                "return"
            ) {
                current.returnedQuantity +=
                    line.quantity;

                current.returns +=
                    amount;

                current.netSales -=
                    amount;
            }
            else {
                current.soldQuantity +=
                    line.quantity;

                current.grossSales +=
                    amount;

                current.netSales +=
                    amount;
            }

            sellers.set(
                key,
                current,
            );
        }
    }

    const rows =
        Array.from(
            sellers.entries(),
        )
            .sort(
                (
                    a,
                    b,
                ) =>
                    b[1].netSales -
                    a[1].netSales,
            )
            .map(
                (
                    [
                        id,
                        value,
                    ],
                ) => ({
                    id,

                    values: {
                        seller:
                            value.name,

                        soldQuantity:
                            value.soldQuantity,

                        returnedQuantity:
                            value.returnedQuantity,

                        grossSales:
                            money(
                                value.grossSales,
                            ),

                        returns:
                            money(
                                value.returns,
                            ),

                        netSales:
                            money(
                                value.netSales,
                            ),
                    },
                }),
            );

    const grossTotal =
        Array.from(
            sellers.values(),
        ).reduce(
            (
                sum,
                seller,
            ) =>
                sum +
                seller.grossSales,
            0,
        );

    const returnTotal =
        Array.from(
            sellers.values(),
        ).reduce(
            (
                sum,
                seller,
            ) =>
                sum +
                seller.returns,
            0,
        );

    const netTotal =
        Array.from(
            sellers.values(),
        ).reduce(
            (
                sum,
                seller,
            ) =>
                sum +
                seller.netSales,
            0,
        );

    return {
        id:
            "seller-sales",

        title:
            "מכירות לפי מוכרן",

        subtitle:
            "מכירות נטו לאחר הנחות והחזרות מקושרות",

        generatedAt:
            new Date()
                .toISOString(),

        columns: [
            {
                id:
                    "seller",
                label:
                    "מוכרן",
            },
            {
                id:
                    "soldQuantity",
                label:
                    "כמות שנמכרה",
                align:
                    "end",
            },
            {
                id:
                    "returnedQuantity",
                label:
                    "כמות שהוחזרה",
                align:
                    "end",
            },
            {
                id:
                    "grossSales",
                label:
                    "מכירות",
                align:
                    "end",
            },
            {
                id:
                    "returns",
                label:
                    "זיכויים",
                align:
                    "end",
            },
            {
                id:
                    "netSales",
                label:
                    "מכירות נטו",
                align:
                    "end",
            },
        ],

        rows,

        totals: [
            {
                label:
                    "מכירות",

                value:
                    money(
                        grossTotal,
                    ),
            },
            {
                label:
                    "זיכויים",

                value:
                    money(
                        returnTotal,
                    ),
            },
            {
                label:
                    "מכירות נטו",

                value:
                    money(
                        netTotal,
                    ),
            },
        ],
    };
}

export function generateReport(
    reportId:
        ReportId,
    filters:
        ReportFilters =
        createTodayReportFilters(),
): ReportResult {
    switch (
        reportId
    ) {
        case "sales-summary":
            return salesSummary(filters);

        case "payments-summary":
            return paymentsSummary(filters);

        case "product-sales":
            return productSales(filters);

        case "returns-summary":
            return returnsSummary(filters);

        case "seller-sales":
            return sellerSales(filters);
    }
}