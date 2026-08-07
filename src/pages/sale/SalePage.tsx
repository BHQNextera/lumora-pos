import {
    useMemo,
    useState,
} from "react";

import CartPanel, {
    type CartLine,
} from "../../components/pos/CartPanel";
import ProductGrid from "../../components/pos/ProductGrid";
import { products } from "../../data/products";
import type { Payment } from "../../models/Payment";
import type { Sale } from "../../models/sale/Sale";
import type { SaleLine } from "../../models/sale/SaleLine";
import { completeSale } from "../../models/sale/SaleService";
import type {
    Product,
    ProductCategory,
} from "../../types/product";
import PaymentPage from "../payment/PaymentPage";
import SaleCompletePage from "../sale-complete/SaleCompletePage";

type CategoryOption = {
    id: ProductCategory;
    label: string;
};

const categories: CategoryOption[] = [
    { id: "all", label: "הכול" },
    {
        id: "hot-drinks",
        label: "שתייה חמה",
    },
    {
        id: "cold-drinks",
        label: "שתייה קרה",
    },
    {
        id: "pastries",
        label: "מאפים",
    },
    {
        id: "sandwiches",
        label: "כריכים",
    },
    {
        id: "desserts",
        label: "קינוחים",
    },
];

function SalePage() {
    const [
        selectedCategory,
        setSelectedCategory,
    ] =
        useState<ProductCategory>("all");

    const [searchTerm, setSearchTerm] =
        useState("");

    const [cartLines, setCartLines] =
        useState<CartLine[]>([]);

    const [
        checkoutTotal,
        setCheckoutTotal,
    ] = useState<number | null>(null);

    const [
        completedSale,
        setCompletedSale,
    ] = useState<Sale | null>(null);

    const filteredProducts = useMemo(
        () => {
            const normalizedSearch =
                searchTerm.trim().toLowerCase();

            return products.filter(
                (product) => {
                    const matchesCategory =
                        selectedCategory === "all" ||
                        product.category ===
                        selectedCategory;

                    const matchesSearch =
                        normalizedSearch.length ===
                        0 ||
                        product.name
                            .toLowerCase()
                            .includes(
                                normalizedSearch,
                            ) ||
                        product.barcode.includes(
                            normalizedSearch,
                        ) ||
                        product.sku
                            .toLowerCase()
                            .includes(
                                normalizedSearch,
                            );

                    return (
                        product.isActive &&
                        matchesCategory &&
                        matchesSearch
                    );
                },
            );
        },
        [searchTerm, selectedCategory],
    );

    const addProduct = (
        product: Product,
    ) => {
        setCartLines((currentLines) => {
            const existingLine =
                currentLines.find(
                    (line) =>
                        line.product.id ===
                        product.id,
                );

            if (existingLine) {
                return currentLines.map(
                    (line) =>
                        line.product.id ===
                            product.id
                            ? {
                                ...line,
                                quantity:
                                    line.quantity + 1,
                            }
                            : line,
                );
            }

            return [
                ...currentLines,
                {
                    product,
                    quantity: 1,
                    lineDiscountAmount: 0,
                    allocatedSaleDiscountAmount:
                        0,
                },
            ];
        });
    };

    const increaseQuantity = (
        productId: string,
    ) => {
        setCartLines((currentLines) =>
            currentLines.map((line) =>
                line.product.id === productId
                    ? {
                        ...line,
                        quantity:
                            line.quantity + 1,
                    }
                    : line,
            ),
        );
    };

    const decreaseQuantity = (
        productId: string,
    ) => {
        setCartLines((currentLines) =>
            currentLines.flatMap(
                (line) => {
                    if (
                        line.product.id !==
                        productId
                    ) {
                        return [line];
                    }

                    if (line.quantity <= 1) {
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
    };

    const createSaleLines = (): SaleLine[] =>
        cartLines.map((line) => {
            const grossAmount =
                line.product.price *
                line.quantity;

            const lineDiscountAmount =
                line.lineDiscountAmount ?? 0;

            const allocatedSaleDiscountAmount =
                line.allocatedSaleDiscountAmount ??
                0;

            const netAmount =
                grossAmount -
                lineDiscountAmount -
                allocatedSaleDiscountAmount;

            return {
                id: crypto.randomUUID(),

                productId: line.product.id,
                productName: line.product.name,

                sku: line.product.sku,
                barcode: line.product.barcode,

                quantity: line.quantity,
                unitPrice: line.product.price,

                grossAmount,

                lineDiscountAmount,
                allocatedSaleDiscountAmount,

                netAmount,
            };
        });

    const handlePaymentComplete = (
        payments: Payment[],
    ) => {
        const sale = completeSale(
            createSaleLines(),
            payments,
        );

        setCompletedSale(sale);
        setCheckoutTotal(null);
    };

    const startNewSale = () => {
        setCompletedSale(null);
        setCheckoutTotal(null);
        setCartLines([]);
        setSearchTerm("");
        setSelectedCategory("all");
    };

    if (completedSale) {
        return (
            <SaleCompletePage
                sale={completedSale}
                onNewSale={startNewSale}
            />
        );
    }

    if (checkoutTotal !== null) {
        return (
            <PaymentPage
                total={checkoutTotal}
                onBack={() =>
                    setCheckoutTotal(null)
                }
                onComplete={
                    handlePaymentComplete
                }
            />
        );
    }

    return (
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
                            aria-label="חיפוש מוצר"
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(
                                    event.target.value,
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

                    <div
                        className="sale-page__categories"
                        aria-label="קטגוריות"
                    >
                        {categories.map(
                            (category) => {
                                const isActive =
                                    category.id ===
                                    selectedCategory;

                                return (
                                    <button
                                        key={category.id}
                                        type="button"
                                        className={`sale-page__category ${isActive
                                            ? "sale-page__category--active"
                                            : ""
                                            }`}
                                        aria-pressed={
                                            isActive
                                        }
                                        onClick={() =>
                                            setSelectedCategory(
                                                category.id,
                                            )
                                        }
                                    >
                                        {category.label}
                                    </button>
                                );
                            },
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
                        <button type="button">
                            הנחת פריט
                        </button>

                        <button type="button">
                            הנחת אחוז
                        </button>

                        <button type="button">
                            שובר זיכוי
                        </button>

                        <button type="button">
                            החזרה
                        </button>

                        <button type="button">
                            הערות
                        </button>

                        <button type="button">
                            עוד פעולות
                        </button>
                    </div>
                </section>

                <CartPanel
                    lines={cartLines}
                    onClear={() =>
                        setCartLines([])
                    }
                    onIncrease={
                        increaseQuantity
                    }
                    onDecrease={
                        decreaseQuantity
                    }
                    onCheckout={
                        setCheckoutTotal
                    }
                />
            </div>
        </section>
    );
}

export default SalePage;