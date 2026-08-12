import {
    useEffect,
    useMemo,
    useState,
} from "react";

import LineDiscountDialog from "../../components/pricing/LineDiscountDialog";
import PriceOverrideDialog from "../../components/pricing/PriceOverrideDialog";
import TransactionDiscountDialog from "../../components/pricing/TransactionDiscountDialog";
import CartPanel from "../../components/pos/CartPanel";
import ProductGrid from "../../components/pos/ProductGrid";
import { posCapabilities } from "../../config/posCapabilities";
import { usePricing } from "../../context/usePricing";
import { useCatalog } from "../../context/useCatalog";
import { translate } from "../../i18n";
import { categorySeed } from "../../models/catalog/Category";
import {
    testCustomers,
} from "../../models/customer/CustomerSeed";
import { createAccountingDocument } from "../../models/document/DocumentFactory";
import { issueMonetaryValue } from "../../models/monetary-value/MonetaryValueService";
import type { Payment } from "../../models/Payment";
import {
    redeemCoupon,
} from "../../models/coupon/CouponService";
import {
    DefaultPricingRules,
} from "../../models/pricing/DefaultPricingRules";
import type { CartLine } from "../../models/sale/CartLine";
import type {
    AppliedSaleCoupon,
    Sale,
} from "../../models/sale/Sale";
import type { SaleLine } from "../../models/sale/SaleLine";
import { completeSale } from "../../models/sale/SaleService";
import type { Product } from "../../types/product";
import PaymentPage from "../payment/PaymentPage";
import RefundPage from "../payment/RefundPage";
import ReturnItemPage from "../return-item/ReturnItemPage";
import SaleCompletePage from "../sale-complete/SaleCompletePage";

type SalePageProps = {
    incomingReturnLines?: CartLine[];
    onReturnLinesConsumed?: () => void;
};

type SaleMode =
    | "sale"
    | "return-item";

type CategoryOption = {
    id: string;
    label: string;
};

const categories: CategoryOption[] = [
    {
        id: "all",
        label: translate("common.all"),
    },
    ...categorySeed
        .filter(
            (category) =>
                category.level === "category" &&
                category.isActive,
        )
        .sort(
            (a, b) =>
                a.sortOrder - b.sortOrder,
        )
        .map((category) => ({
            id: category.id,
            label: category.name,
        })),
];

function SalePage({
    incomingReturnLines = [],
    onReturnLinesConsumed,
}: SalePageProps) {
    const { products } = useCatalog();

    const {
        pricingRules,
        pricing,
        setCartLines,
        updateCartLines,
        addPricingRule,
        removePricingRule,
        clearPricingRules,

        selectedCustomer,
        setSelectedCustomer,

        appliedCoupon,
        couponDiscountAmount,
        totalAfterCoupon,
        applyCoupon,
        removeCoupon,
    } = usePricing();

    const [
        mode,
        setMode,
    ] =
        useState<SaleMode>("sale");

    const [
        selectedCategory,
        setSelectedCategory,
    ] =
        useState<string>("all");

    const [
        searchTerm,
        setSearchTerm,
    ] = useState("");

    const [
        checkoutTotal,
        setCheckoutTotal,
    ] =
        useState<number | null>(null);

    const [
        completedSale,
        setCompletedSale,
    ] =
        useState<Sale | null>(null);
    const [
        issuedRefundVoucher,
        setIssuedRefundVoucher,
    ] =
        useState<{
            number: string;
            amount: number;
        } | null>(
            null,
        );


    const [
        showTransactionDiscount,
        setShowTransactionDiscount,
    ] = useState(false);

    const [
        selectedLineId,
        setSelectedLineId,
    ] =
        useState<string | null>(null);

    const [
        editingPriceLineId,
        setEditingPriceLineId,
    ] =
        useState<string | null>(null);

    const [
        editingDiscountLineId,
        setEditingDiscountLineId,
    ] =
        useState<string | null>(null);

    useEffect(() => {
        if (
            incomingReturnLines.length === 0
        ) {
            return;
        }

        updateCartLines((current) => {
            const existingIds =
                new Set(
                    current.map(
                        (line) => line.id,
                    ),
                );

            const additions =
                incomingReturnLines.filter(
                    (line) =>
                        !existingIds.has(
                            line.id,
                        ),
                );

            return [
                ...current,
                ...additions,
            ];
        });

        onReturnLinesConsumed?.();
    }, [
        incomingReturnLines,
        onReturnLinesConsumed,
        updateCartLines,
    ]);

    const filteredProducts =
        useMemo(() => {
            const value =
                searchTerm
                    .trim()
                    .toLowerCase();

            return products.filter(
                (product) => {
                    const categoryMatch =
                        selectedCategory === "all" ||
                        product.category ===
                        selectedCategory;

                    const searchMatch =
                        !value ||
                        product.name
                            .toLowerCase()
                            .includes(value) ||
                        product.barcode.includes(
                            value,
                        ) ||
                        product.sku
                            .toLowerCase()
                            .includes(value);

                    return (
                        product.isActive &&
                        categoryMatch &&
                        searchMatch
                    );
                },
            );
        }, [
            searchTerm,
            selectedCategory,
        ]);

    const selectedSaleLine =
        pricing.lines.find(
            (line) =>
                line.id === selectedLineId &&
                line.kind === "sale",
        ) ?? null;

    const editingPriceLine =
        pricing.lines.find(
            (line) =>
                line.id ===
                editingPriceLineId,
        ) ?? null;

    const editingDiscountLine =
        pricing.lines.find(
            (line) =>
                line.id ===
                editingDiscountLineId,
        ) ?? null;

    const addProduct = (
        product: Product,
    ) => {
        updateCartLines((current) => {
            const existing =
                current.find(
                    (line) =>
                        line.kind === "sale" &&
                        line.source === "catalog" &&
                        line.product.id ===
                        product.id &&
                        !line.descriptionOverride &&
                        line.originalUnitPrice ===
                        undefined,
                );

            if (existing) {
                setSelectedLineId(
                    existing.id,
                );

                return current.map(
                    (line) =>
                        line.id === existing.id
                            ? {
                                ...line,
                                quantity:
                                    line.quantity + 1,
                            }
                            : line,
                );
            }

            const newLine: CartLine = {
                id:
                    crypto.randomUUID(),

                kind: "sale",
                source: "catalog",

                product,

                quantity: 1,

                unitPrice:
                    product.price,

                lineDiscountAmount: 0,

                allocatedSaleDiscountAmount:
                    0,
            };

            setSelectedLineId(
                newLine.id,
            );

            return [
                ...current,
                newLine,
            ];
        });
    };

    const addReturnLines = (
        lines: CartLine[],
    ) => {
        updateCartLines(
            (current) => [
                ...current,
                ...lines,
            ],
        );

        if (
            lines.length > 0
        ) {
            setSelectedLineId(
                lines[
                    lines.length - 1
                ].id,
            );
        }

        setMode("sale");
    };

    const increaseQuantity = (
        lineId: string,
    ) => {
        updateCartLines(
            (current) =>
                current.map(
                    (line) =>
                        line.id === lineId
                            ? {
                                ...line,
                                quantity:
                                    line.quantity + 1,
                            }
                            : line,
                ),
        );

        setSelectedLineId(lineId);
    };

    const decreaseQuantity = (
        lineId: string,
    ) => {
        updateCartLines(
            (current) =>
                current.flatMap(
                    (line) => {
                        if (
                            line.id !== lineId
                        ) {
                            return [line];
                        }

                        if (
                            line.quantity <= 1
                        ) {
                            removePricingRule(
                                `line-discount-${line.id}`,
                            );

                            return [];
                        }

                        return [
                            {
                                ...line,
                                quantity:
                                    line.quantity - 1,
                            },
                        ];
                    },
                ),
        );

        const currentLine =
            pricing.lines.find(
                (line) =>
                    line.id === lineId,
            );

        if (
            currentLine &&
            currentLine.quantity <= 1
        ) {
            setSelectedLineId(null);
        }
    };

    const editDescription = (
        lineId: string,
        description:
            | string
            | undefined,
    ) => {
        updateCartLines(
            (current) =>
                current.map(
                    (line) =>
                        line.id === lineId &&
                            line.kind === "sale"
                            ? {
                                ...line,
                                descriptionOverride:
                                    description,
                            }
                            : line,
                ),
        );
    };

    const applyPriceOverride = (
        lineId: string,
        price: number,
    ) => {
        updateCartLines(
            (current) =>
                current.map(
                    (line) => {
                        if (
                            line.id !== lineId ||
                            line.kind !== "sale"
                        ) {
                            return line;
                        }

                        return {
                            ...line,

                            originalUnitPrice:
                                line.originalUnitPrice ??
                                line.unitPrice,

                            unitPrice: price,
                        };
                    },
                ),
        );

        setEditingPriceLineId(null);
    };

    const resetPriceOverride = (
        lineId: string,
    ) => {
        updateCartLines(
            (current) =>
                current.map(
                    (line) => {
                        if (
                            line.id !== lineId ||
                            line.originalUnitPrice ===
                            undefined
                        ) {
                            return line;
                        }

                        return {
                            ...line,

                            unitPrice:
                                line.originalUnitPrice,

                            originalUnitPrice:
                                undefined,
                        };
                    },
                ),
        );

        setEditingPriceLineId(null);
    };

    const currentPercentageRule =
        pricingRules.find(
            (rule) =>
                rule.id ===
                "transaction-percentage",
        );

    const currentAmountRule =
        pricingRules.find(
            (rule) =>
                rule.id ===
                "transaction-amount",
        );

    const removeTransactionDiscount =
        () => {
            removePricingRule(
                "transaction-percentage",
            );

            removePricingRule(
                "transaction-amount",
            );
        };

    const applyPercentageDiscount =
        (value: number) => {
            removeTransactionDiscount();

            addPricingRule(
                DefaultPricingRules
                    .transactionPercentage(
                        value,
                    ),
            );

            setShowTransactionDiscount(
                false,
            );
        };

    const applyAmountDiscount = (
        value: number,
    ) => {
        removeTransactionDiscount();

        addPricingRule(
            DefaultPricingRules
                .transactionAmount(
                    value,
                ),
        );

        setShowTransactionDiscount(
            false,
        );
    };

    const applyLinePercentageDiscount =
        (
            lineId: string,
            value: number,
        ) => {
            addPricingRule(
                DefaultPricingRules
                    .linePercentage(
                        lineId,
                        value,
                    ),
            );

            setEditingDiscountLineId(
                null,
            );
        };

    const applyLineAmountDiscount =
        (
            lineId: string,
            value: number,
        ) => {
            addPricingRule(
                DefaultPricingRules
                    .lineAmount(
                        lineId,
                        value,
                    ),
            );

            setEditingDiscountLineId(
                null,
            );
        };

    const removeLineDiscount = (
        lineId: string,
    ) => {
        removePricingRule(
            `line-discount-${lineId}`,
        );

        setEditingDiscountLineId(
            null,
        );
    };

    const createSaleLines =
        (): SaleLine[] =>
            pricing.lines.map(
                (line) => {
                    const sign =
                        line.kind ===
                            "return"
                            ? -1
                            : 1;

                    const gross =
                        line.unitPrice *
                        line.quantity;

                    return {
                        id:
                            crypto.randomUUID(),

                        kind: line.kind,
                        source: line.source,

                        productId:
                            line.product.id,

                        productName:
                            line.product.name,

                        descriptionOverride:
                            line.descriptionOverride,

                        sku:
                            line.product.sku,

                        barcode:
                            line.product.barcode,

                        quantity:
                            line.quantity,

                        unitPrice:
                            line.unitPrice,

                        originalUnitPrice:
                            line.originalUnitPrice,

                        grossAmount:
                            gross * sign,

                        lineDiscountAmount:
                            line.calculatedLineDiscountAmount,

                        allocatedSaleDiscountAmount:
                            line.calculatedTransactionDiscountAmount,

                        appliedPromotions:
                            line.appliedPromotions?.map(
                                (promotion) => ({
                                    id:
                                        promotion.id,
                                    name:
                                        promotion.name,
                                    discountAmount:
                                        promotion.discountAmount,
                                }),
                            ),

                        netAmount:
                            line.calculatedNetAmount,

                        returnSource:
                            line.returnSource,

                        returnReason:
                            line.returnReason,

                        originalSaleId:
                            line.origin?.saleId,

                        originalSaleNumber:
                            line.origin?.saleNumber,

                        originalSaleLineId:
                            line.origin?.saleLineId,
                    };
                },
            );

    const completeTransaction = (
        payments: Payment[],
    ) => {
        const transactionId =
            crypto.randomUUID();

        let appliedSaleCoupon:
            AppliedSaleCoupon | undefined;

        if (appliedCoupon) {
            const redemption =
                redeemCoupon({
                    code:
                        appliedCoupon.code,

                    basketAmount:
                        pricing.total,

                    transactionId,

                    customerGroupId:
                        selectedCustomer.groupIds[0],
                });

            appliedSaleCoupon = {
                couponId:
                    appliedCoupon.id,

                code:
                    appliedCoupon.code,

                name:
                    appliedCoupon.name,

                valueType:
                    appliedCoupon.valueType,

                originalValue:
                    appliedCoupon.value,

                redemptionPolicy:
                    appliedCoupon.redemptionPolicy,

                discountApplied:
                    redemption.discountApplied,
            };
        }

        const sale =
            completeSale(
                createSaleLines(),
                payments,
                {
                    id:
                        selectedCustomer.id,
                    name:
                        selectedCustomer.name,
                    phone:
                        selectedCustomer.phone,
                    groupIds:
                        selectedCustomer.groupIds,
                    isClubMember:
                        selectedCustomer.isClubMember,
                },
                {
                    transactionId,
                    coupon:
                        appliedSaleCoupon,
                },
            );

        
        const accountingDocument =
            createAccountingDocument(
                sale,
            );

        const refundVoucherPayment =
            payments.find(
                (payment) =>
                    payment.method ===
                        "credit_voucher" &&
                    payment.amount < 0,
            );

        if (refundVoucherPayment) {

            const voucher =
                issueMonetaryValue({
                    type:
                        "credit_voucher",

                    amount:
                        Math.abs(
                            refundVoucherPayment.amount,
                        ),

                    customerId:
                        selectedCustomer.id,

                    originTransactionId:
                        sale.id,

                    originDocumentId:
                        accountingDocument?.id,
                });

            setIssuedRefundVoucher({
                number:
                    voucher.number,
                amount:
                    voucher.originalAmount,
            });
        }

removeCoupon();

        setCartLines([]);
        clearPricingRules();
        setSelectedLineId(null);
        setCompletedSale(sale);
        setCheckoutTotal(null);
    };

        const transactionTotal =
        appliedCoupon
            ? totalAfterCoupon
            : createSaleLines().reduce(
                  (
                      sum,
                      line,
                  ) =>
                      sum +
                      line.netAmount,
                  0,
              );

    const handleCheckout = () => {
        if (
            Math.abs(
                transactionTotal,
            ) < 0.001
        ) {
            completeTransaction([]);
            return;
        }

        setCheckoutTotal(
            transactionTotal,
        );
    };

    const clearSale = () => {
        setCartLines([]);
        clearPricingRules();
        removeCoupon();
        setSelectedCustomer(
            testCustomers[0],
        );
        setSelectedLineId(null);
    };

    const startNewSale = () => {
        setMode("sale");

        setCompletedSale(null);
        setIssuedRefundVoucher(null);
        setCheckoutTotal(null);

        clearSale();

        setSearchTerm("");
        setSelectedCategory("all");
    };

    if (completedSale) {
        return (
            <>
                <SaleCompletePage
                    sale={completedSale}
                    onNewSale={
                        startNewSale
                    }
                />

                {issuedRefundVoucher && (
                    <div
                        role="presentation"
                        style={{
                            position:
                                "fixed",
                            inset:
                                0,
                            zIndex:
                                6000,
                            display:
                                "grid",
                            placeItems:
                                "center",
                            padding:
                                "24px",
                            background:
                                "rgba(17, 24, 39, 0.34)",
                        }}
                    >
                        <div
                            dir="rtl"
                            role="dialog"
                            aria-modal="true"
                            style={{
                                width:
                                    "min(460px, 100%)",
                                padding:
                                    "22px",
                                border:
                                    "1px solid #dde4e1",
                                borderRadius:
                                    "18px",
                                background:
                                    "#ffffff",
                                boxShadow:
                                    "0 24px 70px rgba(15, 23, 42, 0.20)",
                            }}
                        >
                            <div
                                style={{
                                    color:
                                        "#7a8580",
                                    fontSize:
                                        "10px",
                                    fontWeight:
                                        800,
                                    letterSpacing:
                                        "0.08em",
                                }}
                            >
                                החזרה הושלמה
                            </div>

                            <h2
                                style={{
                                    margin:
                                        "8px 0 6px",
                                    fontSize:
                                        "22px",
                                }}
                            >
                                שובר זיכוי הונפק
                            </h2>

                            <div
                                style={{
                                    marginTop:
                                        "14px",
                                    padding:
                                        "14px",
                                    borderRadius:
                                        "12px",
                                    background:
                                        "#f5f8f6",
                                }}
                            >
                                <div
                                    style={{
                                        fontSize:
                                            "11px",
                                        color:
                                            "#68736f",
                                    }}
                                >
                                    מספר שובר
                                </div>

                                <div
                                    dir="ltr"
                                    style={{
                                        marginTop:
                                            "3px",
                                        fontSize:
                                            "18px",
                                        fontWeight:
                                            850,
                                    }}
                                >
                                    {
                                        issuedRefundVoucher.number
                                    }
                                </div>

                                <div
                                    style={{
                                        marginTop:
                                            "12px",
                                        fontSize:
                                            "11px",
                                        color:
                                            "#68736f",
                                    }}
                                >
                                    סכום הזיכוי
                                </div>

                                <div
                                    style={{
                                        marginTop:
                                            "3px",
                                        fontSize:
                                            "28px",
                                        fontWeight:
                                            850,
                                    }}
                                >
                                    ₪
                                    {issuedRefundVoucher.amount.toFixed(
                                        2,
                                    )}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setIssuedRefundVoucher(
                                        null,
                                    )
                                }
                                style={{
                                    width:
                                        "100%",
                                    minHeight:
                                        "42px",
                                    marginTop:
                                        "16px",
                                    border:
                                        0,
                                    borderRadius:
                                        "10px",
                                    background:
                                        "var(--primary)",
                                    color:
                                        "#fff",
                                    fontWeight:
                                        750,
                                    cursor:
                                        "pointer",
                                }}
                            >
                                אישור
                            </button>
                        </div>
                    </div>
                )}
            </>
        );
    }

    if (
        checkoutTotal !== null &&
        checkoutTotal < 0
    ) {
        return (
            <RefundPage
                total={checkoutTotal}
                onBack={() =>
                    setCheckoutTotal(
                        null,
                    )
                }
                onComplete={
                    completeTransaction
                }
            />
        );
    }

    if (
        checkoutTotal !== null
    ) {
        return (
            <PaymentPage
                total={checkoutTotal}
                onBack={() =>
                    setCheckoutTotal(
                        null,
                    )
                }
                onComplete={
                    completeTransaction
                }
            />
        );
    }

    if (
        mode === "return-item"
    ) {
        return (
            <ReturnItemPage
                onBack={() =>
                    setMode("sale")
                }
                onContinue={
                    addReturnLines
                }
            />
        );
    }

    return (
        <>
            <section
                className="sale-page"
                aria-labelledby="sale-page-title"
            >
                <header className="sale-page__heading">
                    <div>
                        <p className="sale-page__eyebrow">
                            עסקה חדשה
                        </p>

                        <h1 id="sale-page-title">
                            מכירה
                        </h1>
                    </div>

                    <button
                        type="button"
                        className="sale-page__quick-action"
                    >
                        פעולות מהירות
                    </button>
                </header>

                <div className="sale-page__content">
                    <section className="sale-page__catalog">
                        <div className="sale-page__search-row">
                            <input
                                type="search"
                                className="sale-page__search"
                                placeholder="סריקת ברקוד או חיפוש מוצר"
                                value={searchTerm}
                                onChange={(event) =>
                                    setSearchTerm(
                                        event.target
                                            .value,
                                    )
                                }
                                autoFocus
                            />

                            <button
                                type="button"
                                className="sale-page__secondary-button"
                            >
                                ברקוד
                            </button>

                            <button
                                type="button"
                                className="sale-page__secondary-button"
                            >
                                תצוגה
                            </button>
                        </div>

                        <div className="sale-page__categories">
                            {categories.map(
                                (category) => (
                                    <button
                                        key={
                                            category.id
                                        }
                                        type="button"
                                        className={`sale-page__category ${category.id ===
                                            selectedCategory
                                            ? "sale-page__category--active"
                                            : ""
                                            }`}
                                        onClick={() =>
                                            setSelectedCategory(
                                                category.id,
                                            )
                                        }
                                    >
                                        {category.label}
                                    </button>
                                ),
                            )}
                        </div>

                        <ProductGrid
                            products={
                                filteredProducts
                            }
                            onSelectProduct={
                                addProduct
                            }
                        />

                        <div className="sale-page__actions">
                            <button
                                type="button"
                                disabled={
                                    !selectedSaleLine
                                }
                                onClick={() => {
                                    if (
                                        !selectedSaleLine
                                    ) {
                                        return;
                                    }

                                    setEditingDiscountLineId(
                                        selectedSaleLine.id,
                                    );
                                }}
                            >
                                הנחת פריט
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowTransactionDiscount(
                                        true,
                                    )
                                }
                            >
                                הנחת עסקה
                            </button>

                            <button
                                type="button"
                                disabled={
                                    !selectedSaleLine ||
                                    !posCapabilities
                                        .allowPriceOverride
                                }
                                onClick={() => {
                                    if (
                                        !selectedSaleLine
                                    ) {
                                        return;
                                    }

                                    setEditingPriceLineId(
                                        selectedSaleLine.id,
                                    );
                                }}
                            >
                                שינוי מחיר
                            </button>

                            {posCapabilities
                                .allowReturnWithoutDocument && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setMode(
                                                "return-item",
                                            )
                                        }
                                    >
                                        החזר פריט
                                    </button>
                                )}

                            <button type="button">
                                הערות
                            </button>

                            <button type="button">
                                עוד פעולות
                            </button>
                        </div>
                    </section>

                    <section className="sale-page__cart">
                        <CartPanel
                            lines={pricing.lines}
                            pricing={pricing}
                            selectedCustomer={
                                selectedCustomer
                            }
                            customers={
                                testCustomers
                            }
                            onCustomerChange={
                                setSelectedCustomer
                            }
                            appliedCoupon={appliedCoupon}
                            couponDiscountAmount={
                                couponDiscountAmount
                            }
                            totalAfterCoupon={transactionTotal}
                            onApplyCoupon={
                                applyCoupon
                            }
                            onRemoveCoupon={
                                removeCoupon
                            }
                            selectedLineId={
                                selectedLineId ??
                                undefined
                            }
                            onClear={clearSale}
                            onIncrease={
                                increaseQuantity
                            }
                            onDecrease={
                                decreaseQuantity
                            }
                            onSelectLine={
                                setSelectedLineId
                            }
                            onEditDescription={
                                editDescription
                            }
                            onCheckout={
                                handleCheckout
                            }
                        />
                    </section>
                </div>
            </section>

            {showTransactionDiscount && (
                <TransactionDiscountDialog
                    currentPercentage={
                        currentPercentageRule
                            ?.value ?? 0
                    }
                    currentAmount={
                        currentAmountRule
                            ?.value ?? 0
                    }
                    onCancel={() =>
                        setShowTransactionDiscount(
                            false,
                        )
                    }
                    onApplyPercentage={
                        applyPercentageDiscount
                    }
                    onApplyAmount={
                        applyAmountDiscount
                    }
                    onRemove={() => {
                        removeTransactionDiscount();

                        setShowTransactionDiscount(
                            false,
                        );
                    }}
                />
            )}

            {editingPriceLine && (
                <PriceOverrideDialog
                    productName={
                        editingPriceLine
                            .product.name
                    }
                    currentPrice={
                        editingPriceLine
                            .unitPrice
                    }
                    originalPrice={
                        editingPriceLine
                            .originalUnitPrice ??
                        editingPriceLine
                            .product.price
                    }
                    onCancel={() =>
                        setEditingPriceLineId(
                            null,
                        )
                    }
                    onApply={(price) =>
                        applyPriceOverride(
                            editingPriceLine.id,
                            price,
                        )
                    }
                    onReset={() =>
                        resetPriceOverride(
                            editingPriceLine.id,
                        )
                    }
                />
            )}

            {editingDiscountLine && (
                <LineDiscountDialog
                    productName={
                        editingDiscountLine
                            .product.name
                    }
                    onCancel={() =>
                        setEditingDiscountLineId(
                            null,
                        )
                    }
                    onApplyPercentage={(
                        value,
                    ) =>
                        applyLinePercentageDiscount(
                            editingDiscountLine.id,
                            value,
                        )
                    }
                    onApplyAmount={(
                        value,
                    ) =>
                        applyLineAmountDiscount(
                            editingDiscountLine.id,
                            value,
                        )
                    }
                    onRemove={() =>
                        removeLineDiscount(
                            editingDiscountLine.id,
                        )
                    }
                />
            )}
        </>
    );
}

export default SalePage;

