import { useState } from "react";

import "./price-override-dialog.css";

type PriceOverrideDialogProps = {
    productName: string;
    currentPrice: number;
    originalPrice: number;

    onCancel: () => void;
    onApply: (price: number) => void;
    onReset: () => void;
};

function PriceOverrideDialog({
    productName,
    currentPrice,
    originalPrice,
    onCancel,
    onApply,
    onReset,
}: PriceOverrideDialogProps) {
    const [value, setValue] =
        useState(currentPrice.toFixed(2));

    const numericValue =
        Number(value);

    const isValid =
        Number.isFinite(numericValue) &&
        numericValue >= 0;

    return (
        <div
            className="price-override-dialog__backdrop"
            onMouseDown={onCancel}
        >
            <section
                className="price-override-dialog"
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
            >
                <header className="price-override-dialog__header">
                    <div>
                        <span>שינוי מחיר</span>
                        <h2>{productName}</h2>
                    </div>

                    <button
                        type="button"
                        className="price-override-dialog__close"
                        onClick={onCancel}
                    >
                        ×
                    </button>
                </header>

                <div className="price-override-dialog__price-info">
                    <span>מחיר נוכחי</span>

                    <strong>
                        ₪{currentPrice.toFixed(2)}
                    </strong>

                    {Math.abs(
                        currentPrice -
                        originalPrice,
                    ) > 0.001 && (
                            <small>
                                מחיר מקור ₪
                                {originalPrice.toFixed(2)}
                            </small>
                        )}
                </div>

                <label className="price-override-dialog__field">
                    <span>מחיר חדש</span>

                    <div>
                        <span>₪</span>

                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            value={value}
                            autoFocus
                            onFocus={(event) =>
                                event.currentTarget.select()
                            }
                            onChange={(event) =>
                                setValue(
                                    event.target.value,
                                )
                            }
                            onKeyDown={(event) => {
                                if (
                                    event.key ===
                                    "Enter" &&
                                    isValid
                                ) {
                                    onApply(
                                        numericValue,
                                    );
                                }

                                if (
                                    event.key ===
                                    "Escape"
                                ) {
                                    onCancel();
                                }
                            }}
                        />
                    </div>
                </label>

                <footer className="price-override-dialog__footer">
                    <button
                        type="button"
                        className="price-override-dialog__reset"
                        onClick={onReset}
                    >
                        החזר למחיר המקורי
                    </button>

                    <div>
                        <button
                            type="button"
                            onClick={onCancel}
                        >
                            ביטול
                        </button>

                        <button
                            type="button"
                            className="price-override-dialog__apply"
                            disabled={!isValid}
                            onClick={() =>
                                onApply(
                                    numericValue,
                                )
                            }
                        >
                            שמור מחיר
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    );
}

export default PriceOverrideDialog;