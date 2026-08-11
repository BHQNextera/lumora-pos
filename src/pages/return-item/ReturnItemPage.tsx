import {
    useMemo,
    useState,
} from "react";

import { products } from "../../data/products";
import type { CartLine } from "../../models/sale/CartLine";
import type { Product } from "../../types/product";

import "./return-item-page.css";

type ReturnItemPageProps = {
    onBack: () => void;
    onContinue: (
        lines: CartLine[],
    ) => void;
};

function ReturnItemPage({
    onBack,
    onContinue,
}: ReturnItemPageProps) {
    const [search, setSearch] =
        useState("");

    const [
        selectedProduct,
        setSelectedProduct,
    ] =
        useState<Product | null>(
            null,
        );

    const [
        quantity,
        setQuantity,
    ] = useState(1);

    const [
        returnUnitPrice,
        setReturnUnitPrice,
    ] = useState("");

    const [
        reason,
        setReason,
    ] =
        useState(
            "ללא מסמך מקור",
        );

    const filteredProducts =
        useMemo(() => {
            const value =
                search
                    .trim()
                    .toLowerCase();

            if (!value) {
                return products.filter(
                    (product) =>
                        product.isActive,
                );
            }

            return products.filter(
                (product) =>
                    product.isActive &&
                    (
                        product.name
                            .toLowerCase()
                            .includes(value) ||
                        product.sku
                            .toLowerCase()
                            .includes(value) ||
                        product.barcode.includes(
                            value,
                        )
                    ),
            );
        }, [search]);

    const selectProduct = (
        product: Product,
    ) => {
        setSelectedProduct(
            product,
        );

        setQuantity(1);

        setReturnUnitPrice(
            product.price.toFixed(
                2,
            ),
        );
    };

    const continueToSale =
        () => {
            if (
                !selectedProduct
            ) {
                return;
            }

            const line: CartLine = {
                id:
                    crypto.randomUUID(),

                kind: "return",
                source: "catalog",

                product:
                    selectedProduct,

                quantity,

                unitPrice:
                    Number(
                        returnUnitPrice,
                    ),

                originalUnitPrice:
                    selectedProduct.price,

                lineDiscountAmount:
                    0,

                allocatedSaleDiscountAmount:
                    0,

                returnSource:
                    "without_document",

                returnReason:
                    reason.trim() ||
                    "ללא מסמך מקור",
            };

            onContinue([line]);
        };

    return (
        <section className="return-item-page">
            <header className="return-item-page__header">
                <div>
                    <p>
                        החזרה ללא מסמך
                    </p>

                    <h1>
                        בחירת פריט להחזרה
                    </h1>
                </div>

                <button
                    type="button"
                    onClick={onBack}
                >
                    חזרה
                </button>
            </header>

            <div className="return-item-page__layout">
                <section className="return-item-page__catalog">
                    <input
                        type="search"
                        placeholder="חיפוש לפי מוצר / SKU / ברקוד"
                        value={search}
                        onChange={(
                            event,
                        ) =>
                            setSearch(
                                event.target
                                    .value,
                            )
                        }
                        autoFocus
                    />

                    <div className="return-item-page__products">
                        {filteredProducts.map(
                            (product) => (
                                <button
                                    key={
                                        product.id
                                    }
                                    type="button"
                                    className={
                                        selectedProduct
                                            ?.id ===
                                            product.id
                                            ? "return-item-card return-item-card--active"
                                            : "return-item-card"
                                    }
                                    onClick={() =>
                                        selectProduct(
                                            product,
                                        )
                                    }
                                >
                                    <img
                                        src={
                                            product.imageUrl
                                        }
                                        alt=""
                                    />

                                    <div>
                                        <strong>
                                            {
                                                product.name
                                            }
                                        </strong>

                                        <span>
                                            ₪
                                            {product.price.toFixed(
                                                2,
                                            )}
                                        </span>
                                    </div>
                                </button>
                            ),
                        )}
                    </div>
                </section>

                <aside className="return-item-page__summary">
                    {!selectedProduct ? (
                        <div className="return-item-page__empty">                            בחר פריט
                        </div>
                    ) : (
                        <>
                            <div className="return-item-page__selected">
                                <strong>
                                    {
                                        selectedProduct.name
                                    }
                                </strong>

                                <span>
                                    ₪
                                    {selectedProduct.price.toFixed(
                                        2,
                                    )}{" "}
                                    ליחידה
                                </span>
                            </div>

                            <label className="return-item-page__reason">
                                <span>
                                    מחיר ליחידה לזיכוי
                                </span>

                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    inputMode="decimal"
                                    value={
                                        returnUnitPrice
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setReturnUnitPrice(
                                            event.target
                                                .value,
                                        )
                                    }
                                />
                            </label>

                            <div className="return-item-page__quantity">
                                <span>
                                    כמות להחזרה
                                </span>

                                <div>
                                    <button
                                        type="button"
                                        disabled={
                                            quantity <= 1
                                        }
                                        onClick={() =>
                                            setQuantity(
                                                (
                                                    current,
                                                ) =>
                                                    Math.max(
                                                        1,
                                                        current -                                                        1,
                                                    ),
                                            )
                                        }
                                    >
                                        −
                                    </button>

                                    <strong>
                                        {quantity}
                                    </strong>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setQuantity(
                                                (
                                                    current,
                                                ) =>
                                                    current +
                                                    1,
                                            )
                                        }
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <label className="return-item-page__reason">
                                <span>
                                    סיבת החזרה
                                </span>

                                <input
                                    type="text"
                                    value={reason}
                                    onChange={(
                                        event,
                                    ) =>
                                        setReason(
                                            event.target
                                                .value,
                                        )
                                    }
                                />
                            </label>

                            <div className="return-item-page__total">
                                <span>
                                    סה״כ לזיכוי
                                </span>

                                <strong>
                                    ‎-₪
                                    {(
                                        (
                                            Number(
                                                returnUnitPrice,
                                            ) || 0
                                        ) *
                                        quantity
                                    ).toFixed(
                                        2,
                                    )}
                                </strong>
                            </div>

                            <button
                                type="button"
                                className="return-item-page__continue"
                                onClick={
                                    continueToSale
                                }
                            >
                                המשך לעגלה
                            </button>
                        </>
                    )}
                </aside>
            </div>
        </section>
    );
}

export default ReturnItemPage;