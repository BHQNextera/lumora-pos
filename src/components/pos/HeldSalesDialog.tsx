import { useState } from "react";

import type {
    HeldSale,
} from "../../models/held-sale/HeldSale";

import "./held-sales-dialog.css";

type HeldSalesDialogProps = {
    heldSales: HeldSale[];
    onClose: () => void;
    onResume: (
        heldSale: HeldSale,
    ) => void;
    onDelete: (
        id: string,
    ) => void;
};

function HeldSalesDialog({
    heldSales,
    onClose,
    onResume,
    onDelete,
}: HeldSalesDialogProps) {
    const [
        pendingDeleteSale,
        setPendingDeleteSale,
    ] =
        useState<HeldSale | null>(null);

    return (
        <div
            className="held-sales-dialog__backdrop"
            role="presentation"
            onMouseDown={onClose}
        >
            <section
                className="held-sales-dialog"
                dir="rtl"
                role="dialog"
                aria-modal="true"
                aria-label="עסקאות מושהות"
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
            >
                <header className="held-sales-dialog__header">
                    <div>
                        <strong>
                            עסקאות מושהות
                        </strong>

                        <span>
                            {heldSales.length}
                            {" "}
                            עסקאות שמורות
                        </span>
                    </div>

                    <button
                        type="button"
                        aria-label="סגור"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <div className="held-sales-dialog__list">
                    {heldSales.length === 0 && (
                        <div className="held-sales-dialog__empty">
                            אין עסקאות מושהות
                        </div>
                    )}

                    {heldSales.map(
                        (heldSale) => {
                            const units =
                                heldSale.cartLines.reduce(
                                    (
                                        sum,
                                        line,
                                    ) =>
                                        sum +
                                        line.quantity,
                                    0,
                                );

                            const productNames =
                                heldSale.cartLines
                                    .slice(0, 3)
                                    .map(
                                        (line) =>
                                            line.product.name,
                                    )
                                    .join(" · ");

                            return (
                                <article
                                    key={heldSale.id}
                                    className="held-sales-dialog__item"
                                >
                                    <div className="held-sales-dialog__item-main">
                                        <div className="held-sales-dialog__item-title">
                                            <strong>
                                                {heldSale.customer.name}
                                            </strong>

                                            <span>
                                                {new Date(
                                                    heldSale.heldAt,
                                                ).toLocaleString(
                                                    "he-IL",
                                                    {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                    },
                                                )}
                                            </span>
                                        </div>

                                        <span className="held-sales-dialog__products">
                                            {productNames}
                                            {heldSale.cartLines.length > 3
                                                ? "…"
                                                : ""}
                                        </span>

                                        <div className="held-sales-dialog__meta">
                                            <span>
                                                {units}
                                                {" "}
                                                יחידות
                                            </span>

                                            <strong>
                                                ₪
                                                {heldSale.total.toFixed(
                                                    2,
                                                )}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="held-sales-dialog__actions">
                                        <button
                                            type="button"
                                            className="held-sales-dialog__resume"
                                            onClick={() =>
                                                onResume(
                                                    heldSale,
                                                )
                                            }
                                        >
                                            שחזר
                                        </button>

                                        <button
                                            type="button"
                                            className="held-sales-dialog__delete"
                                            onClick={() => setPendingDeleteSale(heldSale)}
                                        >
                                            מחק
                                        </button>
                                    </div>
                                </article>
                            );
                        },
                    )}
                </div>
            </section>

            {pendingDeleteSale && (
                <div
                    className="held-sales-dialog__confirm-backdrop"
                    role="presentation"
                    onMouseDown={(event) => {
                        event.stopPropagation();
                        setPendingDeleteSale(null);
                    }}
                >
                    <section
                        className="held-sales-dialog__confirm"
                        dir="rtl"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="held-sale-delete-title"
                        aria-describedby="held-sale-delete-description"
                        onMouseDown={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <div className="held-sales-dialog__confirm-header">
                            <div>
                                <strong id="held-sale-delete-title">
                                    מחיקת עסקה מושהית
                                </strong>

                                <span>
                                    {pendingDeleteSale.customer.name}
                                </span>
                            </div>

                            <button
                                type="button"
                                aria-label="סגור"
                                onClick={() =>
                                    setPendingDeleteSale(null)
                                }
                            >
                                ×
                            </button>
                        </div>

                        <p id="held-sale-delete-description">
                            למחוק את העסקה המושהית?
                        </p>

                        <small>
                            הפעולה אינה ניתנת לביטול.
                        </small>

                        <div className="held-sales-dialog__confirm-actions">
                            <button
                                type="button"
                                onClick={() =>
                                    setPendingDeleteSale(null)
                                }
                            >
                                ביטול
                            </button>

                            <button
                                type="button"
                                className="held-sales-dialog__confirm-delete"
                                onClick={() => {
                                    const id =
                                        pendingDeleteSale.id;

                                    setPendingDeleteSale(null);
                                    onDelete(id);
                                }}
                            >
                                מחק
                            </button>
                        </div>
                    </section>
                </div>
            )}

        </div>
    );
}

export default HeldSalesDialog;
