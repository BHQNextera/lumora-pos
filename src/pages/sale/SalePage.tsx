import { ManualNexteraSyncAction } from "../../components/system/ManualNexteraSyncAction";
// LUMORA SELLER EMPLOYEE SYNC V1
import {
    applyStoreCreditBalanceMovement,
    getCustomerCreditSnapshot,
} from "../../models/store-credit/StoreCreditService";
import {
    getStoreCreditRefundLimit,
} from "../../models/store-credit/StoreCreditRefundService";
import {
    saveCustomer,
} from "../../models/customer/CustomerRepository";
import {
    getTransaction,
} from "../../models/transaction/TransactionRepository";
import SaleCustomerQuickCreateDialog from "../../components/pos/SaleCustomerQuickCreateDialog";

import "./SaleTopbarV3.css";

import NoteEditorDialog from "../../components/pos/NoteEditorDialog";

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

import HeldSalesDialog from "../../components/pos/HeldSalesDialog";

import ProductGrid from "../../components/pos/ProductGrid";

import {
    getActiveBusinessOperatingProfile,
} from "../../config/ActiveBusinessConfiguration";
import {
    getReturnPolicy,
} from "../../config/ReturnPolicy";
import {
    getPresentSellers,
} from "../../models/employee/AvailableSellerService";
import {
    subscribeEmployees,
} from "../../models/employee/EmployeeRepository";
import {
    subscribeAttendance,
} from "../../models/attendance/AttendanceRepository";
import { usePricing } from "../../context/usePricing";

import { useCatalog } from "../../context/useCatalog";

import { translate } from "../../i18n";

import { categorySeed } from "../../models/catalog/Category";

import {
    getCustomers,
    getWalkInCustomer,
    subscribeCustomers,
} from "../../models/customer/CustomerRepository";
import {
    getDocumentsForTransaction,
} from "../../models/document/DocumentRepository";
import { issueMonetaryValue } from "../../models/monetary-value/MonetaryValueService";

import type { Payment } from "../../models/Payment";

import {
    getOriginalGiftCardRefundSource,
    restoreGiftCardRefundPayments,
    validateGiftCardRefundPayments,
} from "../../models/refund/RefundStoredValueService";
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
import {
    deleteHeldSale,
    flushHeldSalePersistence,
    getHeldSales,
    saveHeldSale,
} from "../../models/held-sale/HeldSaleRepository";
import type {
    HeldSale,
} from "../../models/held-sale/HeldSale";
import type { CartLine } from "../../models/sale/CartLine";

import type {
    AppliedSaleCoupon,
    Sale,
} from "../../models/sale/Sale";
import type { SaleLine } from "../../models/sale/SaleLine";

import {
    allocateSaleNumber,
    flushSaleNumberPersistence,
    peekNextSaleNumber,
} from "../../models/sale/SaleNumbering";

import { completeSale } from "../../models/sale/SaleService";

import {
    getTransactions,
} from "../../models/transaction/TransactionRepository";
import {
    getActiveRegisterShift,
} from "../../models/shift/RegisterShiftRepository";
import {
    getSalePresets,
    hydrateSalePresets,
    saveSalePresets,
    subscribeSalePresets,
} from "../../models/preset/SalePresetRepository";

import {
    MAX_SALE_PRESETS,
} from "../../models/preset/SalePreset";

import type {
    SalePreset,
} from "../../models/preset/SalePreset";
import {
    executeSaleAction,
    getEligibleSaleActions,
    getSaleActionDefinition,
    isSaleActionEnabled,
    isSaleActionId,
} from "../../models/preset/SaleActionRegistry";
import type { Product } from "../../types/product";

import SystemMessageDialog from "../../components/feedback/SystemMessageDialog";

import GiftCardBalanceDialog from "../../components/pos/GiftCardBalanceDialog";

import QuickPresetEditorDialog from "../../components/pos/QuickPresetEditorDialog";

import {
    requestCashDrawerOpen,
} from "../../models/drawer/CashDrawerService";
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

    const [
        activeSellers,
        setActiveSellers,
    ] = useState(
        () =>
            getPresentSellers(),
    );

    useEffect(() => {
        const refreshActiveSellers =
            () => {
                setActiveSellers(
                    getPresentSellers(),
                );
            };

        const unsubscribeAttendance =
            subscribeAttendance(
                refreshActiveSellers,
            );

        const unsubscribeEmployees =
            subscribeEmployees(
                refreshActiveSellers,
            );

        /*
         * Close the tiny gap between the initial render
         * and subscription registration.
         */
        refreshActiveSellers();

        return () => {
            unsubscribeAttendance();
            unsubscribeEmployees();
        };
    }, []);

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
        cartLines,
        setCartLines,
        updateCartLines,
        setPricingRules,
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

    /*
     * CUSTOMER_MASTER_RUNTIME_SYNC_V1
     *
     * The pricing context may keep the object that was selected before
     * the customer was edited in Customer Management. Rebind the active
     * customer to the current customer-master record so group, credit
     * permission, obligo and balance cannot become stale.
     */
    useEffect(() => {
        const refreshSelectedCustomer =
            () => {
                if (
                    selectedCustomer.id ===
                    "walk-in"
                ) {
                    return;
                }

                const currentCustomer =
                    getCustomers().find(
                        (customer) =>
                            customer.id ===
                            selectedCustomer.id,
                    );

                if (!currentCustomer) {
                    return;
                }

                const changed =
                    currentCustomer.updatedAt !==
                        selectedCustomer.updatedAt ||
                    currentCustomer.storeCreditEnabled !==
                        selectedCustomer.storeCreditEnabled ||
                    currentCustomer.creditLimit !==
                        selectedCustomer.creditLimit ||
                    currentCustomer.accountBalance !==
                        selectedCustomer.accountBalance ||
                    currentCustomer.name !==
                        selectedCustomer.name ||
                    currentCustomer.phone !==
                        selectedCustomer.phone ||
                    currentCustomer.externalId !==
                        selectedCustomer.externalId ||
                    currentCustomer.isClubMember !==
                        selectedCustomer.isClubMember ||
                    currentCustomer.groupIds.join(
                        "|",
                    ) !==
                        selectedCustomer.groupIds.join(
                            "|",
                        );

                if (changed) {
                    setSelectedCustomer(
                        currentCustomer,
                    );
                }
            };

        refreshSelectedCustomer();

        return subscribeCustomers(
            refreshSelectedCustomer,
        );
    }, [
        selectedCustomer,
        setSelectedCustomer,
    ]);

    /*
     * STORE_CREDIT_CUSTOMER_STATUS_POPUP_V1
     * Compact, non-blocking indication when an enabled
     * store-credit customer becomes the active customer.
     */
    const [
        storeCreditCustomerPopupVisible,
        setStoreCreditCustomerPopupVisible,
    ] =
        useState(false);

    const storeCreditCustomerSnapshot =
        useMemo(
            () =>
                getCustomerCreditSnapshot(
                    selectedCustomer,
                ),
            [
                selectedCustomer,
            ],
        );

    useEffect(() => {
        if (
            selectedCustomer.id ===
                "walk-in" ||
            selectedCustomer.storeCreditEnabled !==
                true
        ) {
            setStoreCreditCustomerPopupVisible(
                false,
            );

            return;
        }

        setStoreCreditCustomerPopupVisible(
            true,
        );

        const timeout =
            window.setTimeout(
                () => {
                    setStoreCreditCustomerPopupVisible(
                        false,
                    );
                },
                4500,
            );

        return () =>
            window.clearTimeout(
                timeout,
            );
    }, [
        selectedCustomer.id,
        selectedCustomer.storeCreditEnabled,
    ]);
    /*
     * LINKED_RETURN_CUSTOMER_BINDING_V1
     *
     * A return loaded from an original transaction belongs to
     * that transaction's customer. Do not leave the workspace on
     * walk-in and do not allow store-credit reduction against a
     * different customer.
     */
    useEffect(() => {
        const sourceSaleIds =
            Array.from(
                new Set(
                    cartLines
                        .map(
                            (line) =>
                                line.origin
                                    ?.saleId,
                        )
                        .filter(
                            (
                                saleId,
                            ): saleId is string =>
                                Boolean(
                                    saleId,
                                ),
                        ),
                ),
            );

        if (
            sourceSaleIds.length !==
            1
        ) {
            return;
        }

        const sourceSale =
            getTransaction(
                sourceSaleIds[0],
            );

        const sourceCustomerId =
            sourceSale?.customer.id;

        if (
            !sourceCustomerId ||
            sourceCustomerId ===
                "walk-in" ||
            sourceCustomerId ===
                selectedCustomer.id
        ) {
            return;
        }

        const sourceCustomer =
            getCustomers().find(
                (customer) =>
                    customer.id ===
                    sourceCustomerId,
            );

        if (!sourceCustomer) {
            return;
        }

        setSelectedCustomer(
            sourceCustomer,
        );
    }, [
        cartLines,
        selectedCustomer.id,
        setSelectedCustomer,
    ]);

    const [
        documentNote,
        setDocumentNote,
    ] = useState("");

    const [
        printDocumentNote,
        setPrintDocumentNote,
    ] = useState(false);

    const [
        moreActionsOpen,
        setMoreActionsOpen,
    ] = useState(false);

    const [
        couponDialogRequestId,
        setCouponDialogRequestId,
    ] = useState(0);

    const [
        heldSales,
        setHeldSales,
    ] =
        useState<HeldSale[]>(
            () =>
                getHeldSales(),
        );

    const [
        heldSalesOpen,
        setHeldSalesOpen,
    ] =
        useState(false);

    const [
        pendingHeldCouponCode,
        setPendingHeldCouponCode,
    ] =
        useState<string | null>(
            null,
        );

    const [
        mode,
        setMode,
    ] =
        useState<SaleMode>("sale");

    useEffect(() => {
        if (
            !pendingHeldCouponCode ||
            pricing.total <= 0
        ) {
            return;
        }

        const result =
            applyCoupon(
                pendingHeldCouponCode,
            );

        if (!result.success) {
            console.warn(
                "LUMORA_HELD_SALE_COUPON_RESTORE_FAILED",
                pendingHeldCouponCode,
                result.reason,
            );
        }

        setPendingHeldCouponCode(
            null,
        );
    }, [
        pendingHeldCouponCode,
        pricing.total,
        selectedCustomer.id,
        applyCoupon,
    ]);

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
        catalogViewMode,
        setCatalogViewMode,
    ] = useState<"cards" | "list">(
        "cards",
    );

    const [
        catalogSortMode,
        setCatalogSortMode,
    ] = useState<
        "az" |
        "za" |
        "top"
    >("az");

    const [
        customerCreateOpen,
        setCustomerCreateOpen,
    ] = useState(false);

    const [
        customerPickerOpen,
        setCustomerPickerOpen,
    ] = useState(false);

    const [
        customerSearchTerm,
        setCustomerSearchTerm,
    ] = useState("");

    const saleCustomers =
        getCustomers()
            .filter(
                (customer) =>
                    customer.id === "walk-in" ||
                    customer.isActive !== false,
            );

    const normalizedCustomerSearch =
        customerSearchTerm
            .trim()
            .toLocaleLowerCase();

    const customerSearchDigits =
        customerSearchTerm
            .replace(/\D/g, "");

    const filteredSaleCustomers =
        saleCustomers.filter(
            (customer) => {
                if (!normalizedCustomerSearch) {
                    return true;
                }

                const nameMatches =
                    customer.name
                        .toLocaleLowerCase()
                        .includes(
                            normalizedCustomerSearch,
                        );

                const phone =
                    customer.phone ?? "";

                const externalId =
                    customer.externalId ?? "";

                const textMatches =
                    phone
                        .toLocaleLowerCase()
                        .includes(
                            normalizedCustomerSearch,
                        ) ||
                    externalId
                        .toLocaleLowerCase()
                        .includes(
                            normalizedCustomerSearch,
                        );

                const digitsMatch =
                    customerSearchDigits.length > 0 &&
                    (
                        phone
                            .replace(/\D/g, "")
                            .includes(
                                customerSearchDigits,
                            ) ||
                        externalId
                            .replace(/\D/g, "")
                            .includes(
                                customerSearchDigits,
                            )
                    );

                return (
                    nameMatches ||
                    textMatches ||
                    digitsMatch
                );
            },
        );

    const [
        checkoutTotal,
        setCheckoutTotal,
    ] =
        useState<number | null>(null);

    const [
        reservedTransactionNumber,
        setReservedTransactionNumber,
    ] = useState<string | null>(
        null,
    );

    const openTransactionNumber =
        peekNextSaleNumber();
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
        giftCardBalanceOpen,
        setGiftCardBalanceOpen,
    ] = useState(false);

    const [
        systemMessage,
        setSystemMessage,
    ] = useState<string | null>(
        null,
    );

    const [
        showTransactionDiscount,
        setShowTransactionDiscount,
    ] = useState(false);

    const [
        noteEditorKind,
        setNoteEditorKind,
    ] = useState<
        "line" |
        "document" |
        null
    >(null);

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

    const [
        salePresets,
        setSalePresets,
    ] = useState<SalePreset[]>(
        () =>
            getSalePresets(),
    );

    const [
        presetEditorOpen,
        setPresetEditorOpen,
    ] = useState(false);

    const [
        presetDraft,
        setPresetDraft,
    ] = useState<SalePreset[]>(
        [],
    );

    useEffect(() => {
        const refresh =
            () => {
                setSalePresets(
                    getSalePresets(),
                );
            };

        const unsubscribe =
            subscribeSalePresets(
                refresh,
            );

        void hydrateSalePresets();

        return unsubscribe;
    }, []);
    const saleActionAvailability = {
        profile:
            activeProfile,

        cartLineCount:
            cartLines.length,

        heldSaleCount:
            heldSales.length,

        selectedSaleLineId:
            selectedLineId &&
            cartLines.some(
                (line) =>
                    line.id ===
                        selectedLineId &&
                    line.kind ===
                        "sale",
            )
                ? selectedLineId
                : null,
    };

    const eligibleSaleActions =
        getEligibleSaleActions(
            saleActionAvailability,
        );

    const runSaleAction = (
        actionId: string,
    ) => {
        executeSaleAction(
            actionId,
            saleActionAvailability,
            {
                openCustomer:
                    () => {
                        setCustomerPickerOpen(
                            true,
                        );

                        setCustomerSearchTerm(
                            "",
                        );
                    },

                openCoupon:
                    () => {
                        setCouponDialogRequestId(
                            (current) =>
                                current + 1,
                        );
                    },

                openLineDiscount:
                    () => {
                        if (
                            !saleActionAvailability
                                .selectedSaleLineId
                        ) {
                            return;
                        }

                        setEditingDiscountLineId(
                            saleActionAvailability
                                .selectedSaleLineId,
                        );
                    },

                openTransactionDiscount:
                    () => {
                        setShowTransactionDiscount(
                            true,
                        );
                    },

                openLineNote:
                    () => {
                        if (
                            !saleActionAvailability
                                .selectedSaleLineId
                        ) {
                            return;
                        }

                        setMoreActionsOpen(
                            false,
                        );

                        setNoteEditorKind(
                            "line",
                        );
                    },

                openDocumentNote:
                    () => {
                        if (
                            saleActionAvailability
                                .cartLineCount <= 0
                        ) {
                            return;
                        }

                        setMoreActionsOpen(
                            false,
                        );

                        setNoteEditorKind(
                            "document",
                        );
                    },
                openPriceOverride:
                    () => {
                        if (
                            !saleActionAvailability
                                .selectedSaleLineId
                        ) {
                            return;
                        }

                        setEditingPriceLineId(
                            saleActionAvailability
                                .selectedSaleLineId,
                        );
                    },

                holdSale:
                    () => {
                        void holdCurrentSale();
                    },

                openHeldSales:
                    () => {
                        refreshHeldSales();

                        setHeldSalesOpen(
                            true,
                        );
                    },

                openReturnItem:
                    () => {
                        setMode(
                            "return-item",
                        );
                    },

                openGiftCardBalance:
                    () => {
                        setGiftCardBalanceOpen(
                            true,
                        );
                    },

                openDrawer:
                    () => {
                        requestCashDrawerOpen(
                            "manual",
                        );
                    },
            },
        );
    };
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
                        activeProfile.operatingModel !==
                            "calculator";

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

    const productSalesUnits =
        (() => {
            const totals =
                new Map<
                    string,
                    number
                >();

            if (
                catalogSortMode !==
                "top"
            ) {
                return totals;
            }

            /*
             * Transactions preserve SKU/barcode snapshots.
             * Map those identities back to the current
             * catalog product, including fashion variants.
             */
            const identityToProductId =
                new Map<
                    string,
                    string
                >();

            products.forEach(
                (product) => {
                    if (product.sku) {
                        identityToProductId.set(
                            `sku:${product.sku}`,
                            product.id,
                        );
                    }

                    if (product.barcode) {
                        identityToProductId.set(
                            `barcode:${product.barcode}`,
                            product.id,
                        );
                    }

                    product.variants?.forEach(
                        (variant) => {
                            if (variant.sku) {
                                identityToProductId.set(
                                    `sku:${variant.sku}`,
                                    product.id,
                                );
                            }

                            if (
                                variant.barcode
                            ) {
                                identityToProductId.set(
                                    `barcode:${variant.barcode}`,
                                    product.id,
                                );
                            }
                        },
                    );
                },
            );

            getTransactions()
                .filter(
                    (transaction) =>
                        transaction.status ===
                        "completed",
                )
                .forEach(
                    (transaction) => {
                        transaction.lines.forEach(
                            (line) => {
                                const productId =
                                    (
                                        line.sku
                                            ? identityToProductId.get(
                                                  `sku:${line.sku}`,
                                              )
                                            : undefined
                                    ) ??
                                    (
                                        line.barcode
                                            ? identityToProductId.get(
                                                  `barcode:${line.barcode}`,
                                              )
                                            : undefined
                                    );

                                if (!productId) {
                                    return;
                                }

                                const quantity =
                                    Math.abs(
                                        line.quantity,
                                    );

                                const signedQuantity =
                                    line.kind ===
                                    "return"
                                        ? -quantity
                                        : line.kind ===
                                          "sale"
                                        ? quantity
                                        : 0;

                                if (
                                    signedQuantity ===
                                    0
                                ) {
                                    return;
                                }

                                totals.set(
                                    productId,
                                    (
                                        totals.get(
                                            productId,
                                        ) ?? 0
                                    ) +
                                        signedQuantity,
                                );
                            },
                        );
                    },
                );

            return totals;
        })();

    const sortedProducts =
        [...filteredProducts]
            .sort(
                (
                    left,
                    right,
                ) => {
                    if (
                        catalogSortMode ===
                        "top"
                    ) {
                        const salesDifference =
                            (
                                productSalesUnits.get(
                                    right.id,
                                ) ?? 0
                            ) -
                            (
                                productSalesUnits.get(
                                    left.id,
                                ) ?? 0
                            );

                        if (
                            salesDifference !==
                            0
                        ) {
                            return salesDifference;
                        }
                    }

                    const nameComparison =
                        left.name.localeCompare(
                            right.name,
                            "he",
                            {
                                sensitivity:
                                    "base",
                                numeric:
                                    true,
                            },
                        );

                    return catalogSortMode ===
                        "za"
                        ? -nameComparison
                        : nameComparison;
                },
            );
    const selectedCartLine =
        selectedLineId
            ? pricing.lines.find(
                  (line) =>
                      line.id === selectedLineId,
              ) ?? null
            : null;

    const [
        sellerOverrideOpen,
        setSellerOverrideOpen,
    ] = useState(false);

    const [
        sellerOverrideEmployeeId,
        setSellerOverrideEmployeeId,
    ] = useState("");

    useEffect(() => {
        setSellerOverrideOpen(false);
    }, [selectedLineId]);

    const selectedSaleLine =
        pricing.lines.find(
            (line) =>
                line.id === selectedLineId &&
                line.kind === "sale",
        ) ?? null;

    const selectedNoteLine =
        selectedLineId
            ? cartLines.find(
                  (line) =>
                      line.id ===
                          selectedLineId &&
                      line.kind ===
                          "sale",
              ) ?? null
            : null;

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

    const blockSaleItemForReturnOnlyTransaction =
        () => {
            if (
                getReturnPolicy()
                    .exchangesEnabled ||
                !pricing.lines.some(
                    (line) =>
                        line.kind ===
                        "return",
                )
            ) {
                return false;
            }

            setSystemMessage(
                "\u05dc\u05d0 \u05e0\u05d9\u05ea\u05df \u05dc\u05e7\u05d9\u05d9\u05dd \u05d4\u05d7\u05dc\u05e4\u05d4 \u05d1\u05e2\u05e1\u05e7\u05d4 \u05d6\u05d5. \u05d4\u05d7\u05dc\u05e4\u05d5\u05ea \u05db\u05d1\u05d5\u05d9\u05d5\u05ea \u05d1\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea.",
            );

            return true;
        };

    const addProduct = (
        product: Product,
        sellerOverride?: {
            id: string;
            name: string;
        },
    ) => {
        if (
            blockSaleItemForReturnOnlyTransaction()
        ) {
            return;
        }

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

        const sellerForLine =
            sellerOverride ??
            currentSeller;

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
                    sellerForLine
                        ? {
                              employeeId:
                                  sellerForLine.id,
                              employeeName:
                                  sellerForLine.name,
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
        if (
            blockSaleItemForReturnOnlyTransaction()
        ) {
            return;
        }

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

            imageUrl:
                ((variant as ProductVariant & {
                    imageUrl?: string;
                }).imageUrl || product.imageUrl),
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
        sellerOverride?: {
            id: string;
            name: string;
        },
    ) => {
        const hasActiveVariants =
            product.variants?.some(
                (variant) =>
                    variant.isActive,
            ) ?? false;

        if (hasActiveVariants) {
            setSelectedFashionProduct(
                product as FashionProduct,
            );

            return;
        }

        addProduct(
            product,
            sellerOverride,
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
        if (
            !getReturnPolicy()
                .exchangesEnabled &&
            pricing.lines.some(
                (line) =>
                    line.kind ===
                    "sale",
            )
        ) {
            setSystemMessage(
                "\u05dc\u05d0 \u05e0\u05d9\u05ea\u05df \u05dc\u05d4\u05d5\u05e1\u05d9\u05e3 \u05e4\u05e8\u05d9\u05d8 \u05de\u05d5\u05d7\u05d6\u05e8 \u05dc\u05e2\u05e1\u05e7\u05ea \u05de\u05db\u05d9\u05e8\u05d4. \u05d4\u05d7\u05dc\u05e4\u05d5\u05ea \u05db\u05d1\u05d5\u05d9\u05d5\u05ea \u05d1\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea.",
            );

            setMode("sale");
            return;
        }

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

    const setQuantity = (
        lineId: string,
        quantity: number,
    ) => {
        if (!Number.isFinite(quantity)) {
            return;
        }

        const normalizedQuantity =
            Math.max(
                1,
                Math.floor(quantity),
            );

        updateCartLines(
            (current) =>
                current.map(
                    (line) =>
                        line.id === lineId
                            ? {
                                ...line,
                                quantity:
                                    normalizedQuantity,
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

                        note:
                            line.note,

                        printNoteOnDocument:
                            line.printNoteOnDocument,

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

    const reserveOpenTransactionNumber =
        async () => {
            if (
                reservedTransactionNumber
            ) {
                return reservedTransactionNumber;
            }

            const transactionNumber =
                allocateSaleNumber();

            await flushSaleNumberPersistence();

            setReservedTransactionNumber(
                transactionNumber,
            );

            return transactionNumber;
        };

    const completeTransaction = async (
        payments: Payment[],
        applyCancellationFee = false,
    ) => {
        const transactionNumber =
            await reserveOpenTransactionNumber();

        const transactionId =
            crypto.randomUUID();

        validateGiftCardRefundPayments(
            createSaleLines(),
            payments,
        );

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
        const effectiveSelectedCustomer =
            getCustomers().find(
                (customer) =>
                    customer.id ===
                    selectedCustomer.id,
            ) ??
            selectedCustomer;

        const storeCreditMovementAmount =
            Math.round(
                (
                    payments
                        .filter(
                            (payment) =>
                                payment.status ===
                                    "approved" &&
                                payment.method ===
                                    "store_credit",
                        )
                        .reduce(
                            (sum, payment) =>
                                sum +
                                payment.amount,
                            0,
                        ) +
                    Number.EPSILON
                ) * 100,
            ) / 100;

        const storeCreditBalanceBefore =
            Math.round(
                (
                    (
                        effectiveSelectedCustomer.accountBalance ??
                        0
                    ) +
                    Number.EPSILON
                ) * 100,
            ) / 100;

        const storeCreditObligo =
            Math.abs(
                storeCreditMovementAmount,
            ) > 0.001
                ? {
                      beforeBalance:
                          storeCreditBalanceBefore,
                      creditLimit:
                          Math.max(
                              0,
                              Math.round(
                                  (
                                      (
                                          effectiveSelectedCustomer.creditLimit ??
                                          0
                                      ) +
                                      Number.EPSILON
                                  ) * 100,
                              ) / 100,
                          ),

                      movementAmount:
                          storeCreditMovementAmount,

                      afterBalance:
                          Math.round(
                              (
                                  storeCreditBalanceBefore +
                                  storeCreditMovementAmount +
                                  Number.EPSILON
                              ) * 100,
                          ) / 100,
                  }
                : undefined;

        const sale =
            await completeSale(
                createSaleLines(),
                payments,
                {
                    id:
                        effectiveSelectedCustomer.id,
                    name:
                        effectiveSelectedCustomer.name,
                    phone:
                        effectiveSelectedCustomer.phone,
                    groupIds:
                        effectiveSelectedCustomer.groupIds,
                    isClubMember:
                        effectiveSelectedCustomer.isClubMember,
                },
                {
                    transactionId,


                    transactionNumber,

                    shiftId:
                        getActiveRegisterShift()
                            ?.id,

                    applyCancellationFee,

                    coupon:
                        appliedSaleCoupon,

                    documentNote,

                    printDocumentNote,


                    storeCreditObligo,
                },
            );
        if (
            Math.abs(
                storeCreditMovementAmount,
            ) > 0.001
        ) {
            const updatedCustomer =
                saveCustomer(
                    applyStoreCreditBalanceMovement(
                        effectiveSelectedCustomer,
                        storeCreditMovementAmount,
                    ),
                );

            setSelectedCustomer(
                updatedCustomer,
            );
        }

        await restoreGiftCardRefundPayments(
            payments,
            sale.id,
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
        setDocumentNote("");
        setPrintDocumentNote(false);
        setNoteEditorKind(null);
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
            getWalkInCustomer(),
        );

        setCustomerPickerOpen(false);
        setCustomerSearchTerm("");
        setDocumentNote("");
        setPrintDocumentNote(false);
        setNoteEditorKind(null);
        setMoreActionsOpen(false);
        setSelectedLineId(null);
    };

    const refreshHeldSales = () => {
        setHeldSales(
            getHeldSales(),
        );
    };

    const holdCurrentSale =
        async () => {
            if (
                cartLines.length === 0
            ) {
                return;
            }saveHeldSale({
                id:
                    crypto.randomUUID(),heldAt:
                    new Date()
                        .toISOString(),

                cartLines:
                    [...cartLines],

                pricingRules:
                    [...pricingRules],

                customer:
                    selectedCustomer,

                couponCode:
                    appliedCoupon?.code,

                documentNote:
                    documentNote || undefined,

                printDocumentNote:
                    documentNote &&
                    printDocumentNote
                        ? true
                        : undefined,

                currentSellerId,

                sellerSelectionMode,

                selectedCategory,

                total:
                    transactionTotal,
            });

            await flushHeldSalePersistence();

            refreshHeldSales();

            clearSale();

            setReservedTransactionNumber(
                null,
            );

            setSearchTerm("");
            setSelectedCategory(
                "all",
            );
        };

    const resumeHeldSale =
        async (
            heldSale: HeldSale,
        ) => {
            if (
                cartLines.length > 0
            ) {
                return;
            }

            removeCoupon();


            setReservedTransactionNumber(null);

            setCartLines(
                heldSale.cartLines,
            );

            setPricingRules(
                heldSale.pricingRules,
            );

            setSelectedCustomer(
                heldSale.customer,
            );

            setDocumentNote(
                heldSale.documentNote ??
                "",
            );

            setPrintDocumentNote(
                Boolean(
                    heldSale.documentNote &&
                    heldSale.printDocumentNote,
                ),
            );

            setCurrentSellerId(
                heldSale.currentSellerId,
            );

            setSellerSelectionMode(
                heldSale
                    .sellerSelectionMode,
            );

            setSelectedCategory(
                heldSale.selectedCategory ||
                "all",
            );

            setSearchTerm("");
            setSelectedLineId(null);
            setCheckoutTotal(null);
            setMode("sale");

            setPendingHeldCouponCode(
                heldSale.couponCode ??
                null,
            );

            deleteHeldSale(
                heldSale.id,
            );

            await flushHeldSalePersistence();

            refreshHeldSales();
            setHeldSalesOpen(false);
        };

    const removeHeldSale =
        async (
            id: string,
        ) => {
            deleteHeldSale(
                id,
            );

            await flushHeldSalePersistence();

            refreshHeldSales();
        };

    const startNewSale = () => {
        setMode("sale");

        setCompletedSale(null);
        setIssuedRefundVoucher(null);
        setCheckoutTotal(null);

        clearSale();

        setReservedTransactionNumber(
            null,
        );

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
                    refundVoucher={
                        issuedRefundVoucher
                    }
                />
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
                giftCardRefundSource={
                    getOriginalGiftCardRefundSource(
                        createSaleLines(),
                    )
                }
                                storeCreditRefundLimit={
                    getStoreCreditRefundLimit(
                        createSaleLines(),
                        selectedCustomer,
                    )
                }onBack={() =>
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
                <div className="sale-page__operator-topbar">
                    <div className="sale-page__merchant-zone">
                        <div className="sale-page__merchant-compact">
                            <div
                                className="sale-page__merchant-monogram"
                                aria-hidden="true"
                            >
                                {(
                                    activeProfile.identity.tradingName ??
                                    activeProfile.identity.businessName
                                )
                                    .trim()
                                    .charAt(0)
                                    .toUpperCase()}
                            </div>

                            <div className="sale-page__merchant-copy">
                                <strong>
                                    {activeProfile.identity.tradingName ??
                                        activeProfile.identity.businessName}
                                </strong>

                                {activeProfile.identity.branchName && (
                                    <span>
                                        {activeProfile.identity.branchName}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="sale-page__transaction-zone">
                        <div className="sale-page__transaction-identity">
                            <strong id="sale-page-title">
                            <span>
                                עסקה
                            </span>

                            <span
                                className="sale-page__transaction-number"
                                dir="ltr"
                            >
                                {openTransactionNumber}
                            </span>
                        </strong>

                            <span className="sale-page__transaction-state">
                                פתוחה
                            </span>
                        </div>
                    </div>

                <div className="sale-page__transaction-context">
                    <div className="sale-page__context-field sale-page__customer-tools">
                        <span>לקוח</span>

                        <button
                            type="button"
                            className="sale-page__customer-trigger"
                            onClick={() => {
                                setCustomerPickerOpen(
                                    (current) => !current,
                                );

                                setCustomerSearchTerm("");
                            }}
                        >
                            <span>
                                {selectedCustomer.name}
                            </span>

                            <span
                                className="sale-page__customer-chevron"
                                aria-hidden="true"
                            >
                                ⌄
                            </span>
                        </button>

                        <button
                            type="button"
                            className="sale-page__customer-create-trigger"
                            onClick={() => {
                                setCustomerPickerOpen(
                                    false,
                                );

                                setCustomerSearchTerm(
                                    "",
                                );

                                setCustomerCreateOpen(
                                    true,
                                );
                            }}
                        >
                            + לקוח
                        </button>
                        {customerPickerOpen && (
                            <div className="sale-page__customer-popover">
                                <input
                                    type="search"
                                    autoFocus
                                    value={customerSearchTerm}
                                    placeholder="חיפוש לפי שם, טלפון או ת״ז"
                                    onChange={(event) =>
                                        setCustomerSearchTerm(
                                            event.target.value,
                                        )
                                    }
                                />

                                <div className="sale-page__customer-results">
                                    {filteredSaleCustomers.length === 0 && (
                                        <div className="sale-page__customer-empty">
                                            לא נמצאו לקוחות
                                        </div>
                                    )}

                                    {filteredSaleCustomers.map(
                                        (customer) => (
                                            <button
                                                key={customer.id}
                                                type="button"
                                                className={
                                                    customer.id ===
                                                    selectedCustomer.id
                                                        ? "sale-page__customer-result sale-page__customer-result--selected"
                                                        : "sale-page__customer-result"
                                                }
                                                onClick={() => {
                                                    setSelectedCustomer(
                                                        customer,
                                                    );

                                                    setCustomerPickerOpen(
                                                        false,
                                                    );

                                                    setCustomerSearchTerm(
                                                        "",
                                                    );
                                                }}
                                            >
                                                <strong>
                                                    {customer.name}
                                                </strong>

                                                {customer.id !==
                                                    "walk-in" && (
                                                    <span>
                                                        {[
                                                            customer.phone,
                                                            customer.externalId,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(" · ")}
                                                    </span>
                                                )}
                                            </button>
                                        ),
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <label className="sale-page__context-field">
                        <span>מוכרן</span>

                        <select
                            value={currentSellerId}
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
                                    {activeSellers.length === 0
                                        ? "אין מוכרנים בנוכחות"
                                        : "בחר מוכרן"}
                                </option>
                            )}

                            {activeSellers.map(
                                (employee) => (
                                    <option
                                        key={employee.id}
                                        value={employee.id}
                                    >
                                        {employee.name}
                                    </option>
                                ),
                            )}
                        </select>
                    </label>


                    <div className="sale-page__context-field sale-page__seller-tools">
                            <span>שינוי לשורה</span>

                            <button
                                type="button"
                                className="sale-page__seller-override-trigger"
                                disabled={
                                    activeSellers.length === 0 ||
                                    !selectedCartLine
                                }
                                onClick={() => {
                                    if (!selectedCartLine) {
                                        return;
                                    }

                                    const replacementSeller =
                                        activeSellers.find(
                                            (employee) =>
                                                employee.id !==
                                                selectedCartLine?.seller?.employeeId,
                                        );

                                    setSellerOverrideEmployeeId(
                                        replacementSeller?.id || "",
                                    );

                                    setSellerOverrideOpen(
                                        (current) => !current,
                                    );
                                }}
                            >
                                <span>
                                    {selectedCartLine?.seller?.employeeName ||
                                        (selectedCartLine
                                            ? "בחר מוכרן"
                                            : "בחר שורה בעגלה")}
                                </span>

                                <span
                                    className="sale-page__seller-override-chevron"
                                    aria-hidden="true"
                                >
                                   ⌄
                                </span>
                            </button>

                            {sellerOverrideOpen && selectedCartLine && (
                                <div className="sale-page__seller-popover">
                                    <span>
                                        מוכרן לשורה הנבחרת
                                    </span>

                                    <select
                                        value={sellerOverrideEmployeeId}
                                        onChange={(event) =>
                                            setSellerOverrideEmployeeId(
                                                event.target.value,
                                            )
                                        }
                                    >
                                        {activeSellers
                                            .filter(
                                                (employee) =>
                                                    employee.id !==
                                                    selectedCartLine?.seller?.employeeId,
                                            )
                                            .map(
                                                (employee) => (
                                                    <option
                                                        key={employee.id}
                                                        value={employee.id}
                                                    >
                                                        {employee.name}
                                                    </option>
                                                ),
                                            )}
                                    </select>

                                    <div className="sale-page__seller-popover-actions">
                                        <button
                                            type="button"
                                            disabled={!sellerOverrideEmployeeId}
                                            onClick={() => {
                                                const seller =
                                                    activeSellers.find(
                                                        (employee) =>
                                                            employee.id ===
                                                            sellerOverrideEmployeeId,
                                                    );

                                                if (!seller) {
                                                    return;
                                                }

                                                changeSellerForLine(
                                                    selectedCartLine.id,
                                                    {
                                                        employeeId: seller.id,
                                                        employeeName: seller.name,
                                                    },
                                                );

                                                setSellerOverrideOpen(false);
                                            }}
                                        >
                                            רק שורה זו
                                        </button>

                                        <button
                                            type="button"
                                            disabled={!sellerOverrideEmployeeId}
                                            onClick={() => {
                                                const seller =
                                                    activeSellers.find(
                                                        (employee) =>
                                                            employee.id ===
                                                            sellerOverrideEmployeeId,
                                                    );

                                                if (!seller) {
                                                    return;
                                                }

                                                changeSellerFromLineToEnd(
                                                    selectedCartLine.id,
                                                    {
                                                        employeeId: seller.id,
                                                        employeeName: seller.name,
                                                    },
                                                );

                                                setSellerOverrideOpen(false);
                                            }}
                                        >
                                            מכאן ועד הסוף
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                </div>
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
                                className={`sale-page__secondary-button sale-page__view-toggle ${
                                    catalogViewMode ===
                                    "list"
                                        ? "sale-page__view-toggle--active"
                                        : ""
                                }`}
                                aria-pressed={
                                    catalogViewMode ===
                                    "list"
                                }
                                onClick={() =>
                                    setCatalogViewMode(
                                        (current) =>
                                            current ===
                                            "cards"
                                                ? "list"
                                                : "cards",
                                    )
                                }
                                title="החלף תצוגת קטלוג"
                            >
                                {catalogViewMode ===
                                "cards"
                                    ? "▦ תמונות"
                                    : "☷ רשימה"}
                            </button>
                            <button
                                type="button"
                                className="sale-page__secondary-button sale-page__sort-toggle"
                                onClick={() =>
                                    setCatalogSortMode(
                                        (current) =>
                                            current ===
                                            "az"
                                                ? "za"
                                                : current ===
                                                  "za"
                                                ? "top"
                                                : "az",
                                    )
                                }
                                title="החלף מיון מוצרים"
                            >
                                מיון:{" "}
                                {catalogSortMode ===
                                "az"
                                    ? "א–ת"
                                    : catalogSortMode ===
                                      "za"
                                    ? "ת–א"
                                    : "טופ סלר"}
                            </button>
                            <button
                                type="button"
                                className="sale-page__secondary-button sale-page__preset-config-button"
                                onClick={() => {
                                    setPresetDraft(
                                        salePresets.map(
                                            (preset) => ({
                                                ...preset,
                                            }),
                                        ),
                                    );

                                    setPresetEditorOpen(
                                        true,
                                    );
                                }}
                                title="הגדרת קיצורים"
                            >
                                ⚡ קיצורים
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

                        {salePresets.length > 0 && (
                            <div className="sale-page__preset-strip">
                                {salePresets.map(
                                    (preset) => {
                                        const product =
                                            preset.kind ===
                                            "product"
                                                ? products.find(
                                                      (candidate) =>
                                                          candidate.id ===
                                                              preset.targetId &&
                                                          candidate.isActive,
                                                  )
                                                : undefined;

                                        const category =
                                            preset.kind ===
                                            "category"
                                                ? categories.find(
                                                      (candidate) =>
                                                          candidate.id ===
                                                          preset.targetId,
                                                  )
                                                : undefined;
                                        const action =
                                            preset.kind ===
                                            "action"
                                                ? getSaleActionDefinition(
                                                      preset.targetId,
                                                  )
                                                : undefined;

                                        const label =
                                            product?.name ??
                                            category?.label ??
                                            action?.label ??
                                            "פעולה";

                                        const unavailable =
                                            (
                                                preset.kind ===
                                                    "product" &&
                                                !product
                                            ) ||
                                            (
                                                preset.kind ===
                                                    "category" &&
                                                !category
                                            ) ||
                                            (
                                                preset.kind ===
                                                    "action" &&
                                                (
                                                    !action ||
                                                    !isSaleActionEnabled(
                                                        preset.targetId,
                                                        saleActionAvailability,
                                                    )
                                                )
                                            );

                                        return (
                                            <button
                                                key={
                                                    preset.id
                                                }
                                                type="button"
                                                className="sale-page__preset-chip"
                                                disabled={
                                                    unavailable
                                                }
                                                onClick={() => {
                                                    if (
                                                        preset.kind ===
                                                        "product"
                                                    ) {
                                                        if (
                                                            product
                                                        ) {
                                                            handleProductSelection(
                                                                product,
                                                            );
                                                        }

                                                        return;
                                                    }

                                                    if (
                                                        preset.kind ===
                                                        "category"
                                                    ) {
                                                        if (
                                                            category
                                                        ) {
                                                            setSelectedCategory(
                                                                category.id,
                                                            );

                                                            setSearchTerm(
                                                                "",
                                                            );
                                                        }

                                                        return;
                                                    }
                                                    runSaleAction(
                                                        preset.targetId,
                                                    );
                                                }}
                                            >
                                                <span
                                                    className="sale-page__preset-chip-icon"
                                                    aria-hidden="true"
                                                >
                                                    {preset.kind ===
                                                    "product"
                                                        ? "◆"
                                                        : preset.kind ===
                                                          "category"
                                                        ? "▦"
                                                        : "⚡"}
                                                </span>

                                                <span>
                                                    {
                                                        label
                                                    }
                                                </span>
                                            </button>
                                        );
                                    },
                                )}
                            </div>
                        )}
                        <ProductGrid
                            products={sortedProducts}
                            onSelectProduct={
                                handleProductSelection
                            }
                            viewMode={
                                catalogViewMode
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
                                        disabled={
                                            !getReturnPolicy()
                                                .exchangesEnabled &&
                                            pricing.lines.some(
                                                (line) =>
                                                    line.kind ===
                                                    "sale",
                                            )
                                        }
                                        title={
                                            !getReturnPolicy()
                                                .exchangesEnabled &&
                                            pricing.lines.some(
                                                (line) =>
                                                    line.kind ===
                                                    "sale",
                                            )
                                                ? "\u05dc\u05d0 \u05e0\u05d9\u05ea\u05df \u05dc\u05d4\u05ea\u05d7\u05d9\u05dc \u05d4\u05d7\u05d6\u05e8\u05d4 \u05d1\u05e2\u05e1\u05e7\u05ea \u05de\u05db\u05d9\u05e8\u05d4 \u05db\u05d0\u05e9\u05e8 \u05d4\u05d7\u05dc\u05e4\u05d5\u05ea \u05db\u05d1\u05d5\u05d9\u05d5\u05ea."
                                                : undefined
                                        }
                                        onClick={() =>
                                            setMode(
                                                "return-item",
                                            )
                                        }
                                    >
                                        החזר פריט
                                    </button>
                                )}

                            <button
                                type="button"
                                disabled={
                                    cartLines.length === 0
                                }
                                onClick={() =>
                                    void holdCurrentSale()
                                }
                            >
                                השהה עסקה
                            </button>

                            <div className="sale-page__more-actions">
                                <button
                                    type="button"
                                    className="sale-page__more-actions-trigger"
                                    onClick={() =>
                                        setMoreActionsOpen(
                                            (current) =>
                                                !current,
                                        )
                                    }
                                >
                                    <span>
                                        עוד פעולות
                                    </span>

                                    <span
                                        aria-hidden="true"
                                        className="sale-page__more-actions-chevron"
                                    >
                                        ⌄
                                    </span>
                                </button>

                                {moreActionsOpen && (
                                    <div
                                        className="sale-page__more-actions-overlay"
                                        role="presentation"
                                        onMouseDown={() =>
                                            setMoreActionsOpen(false)
                                        }
                                    >
                                        <section
                                            className="sale-page__more-actions-dialog"
                                            role="dialog"
                                            aria-modal="true"
                                            aria-label="פעולות נוספות"
                                            onMouseDown={(event) =>
                                                event.stopPropagation()
                                            }
                                        >
                                            <header className="sale-page__more-actions-dialog-header">
                                                <div>
                                                    <strong>
                                                        פעולות נוספות
                                                    </strong>

                                                    <span>
                                                        פעולות משלימות לעסקה
                                                    </span>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="sale-page__more-actions-close"
                                                    aria-label="סגור"
                                                    onClick={() =>
                                                        setMoreActionsOpen(
                                                            false,
                                                        )
                                                    }
                                                >
                                                    ×
                                                </button>
                                            </header>

                                            <div className="sale-page__more-actions-grid">
                                                <ManualNexteraSyncAction />
                                                <button
                                                    type="button"
                                                    className="sale-page__more-actions-card"
                                                    disabled={
                                                        !selectedNoteLine
                                                    }
                                                    onClick={() => {
                                                        if (
                                                            !selectedNoteLine
                                                        ) {
                                                            return;
                                                        }

                                                        setMoreActionsOpen(
                                                            false,
                                                        );

                                                        setNoteEditorKind(
                                                            "line",
                                                        );
                                                    }}
                                                >
                                                    <strong>
                                                        {selectedNoteLine
                                                            ?.note
                                                            ?.trim()
                                                            ? "הערת פריט ✓"
                                                            : "הערת פריט"}
                                                    </strong>

                                                    <span>
                                                        {selectedNoteLine
                                                            ? selectedNoteLine
                                                                  .product
                                                                  .name
                                                            : "בחר פריט בעגלה"}
                                                    </span>

                                                    <small>
                                                        {selectedNoteLine
                                                            ?.note
                                                            ?.trim()
                                                            ? selectedNoteLine
                                                                  .printNoteOnDocument
                                                                ? "מודפסת במסמך"
                                                                : "פנימית בלבד"
                                                            : "הערה לפריט שנבחר"}
                                                    </small>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="sale-page__more-actions-card"
                                                    disabled={
                                                        cartLines.length === 0
                                                    }
                                                    onClick={() => {
                                                        setMoreActionsOpen(
                                                            false,
                                                        );

                                                        setNoteEditorKind(
                                                            "document",
                                                        );
                                                    }}
                                                >
                                                    <strong>
                                                        {documentNote
                                                            .trim()
                                                            ? "הערת מסמך ✓"
                                                            : "הערת מסמך"}
                                                    </strong>

                                                    <span>
                                                        הערה כללית לעסקה
                                                    </span>

                                                    <small>
                                                        {documentNote
                                                            .trim()
                                                            ? printDocumentNote
                                                                ? "מודפסת במסמך"
                                                                : "פנימית בלבד"
                                                            : "ללא הערה"}
                                                    </small>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="sale-page__more-actions-card"
                                                    disabled={
                                                        heldSales.length === 0 ||
                                                        cartLines.length > 0
                                                    }
                                                    onClick={() => {
                                                        setMoreActionsOpen(
                                                            false,
                                                        );

                                                        setHeldSalesOpen(
                                                            true,
                                                        );
                                                    }}
                                                >
                                                    <strong>
                                                        עסקאות מושהות
                                                    </strong>

                                                    <span>
                                                        שחזור עסקה שהושהתה
                                                    </span>

                                                    <small>
                                                        {heldSales.length}
                                                        {" "}
                                                        מושהות
                                                    </small>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="sale-page__more-actions-card"
                                                    disabled={
                                                        Boolean(
                                                            appliedCoupon,
                                                        )
                                                    }
                                                    onClick={() => {
                                                        setMoreActionsOpen(
                                                            false,
                                                        );

                                                        setCouponDialogRequestId(
                                                            (current) =>
                                                                current + 1,
                                                        );
                                                    }}
                                                >
                                                    <strong>
                                                        {appliedCoupon
                                                            ? "קופון פעיל"
                                                            : "קופון"}
                                                    </strong>

                                                    <span>
                                                        סריקה או הקלדת קוד קופון
                                                    </span>

                                                    {appliedCoupon && (
                                                        <small>
                                                            {
                                                                appliedCoupon.code
                                                            }
                                                        </small>
                                                    )}
                                                </button>
                                            </div>
                                        </section>
                                    </div>
                                )}
                            </div>

                        </div>
                    </section>
                    )}

                    <section className="sale-page__cart">
                        <CartPanel
                            lines={pricing.lines}
                            activeSellers={activeSellers}
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
                            couponDialogRequestId={
                                couponDialogRequestId
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
                            onSetQuantity={
                                setQuantity
                            }
                            onSelectLine={
                                setSelectedLineId
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

                        {storeCreditCustomerPopupVisible &&
                selectedCustomer.storeCreditEnabled ===
                    true && (
                <div
                    className="sale-page__store-credit-popup"
                    role="status"
                    aria-live="polite"
                >
                    <button
                        type="button"
                        className="sale-page__store-credit-popup-close"
                        aria-label="סגור"
                        onClick={() =>
                            setStoreCreditCustomerPopupVisible(
                                false,
                            )
                        }
                    >
                        ×
                    </button>

                    <div className="sale-page__store-credit-popup-head">
                        <span>
                            לקוח הקפה
                        </span>

                        <strong>
                            {selectedCustomer.name}
                        </strong>
                    </div>

                    <div className="sale-page__store-credit-popup-grid">
                        <div>
                            <span>
                                {storeCreditCustomerSnapshot.accountBalance <
                                -0.001
                                    ? "יתרת זכות"
                                    : "חוב נוכחי"}
                            </span>

                            <strong>
                                ₪
                                {Math.abs(
                                    storeCreditCustomerSnapshot.accountBalance,
                                ).toFixed(
                                    2,
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                זמין להקפה
                            </span>

                            <strong>
                                ₪
                                {storeCreditCustomerSnapshot.availableCredit.toFixed(
                                    2,
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                מסגרת
                            </span>

                            <strong>
                                ₪
                                {storeCreditCustomerSnapshot.creditLimit.toFixed(
                                    2,
                                )}
                            </strong>
                        </div>
                    </div>
                </div>
            )}
{customerCreateOpen && (

                <SaleCustomerQuickCreateDialog

                    onClose={() =>

                        setCustomerCreateOpen(

                            false,

                        )

                    }

                    onCreated={(

                        customer,

                    ) => {

                        setSelectedCustomer(

                            customer,

                        );


                        setCustomerCreateOpen(

                            false,

                        );


                        setCustomerPickerOpen(

                            false,

                        );


                        setCustomerSearchTerm(

                            "",

                        );

                    }}

                />

            )}

            {noteEditorKind && (
                <NoteEditorDialog
                    kind={
                        noteEditorKind
                    }
                    initialNote={
                        noteEditorKind ===
                        "line"
                            ? selectedNoteLine
                                  ?.note
                            : documentNote
                    }
                    initialPrintOnDocument={
                        noteEditorKind ===
                        "line"
                            ? Boolean(
                                  selectedNoteLine
                                      ?.note &&
                                      selectedNoteLine
                                          .printNoteOnDocument,
                              )
                            : Boolean(
                                  documentNote &&
                                      printDocumentNote,
                              )
                    }
                    contextLabel={
                        noteEditorKind ===
                            "line" &&
                        selectedNoteLine
                            ? selectedNoteLine
                                  .product
                                  .name
                            : undefined
                    }
                    onClose={() =>
                        setNoteEditorKind(
                            null,
                        )
                    }
                    onSave={(
                        note,
                        printOnDocument,
                    ) => {
                        if (
                            noteEditorKind ===
                            "line"
                        ) {
                            if (
                                selectedNoteLine
                            ) {
                                updateCartLines(
                                    (
                                        current,
                                    ) =>
                                        current.map(
                                            (
                                                line,
                                            ) =>
                                                line.id ===
                                                    selectedNoteLine.id &&
                                                line.kind ===
                                                    "sale"
                                                    ? {
                                                          ...line,

                                                          note,

                                                          printNoteOnDocument:
                                                              note &&
                                                              printOnDocument
                                                                  ? true
                                                                  : undefined,
                                                      }
                                                    : line,
                                        ),
                                );
                            }
                        }
                        else {
                            setDocumentNote(
                                note ?? "",
                            );

                            setPrintDocumentNote(
                                Boolean(
                                    note &&
                                        printOnDocument,
                                ),
                            );
                        }

                        setNoteEditorKind(
                            null,
                        );
                    }}
                />
            )}
            {heldSalesOpen && (
                <HeldSalesDialog
                    heldSales={
                        heldSales
                    }
                    onClose={() =>
                        setHeldSalesOpen(
                            false,
                        )
                    }
                    onResume={(heldSale) =>
                        void resumeHeldSale(
                            heldSale,
                        )
                    }
                    onDelete={(id) =>
                        void removeHeldSale(
                            id,
                        )
                    }
                />
            )}

            {pendingProductForSeller && (
                <div
                    className="sale-page__seller-selection-overlay"
                    dir="rtl"
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 13000,
                        display: "grid",
                        placeItems: "center",
                        padding: "24px",
                        background:
                            "rgb(20 23 27 / 32%)",
                    }}
                >
                    <section
                        style={{
                            width:
                                "min(440px, 94vw)",
                            padding: "24px",
                            borderRadius: "16px",
                            background: "#fff",
                            boxShadow:
                                "0 24px 70px rgb(15 18 21 / 22%)",
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
                                                    employee,
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

            <SystemMessageDialog
                title={
                    "\u05e4\u05e2\u05d5\u05dc\u05d4 \u05dc\u05d0 \u05d6\u05de\u05d9\u05e0\u05d4"
                }
                message={
                    systemMessage
                }
                onClose={() =>
                    setSystemMessage(
                        null,
                    )
                }
            />

            <GiftCardBalanceDialog
                open={
                    giftCardBalanceOpen
                }
                onClose={() =>
                    setGiftCardBalanceOpen(
                        false,
                    )
                }
            />
            <QuickPresetEditorDialog
                open={
                    presetEditorOpen
                }
                maxPresets={
                    MAX_SALE_PRESETS
                }
                presets={
                    presetDraft
                }
                productOptions={
                    products
                        .filter(
                            (product) =>
                                product.isActive,
                        )
                        .map(
                            (product) => ({
                                id:
                                    product.id,
                                label:
                                    product.name,
                            }),
                        )
                }
                categoryOptions={
                    categories.map(
                        (category) => ({
                            id:
                                category.id,
                            label:
                                category.label,
                        }),
                    )
                }
                actions={
                    eligibleSaleActions
                }
                onChange={
                    setPresetDraft
                }
                onCancel={() =>
                    setPresetEditorOpen(
                        false,
                    )
                }
                onSave={(draft) => {
                    const valid =
                        draft.filter(
                            (preset) => {
                                if (
                                    preset.kind ===
                                    "product"
                                ) {
                                    return products.some(
                                        (
                                            product,
                                        ) =>
                                            product.id ===
                                                preset.targetId &&
                                            product.isActive,
                                    );
                                }

                                if (
                                    preset.kind ===
                                    "category"
                                ) {
                                    return categories.some(
                                        (
                                            category,
                                        ) =>
                                            category.id ===
                                            preset.targetId,
                                    );
                                }

                                return isSaleActionId(
                                    preset.targetId,
                                );
                            },
                        );

                    saveSalePresets(
                        valid,
                    );

                    setPresetEditorOpen(
                        false,
                    );
                }}
            />
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
