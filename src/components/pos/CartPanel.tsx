import { useEffect, useRef } from "react";

import type { Product } from "../../types/product";

import "./cart-panel.css";

export type CartLine = {
    product: Product;
    quantity: number;
    lineDiscountAmount?: number;
    allocatedSaleDiscountAmount?: number;
};

type CartPanelProps = {
    lines: CartLine[];
    onClear: () => void;
    onIncrease: (productId: string) => void;
    onDecrease: (productId: string) => void;
    onCheckout: (total: number) => void;
};

function CartPanel({
    lines,
    onClear,
    onIncrease,
    onDecrease,
    onCheckout,
}: CartPanelProps) {
    const listRef =
        useRef<HTMLDivElement | null>(null);

    const totalQuantity = lines.reduce(
        (sum, line) => sum + line.quantity,
        0,
    );

    const subtotal = lines.reduce(
        (sum, line) =>
            sum +
            line.product.price * line.quantity,
        0,
    );

    const totalDiscount = lines.reduce(
        (sum, line) =>
            sum +
            (line.lineDiscountAmount ?? 0) +
            (line.allocatedSaleDiscountAmount ??
                0),
        0,
    );

    const total = subtotal - totalDiscount;

    useEffect(() => {
        if (
            !listRef.current ||
            lines.length === 0
        ) {
            return;
        }

        listRef.current.scrollTo({
            top: listRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [lines.length]);

    return (
        <aside
            className="lumora-cart"
            aria-label="עגלה"
        >
            <div className="lumora-cart__header">
                <div>
                    <h2>עגלה</h2>

                    <span>
                        {totalQuantity === 0
                            ? "עסקה חדשה"
                            : `${totalQuantity} פריטים`}
                    </span>
                </div>

                <button
                    type="button"
                    className="lumora-cart__clear"
                    disabled={lines.length === 0}
                    onClick={onClear}
                >
                    נקה
                </button>
            </div>

            {lines.length === 0 ? (
                <div className="lumora-cart__empty">
                    <div className="lumora-cart__empty-icon">
                        ▦
                    </div>

                    <strong>
                        העגלה עדיין ריקה
                    </strong>

                    <span>
                        סרוק ברקוד או בחר מוצר
                        מהקטלוג
                    </span>
                </div>
            ) : (
                <div
                    ref={listRef}
                    className="lumora-cart__lines"
                >
                    {lines.map((line) => {
                        const gross =
                            line.product.price *
                            line.quantity;

                        const discount =
                            (line.lineDiscountAmount ??
                                0) +
                            (line.allocatedSaleDiscountAmount ??
                                0);

                        const net = gross - discount;

                        return (
                            <article
                                key={line.product.id}
                                className="lumora-cart-line"
                            >
                                <img
                                    className="lumora-cart-line__image"
                                    src={
                                        line.product.imageUrl
                                    }
                                    alt=""
                                />

                                <div className="lumora-cart-line__main">
                                    <strong>
                                        {line.product.name}
                                    </strong>

                                    <span className="lumora-cart-line__unit-price">
                                        {line.quantity} × ₪
                                        {line.product.price.toFixed(
                                            2,
                                        )}
                                    </span>

                                    {discount > 0 && (
                                        <div className="lumora-cart-line__discount">
                                            <span>הנחה</span>

                                            <strong>
                                                ‎-₪
                                                {discount.toFixed(2)}
                                            </strong>
                                        </div>
                                    )}
                                </div>

                                <div className="lumora-cart-line__controls">
                                    <div className="lumora-cart-line__quantity">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onDecrease(
                                                    line.product.id,
                                                )
                                            }
                                        >
                                            −
                                        </button>

                                        <span>
                                            {line.quantity}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                onIncrease(
                                                    line.product.id,
                                                )
                                            }
                                        >
                                            +
                                        </button>
                                    </div>

                                    <strong className="lumora-cart-line__total">
                                        ₪{net.toFixed(2)}
                                    </strong>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <div className="lumora-cart__summary">
                <div>
                    <span>סכום ביניים</span>

                    <strong>
                        ₪{subtotal.toFixed(2)}
                    </strong>
                </div>

                {totalDiscount > 0 && (
                    <div className="lumora-cart__summary-discount">
                        <span>הנחות</span>

                        <strong>
                            ‎-₪
                            {totalDiscount.toFixed(2)}
                        </strong>
                    </div>
                )}

                <div className="lumora-cart__total">
                    <span>סה״כ לתשלום</span>

                    <strong>
                        ₪{total.toFixed(2)}
                    </strong>
                </div>
            </div>

            <button
                type="button"
                className="lumora-cart__checkout"
                disabled={lines.length === 0}
                onClick={() =>
                    onCheckout(total)
                }
            >
                <span>לתשלום</span>

                {lines.length > 0 && (
                    <strong>
                        ₪{total.toFixed(2)}
                    </strong>
                )}
            </button>
        </aside>
    );
}

export default CartPanel;