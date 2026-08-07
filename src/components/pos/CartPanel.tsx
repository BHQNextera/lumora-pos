import {
    useEffect,
    useRef,
    useState,
} from "react";

import { posCapabilities } from "../../config/posCapabilities";
import type {
    PricedCartLine,
    PricingResult,
} from "../../models/pricing/PricingEngine";

import "./cart-panel.css";

type CartPanelProps = {
    lines: PricedCartLine[];
    pricing: PricingResult;

    selectedLineId?: string;

    onClear: () => void;
    onIncrease: (lineId: string) => void;
    onDecrease: (lineId: string) => void;
    onSelectLine: (lineId: string) => void;

    onEditDescription: (
        lineId: string,
        description: string | undefined,
    ) => void;

    onCheckout: (total: number) => void;
};

function CartPanel({
    lines,
    pricing,
    selectedLineId,
    onClear,
    onIncrease,
    onDecrease,
    onSelectLine,
    onEditDescription,
    onCheckout,
}: CartPanelProps) {
    const listRef =
        useRef<HTMLDivElement | null>(null);

    const [editingLine, setEditingLine] =
        useState<PricedCartLine | null>(null);

    const [descriptionValue, setDescriptionValue] =
        useState("");

    const totalQuantity = lines.reduce(
        (sum, line) => sum + line.quantity,
        0,
    );

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

    const openDescriptionEditor = (
        line: PricedCartLine,
    ) => {
        if (
            !posCapabilities.allowDescriptionOverride ||
            line.kind !== "sale"
        ) {
            return;
        }

        setEditingLine(line);

        setDescriptionValue(
            line.descriptionOverride ?? "",
        );
    };

    const closeDescriptionEditor = () => {
        setEditingLine(null);
        setDescriptionValue("");
    };

    const saveDescription = () => {
        if (!editingLine) {
            return;
        }

        const value =
            descriptionValue.trim();

        onEditDescription(
            editingLine.id,
            value || undefined,
        );

        closeDescriptionEditor();
    };

    return (
        <>
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
                                : `${totalQuantity} יחידות`}
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
                            סרוק ברקוד או בחר מוצר מהקטלוג
                        </span>
                    </div>
                ) : (
                    <div
                        ref={listRef}
                        className="lumora-cart__lines"
                    >
                        {lines.map((line) => {
                            const lineDiscount =
                                line.calculatedLineDiscountAmount;

                            const transactionDiscount =
                                line.calculatedTransactionDiscountAmount;

                            const totalLineDiscount =
                                lineDiscount +
                                transactionDiscount;

                            const priceOverridden =
                                line.originalUnitPrice !== undefined &&
                                Math.abs(
                                    line.originalUnitPrice -
                                    line.unitPrice,
                                ) > 0.001;

                            const selected =
                                selectedLineId === line.id;

                            return (
                                <article
                                    key={line.id}
                                    onClick={() =>
                                        onSelectLine(line.id)
                                    }
                                    className={`lumora-cart-line ${line.kind === "return"
                                            ? "lumora-cart-line--return"
                                            : ""
                                        } ${selected
                                            ? "lumora-cart-line--selected"
                                            : ""
                                        }`}
                                >
                                    <img
                                        className="lumora-cart-line__image"
                                        src={line.product.imageUrl}
                                        alt=""
                                    />

                                    <div className="lumora-cart-line__main">
                                        <strong
                                            title={
                                                line.kind === "sale" &&
                                                    posCapabilities.allowDescriptionOverride
                                                    ? "לחיצה כפולה לשינוי תיאור בעסקה זו"
                                                    : undefined
                                            }
                                            onDoubleClick={(event) => {
                                                event.stopPropagation();

                                                openDescriptionEditor(
                                                    line,
                                                );
                                            }}
                                            style={{
                                                cursor:
                                                    line.kind === "sale" &&
                                                        posCapabilities.allowDescriptionOverride
                                                        ? "text"
                                                        : "default",
                                            }}
                                        >
                                            {line.descriptionOverride ??
                                                line.product.name}
                                        </strong>

                                        {line.descriptionOverride && (
                                            <span
                                                style={{
                                                    color: "#8a8f97",
                                                    fontSize: "8px",
                                                    marginTop: "2px",
                                                }}
                                            >
                                                מוצר מקור:{" "}
                                                {line.product.name}
                                            </span>
                                        )}

                                        <span className="lumora-cart-line__unit-price">
                                            {line.kind === "return"
                                                ? "החזרה · "
                                                : ""}

                                            {line.quantity} × ₪
                                            {line.unitPrice.toFixed(2)}
                                        </span>

                                        {priceOverridden && (
                                            <span
                                                style={{
                                                    color: "#777c84",
                                                    fontSize: "8px",
                                                    marginTop: "2px",
                                                }}
                                            >
                                                מחיר מקור: ₪
                                                {line.originalUnitPrice?.toFixed(
                                                    2,
                                                )}
                                            </span>
                                        )}

                                        {line.origin && (
                                            <span className="lumora-cart-line__origin">
                                                מקור:{" "}
                                                {line.origin.saleNumber}
                                            </span>
                                        )}

                                        {totalLineDiscount > 0 && (
                                            <div className="lumora-cart-line__discount">
                                                <span>
                                                    הנחה
                                                </span>

                                                <strong>
                                                    ‎-₪
                                                    {totalLineDiscount.toFixed(
                                                        2,
                                                    )}
                                                </strong>
                                            </div>
                                        )}
                                    </div>

                                    <div className="lumora-cart-line__controls">
                                        <div className="lumora-cart-line__quantity">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();

                                                    onDecrease(
                                                        line.id,
                                                    );
                                                }}
                                            >
                                                −
                                            </button>

                                            <span>
                                                {line.quantity}
                                            </span>

                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();

                                                    onIncrease(
                                                        line.id,
                                                    );
                                                }}
                                            >
                                                +
                                            </button>
                                        </div>

                                        <strong
                                            className={`lumora-cart-line__total ${line.calculatedNetAmount < 0
                                                    ? "lumora-cart-line__total--return"
                                                    : ""
                                                }`}
                                        >
                                            {line.calculatedNetAmount < 0
                                                ? "‎-"
                                                : ""}
                                            ₪
                                            {Math.abs(
                                                line.calculatedNetAmount,
                                            ).toFixed(2)}
                                        </strong>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}

                <div className="lumora-cart__summary">
                    <div>
                        <span>
                            כמות פריטים
                        </span>

                        <strong>
                            {totalQuantity}
                        </strong>
                    </div>

                    <div>
                        <span>
                            נטו פריטים
                        </span>

                        <strong>
                            {pricing.subtotal < 0
                                ? "‎-"
                                : ""}
                            ₪
                            {Math.abs(
                                pricing.subtotal,
                            ).toFixed(2)}
                        </strong>
                    </div>

                    {pricing.lineDiscountTotal > 0 && (
                        <div className="lumora-cart__summary-discount">
                            <span>
                                הנחות פריט
                            </span>

                            <strong>
                                ‎-₪
                                {pricing.lineDiscountTotal.toFixed(
                                    2,
                                )}
                            </strong>
                        </div>
                    )}

                    {pricing.transactionDiscountTotal > 0 && (
                        <div className="lumora-cart__summary-discount">
                            <span>
                                הנחת עסקה
                            </span>

                            <strong>
                                ‎-₪
                                {pricing.transactionDiscountTotal.toFixed(
                                    2,
                                )}
                            </strong>
                        </div>
                    )}

                    <div className="lumora-cart__total">
                        <span>
                            {pricing.total < 0
                                ? "סה״כ לזיכוי"
                                : pricing.total === 0
                                    ? "יתרה"
                                    : "סה״כ לתשלום"}
                        </span>

                        <strong>
                            {pricing.total < 0
                                ? "‎-"
                                : ""}
                            ₪
                            {Math.abs(
                                pricing.total,
                            ).toFixed(2)}
                        </strong>
                    </div>
                </div>

                <button
                    type="button"
                    className="lumora-cart__checkout"
                    disabled={lines.length === 0}
                    onClick={() =>
                        onCheckout(
                            pricing.total,
                        )
                    }
                >
                    <span>
                        {pricing.total < 0
                            ? "להחזר"
                            : pricing.total === 0
                                ? "סיום עסקה"
                                : "לתשלום"}
                    </span>

                    {lines.length > 0 && (
                        <strong>
                            {pricing.total < 0
                                ? "‎-"
                                : ""}
                            ₪
                            {Math.abs(
                                pricing.total,
                            ).toFixed(2)}
                        </strong>
                    )}
                </button>
            </aside>

            {editingLine && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 1000,
                        display: "grid",
                        placeItems: "center",
                        background:
                            "rgb(0 0 0 / 28%)",
                        direction: "rtl",
                    }}
                    onMouseDown={
                        closeDescriptionEditor
                    }
                >
                    <div
                        style={{
                            width:
                                "min(420px, calc(100vw - 40px))",
                            padding: "18px",
                            border:
                                "1px solid #d8dadd",
                            borderRadius: "14px",
                            background: "#fff",
                            boxShadow:
                                "0 18px 50px rgb(0 0 0 / 16%)",
                        }}
                        onMouseDown={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <span>
                            מוצר מקור
                        </span>

                        <strong
                            style={{
                                display: "block",
                                marginTop: "4px",
                            }}
                        >
                            {editingLine.product.name}
                        </strong>

                        <input
                            type="text"
                            value={descriptionValue}
                            autoFocus
                            onChange={(event) =>
                                setDescriptionValue(
                                    event.target.value,
                                )
                            }
                            onKeyDown={(event) => {
                                if (
                                    event.key === "Enter"
                                ) {
                                    saveDescription();
                                }

                                if (
                                    event.key === "Escape"
                                ) {
                                    closeDescriptionEditor();
                                }
                            }}
                            style={{
                                width: "100%",
                                minHeight: "42px",
                                marginTop: "14px",
                                padding: "0 11px",
                                border:
                                    "1px solid #d8dadd",
                                borderRadius: "9px",
                                boxSizing: "border-box",
                            }}
                        />

                        <div
                            style={{
                                display: "flex",
                                justifyContent:
                                    "flex-end",
                                gap: "8px",
                                marginTop: "16px",
                            }}
                        >
                            <button
                                type="button"
                                onClick={
                                    closeDescriptionEditor
                                }
                            >
                                ביטול
                            </button>

                            <button
                                type="button"
                                onClick={
                                    saveDescription
                                }
                            >
                                שמור
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default CartPanel;