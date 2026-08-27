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
import {
    getCatalogProducts,
} from "../catalog/CatalogRepository";
import {
    categorySeed,
} from "../catalog/Category";
import {
    currentTaxPolicy,
    resolveProductTaxRate,
} from "../tax/TaxPolicy";
import {
    getSupplierInvoices,
} from "../inventory/SupplierInvoiceRepository";
import {
    getSupplierReturns,
} from "../inventory/SupplierReturnRepository";
import {
    getInventoryAdjustmentDocuments,
} from "../inventory/InventoryAdjustmentRepository";
import {
    getAttendance,
} from "../attendance/AttendanceRepository";
import {
    getActiveBusinessConfiguration,
} from "../../config/ActiveBusinessConfiguration";
import {
    formatMoney,
} from "../../utils/MoneyFormatter";

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
            "דוח תקבולים",

        description:
            "תקבולים והחזרים לפי אמצעי תשלום, בהפרדה מאמצעי סגירה שאינם כסף.",
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
            "category-sales",

        title:
            "מכירות לפי קטגוריה",

        description:
            "כמות, מכירות, החזרות ורווחיות לפי קטגוריה.",
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
    {
        id:
            "inventory-valuation",

        title:
            "דוח ערך מלאי",

        description:
            "ערך מלאי נוכחי או נכון לתאריך, לפני מע״מ וכולל מע״מ.",
    },
    {
        id:
            "attendance",

        title:
            "נוכחות עובדים",

        description:
            "סיכום שעות ונוכחות לפי עובד, עם פירוט יומי לפי דרישה.",
    },
];

function money(
    value: number,
) {
    return formatMoney(
        value,
    );
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
            return "הקפה";

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
    type DailyReceiptAggregate = {
        dateKey: string;
        dateLabel: string;
        amounts: Record<
            PaymentMethodCode,
            number
        >;
        total: number;
    };

    const methodOrder:
        PaymentMethodCode[] = [
            "cash",
            "card_terminal",
            "echo",
            "bit",
            "paybox",
            "bank_transfer",
            "cheque",
            "external_credit",
            "credit_voucher",
            "gift_card",
            "store_credit",
            "custom",
        ];

    const createEmptyAmounts = () =>
        Object.fromEntries(
            methodOrder.map(
                (method) => [
                    method,
                    0,
                ],
            ),
        ) as Record<
            PaymentMethodCode,
            number
        >;

    const daily =
        new Map<
            string,
            DailyReceiptAggregate
        >();

    for (
        const sale of
        completedTransactions(filters)
    ) {
        const transactionDate =
            getTransactionDate(
                sale,
            );

        const dateKey =
            getLocalDateKey(
                transactionDate,
            );

        const current =
            daily.get(
                dateKey,
            ) ?? {
                dateKey,
                dateLabel:
                    transactionDate
                        .toLocaleDateString(
                            "he-IL",
                        ),
                amounts:
                    createEmptyAmounts(),
                total:
                    0,
            };

        for (
            const payment of
            sale.payments
        ) {
            if (
                filters.paymentMethod &&
                payment.method !==
                    filters.paymentMethod
            ) {
                continue;
            }

            const amount =
                payment.amount;

            current.amounts[
                payment.method
            ] += amount;

            current.total +=
                amount;
        }

        daily.set(
            dateKey,
            current,
        );
    }

    const rows =
        Array.from(
            daily.values(),
        )
            .sort(
                (a, b) =>
                    a.dateKey.localeCompare(
                        b.dateKey,
                    ),
            )
            .map(
                (day) => ({
                    id:
                        day.dateKey,
                    values: {
                        date:
                            day.dateLabel,

                        ...Object.fromEntries(
                            methodOrder.map(
                                (method) => [
                                    method,
                                    money(
                                        day.amounts[
                                            method
                                        ],
                                    ),
                                ],
                            ),
                        ),

                        total:
                            money(
                                day.total,
                            ),
                    },
                }),
            );

    const periodTotal =
        Array.from(
            daily.values(),
        ).reduce(
            (
                sum,
                day,
            ) =>
                sum +
                day.total,
            0,
        );

    return {
        id:
            "payments-summary",

        title:
            "דוח תקבולים",

        subtitle:
            "שורה לכל תאריך. כל אמצעי התשלום מוצגים בעמודות נפרדות, והסכומים הם נטו לאחר החזרים.",

        generatedAt:
            new Date()
                .toISOString(),

        columns: [
            {
                id:
                    "date",
                label:
                    "תאריך",
            },
            ...methodOrder.map(
                (method) => ({
                    id:
                        method,
                    label:
                        paymentLabel(
                            method,
                        ),
                    align:
                        "end" as const,
                }),
            ),
            {
                id:
                    "total",
                label:
                    "סה״כ",
                align:
                    "end",
            },
        ],

        rows,

        totals: [
            {
                label:
                    "סה״כ לתקופה",
                value:
                    money(
                        periodTotal,
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


function inventoryValuation(
    filters: ReportFilters,
):
ReportResult {
    type QuantityEvent = {
        occurredAt: number;
        delta: number;
    };

    type CostEvent = {
        occurredAt: number;
        unitCostBeforeVat: number;
        previousUnitCostBeforeVat?: number;
        vatRate: number;
    };

    const now = new Date();
    const todayKey =
        getLocalDateKey(now);

    const requestedDateKey =
        filters.toDate ||
        todayKey;

    const asOfDateKey =
        requestedDateKey > todayKey
            ? todayKey
            : requestedDateKey;

    const requestedAsOfEnd =
        new Date(
            `${asOfDateKey}T23:59:59.999`,
        );

    const asOfEnd =
        Number.isFinite(
            requestedAsOfEnd.getTime(),
        )
            ? requestedAsOfEnd
            : now;

    const asOfTime =
        asOfEnd.getTime();

    const isHistorical =
        asOfDateKey !==
        todayKey;

    const quantityEventsByProduct =
        new Map<
            string,
            QuantityEvent[]
        >();

    const costEventsByProduct =
        new Map<
            string,
            CostEvent[]
        >();

    const pushQuantityEvent = (
        productId: string,
        occurredAt: string,
        delta: number,
    ) => {
        const timestamp =
            new Date(
                occurredAt,
            ).getTime();

        if (
            !Number.isFinite(
                timestamp,
            ) ||
            !Number.isFinite(
                delta,
            )
        ) {
            return;
        }

        const events =
            quantityEventsByProduct.get(
                productId,
            ) ?? [];

        events.push({
            occurredAt:
                timestamp,
            delta,
        });

        quantityEventsByProduct.set(
            productId,
            events,
        );
    };

    const pushCostEvent = (
        productId: string,
        occurredAt: string,
        unitCostBeforeVat: number,
        previousUnitCostBeforeVat:
            number | undefined,
        vatRate: number,
    ) => {
        const timestamp =
            new Date(
                occurredAt,
            ).getTime();

        if (
            !Number.isFinite(
                timestamp,
            ) ||
            !Number.isFinite(
                unitCostBeforeVat,
            ) ||
            unitCostBeforeVat < 0
        ) {
            return;
        }

        const events =
            costEventsByProduct.get(
                productId,
            ) ?? [];

        events.push({
            occurredAt:
                timestamp,
            unitCostBeforeVat,
            previousUnitCostBeforeVat:
                previousUnitCostBeforeVat !==
                    undefined &&
                Number.isFinite(
                    previousUnitCostBeforeVat,
                ) &&
                previousUnitCostBeforeVat >=
                    0
                    ? previousUnitCostBeforeVat
                    : undefined,
            vatRate:
                Number.isFinite(
                    vatRate,
                ) &&
                vatRate >= 0
                    ? vatRate
                    : currentTaxPolicy.rate,
        });

        costEventsByProduct.set(
            productId,
            events,
        );
    };

    for (
        const invoice of
        getSupplierInvoices()
    ) {
        if (
            invoice.status !==
            "posted"
        ) {
            continue;
        }

        const occurredAt =
            invoice.postedAt ??
            invoice.updatedAt;

        for (
            const line of
            invoice.lines
        ) {
            if (
                line.receivedQuantity !==
                null
            ) {
                pushQuantityEvent(
                    line.product.id,
                    occurredAt,
                    Math.abs(
                        line.receivedQuantity,
                    ),
                );
            }

            if (
                line.unitCostBeforeVat !==
                null
            ) {
                pushCostEvent(
                    line.product.id,
                    occurredAt,
                    line.unitCostBeforeVat,
                    line.previousUnitCostBeforeVat,
                    line.vatRate,
                );
            }
        }
    }

    for (
        const supplierReturn of
        getSupplierReturns()
    ) {
        if (
            supplierReturn.status !==
            "posted"
        ) {
            continue;
        }

        const occurredAt =
            supplierReturn.postedAt ??
            supplierReturn.updatedAt;

        for (
            const line of
            supplierReturn.lines
        ) {
            if (
                line.returnedQuantity ===
                null
            ) {
                continue;
            }

            pushQuantityEvent(
                line.product.id,
                occurredAt,
                -Math.abs(
                    line.returnedQuantity,
                ),
            );
        }
    }

    for (
        const document of
        getInventoryAdjustmentDocuments()
    ) {
        if (
            document.status !==
            "posted"
        ) {
            continue;
        }

        const occurredAt =
            document.postedAt ??
            document.updatedAt;

        for (
            const line of
            document.lines
        ) {
            if (
                line.difference ===
                null
            ) {
                continue;
            }

            pushQuantityEvent(
                line.product.id,
                occurredAt,
                line.difference,
            );
        }
    }

    for (
        const transaction of
        getTransactions()
    ) {
        if (
            transaction.status !==
            "completed"
        ) {
            continue;
        }

        const occurredAt =
            transaction.completedAt ??
            transaction.createdAt;

        for (
            const line of
            transaction.lines
        ) {
            if (
                line.source !==
                "catalog"
            ) {
                continue;
            }

            pushQuantityEvent(
                line.productId,
                occurredAt,
                line.kind ===
                    "return"
                    ? Math.abs(
                        line.quantity,
                    )
                    : -Math.abs(
                        line.quantity,
                    ),
            );
        }
    }

    const catalog =
        getCatalogProducts();

    const items =
        catalog
            .map(
                (product) => {
                    const currentQuantity =
                        typeof product.stockOnHand ===
                            "number" &&
                        Number.isFinite(
                            product.stockOnHand,
                        )
                            ? product.stockOnHand
                            : 0;

                    const movementAfterDate =
                        (
                            quantityEventsByProduct.get(
                                product.id,
                            ) ?? []
                        ).reduce(
                            (
                                sum,
                                event,
                            ) =>
                                event.occurredAt >
                                    asOfTime
                                    ? sum +
                                        event.delta
                                    : sum,
                            0,
                        );

                    const quantity =
                        isHistorical
                            ? currentQuantity -
                                movementAfterDate
                            : currentQuantity;

                    const currentCost =
                        typeof product.costPrice ===
                            "number" &&
                        Number.isFinite(
                            product.costPrice,
                        ) &&
                        product.costPrice >=
                            0
                            ? product.costPrice
                            : undefined;

                    const defaultVatRate =
                        resolveProductTaxRate(
                            product.taxClass,
                        );

                    let costPrice =
                        currentCost;
                    let vatRate =
                        defaultVatRate;
                    let usesCurrentMasterCostFallback =
                        false;

                    if (isHistorical) {
                        const costEvents =
                            [
                                ...(
                                    costEventsByProduct.get(
                                        product.id,
                                    ) ?? []
                                ),
                            ].sort(
                                (a, b) =>
                                    a.occurredAt -
                                    b.occurredAt,
                            );

                        const priorEvents =
                            costEvents.filter(
                                (event) =>
                                    event.occurredAt <=
                                    asOfTime,
                            );

                        const priorEvent =
                            priorEvents[
                                priorEvents.length - 1
                            ];

                        if (priorEvent) {
                            costPrice =
                                priorEvent.unitCostBeforeVat;
                            vatRate =
                                priorEvent.vatRate;
                        }
                        else {
                            const nextEvent =
                                costEvents.find(
                                    (event) =>
                                        event.occurredAt >
                                        asOfTime &&
                                        event.previousUnitCostBeforeVat !==
                                            undefined,
                                );

                            if (
                                nextEvent?.previousUnitCostBeforeVat !==
                                undefined
                            ) {
                                costPrice =
                                    nextEvent.previousUnitCostBeforeVat;
                                vatRate =
                                    defaultVatRate;
                            }
                            else {
                                costPrice =
                                    currentCost;
                                vatRate =
                                    defaultVatRate;
                                usesCurrentMasterCostFallback =
                                    currentCost !==
                                    undefined;
                            }
                        }
                    }

                    const hasCost =
                        costPrice !==
                            undefined &&
                        Number.isFinite(
                            costPrice,
                        ) &&
                        costPrice >= 0;

                    const resolvedCost =
                        hasCost
                            ? costPrice as number
                            : 0;

                    const costIncludingVat =
                        resolvedCost *
                        (
                            1 +
                            vatRate
                        );

                    return {
                        id:
                            product.id,
                        productName:
                            product.names?.he
                                ?.trim() ||
                            product.name.trim() ||
                            product.sku ||
                            product.id,
                        sku:
                            product.sku ||
                            "—",
                        supplier:
                            product.supplier?.name
                                ?.trim() ||
                            "—",
                        quantity,
                        hasCost,
                        costPrice:
                            resolvedCost,
                        costIncludingVat,
                        inventoryValueBeforeVat:
                            quantity *
                            resolvedCost,
                        inventoryValueIncludingVat:
                            quantity *
                            costIncludingVat,
                        usesCurrentMasterCostFallback,
                    };
                },
            )
            .filter(
                (item) =>
                    item.quantity !==
                    0,
            );

    items.sort(
        (
            a,
            b,
        ) =>
            Math.abs(
                b.inventoryValueBeforeVat,
            ) -
                Math.abs(
                    a.inventoryValueBeforeVat,
                ) ||
            a.productName.localeCompare(
                b.productName,
                "he",
            ),
    );

    const totalQuantity =
        items.reduce(
            (
                sum,
                item,
            ) =>
                sum +
                item.quantity,
            0,
        );

    const totalValueBeforeVat =
        items.reduce(
            (
                sum,
                item,
            ) =>
                item.hasCost
                    ? sum +
                        item.inventoryValueBeforeVat
                    : sum,
            0,
        );

    const totalValueIncludingVat =
        items.reduce(
            (
                sum,
                item,
            ) =>
                item.hasCost
                    ? sum +
                        item.inventoryValueIncludingVat
                    : sum,
            0,
        );

    const missingCostCount =
        items.filter(
            (item) =>
                !item.hasCost,
        ).length;

    const negativeStockCount =
        items.filter(
            (item) =>
                item.quantity <
                0,
        ).length;

    const fallbackCostCount =
        items.filter(
            (item) =>
                item.usesCurrentMasterCostFallback,
        ).length;

    const historyNote =
        isHistorical
            ? "המלאי ההיסטורי משוחזר מתנועות מתועדות."
            : "תמונת מצב נוכחית.";

    const fallbackNote =
        fallbackCostCount > 0
            ? ` ${fallbackCostCount} פריטים משתמשים בעלות המאסטר הנוכחית כי לא קיימת עבורם נקודת עלות היסטורית מלאה.`
            : "";

    const missingCostNote =
        missingCostCount > 0
            ? ` ${missingCostCount} פריטים במלאי חסרי עלות.`
            : "";

    return {
        id:
            "inventory-valuation",

        title:
            "דוח ערך מלאי",

        subtitle:
            `${historyNote} נכון ל־${asOfDateKey}. ערכים מוצגים לפני מע״מ וכולל מע״מ.${fallbackNote}${missingCostNote}`,

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
                    "supplier",
                label:
                    "ספק",
            },
            {
                id:
                    "quantity",
                label:
                    "כמות במלאי",
                align:
                    "end",
            },
            {
                id:
                    "unitCostBeforeVat",
                label:
                    "עלות יחידה לפני מע״מ",
                align:
                    "end",
            },
            {
                id:
                    "unitCostIncludingVat",
                label:
                    "עלות יחידה כולל מע״מ",
                align:
                    "end",
            },
            {
                id:
                    "inventoryValueBeforeVat",
                label:
                    "ערך מלאי לפני מע״מ",
                align:
                    "end",
            },
            {
                id:
                    "inventoryValueIncludingVat",
                label:
                    "ערך מלאי כולל מע״מ",
                align:
                    "end",
            },
            {
                id:
                    "status",
                label:
                    "סטטוס",
            },
        ],

        rows:
            items.map(
                (item) => ({
                    id:
                        item.id,

                    values: {
                        product:
                            item.productName,
                        sku:
                            item.sku,
                        supplier:
                            item.supplier,
                        quantity:
                            item.quantity,
                        unitCostBeforeVat:
                            item.hasCost
                                ? money(
                                    item.costPrice,
                                )
                                : "—",
                        unitCostIncludingVat:
                            item.hasCost
                                ? money(
                                    item.costIncludingVat,
                                )
                                : "—",
                        inventoryValueBeforeVat:
                            item.hasCost
                                ? money(
                                    item.inventoryValueBeforeVat,
                                )
                                : "—",
                        inventoryValueIncludingVat:
                            item.hasCost
                                ? money(
                                    item.inventoryValueIncludingVat,
                                )
                                : "—",
                        status:
                            !item.hasCost
                                ? "חסרה עלות"
                                : item.quantity <
                                    0
                                    ? "מלאי שלילי"
                                    : item.usesCurrentMasterCostFallback
                                        ? "עלות היסטורית חלקית"
                                        : "תקין",
                    },
                }),
            ),

        totals: [
            {
                label:
                    "ערך מלאי לפני מע״מ",
                value:
                    money(
                        totalValueBeforeVat,
                    ),
            },
            {
                label:
                    "ערך מלאי כולל מע״מ",
                value:
                    money(
                        totalValueIncludingVat,
                    ),
            },
            {
                label:
                    "סה״כ יחידות",
                value:
                    totalQuantity
                        .toLocaleString(
                            "he-IL",
                            {
                                maximumFractionDigits:
                                    3,
                            },
                        ),
            },
            {
                label:
                    "פריטים ללא עלות",
                value:
                    String(
                        missingCostCount,
                    ),
            },
            {
                label:
                    "עלות היסטורית חלקית",
                value:
                    String(
                        fallbackCostCount,
                    ),
            },
            {
                label:
                    "מלאי שלילי",
                value:
                    String(
                        negativeStockCount,
                    ),
            },
        ],
    };
}

function categorySales(
    filters: ReportFilters,
):
ReportResult {
    type CatalogMetadata = {
        id: string;
        category?: string;
        department?: string;
        subcategory?: string;
        costPrice?: number;
        hierarchy?: {
            department?: string;
            category?: string;
            subcategory?: string;
        };
    };

    type CategoryAggregate = {
        label: string;
        soldQuantity: number;
        returnedQuantity: number;
        grossSales: number;
        returns: number;
        netSales: number;
        netCostIncludingVat: number;
        costComplete: boolean;
    };

    const catalog =
        getCatalogProducts();

    const productsById =
        new Map(
            catalog.map(
                (product) => [
                    product.id,
                    product as
                        CatalogMetadata,
                ] as const,
            ),
        );

    const categoryLabels =
        new Map(
            categorySeed.map(
                (category) => [
                    category.id,
                    category.name,
                ] as const,
            ),
        );

    const categories =
        new Map<
            string,
            CategoryAggregate
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

            const product =
                productsById.get(
                    line.productId,
                );

            const categoryId =
                product?.category
                    ?.trim() ||
                "uncategorized";

            const categoryLabel =
                product?.hierarchy
                    ?.category
                    ?.trim() ||
                categoryLabels.get(
                    categoryId,
                ) ||
                (
                    categoryId ===
                    "uncategorized"
                        ? "ללא קטגוריה"
                        : categoryId
                );

            const current =
                categories.get(
                    categoryId,
                ) ?? {
                    label:
                        categoryLabel,
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
                    netCostIncludingVat:
                        0,
                    costComplete:
                        true,
                };

            const amount =
                Math.abs(
                    line.netAmount,
                );

            const isReturn =
                line.kind ===
                "return";

            if (isReturn) {
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

            const costPrice =
                product?.costPrice;

            if (
                costPrice ===
                    undefined ||
                !Number.isFinite(
                    costPrice,
                )
            ) {
                current.costComplete =
                    false;
            }
            else {
                const costIncludingVat =
                    costPrice *
                    (
                        1 +
                        currentTaxPolicy
                            .rate
                    ) *
                    line.quantity;

                current.netCostIncludingVat +=
                    isReturn
                        ? -costIncludingVat
                        : costIncludingVat;
            }

            categories.set(
                categoryId,
                current,
            );
        }
    }

    const rows =
        Array.from(
            categories.entries(),
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
                ) => {
                    const gp =
                        value.costComplete &&
                        Math.abs(
                            value.netSales,
                        ) >
                            0.000001
                            ? (
                                (
                                    value.netSales -
                                    value.netCostIncludingVat
                                ) /
                                value.netSales
                            ) *
                            100
                            : null;

                    return {
                        id,

                        values: {
                            category:
                                value.label,

                            soldQuantity:
                                value.soldQuantity,

                            returnedQuantity:
                                value.returnedQuantity,

                            netQuantity:
                                value.soldQuantity -
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

                            cost:
                                value.costComplete
                                    ? money(
                                        value.netCostIncludingVat,
                                    )
                                    : "—",

                            gp:
                                gp === null
                                    ? "—"
                                    : `${gp.toFixed(
                                        1,
                                    )}%`,
                        },
                    };
                },
            );

    const values =
        Array.from(
            categories.values(),
        );

    const grossTotal =
        values.reduce(
            (
                sum,
                item,
            ) =>
                sum +
                item.grossSales,
            0,
        );

    const returnTotal =
        values.reduce(
            (
                sum,
                item,
            ) =>
                sum +
                item.returns,
            0,
        );

    const netTotal =
        values.reduce(
            (
                sum,
                item,
            ) =>
                sum +
                item.netSales,
            0,
        );

    const allCostsComplete =
        values.every(
            (item) =>
                item.costComplete,
        );

    const costTotal =
        values.reduce(
            (
                sum,
                item,
            ) =>
                sum +
                item.netCostIncludingVat,
            0,
        );

    const totalGp =
        allCostsComplete &&
        Math.abs(netTotal) >
            0.000001
            ? (
                (
                    netTotal -
                    costTotal
                ) /
                netTotal
            ) *
            100
            : null;

    return {
        id:
            "category-sales",

        title:
            "מכירות לפי קטגוריה",

        subtitle:
            "קטגוריה ועלות נלקחות מקטלוג הפריטים הנוכחי. רווחיות מוצגת רק כאשר קיימת עלות לכל הפריטים בקטגוריה.",

        generatedAt:
            new Date()
                .toISOString(),

        columns: [
            {
                id:
                    "category",
                label:
                    "קטגוריה",
            },
            {
                id:
                    "soldQuantity",
                label:
                    "נמכר",
                align:
                    "end",
            },
            {
                id:
                    "returnedQuantity",
                label:
                    "הוחזר",
                align:
                    "end",
            },
            {
                id:
                    "netQuantity",
                label:
                    "כמות נטו",
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
                    "החזרות",
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
            {
                id:
                    "cost",
                label:
                    "עלות כולל מע״מ",
                align:
                    "end",
            },
            {
                id:
                    "gp",
                label:
                    "GP%",
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
                    "החזרות",

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
            {
                label:
                    "עלות נטו",

                value:
                    allCostsComplete
                        ? money(
                            costTotal,
                        )
                        : "—",
            },
            {
                label:
                    "GP%",

                value:
                    totalGp === null
                        ? "—"
                        : `${totalGp.toFixed(
                            1,
                        )}%`,
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


const ATTENDANCE_DAILY_EXTRA_THRESHOLD_MINUTES =
    9 * 60;

type AttendanceDay = {
    employeeId: string;
    employeeName: string;
    dateKey: string;
    firstIn: Date | null;
    lastOut: Date | null;
    closedMinutes: number;
    checkInCount: number;
    openEntryCount: number;
    hasOpenEntry: boolean;
    hasManualCorrection: boolean;
    hasManualEntry: boolean;
    entryIds: string[];
    openStatus?:
        | "נוכח כעת"
        | "יציאה חסרה";
};

function formatAttendanceTime(
    value: Date | null,
) {
    return value
        ? value.toLocaleTimeString(
            "he-IL",
            {
                hour:
                    "2-digit",
                minute:
                    "2-digit",
            },
        )
        : "—";
}

function formatAttendanceDateTime(
    value: Date | null,
) {
    return value
        ? value.toLocaleString(
            "he-IL",
            {
                day:
                    "2-digit",
                month:
                    "2-digit",
                year:
                    "2-digit",
                hour:
                    "2-digit",
                minute:
                    "2-digit",
            },
        )
        : "—";
}

function formatAttendanceMinutes(
    value: number,
) {
    const rounded =
        Math.max(
            0,
            Math.round(
                value,
            ),
        );

    const hours =
        Math.floor(
            rounded /
                60,
        );

    const minutes =
        rounded %
        60;

    return `${hours}:${String(
        minutes,
    ).padStart(
        2,
        "0",
    )}`;
}

function buildAttendanceDays(
    filters: ReportFilters,
): AttendanceDay[] {
    const configuration =
        getActiveBusinessConfiguration();

    const now =
        new Date();

    const todayKey =
        getLocalDateKey(now);

    const days =
        new Map<
            string,
            AttendanceDay
        >();

    const getOrCreateDay = (
        employeeId: string,
        employeeName: string,
        dateKey: string,
    ) => {
        const key =
            `${employeeId}::${dateKey}`;

        const existing =
            days.get(key);

        if (existing) {
            return existing;
        }

        const created:
            AttendanceDay = {
                employeeId,
                employeeName,
                dateKey,
                firstIn:
                    null,
                lastOut:
                    null,
                closedMinutes:
                    0,
                checkInCount:
                    0,
                openEntryCount:
                    0,
                hasOpenEntry:
                    false,
                hasManualCorrection:
                    false,
                hasManualEntry:
                    false,
                entryIds:
                    [],
            };

        days.set(
            key,
            created,
        );

        return created;
    };

    const attendance =
        getAttendance()
            .filter(
                (entry) =>
                    entry.tenantId ===
                        configuration.tenantId &&
                    entry.storeCode ===
                        configuration.storeCode,
            )
            .filter(
                (entry) =>
                    !filters.employeeId ||
                    entry.employeeId ===
                        filters.employeeId,
            );

    for (
        const entry of attendance
    ) {
        const clockedIn =
            new Date(
                entry.clockedInAt,
            );

        if (
            !Number.isFinite(
                clockedIn.getTime(),
            )
        ) {
            continue;
        }

        const dateKey =
            getLocalDateKey(
                clockedIn,
            );

        if (
            dateKey <
                filters.fromDate ||
            dateKey >
                filters.toDate
        ) {
            continue;
        }

        const day =
            getOrCreateDay(
                entry.employeeId,
                entry.employeeName,
                dateKey,
            );

        day.firstIn =
            !day.firstIn ||
            clockedIn <
                day.firstIn
                ? clockedIn
                : day.firstIn;

        day.checkInCount +=
            1;

        if (
            !day.entryIds.includes(
                entry.id,
            )
        ) {
            day.entryIds.push(
                entry.id,
            );
        }

        if (
            (entry.corrections?.length ?? 0) >
            0
        ) {
            day.hasManualCorrection =
                true;
        }

        if (entry.manualEntry) {
            day.hasManualEntry =
                true;
        }

        if (!entry.clockedOutAt) {
            day.openEntryCount +=
                1;

            day.hasOpenEntry =
                true;

            day.openStatus =
                dateKey ===
                    todayKey
                    ? "נוכח כעת"
                    : "יציאה חסרה";

            continue;
        }

        const clockedOut =
            new Date(
                entry.clockedOutAt,
            );

        if (
            !Number.isFinite(
                clockedOut.getTime(),
            ) ||
            clockedOut <=
                clockedIn
        ) {
            day.openEntryCount +=
                1;

            day.hasOpenEntry =
                true;

            day.openStatus =
                "יציאה חסרה";

            continue;
        }

        day.lastOut =
            !day.lastOut ||
            clockedOut >
                day.lastOut
                ? clockedOut
                : day.lastOut;

        day.closedMinutes +=
            Math.max(
                0,
                (
                    clockedOut.getTime() -
                    clockedIn.getTime()
                ) /
                    60000,
            );
    }

    return Array.from(
        days.values(),
    );
}

function attendanceReport(
    filters: ReportFilters,
): ReportResult {
    type EmployeeSummary = {
        employeeId: string;
        employeeName: string;
        daysWorked: number;
        totalMinutes: number;
        checkInCount: number;
        openEntryCount: number;
        firstIn: Date | null;
        lastOut: Date | null;
        isPresentNow: boolean;
        hasMissingExit: boolean;
        hasManualCorrection: boolean;
        hasManualEntry: boolean;
        extraMinutes: number;
    };

    const summaries =
        new Map<
            string,
            EmployeeSummary
        >();

    for (
        const day of
        buildAttendanceDays(
            filters,
        )
    ) {
        const existing =
            summaries.get(
                day.employeeId,
            );

        const summary:
            EmployeeSummary =
            existing ?? {
                employeeId:
                    day.employeeId,
                employeeName:
                    day.employeeName,
                daysWorked:
                    0,
                totalMinutes:
                    0,
                checkInCount:
                    0,
                openEntryCount:
                    0,
                firstIn:
                    null,
                lastOut:
                    null,
                isPresentNow:
                    false,
                hasMissingExit:
                    false,
                hasManualCorrection:
                    false,
                hasManualEntry:
                    false,
                extraMinutes:
                    0,
            };

        summary.daysWorked +=
            1;

        summary.totalMinutes +=
            day.closedMinutes;

        summary.checkInCount +=
            day.checkInCount;

        summary.openEntryCount +=
            day.openEntryCount;

        summary.firstIn =
            !summary.firstIn ||
            (
                day.firstIn &&
                day.firstIn <
                    summary.firstIn
            )
                ? day.firstIn
                : summary.firstIn;

        summary.lastOut =
            !summary.lastOut ||
            (
                day.lastOut &&
                day.lastOut >
                    summary.lastOut
            )
                ? day.lastOut
                : summary.lastOut;

        if (
            day.openStatus ===
            "נוכח כעת"
        ) {
            summary.isPresentNow =
                true;
        }

        if (
            day.openStatus ===
            "יציאה חסרה"
        ) {
            summary.hasMissingExit =
                true;
        }

        if (day.hasManualCorrection) {
            summary.hasManualCorrection =
                true;
        }

        if (day.hasManualEntry) {
            summary.hasManualEntry =
                true;
        }

        summary.extraMinutes +=
            Math.max(
                0,
                day.closedMinutes -
                    ATTENDANCE_DAILY_EXTRA_THRESHOLD_MINUTES,
            );

        summaries.set(
            day.employeeId,
            summary,
        );
    }

    const values =
        Array.from(
            summaries.values(),
        ).sort(
            (a, b) =>
                a.employeeName.localeCompare(
                    b.employeeName,
                    "he",
                ),
        );

    const rows =
        values.map(
            (summary) => ({
                id:
                    summary.employeeId,
                values: {
                    employee:
                        summary.employeeName,
                    workDays:
                        summary.daysWorked,
                    totalHours:
                        formatAttendanceMinutes(
                            summary.totalMinutes,
                        ),
                    extraHours:
                        formatAttendanceMinutes(
                            summary.extraMinutes,
                        ),
                    averagePerDay:
                        formatAttendanceMinutes(
                            summary.daysWorked > 0
                                ? summary.totalMinutes /
                                    summary.daysWorked
                                : 0,
                        ),
                    firstIn:
                        formatAttendanceDateTime(
                            summary.firstIn,
                        ),
                    lastOut:
                        formatAttendanceDateTime(
                            summary.lastOut,
                        ),
                    entries:
                        summary.checkInCount,
                    openEntries:
                        summary.openEntryCount,
                    status:
                        summary.isPresentNow
                            ? "נוכח כעת"
                            : summary.hasMissingExit
                              ? "דורש בדיקה"
                              : summary.hasManualCorrection
                                ? "תוקן ידנית"
                                : summary.hasManualEntry
                                  ? "כולל רישום ידני"
                                  : "תקין",
                    details:
                        "פירוט",
                },
            }),
        );

    const totalMinutes =
        values.reduce(
            (
                sum,
                employee,
            ) =>
                sum +
                employee.totalMinutes,
            0,
        );

    const totalExtraMinutes =
        values.reduce(
            (
                sum,
                employee,
            ) =>
                sum +
                employee.extraMinutes,
            0,
        );

    const totalOpenEntries =
        values.reduce(
            (
                sum,
                employee,
            ) =>
                sum +
                employee.openEntryCount,
            0,
        );

    const averagePerEmployee =
        values.length > 0
            ? totalMinutes /
                values.length
            : 0;

    return {
        id:
            "attendance",

        title:
            "דוח נוכחות עובדים",

        subtitle:
            "סיכום נוכחות לתקופה — שורה אחת לכל עובד. לחיצה על פירוט מציגה את ימי העבודה של העובד.",

        generatedAt:
            new Date()
                .toISOString(),

        columns: [
            {
                id:
                    "employee",
                label:
                    "עובד",
            },
            {
                id:
                    "workDays",
                label:
                    "ימי עבודה",
                align:
                    "center",
            },
            {
                id:
                    "totalHours",
                label:
                    "סה״כ שעות",
                align:
                    "center",
            },
            {
                id:
                    "extraHours",
                label:
                    "מעל 9 שעות",
                align:
                    "center",
            },
            {
                id:
                    "averagePerDay",
                label:
                    "ממוצע ליום",
                align:
                    "center",
            },
            {
                id:
                    "firstIn",
                label:
                    "כניסה ראשונה",
                align:
                    "center",
            },
            {
                id:
                    "lastOut",
                label:
                    "יציאה אחרונה",
                align:
                    "center",
            },
            {
                id:
                    "entries",
                label:
                    "כניסות",
                align:
                    "center",
            },
            {
                id:
                    "openEntries",
                label:
                    "חריגות",
                align:
                    "center",
            },
            {
                id:
                    "status",
                label:
                    "סטטוס",
                align:
                    "center",
            },
            {
                id:
                    "details",
                label:
                    "",
                align:
                    "center",
            },
        ],

        rows,

        totals: [
            {
                label:
                    "עובדים שעבדו",
                value:
                    String(
                        values.length,
                    ),
            },
            {
                label:
                    "סה״כ שעות",
                value:
                    formatAttendanceMinutes(
                        totalMinutes,
                    ),
            },
            {
                label:
                    "ממוצע שעות לעובד",
                value:
                    formatAttendanceMinutes(
                        averagePerEmployee,
                    ),
            },
            {
                label:
                    "מעל 9 שעות",
                value:
                    formatAttendanceMinutes(
                        totalExtraMinutes,
                    ),
            },
            {
                label:
                    "רישומים פתוחים / חסרים",
                value:
                    String(
                        totalOpenEntries,
                    ),
            },
        ],
    };
}

export function generateAttendanceEmployeeDetail(
    employeeId: string,
    filters: ReportFilters,
): ReportResult {
    const configuration =
        getActiveBusinessConfiguration();

    const todayKey =
        getLocalDateKey(
            new Date(),
        );

    const entries =
        getAttendance()
            .filter(
                (entry) =>
                    entry.tenantId ===
                        configuration.tenantId &&
                    entry.storeCode ===
                        configuration.storeCode &&
                    entry.employeeId ===
                        employeeId,
            )
            .map(
                (entry) => {
                    const clockedIn =
                        new Date(
                            entry.clockedInAt,
                        );

                    const clockedOut =
                        entry.clockedOutAt
                            ? new Date(
                                entry.clockedOutAt,
                            )
                            : null;

                    const validClockOut =
                        clockedOut &&
                        Number.isFinite(
                            clockedOut.getTime(),
                        ) &&
                        clockedOut >
                            clockedIn
                            ? clockedOut
                            : null;

                    const dateKey =
                        Number.isFinite(
                            clockedIn.getTime(),
                        )
                            ? getLocalDateKey(
                                clockedIn,
                            )
                            : "";

                    const minutes =
                        validClockOut
                            ? Math.max(
                                0,
                                (
                                    validClockOut.getTime() -
                                    clockedIn.getTime()
                                ) /
                                    60000,
                            )
                            : null;

                    return {
                        entry,
                        clockedIn,
                        validClockOut,
                        dateKey,
                        minutes,
                    };
                },
            )
            .filter(
                (item) =>
                    item.dateKey &&
                    item.dateKey >=
                        filters.fromDate &&
                    item.dateKey <=
                        filters.toDate,
            );

    const daily =
        new Map<
            string,
            {
                totalMinutes: number;
                hasOpenEntry: boolean;
                lastEntryId: string;
            }
        >();

    for (
        const item of entries
    ) {
        const existing =
            daily.get(
                item.dateKey,
            ) ?? {
                totalMinutes:
                    0,
                hasOpenEntry:
                    false,
                lastEntryId:
                    item.entry.id,
            };

        if (
            item.minutes !==
            null
        ) {
            existing.totalMinutes +=
                item.minutes;
        }
        else {
            existing.hasOpenEntry =
                true;
        }

        const currentLast =
            entries.find(
                (candidate) =>
                    candidate.entry.id ===
                    existing.lastEntryId,
            );

        if (
            !currentLast ||
            item.clockedIn >
                currentLast.clockedIn
        ) {
            existing.lastEntryId =
                item.entry.id;
        }

        daily.set(
            item.dateKey,
            existing,
        );
    }

    entries.sort(
        (a, b) => {
            if (
                a.dateKey !==
                b.dateKey
            ) {
                return b.dateKey.localeCompare(
                    a.dateKey,
                );
            }

            return (
                a.clockedIn.getTime() -
                b.clockedIn.getTime()
            );
        },
    );

    const employeeName =
        entries[0]
            ?.entry.employeeName ??
        "עובד";

    return {
        id:
            "attendance",

        title:
            `פירוט נוכחות · ${employeeName}`,

        subtitle:
            "כל כניסה ויציאה מוצגות בשורה נפרדת. סה״כ יומי ומעבר ל־9 שעות מחושבים מכל המקטעים של אותו יום.",

        generatedAt:
            new Date()
                .toISOString(),

        columns: [
            {
                id:
                    "entryDate",
                label:
                    "תאריך כניסה",
            },
            {
                id:
                    "clockIn",
                label:
                    "כניסה",
                align:
                    "center",
            },
            {
                id:
                    "exitDate",
                label:
                    "תאריך יציאה",
                align:
                    "center",
            },
            {
                id:
                    "clockOut",
                label:
                    "יציאה",
                align:
                    "center",
            },
            {
                id:
                    "segmentHours",
                label:
                    "משך",
                align:
                    "center",
            },
            {
                id:
                    "dailyTotal",
                label:
                    "סה״כ יומי",
                align:
                    "center",
            },
            {
                id:
                    "extraHours",
                label:
                    "מעל 9 שעות",
                align:
                    "center",
            },
            {
                id:
                    "status",
                label:
                    "מצב",
                align:
                    "center",
            },
        ],

        rows:
            entries.map(
                (item) => {
                    const {
                        entry,
                        clockedIn,
                        validClockOut,
                        dateKey,
                        minutes,
                    } = item;

                    const day =
                        daily.get(
                            dateKey,
                        );

                    const showDailySummary =
                        day?.lastEntryId ===
                        entry.id;

                    const hasManualCorrection =
                        (
                            entry.corrections
                                ?.length ??
                            0
                        ) > 0;

                    const status =
                        hasManualCorrection
                            ? "תוקן ידנית"
                            : entry.manualEntry
                              ? "נוסף ידנית"
                              : validClockOut
                                ? "תקין"
                                : dateKey ===
                                      todayKey &&
                                  entry.status ===
                                      "present"
                                  ? "נוכח כעת"
                                  : "יציאה חסרה";

                    const dailyTotal =
                        showDailySummary &&
                        day
                            ? day.hasOpenEntry
                                ? day.totalMinutes > 0
                                    ? `${formatAttendanceMinutes(
                                        day.totalMinutes,
                                    )} + פתוח`
                                    : "פתוח"
                                : formatAttendanceMinutes(
                                    day.totalMinutes,
                                )
                            : "—";

                    const extraHours =
                        showDailySummary &&
                        day &&
                        !day.hasOpenEntry
                            ? formatAttendanceMinutes(
                                Math.max(
                                    0,
                                    day.totalMinutes -
                                        ATTENDANCE_DAILY_EXTRA_THRESHOLD_MINUTES,
                                ),
                            )
                            : "—";

                    return {
                        id:
                            entry.id,

                        values: {
                            entryDate:
                                clockedIn.toLocaleDateString(
                                    "he-IL",
                                ),

                            clockIn:
                                formatAttendanceTime(
                                    clockedIn,
                                ),

                            exitDate:
                                validClockOut
                                    ? validClockOut.toLocaleDateString(
                                        "he-IL",
                                    )
                                    : "—",

                            clockOut:
                                validClockOut
                                    ? formatAttendanceTime(
                                        validClockOut,
                                    )
                                    : "—",

                            segmentHours:
                                minutes ===
                                null
                                    ? "—"
                                    : formatAttendanceMinutes(
                                        minutes,
                                    ),

                            dailyTotal,

                            extraHours,

                            status,

                            employeeId:
                                entry.employeeId,

                            correctionEntryId:
                                entry.id,

                            hasManualCorrection:
                                hasManualCorrection
                                    ? "yes"
                                    : "no",

                            hasManualEntry:
                                entry.manualEntry
                                    ? "yes"
                                    : "no",
                        },
                    };
                },
            ),
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

        case "category-sales":
            return categorySales(filters);

        case "returns-summary":
            return returnsSummary(filters);

        case "seller-sales":
            return sellerSales(filters);

        case "inventory-valuation":
            return inventoryValuation(filters);

        case "attendance":
            return attendanceReport(filters);
    }
}
