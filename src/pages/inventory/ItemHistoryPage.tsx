// LUMORA ITEM HISTORY V1.5 DOCUMENT DRILLDOWN
import {
    Fragment,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useCatalog,
} from "../../context/useCatalog";
import {
    getInventoryAdjustmentDocuments,
    hydrateInventoryAdjustments,
} from "../../models/inventory/InventoryAdjustmentRepository";
import {
    getSupplierInvoices,
    hydrateSupplierInvoices,
} from "../../models/inventory/SupplierInvoiceRepository";
import {
    getSuppliers,
    hydrateSuppliers,
} from "../../models/inventory/SupplierRepository";
import {
    getSupplierReturns,
    hydrateSupplierReturns,
} from "../../models/inventory/SupplierReturnRepository";
import {
    getTransactions,
    hydrateTransactions,
} from "../../models/transaction/TransactionRepository";
import type {
    Product,
} from "../../types/product";

import "./item-history-page.css";

type ItemHistoryType =
    | "supplier_invoice"
    | "sale"
    | "customer_return"
    | "adjustment"
    | "supplier_return";

type DatePreset =
    | "all"
    | "today"
    | "7d"
    | "30d"
    | "month"
    | "custom";

type ItemHistoryEvent = {
    id: string;
    occurredAt: string;
    type: ItemHistoryType;
    label: string;
    documentNumber: string;
    party: string;
    variant: string;
    quantityDelta: number;
    before?: number;
    after?: number;
    unitCost?: number;
    note: string;
};

type EventWithBalance =
    ItemHistoryEvent & {
        balanceAfter?: number;
    };

const typeLabels: Record<ItemHistoryType, string> = {
    supplier_invoice: "קנייה מספק",
    sale: "מכירה",
    customer_return: "החזרת לקוח",
    adjustment: "התאמת מלאי",
    supplier_return: "החזרה לספק",
};

const datePresets: Array<{
    value: DatePreset;
    label: string;
}> = [
    { value: "all", label: "הכול" },
    { value: "today", label: "היום" },
    { value: "7d", label: "7 ימים" },
    { value: "30d", label: "30 ימים" },
    { value: "month", label: "החודש" },
    { value: "custom", label: "מותאם" },
];

function productName(product: Product): string {
    return (
        product.names?.he ??
        product.name
    );
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat(
        "he-IL",
        {
            dateStyle: "short",
            timeStyle: "short",
        },
    ).format(new Date(value));
}

function formatNumber(value: number): string {
    return new Intl.NumberFormat(
        "he-IL",
        {
            maximumFractionDigits: 3,
        },
    ).format(value);
}

function startOfDay(value: Date): Date {
    const result = new Date(value);
    result.setHours(0, 0, 0, 0);
    return result;
}

function endOfDay(value: Date): Date {
    const result = new Date(value);
    result.setHours(23, 59, 59, 999);
    return result;
}

function dateInputValue(value: Date): string {
    const year = value.getFullYear();
    const month = String(
        value.getMonth() + 1,
    ).padStart(2, "0");
    const day = String(
        value.getDate(),
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getDateBounds(
    preset: DatePreset,
    customFrom: string,
    customTo: string,
): {
    from?: Date;
    to?: Date;
} {
    const now = new Date();

    if (preset === "all") {
        return {};
    }

    if (preset === "custom") {
        return {
            from: customFrom
                ? startOfDay(
                      new Date(
                          `${customFrom}T00:00:00`,
                      ),
                  )
                : undefined,
            to: customTo
                ? endOfDay(
                      new Date(
                          `${customTo}T00:00:00`,
                      ),
                  )
                : undefined,
        };
    }

    if (preset === "today") {
        return {
            from: startOfDay(now),
            to: endOfDay(now),
        };
    }

    if (preset === "month") {
        return {
            from: new Date(
                now.getFullYear(),
                now.getMonth(),
                1,
                0,
                0,
                0,
                0,
            ),
            to: endOfDay(now),
        };
    }

    const days =
        preset === "7d"
            ? 7
            : 30;
    const from = startOfDay(now);
    from.setDate(
        from.getDate() - (days - 1),
    );

    return {
        from,
        to: endOfDay(now),
    };
}

function inDateRange(
    value: string,
    from?: Date,
    to?: Date,
): boolean {
    const time = new Date(value).getTime();

    if (
        from &&
        time < from.getTime()
    ) {
        return false;
    }

    if (
        to &&
        time > to.getTime()
    ) {
        return false;
    }

    return true;
}

type ItemHistoryPageProps = {
    onOpenInventoryDocument?: (
        type:
            | "supplier_invoice"
            | "supplier_return"
            | "adjustment",
        documentNumber: string,
    ) => void;
};

function ItemHistoryPage({
    onOpenInventoryDocument,
}: ItemHistoryPageProps) {
    const { products } = useCatalog();
    const [revision, setRevision] =
        useState(0);
    const [query, setQuery] =
        useState("");
    const [productId, setProductId] =
        useState("");
    const [typeFilter, setTypeFilter] =
        useState<ItemHistoryType | "all">(
            "all",
        );
    const [datePreset, setDatePreset] =
        useState<DatePreset>("30d");
    const [customFrom, setCustomFrom] =
        useState("");
    const [customTo, setCustomTo] =
        useState("");
    const [historyQuery, setHistoryQuery] =
        useState("");
    const [variantFilter, setVariantFilter] =
        useState("all");
    const [supplierFilter, setSupplierFilter] =
        useState("all");
    const [expandedEventId, setExpandedEventId] =
        useState<string | null>(null);
    const [error, setError] =
        useState<string | null>(null);

    useEffect(() => {
        let alive = true;

        Promise.all([
            hydrateTransactions(),
            hydrateSupplierInvoices(),
            hydrateSupplierReturns(),
            hydrateSuppliers(),
            hydrateInventoryAdjustments(),
        ])
            .then(() => {
                if (alive) {
                    setRevision(
                        (current) =>
                            current + 1,
                    );
                }
            })
            .catch((reason) => {
                if (alive) {
                    setError(
                        reason instanceof Error
                            ? reason.message
                            : "טעינת היסטוריית הפריט נכשלה.",
                    );
                }
            });

        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        if (
            !productId &&
            products.length > 0 &&
            supplierFilter === "all"
        ) {
            setProductId(products[0].id);
        }
    }, [
        productId,
        products,
        supplierFilter,
    ]);

    useEffect(() => {
        setVariantFilter("all");
        setExpandedEventId(null);
    }, [productId]);

    const supplierOptions =
        useMemo(
            () =>
                getSuppliers()
                    .filter(
                        (supplier) =>
                            supplier.isActive,
                    )
                    .sort(
                        (left, right) =>
                            left.name.localeCompare(
                                right.name,
                                "he",
                            ),
                    ),
            [revision],
        );

    const sortedProducts =
        useMemo(
            () =>
                [...products].sort(
                    (left, right) =>
                        productName(left)
                            .localeCompare(
                                productName(right),
                                "he",
                            ),
                ),
            [products],
        );

    const supplierFilteredProducts =
        useMemo(() => {
            if (supplierFilter === "all") {
                return sortedProducts;
            }

            const supplier =
                supplierOptions.find(
                    (item) =>
                        item.id === supplierFilter,
                );

            return sortedProducts.filter(
                (product) =>
                    product.supplier?.id ===
                        supplierFilter ||
                    Boolean(
                        supplier &&
                        product.supplier?.name ===
                            supplier.name,
                    ),
            );
        }, [
            sortedProducts,
            supplierFilter,
            supplierOptions,
        ]);

    const visibleProducts =
        useMemo(() => {
            const value =
                query.trim().toLowerCase();

            return supplierFilteredProducts.filter(
                (product) =>
                    !value ||
                    productName(product)
                        .toLowerCase()
                        .includes(value) ||
                    product.sku
                        .toLowerCase()
                        .includes(value) ||
                    product.barcode.includes(
                        value,
                    ),
            );
        }, [
            query,
            supplierFilteredProducts,
        ]);

    useEffect(() => {
        if (supplierFilter === "all") {
            return;
        }

        if (
            supplierFilteredProducts.some(
                (product) =>
                    product.id === productId,
            )
        ) {
            return;
        }

        setProductId(
            supplierFilteredProducts[0]?.id ??
                "",
        );
    }, [
        productId,
        supplierFilter,
        supplierFilteredProducts,
    ]);

    const selectedProduct =
        products.find(
            (product) =>
                product.id === productId,
        );

    const selectedIndex =
        supplierFilteredProducts.findIndex(
            (product) =>
                product.id === productId,
        );

    const selectRelativeProduct =
        (direction: -1 | 1) => {
            if (
                supplierFilteredProducts.length === 0 ||
                selectedIndex < 0
            ) {
                return;
            }

            const nextIndex =
                selectedIndex + direction;

            if (
                nextIndex < 0 ||
                nextIndex >= supplierFilteredProducts.length
            ) {
                return;
            }

            setProductId(
                supplierFilteredProducts[nextIndex].id,
            );
        };

    const allEvents = useMemo(() => {
        if (!productId) {
            return [] as ItemHistoryEvent[];
        }

        const result: ItemHistoryEvent[] = [];

        for (
            const invoice of
            getSupplierInvoices()
        ) {
            if (invoice.status !== "posted") {
                continue;
            }

            for (const line of invoice.lines) {
                if (
                    line.product.id !== productId ||
                    line.receivedQuantity === null
                ) {
                    continue;
                }

                result.push({
                    id: `supplier-invoice:${invoice.id}:${line.key}`,
                    occurredAt:
                        invoice.postedAt ??
                        invoice.updatedAt,
                    type: "supplier_invoice",
                    label: typeLabels.supplier_invoice,
                    documentNumber:
                        invoice.documentNumber ??
                        invoice.supplierInvoiceNumber,
                    party: invoice.supplier.name,
                    variant:
                        line.product.variantLabel ??
                        "—",
                    quantityDelta:
                        Math.abs(
                            line.receivedQuantity,
                        ),
                    before:
                        line.previousQuantity,
                    after:
                        line.resultingQuantity ??
                        undefined,
                    unitCost:
                        line.unitCostBeforeVat ??
                        undefined,
                    note: invoice.note,
                });
            }
        }

        for (
            const supplierReturn of
            getSupplierReturns()
        ) {
            if (
                supplierReturn.status !== "posted"
            ) {
                continue;
            }

            for (
                const line of
                supplierReturn.lines
            ) {
                if (
                    line.product.id !== productId ||
                    line.returnedQuantity === null
                ) {
                    continue;
                }

                result.push({
                    id: `supplier-return:${supplierReturn.id}:${line.key}`,
                    occurredAt:
                        supplierReturn.postedAt ??
                        supplierReturn.updatedAt,
                    type: "supplier_return",
                    label: typeLabels.supplier_return,
                    documentNumber:
                        supplierReturn.documentNumber ??
                        supplierReturn.supplierReferenceNumber ??
                        "—",
                    party:
                        supplierReturn.supplier.name,
                    variant:
                        line.product.variantLabel ??
                        "—",
                    quantityDelta:
                        -Math.abs(
                            line.returnedQuantity,
                        ),
                    before:
                        line.previousQuantity,
                    after:
                        line.resultingQuantity ??
                        undefined,
                    unitCost:
                        line.unitCostBeforeVat ??
                        undefined,
                    note: supplierReturn.note,
                });
            }
        }

        for (
            const document of
            getInventoryAdjustmentDocuments()
        ) {
            if (document.status !== "posted") {
                continue;
            }

            for (const line of document.lines) {
                if (
                    line.product.id !== productId ||
                    line.difference === null
                ) {
                    continue;
                }

                result.push({
                    id: `adjustment:${document.id}:${line.key}`,
                    occurredAt:
                        document.postedAt ??
                        document.updatedAt,
                    type: "adjustment",
                    label: typeLabels.adjustment,
                    documentNumber:
                        document.documentNumber ??
                        "—",
                    party:
                        document.performedBy
                            ?.employeeName ??
                        "—",
                    variant:
                        line.product.variantLabel ??
                        "—",
                    quantityDelta:
                        line.difference,
                    before:
                        line.previousQuantity,
                    after:
                        line.resultingQuantity ??
                        undefined,
                    note: document.note,
                });
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

            for (const line of transaction.lines) {
                if (
                    line.productId !== productId ||
                    line.source !== "catalog"
                ) {
                    continue;
                }

                const isReturn =
                    line.kind === "return";

                result.push({
                    id: `transaction:${transaction.id}:${line.id}`,
                    occurredAt:
                        transaction.completedAt ??
                        transaction.createdAt,
                    type: isReturn
                        ? "customer_return"
                        : "sale",
                    label: isReturn
                        ? typeLabels.customer_return
                        : typeLabels.sale,
                    documentNumber:
                        transaction.number,
                    party:
                        transaction.customer.name,
                    variant:
                        line.variant?.variantId ??
                        "—",
                    quantityDelta:
                        isReturn
                            ? Math.abs(line.quantity)
                            : -Math.abs(line.quantity),
                    note:
                        line.returnReason ??
                        "",
                });
            }
        }

        return result.sort(
            (left, right) =>
                new Date(
                    right.occurredAt,
                ).getTime() -
                new Date(
                    left.occurredAt,
                ).getTime(),
        );
    }, [productId, revision]);

    const eventsWithBalance =
        useMemo(() => {
            let balance =
                selectedProduct?.stockOnHand;

            return allEvents.map(
                (event): EventWithBalance => {
                    const balanceAfter =
                        balance;

                    if (
                        balance !== undefined &&
                        Number.isFinite(balance)
                    ) {
                        balance -=
                            event.quantityDelta;
                    }

                    return {
                        ...event,
                        balanceAfter:
                            balanceAfter !== undefined &&
                            Number.isFinite(balanceAfter)
                                ? balanceAfter
                                : event.after,
                    };
                },
            );
        }, [allEvents, selectedProduct]);

    const dateBounds = useMemo(
        () =>
            getDateBounds(
                datePreset,
                customFrom,
                customTo,
            ),
        [datePreset, customFrom, customTo],
    );

    const periodEvents = useMemo(
        () =>
            eventsWithBalance.filter(
                (event) =>
                    inDateRange(
                        event.occurredAt,
                        dateBounds.from,
                        dateBounds.to,
                    ),
            ),
        [eventsWithBalance, dateBounds],
    );

    const variants = useMemo(
        () =>
            Array.from(
                new Set(
                    eventsWithBalance
                        .map(
                            (event) =>
                                event.variant,
                        )
                        .filter(
                            (variant) =>
                                variant &&
                                variant !== "—",
                        ),
                ),
            ).sort((left, right) =>
                left.localeCompare(right, "he"),
            ),
        [eventsWithBalance],
    );

    const visibleEvents = useMemo(() => {
        const value =
            historyQuery
                .trim()
                .toLowerCase();

        return periodEvents.filter(
            (event) => {
                if (
                    typeFilter !== "all" &&
                    event.type !== typeFilter
                ) {
                    return false;
                }

                if (
                    variantFilter !== "all" &&
                    event.variant !== variantFilter
                ) {
                    return false;
                }

                if (!value) {
                    return true;
                }

                return [
                    event.documentNumber,
                    event.party,
                    event.note,
                    event.label,
                    event.variant,
                ].some((candidate) =>
                    candidate
                        .toLowerCase()
                        .includes(value),
                );
            },
        );
    }, [
        historyQuery,
        periodEvents,
        typeFilter,
        variantFilter,
    ]);

    const periodSummary = useMemo(() => {
        const currentStock =
            selectedProduct?.stockOnHand;

        const inbound =
            periodEvents.reduce(
                (sum, event) =>
                    sum +
                    Math.max(
                        event.quantityDelta,
                        0,
                    ),
                0,
            );
        const outbound =
            periodEvents.reduce(
                (sum, event) =>
                    sum +
                    Math.abs(
                        Math.min(
                            event.quantityDelta,
                            0,
                        ),
                    ),
                0,
            );

        if (
            currentStock === undefined ||
            !Number.isFinite(currentStock)
        ) {
            return {
                opening: undefined,
                inbound,
                outbound,
                closing: undefined,
            };
        }

        const afterPeriod =
            dateBounds.to
                ? eventsWithBalance.filter(
                      (event) =>
                          new Date(
                              event.occurredAt,
                          ).getTime() >
                          dateBounds.to!.getTime(),
                  )
                : [];

        const movementAfterPeriod =
            afterPeriod.reduce(
                (sum, event) =>
                    sum + event.quantityDelta,
                0,
            );

        const closing =
            currentStock -
            movementAfterPeriod;
        const periodMovement =
            periodEvents.reduce(
                (sum, event) =>
                    sum + event.quantityDelta,
                0,
            );

        return {
            opening:
                closing - periodMovement,
            inbound,
            outbound,
            closing,
        };
    }, [
        dateBounds.to,
        eventsWithBalance,
        periodEvents,
        selectedProduct,
    ]);

    const customDatesVisible =
        datePreset === "custom";

    const resetFilters = () => {
        setDatePreset("30d");
        setCustomFrom("");
        setCustomTo("");
        setTypeFilter("all");
        setVariantFilter("all");
        setSupplierFilter("all");
        setHistoryQuery("");
    };

    return (
        <section
            className="item-history"
            dir="rtl"
        >
            <header className="item-history__header">
                <div>
                    <p className="item-history__eyebrow">
                        LUMORA INVENTORY
                    </p>
                    <h1>היסטוריית פריט</h1>
                    <p>
                        תמונת מצב ותנועות מלאי לפי תקופה, מסמך וסוג תנועה.
                    </p>
                </div>
            </header>

            <div className="item-history__product-bar">
                <label className="item-history__product-search">
                    <span>חיפוש פריט</span>
                    <input
                        type="search"
                        value={query}
                        onChange={(event) =>
                            setQuery(
                                event.target.value,
                            )
                        }
                        placeholder="שם / SKU / ברקוד"
                    />
                </label>

                <div className="item-history__product-picker">
                    <span>פריט</span>
                    <div className="item-history__product-picker-row">
                        <button
                            type="button"
                            className="item-history__step"
                            onClick={() =>
                                selectRelativeProduct(-1)
                            }
                            disabled={
                                selectedIndex <= 0
                            }
                            aria-label="פריט קודם"
                        >
                            ‹
                        </button>

                        <select
                            value={productId}
                            onChange={(event) =>
                                setProductId(
                                    event.target.value,
                                )
                            }
                        >
                            <option value="">
                                בחר פריט
                            </option>
                            {visibleProducts.map(
                                (product) => (
                                    <option
                                        key={product.id}
                                        value={product.id}
                                    >
                                        {productName(product)} · {product.sku}
                                    </option>
                                ),
                            )}
                        </select>

                        <button
                            type="button"
                            className="item-history__step"
                            onClick={() =>
                                selectRelativeProduct(1)
                            }
                            disabled={
                                selectedIndex < 0 ||
                                selectedIndex >=
                                    supplierFilteredProducts.length - 1
                            }
                            aria-label="פריט הבא"
                        >
                            ›
                        </button>
                    </div>
                </div>

                <div className="item-history__stock-card">
                    <span>מלאי נוכחי</span>
                    <strong>
                        {selectedProduct
                            ?.stockOnHand ??
                            "—"}
                    </strong>
                </div>
            </div>

            <section className="item-history__filter-card">
                <div className="item-history__filter-row">
                    <div className="item-history__filter-group item-history__filter-group--wide">
                        <span>תקופה</span>
                        <div className="item-history__chips">
                            {datePresets.map(
                                (preset) => (
                                    <button
                                        key={preset.value}
                                        type="button"
                                        className={
                                            datePreset === preset.value
                                                ? "item-history__chip item-history__chip--active"
                                                : "item-history__chip"
                                        }
                                        onClick={() =>
                                            setDatePreset(
                                                preset.value,
                                            )
                                        }
                                    >
                                        {preset.label}
                                    </button>
                                ),
                            )}
                        </div>
                    </div>

                    <label className="item-history__history-search">
                        <span>חיפוש בתנועות</span>
                        <input
                            type="search"
                            value={historyQuery}
                            onChange={(event) =>
                                setHistoryQuery(
                                    event.target.value,
                                )
                            }
                            placeholder="מסמך / ספק / לקוח / הערה"
                        />
                    </label>

                    <label className="item-history__supplier-filter">
                        <span>ספק · מסנן פריטים</span>
                        <select
                            value={supplierFilter}
                            onChange={(event) =>
                                setSupplierFilter(
                                    event.target.value,
                                )
                            }
                        >
                            <option value="all">
                                כל הספקים
                            </option>
                            {supplierOptions.map(
                                (supplier) => (
                                    <option
                                        key={supplier.id}
                                        value={supplier.id}
                                    >
                                        {supplier.name}
                                    </option>
                                ),
                            )}
                        </select>
                    </label>

                    {variants.length > 0 && (
                        <label className="item-history__variant-filter">
                            <span>וריאנט</span>
                            <select
                                value={variantFilter}
                                onChange={(event) =>
                                    setVariantFilter(
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="all">
                                    כל הוריאנטים
                                </option>
                                {variants.map(
                                    (variant) => (
                                        <option
                                            key={variant}
                                            value={variant}
                                        >
                                            {variant}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>
                    )}

                    <button
                        type="button"
                        className="item-history__reset"
                        onClick={resetFilters}
                    >
                        איפוס
                    </button>
                </div>

                {customDatesVisible && (
                    <div className="item-history__custom-dates">
                        <label>
                            <span>מתאריך</span>
                            <input
                                type="date"
                                value={customFrom}
                                max={
                                    customTo ||
                                    dateInputValue(
                                        new Date(),
                                    )
                                }
                                onChange={(event) =>
                                    setCustomFrom(
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            <span>עד תאריך</span>
                            <input
                                type="date"
                                value={customTo}
                                min={customFrom || undefined}
                                max={dateInputValue(
                                    new Date(),
                                )}
                                onChange={(event) =>
                                    setCustomTo(
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>
                )}

                <div className="item-history__movement-filter">
                    <span>סוג תנועה</span>
                    <div className="item-history__chips">
                        <button
                            type="button"
                            className={
                                typeFilter === "all"
                                    ? "item-history__chip item-history__chip--active"
                                    : "item-history__chip"
                            }
                            onClick={() =>
                                setTypeFilter("all")
                            }
                        >
                            הכול
                        </button>
                        {Object.entries(
                            typeLabels,
                        ).map(
                            ([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    className={
                                        typeFilter === value
                                            ? "item-history__chip item-history__chip--active"
                                            : "item-history__chip"
                                    }
                                    onClick={() =>
                                        setTypeFilter(
                                            value as ItemHistoryType,
                                        )
                                    }
                                >
                                    {label}
                                </button>
                            ),
                        )}
                    </div>
                </div>
            </section>

            <section className="item-history__summary" aria-label="סיכום מלאי בתקופה">
                <div>
                    <span>פתיחה</span>
                    <strong>
                        {periodSummary.opening === undefined
                            ? "—"
                            : formatNumber(
                                  periodSummary.opening,
                              )}
                    </strong>
                </div>
                <div>
                    <span>נכנס</span>
                    <strong className="item-history__summary-positive">
                        +{formatNumber(
                            periodSummary.inbound,
                        )}
                    </strong>
                </div>
                <div>
                    <span>יצא</span>
                    <strong className="item-history__summary-negative">
                        -{formatNumber(
                            periodSummary.outbound,
                        )}
                    </strong>
                </div>
                <div>
                    <span>סגירה</span>
                    <strong>
                        {periodSummary.closing === undefined
                            ? "—"
                            : formatNumber(
                                  periodSummary.closing,
                              )}
                    </strong>
                </div>
            </section>

            {error && (
                <div className="item-history__error">
                    {error}
                </div>
            )}

            <div className="item-history__table-header">
                <strong>
                    {visibleEvents.length} תנועות
                </strong>
                <span>
                    לחץ על „פרטים” למידע המלא של התנועה.
                </span>
            </div>

            <div className="item-history__table-wrap">
                <table className="item-history__table">
                    <thead>
                        <tr>
                            <th>מועד</th>
                            <th>תנועה</th>
                            <th>מסמך</th>
                            <th>גורם</th>
                            <th>כמות</th>
                            <th>יתרה</th>
                            <th>וריאנט</th>
                            <th>פרטים</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleEvents.map((event) => {
                            const expanded =
                                expandedEventId ===
                                event.id;

                            return (
                                <Fragment key={event.id}>
                                    <tr>
                                        <td>
                                            {formatDate(
                                                event.occurredAt,
                                            )}
                                        </td>
                                        <td>
                                            <span
                                                className={`item-history__type item-history__type--${event.type}`}
                                            >
                                                {event.label}
                                            </span>
                                        </td>
                                        <td>
                                            <strong
                                                className="item-history__document-number"
                                                role={
                                                    event.type === "supplier_invoice" ||
                                                    event.type === "supplier_return" ||
                                                    event.type === "adjustment"
                                                        ? "button"
                                                        : undefined
                                                }
                                                tabIndex={
                                                    event.type === "supplier_invoice" ||
                                                    event.type === "supplier_return" ||
                                                    event.type === "adjustment"
                                                        ? 0
                                                        : undefined
                                                }
                                                title={
                                                    event.type === "supplier_invoice" ||
                                                    event.type === "supplier_return" ||
                                                    event.type === "adjustment"
                                                        ? "לחיצה כפולה לפתיחת המסמך"
                                                        : undefined
                                                }
                                                onDoubleClick={() => {
                                                    if (
                                                        event.documentNumber === "—" ||
                                                        (
                                                            event.type !== "supplier_invoice" &&
                                                            event.type !== "supplier_return" &&
                                                            event.type !== "adjustment"
                                                        )
                                                    ) {
                                                        return;
                                                    }

                                                    onOpenInventoryDocument?.(
                                                        event.type,
                                                        event.documentNumber,
                                                    );
                                                }}
                                                onKeyDown={(keyboardEvent) => {
                                                    if (
                                                        keyboardEvent.key !== "Enter" ||
                                                        event.documentNumber === "—" ||
                                                        (
                                                            event.type !== "supplier_invoice" &&
                                                            event.type !== "supplier_return" &&
                                                            event.type !== "adjustment"
                                                        )
                                                    ) {
                                                        return;
                                                    }

                                                    onOpenInventoryDocument?.(
                                                        event.type,
                                                        event.documentNumber,
                                                    );
                                                }}
                                            >
                                                {event.documentNumber}
                                            </strong>
                                        </td>
                                        <td>{event.party}</td>
                                        <td
                                            className={
                                                event.quantityDelta > 0
                                                    ? "item-history__quantity item-history__quantity--positive"
                                                    : "item-history__quantity item-history__quantity--negative"
                                            }
                                        >
                                            {event.quantityDelta > 0
                                                ? "+"
                                                : ""}
                                            {formatNumber(
                                                event.quantityDelta,
                                            )}
                                        </td>
                                        <td className="item-history__balance">
                                            {event.balanceAfter === undefined
                                                ? "—"
                                                : formatNumber(
                                                      event.balanceAfter,
                                                  )}
                                        </td>
                                        <td>{event.variant}</td>
                                        <td>
                                            <button
                                                type="button"
                                                className="item-history__details-button"
                                                aria-expanded={expanded}
                                                onClick={() =>
                                                    setExpandedEventId(
                                                        expanded
                                                            ? null
                                                            : event.id,
                                                    )
                                                }
                                            >
                                                {expanded
                                                    ? "סגור"
                                                    : "פרטים"}
                                            </button>
                                        </td>
                                    </tr>

                                    {expanded && (
                                        <tr className="item-history__details-row">
                                            <td colSpan={8}>
                                                <div className="item-history__details-grid">
                                                    <div>
                                                        <span>לפני</span>
                                                        <strong>
                                                            {event.before ?? "—"}
                                                        </strong>
                                                    </div>
                                                    <div>
                                                        <span>אחרי</span>
                                                        <strong>
                                                            {event.after ?? event.balanceAfter ?? "—"}
                                                        </strong>
                                                    </div>
                                                    <div>
                                                        <span>עלות יח׳</span>
                                                        <strong>
                                                            {event.unitCost === undefined
                                                                ? "—"
                                                                : `₪${event.unitCost.toFixed(2)}`}
                                                        </strong>
                                                    </div>
                                                    <div className="item-history__details-note">
                                                        <span>הערה</span>
                                                        <strong>
                                                            {event.note || "—"}
                                                        </strong>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}

                        {productId &&
                            visibleEvents.length === 0 && (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="item-history__empty"
                                >
                                    אין תנועות מתועדות לפריט במסננים הנוכחיים.
                                </td>
                            </tr>
                        )}

                        {!productId && (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="item-history__empty"
                                >
                                    בחר פריט כדי לראות את ההיסטוריה שלו.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

export default ItemHistoryPage;
