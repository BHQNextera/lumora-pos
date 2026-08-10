import {
    useMemo,
    useState,
} from "react";

import {
    usePricing,
} from "../../context/usePricing";
import {
    products,
} from "../../data/products";
import {
    getSalesCoachSuggestion,
} from "../../models/sales-coach/SalesCoachEngine";

function SalesCoach() {
    const {
        cartLines,
        updateCartLines,
    } = usePricing();

    const [
        dismissedSuggestionId,
        setDismissedSuggestionId,
    ] = useState<string | null>(null);

    const suggestion =
        useMemo(
            () =>
                getSalesCoachSuggestion(
                    cartLines,
                    products,
                ),
            [cartLines],
        );

    const isDismissed =
        suggestion?.id ===
        dismissedSuggestionId;

    if (
        !suggestion ||
        isDismissed
    ) {
        return null;
    }

    const addSuggestedProduct = () => {
        updateCartLines((current) => {
            const existing =
                current.find(
                    (line) =>
                        line.kind === "sale" &&
                        line.source === "catalog" &&
                        line.product.id ===
                        suggestion.product.id &&
                        !line.descriptionOverride &&
                        line.originalUnitPrice ===
                        undefined,
                );

            if (existing) {
                return current.map(
                    (line) =>
                        line.id === existing.id
                            ? {
                                ...line,
                                quantity:
                                    line.quantity +
                                    1,
                            }
                            : line,
                );
            }

            return [
                ...current,
                {
                    id:
                        crypto.randomUUID(),

                    kind: "sale",

                    source: "catalog",

                    product:
                        suggestion.product,

                    quantity: 1,

                    unitPrice:
                        suggestion.product.price,

                    lineDiscountAmount: 0,

                    allocatedSaleDiscountAmount:
                        0,
                },
            ];
        });

        setDismissedSuggestionId(
            suggestion.id,
        );
    };

    return (
        <aside
            dir="rtl"
            aria-live="polite"
            style={{
                position: "fixed",
                right: "22px",
                bottom: "22px",
                zIndex: 4000,

                width:
                    "min(380px, calc(100vw - 44px))",

                padding: "13px",

                border:
                    "1px solid #d8e3df",
                borderRadius: "16px",

                background:
                    "rgba(250,252,251,.98)",

                color: "#1f2933",

                boxShadow:
                    "0 14px 36px rgba(30,41,59,.14)",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                        "space-between",
                    gap: "12px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "7px",
                    }}
                >
                    <span
                        style={{
                            display: "inline-flex",
                            alignItems: "center",

                            padding: "4px 8px",

                            border:
                                "1px solid #d5ebe1",
                            borderRadius: "999px",

                            background:
                                "#eef8f3",

                            fontSize: "10px",
                            fontWeight: 750,

                            letterSpacing:
                                ".08em",

                            color: "#4f6f62",
                        }}
                    >
                        LUMORA COACH
                    </span>
                </div>

                <button
                    type="button"
                    aria-label="סגור הצעה"
                    onClick={() =>
                        setDismissedSuggestionId(
                            suggestion.id,
                        )
                    }
                    style={{
                        width: "27px",
                        height: "27px",

                        border:
                            "1px solid #dde3e1",
                        borderRadius: "8px",

                        background:
                            "#ffffff",

                        color: "#78827f",

                        cursor: "pointer",

                        fontSize: "17px",

                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                            "center",
                    }}
                >
                    ×
                </button>
            </div>

            <div
                style={{
                    marginTop: "8px",

                    fontSize: "14px",
                    fontWeight: 750,

                    color: "#17201d",
                }}
            >
                {suggestion.title}
            </div>

            <div
                style={{
                    marginTop: "2px",

                    fontSize: "11px",
                    lineHeight: 1.45,

                    color: "#68736f",
                }}
            >
                {suggestion.message}
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "9px",

                    marginTop: "11px",
                }}
            >
                <div
                    style={{
                        flex: 1,
                        minWidth: 0,

                        height: "45px",

                        padding:
                            "7px 11px",

                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                            "space-between",

                        gap: "12px",

                        border:
                            "1px solid #e0e7e4",
                        borderRadius: "10px",

                        background:
                            "#f4f7f6",
                    }}
                >
                    <div
                        style={{
                            minWidth: 0,
                        }}
                    >
                        <div
                            style={{
                                fontSize: "9px",
                                color: "#89938f",
                            }}
                        >
                            מומלץ להוסיף
                        </div>

                        <div
                            style={{
                                marginTop: "1px",

                                fontSize: "12px",
                                fontWeight: 700,

                                color: "#202a27",

                                overflow: "hidden",
                                textOverflow:
                                    "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {
                                suggestion.product
                                    .name
                            }
                        </div>
                    </div>

                    <div
                        style={{
                            flexShrink: 0,

                            fontSize: "15px",
                            fontWeight: 750,

                            color: "#17201d",

                            fontVariantNumeric:
                                "tabular-nums",
                        }}
                    >
                        ₪
                        {suggestion.product.price.toFixed(
                            2,
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={
                        addSuggestedProduct
                    }
                    style={{
                        flexShrink: 0,

                        height: "45px",

                        padding:
                            "0 18px",

                        border: 0,
                        borderRadius: "10px",

                        background:
                            "#2db978",

                        color: "#ffffff",

                        cursor: "pointer",

                        fontSize: "11px",
                        fontWeight: 750,

                        whiteSpace: "nowrap",

                        boxShadow:
                            "0 5px 12px rgba(45,185,120,.18)",
                    }}
                >
                    + הוסף
                </button>
            </div>
        </aside>
    );
}

export default SalesCoach;