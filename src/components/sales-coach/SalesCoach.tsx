import {
    useMemo,
    useState,
} from "react";

import {
    usePricing,
} from "../../context/usePricing";
import { useCatalog } from "../../context/useCatalog";
import {
    getSalesCoachSuggestion,
} from "../../models/sales-coach/SalesCoachEngine";

import "./sales-coach.css";

function SalesCoach() {
    const { products } = useCatalog();
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
            [cartLines, products],
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
            className="sales-coach-v2"
        >
            <div className="sales-coach-v2__header">
                <div className="sales-coach-v2__identity">
                    <span
                        className="sales-coach-v2__mark"
                        aria-hidden="true"
                    >
                        ✦
                    </span>

                    <span className="sales-coach-v2__label">
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
                    className="sales-coach-v2__close"
                >
                    ×
                </button>
            </div>

            <div className="sales-coach-v2__title">
                {suggestion.title}
            </div>

            <div className="sales-coach-v2__message">
                {suggestion.message}
            </div>

            <div className="sales-coach-v2__action-row">
                <div className="sales-coach-v2__product">
                    <div className="sales-coach-v2__product-copy">
                        <div className="sales-coach-v2__eyebrow">
                            מומלץ להוסיף
                        </div>

                        <div className="sales-coach-v2__product-name">
                            {
                                suggestion.product
                                    .name
                            }
                        </div>
                    </div>

                    <div className="sales-coach-v2__price">
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
                    className="sales-coach-v2__add"
                >
                    <span aria-hidden="true">
                        +
                    </span>
                    הוסף
                </button>
            </div>
        </aside>
    );
}

export default SalesCoach;