import {
    useEffect,
    useMemo,
    useState,
} from "react";

import LineDiscountDialog from "../../components/pricing/LineDiscountDialog";
import PriceOverrideDialog from "../../components/pricing/PriceOverrideDialog";
import TransactionDiscountDialog from "../../components/pricing/TransactionDiscountDialog";
import CalculatorSaleEntry from "../../components/pos/CalculatorSaleEntry";
import FashionVariantSelector from "../../components/pos/FashionVariantSelector";
import CartPanel from "../../components/pos/CartPanel";
import ProductGrid from "../../components/pos/ProductGrid";
import {
    getActiveBusinessOperatingProfile,
} from "../../config/ActiveBusinessConfiguration";
import {
    getPresentSellers,
} from "../../models/employee/AvailableSellerService";
import { usePricing } from "../../context/usePricing";
import { useCatalog } from "../../context/useCatalog";
import { translate } from "../../i18n";
import { categorySeed } from "../../models/catalog/Category";
import {
    testCustomers,
} from "../../models/customer/CustomerSeed";
import {
    getDocumentsForTransaction,
} from "../../models/document/DocumentRepository";
import { issueMonetaryValue } from "../../models/monetary-value/MonetaryValueService";
import type { Payment } from "../../models/Payment";
import {
    redeemCoupon,
} from "../../models/coupon/CouponService";
import {
    DefaultPricingRules,
} from "../../models/pricing/DefaultPricingRules";
import {
    isFashionProduct,
} from "../../models/catalog/FashionProduct";
import type {
    FashionProduct,
} from "../../models/catalog/FashionProduct";
import type {
    ProductVariant,
} from "../../models/catalog/ProductVariantIdentity";
import type { CartLine } from "../../models/sale/CartLine";
import type {
    AppliedSaleCoupon,
    Sale,
} from "../../models/sale/Sale";
import type { SaleLine } from "../../models/sale/SaleLine";
import { completeSale } from "../../models/sale/SaleService";
import {
    getActiveRegisterShift,
} from "../../models/shift/RegisterShiftRepository";
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
    const activeProfile =
        getActiveBusinessOperatingProfile();

    const posCapabilities =
        activeProfile.pos;

    const { products } = useCatalog();

    const activeSellers =
        getPresentSellers();

    const [
        currentSellerId,
        setCurrentSellerId,
    ] =
        useState<string>(
            activeSellers.length === 1
                ? activeSellers[0].id
                : "",
        );

    const [
        sellerSelectionMode,
        setSellerSelectionMode,
    ] =
        useState<
            "auto" |
            "explicit" |
            null
        >(
            activeSellers.length === 1
                ? "auto"
                : null,
        );

    const currentSeller =
        activeSellers.find(
            (employee) =>
                employee.id ===
                currentSellerId,
        );

    const sellerPresenceKey =
        activeSellers
            .map(
                (employee) =>
                    employee.id,
            )
            .sort()
            .join("|");

    useEffect(() => {
        if (
            activeSellers.length === 0
        ) {
            if (currentSellerId) {
                setCurrentSellerId("");
            }

            if (
                sellerSelectionMode !==
                null
            ) {
                setSellerSelectionMode(
                    null,
                );
            }

            return;
        }

        if (
            activeSellers.length === 1
        ) {
            const onlySeller =
                activeSellers[0];

            if (
                currentSellerId !==
                onlySeller.id
            ) {
                setCurrentSellerId(
                    onlySeller.id,
                );
            }

            if (
                sellerSelectionMode !==
                "auto"
            ) {
                setSellerSelectionMode(
                    "auto",
                );
            }

            return;
        }

        const currentStillPresent =
            activeSellers.some(
                (employee) =>
                    employee.id ===
                    currentSellerId,
            );

        /*
         * With 2+ sellers, only an explicit manual selection
         * may remain active.
         *
         * Example:
         * Shay was alone and auto-selected.
         * Kobi clocks in.
         * We clear Shay and require an intentional choice.
         */
        if (
            !currentStillPresent ||
            sellerSelectionMode !==
                "explicit"
        ) {
            if (currentSellerId) {
                setCurrentSellerId("");
            }

            if (
                sellerSelectionMode !==
                null
            ) {
                setSellerSelectionMode(
                    null,
                );
            }
        }
    }, [
        sellerPresenceKey,
        currentSellerId,
        sellerSelectionMode,
    ]);
    const [
        selectedFashionProduct,
        setSelectedFashionProduct,
    ] =
        useState<FashionProduct | null>(
            null,
        );

    const [
        pendingProductForSeller,
        setPendingProductForSeller,
    ] =
        useState<Product | null>(
            null,
        );

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

                    const variantSearchMatch =
                        product.variants?.some(
                            (variant) =>
                                variant.isActive &&
                                (
                                    variant.barcode
                                        .toLowerCase()
                                        .includes(value) ||
                                    variant.sku
                                        .toLowerCase()
                                        .includes(value)
                                ),
                        ) ?? false;

                    const searchMatch =
                        !value ||
                        product.name
                            .toLowerCase()
                            .includes(value) ||
                        product.barcode
                            .toLowerCase()
                            .includes(value) ||
                        product.sku
                            .toLowerCase()
                            .includes(value) ||
                        product.styleCode
                            ?.toLowerCase()
                            .includes(value) ===
                            true ||
                        variantSearchMatch;

                    const segmentMatch =
                        activeProfile.operatingModel ===
                            "calculator"
                            ? false
                            : activeProfile.operatingModel ===
                                  "fashion"
                                ? true
                                : !isFashionProduct(
                                      product,
                                  );

                    return (
                        product.isActive &&
                        segmentMatch &&
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
        const existing =
            pricing.lines.find(
                (line) =>
                    line.kind === "sale" &&
                    line.source === "catalog" &&
                    line.product.id ===
                    product.id &&
                    !line.descriptionOverride &&
                    line.originalUnitPrice ===
                    undefined,
            );

        const newLineId =
            crypto.randomUUID();

        setSelectedLineId(
            existing?.id ??
            newLineId,
        );

        updateCartLines((current) => {
            const currentExisting =
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

            if (currentExisting) {
                return current.map(
                    (line) =>
                        line.id === currentExisting.id
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
                    newLineId,

                kind: "sale",
                source: "catalog",

                product,

                seller:
                    currentSeller
                        ? {
                              employeeId:
                                  currentSeller.id,
                              employeeName:
                                  currentSeller.name,
                          }
                        : undefined,

                quantity: 1,

                unitPrice:
                    product.price,

                lineDiscountAmount: 0,

                allocatedSaleDiscountAmount:
                    0,
            };

            return [
                ...current,
                newLine,
            ];
        });
    };
    const addFashionVariant = (
        product: FashionProduct,
        variant: ProductVariant,
    ) => {
        const variantProduct: Product = {
            ...product,

            price:
                variant.price ??
                product.price,

            sku:
                variant.sku,

            barcode:
                variant.barcode,

            stockOnHand:
                variant.stockOnHand,
        };

        const existing =
            pricing.lines.find(
                (line) =>
                    line.kind ===
                        "sale" &&
                    line.source ===
                        "catalog" &&
                    line.product.id ===
                        product.id &&
                    line.variant
                        ?.variantId ===
                        variant.variantId,
            );

        const newLineId =
            crypto.randomUUID();

        setSelectedLineId(
            existing?.id ??
            newLineId,
        );

        updateCartLines(
            (current) => {
                const currentExisting =
                    current.find(
                        (line) =>
                            line.kind ===
                                "sale" &&
                            line.source ===
                                "catalog" &&
                            line.product.id ===
                                product.id &&
                            line.variant
                                ?.variantId ===
                                variant.variantId,
                    );

                if (currentExisting) {

                    return current.map(
                        (line) =>
                            line.id ===
                                currentExisting.id
                                ? {
                                    ...line,
                                    quantity:
                                        line.quantity +
                                        1,
                                }
                                : line,
                    );
                }

                const line:
                    CartLine = {
                    id:
                        newLineId,

                    kind:
                        "sale",

                    source:
                        "catalog",

                    product:
                        variantProduct,

                    seller:
                        currentSeller
                            ? {
                                  employeeId:
                                      currentSeller.id,
                                  employeeName:
                                      currentSeller.name,
                              }
                            : undefined,

                    variant: {
                        variantId:
                            variant.variantId,

                        styleCode:
                            variant.styleCode,

                        color:
                            variant.color,

                        size:
                            variant.size,
                    },

                    quantity:
                        1,

                    unitPrice:
                        variant.price ??
                        product.price,

                    lineDiscountAmount:
                        0,

                    allocatedSaleDiscountAmount:
                        0,
                };


                return [
                    ...current,
                    line,
                ];
            },
        );

        setSelectedFashionProduct(
            null,
        );
    };

    const continueProductSelection = (
        product: Product,
    ) => {
        if (
            activeProfile.operatingModel ===
                "fashion" &&
            isFashionProduct(
                product,
            )
        ) {
            setSelectedFashionProduct(
                product,
            );

            return;
        }

        addProduct(
            product,
        );
    };

    const handleProductSelection = (
        product: Product,
    ) => {
        if (!currentSeller) {
            setPendingProductForSeller(
                product,
            );

            return;
        }

        continueProductSelection(
            product,
        );
    };
    const addCalculatorAmount = (
        amount: number,
        description: string,
    ) => {
        const productId =
            crypto.randomUUID();

        const product: Product = {
            id:
                productId,

            name:
                description ||
                "פריט כללי",

            names: {
                he:
                    description ||
                    "פריט כללי",
            },

            price:
                amount,

            category:
                "manual",

            imageUrl:
                "",

            barcode:
                "",

            sku:
                `CALC-${productId}`,

            isActive:
                true,
        };

        const line: CartLine = {
            id:
                crypto.randomUUID(),

            kind:
                "sale",

            source:
                "calculator",

            product,

            quantity:
                1,

            unitPrice:
                amount,

            lineDiscountAmount:
                0,

            allocatedSaleDiscountAmount:
                0,
        };

        updateCartLines(
            (current) => [
                ...current,
                line,
            ],
        );

        setSelectedLineId(
            line.id,
        );
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
        const currentLine =
            pricing.lines.find(
                (line) =>
                    line.id === lineId,
            );

        if (
            currentLine &&
            currentLine.quantity <= 1
        ) {
            removePricingRule(
                `line-discount-${lineId}`,
            );
        }

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

                        variant:
                            line.variant,

                        seller:
                            line.seller,

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

                        originalDocumentId:
                            line.origin?.documentId,

                        originalDocumentNumber:
                            line.origin?.documentNumber,
                    };
                },
            );

    const completeTransaction = async (
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
            await completeSale(
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

                    shiftId:
                        getActiveRegisterShift()
                            ?.id,

                    coupon:
                        appliedSaleCoupon,
                },
            );


        const accountingDocument =
            getDocumentsForTransaction(
                sale.id,
            )[0] ?? null;

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

    const sellerAssignments =
        activeSellers.map(
            (employee) => ({
                employeeId:
                    employee.id,

                employeeName:
                    employee.name,
            }),
        );

    const changeSellerForLine = (
        lineId: string,
        seller: {
            employeeId: string;
            employeeName: string;
        },
    ) => {
        updateCartLines(
            (current) =>
                current.map(
                    (line) =>
                        line.id ===
                        lineId
                            ? {
                                  ...line,
                                  seller,
                              }
                            : line,
                ),
        );
    };

    const changeSellerFromLineToEnd = (
        lineId: string,
        seller: {
            employeeId: string;
            employeeName: string;
        },
    ) => {
        updateCartLines(
            (current) => {
                const startIndex =
                    current.findIndex(
                        (line) =>
                            line.id ===
                            lineId,
                    );

                if (startIndex < 0) {
                    return current;
                }

                return current.map(
                    (
                        line,
                        index,
                    ) =>
                        index >=
                        startIndex
                            ? {
                                  ...line,
                                  seller,
                              }
                            : line,
                );
            },
        );
    };
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

                                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "10px",
                    }}
                >
                    <strong>
                        מוכרן פעיל
                    </strong>

                    <select
                        value={
                            currentSellerId
                        }
                        onChange={(event) => {
                            const nextSellerId =
                                event.target.value;

                            setCurrentSellerId(
                                nextSellerId,
                            );

                            setSellerSelectionMode(
                                nextSellerId
                                    ? "explicit"
                                    : null,
                            );
                        }}
                    >
                        {activeSellers.length !== 1 && (
                            <option value="">
                                {
                                    activeSellers.length === 0
                                        ? "אין מוכרנים בנוכחות"
                                        : "בחר מוכרן"
                                }
                            </option>
                        )}

                        {activeSellers.map(
                            (employee) => (
                                <option
                                    key={
                                        employee.id
                                    }
                                    value={
                                        employee.id
                                    }
                                >
                                    {
                                        employee.name
                                    }
                                </option>
                            ),
                        )}
                    </select>
                </div>
<div className="sale-page__content">
                    {activeProfile.operatingModel ===
                        "calculator" && (
                        <CalculatorSaleEntry
                            onAddAmount={
                                addCalculatorAmount
                            }
                        />
                    )}

                    {activeProfile.operatingModel !==
                        "calculator" && (
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
                                onKeyDown={(event) => {
                                    if (
                                        event.key !==
                                        "Enter"
                                    ) {
                                        return;
                                    }

                                    const value =
                                        searchTerm.trim();

                                    if (!value) {
                                        return;
                                    }

                                    event.preventDefault();

                                    const normalized =
                                        value.toLowerCase();

                                    /*
                                     * 1. Exact variant barcode / SKU.
                                     *
                                     * Highest priority because a physical
                                     * Fashion barcode identifies the exact
                                     * sellable variant.
                                     */
                                    for (
                                        const product of products
                                    ) {
                                        if (
                                            !product.isActive ||
                                            !isFashionProduct(
                                                product,
                                            )
                                        ) {
                                            continue;
                                        }

                                        const variant =
                                            product.variants.find(
                                                (item) =>
                                                    item.isActive &&
                                                    (
                                                        item.barcode ===
                                                            value ||
                                                        item.sku
                                                            .toLowerCase() ===
                                                            normalized
                                                    ),
                                            );

                                        if (variant) {
                                            addFashionVariant(
                                                product,
                                                variant,
                                            );

                                            setSearchTerm(
                                                "",
                                            );

                                            return;
                                        }
                                    }

                                    /*
                                     * 2. Exact master product barcode / SKU.
                                     *
                                     * Regular product:
                                     * add directly.
                                     *
                                     * Style with variants:
                                     * open variant selector.
                                     */
                                    const exactProduct =
                                        products.find(
                                            (product) =>
                                                product.isActive &&
                                                (
                                                    product.barcode ===
                                                        value ||
                                                    product.sku
                                                        .toLowerCase() ===
                                                        normalized ||
                                                    product.styleCode
                                                        ?.toLowerCase() ===
                                                        normalized
                                                ),
                                        );

                                    if (exactProduct) {
                                        handleProductSelection(
                                            exactProduct,
                                        );

                                        setSearchTerm(
                                            "",
                                        );

                                        return;
                                    }

                                    /*
                                     * No exact code match:
                                     * keep the value in the field so it
                                     * continues working as normal search.
                                     */
                                }}
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
                                handleProductSelection
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
                    )}

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
                            
                            sellers={
                                sellerAssignments
                            }

                            onChangeSellerForLine={
                                changeSellerForLine
                            }

                            onChangeSellerFromLineToEnd={
                                changeSellerFromLineToEnd
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

            {pendingProductForSeller && (
                <div
                    dir="rtl"
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 13000,
                        display: "grid",
                        placeItems: "center",
                        padding: "24px",
                        background:
                            "rgba(15,23,42,.42)",
                    }}
                >
                    <section
                        style={{
                            width:
                                "min(440px, 94vw)",
                            padding: "24px",
                            borderRadius: "18px",
                            background: "#fff",
                            boxShadow:
                                "0 24px 70px rgba(15,23,42,.22)",
                        }}
                    >
                        <h2
                            style={{
                                margin:
                                    "0 0 6px",
                            }}
                        >
                            בחירת מוכרן
                        </h2>

                        <div
                            style={{
                                marginBottom:
                                    "20px",
                                opacity: .65,
                            }}
                        >
                            יש לבחור מוכרן לפני הוספת הפריט
                        </div>

                        {activeSellers.length === 0 ? (
                            <div>
                                <strong>
                                    אין מוכרנים בנוכחות
                                </strong>

                                <p>
                                    יש לבצע כניסה בנוכחות עובדים לפני המשך המכירה.
                                </p>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setPendingProductForSeller(
                                            null,
                                        )
                                    }
                                >
                                    סגור
                                </button>
                            </div>
                        ) : (
                            <div
                                style={{
                                    display:
                                        "grid",
                                    gap:
                                        "10px",
                                }}
                            >
                                {activeSellers.map(
                                    (employee) => (
                                        <button
                                            key={
                                                employee.id
                                            }
                                            type="button"
                                            onClick={() => {
                                                setCurrentSellerId(
                                                    employee.id,
                                                );

                                                setSellerSelectionMode(
                                                    "explicit",
                                                );

                                                const product =
                                                    pendingProductForSeller;

                                                setPendingProductForSeller(
                                                    null,
                                                );

                                                continueProductSelection(
                                                    product,
                                                );
                                            }}
                                            style={{
                                                minHeight:
                                                    "48px",
                                                textAlign:
                                                    "right",
                                            }}
                                        >
                                            {
                                                employee.name
                                            }
                                        </button>
                                    ),
                                )}

                                <button
                                    type="button"
                                    onClick={() =>
                                        setPendingProductForSeller(
                                            null,
                                        )
                                    }
                                >
                                    ביטול
                                </button>
                            </div>
                        )}
                    </section>
                </div>
            )}

            {selectedFashionProduct && (
                <FashionVariantSelector
                    product={
                        selectedFashionProduct
                    }
                    onClose={() =>
                        setSelectedFashionProduct(
                            null,
                        )
                    }
                    onSelect={(variant) =>
                        addFashionVariant(
                            selectedFashionProduct,
                            variant,
                        )
                    }
                />
            )}
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

export default SalePage
