import { useState } from "react";

import "./transaction-discount-dialog.css";

type TransactionDiscountDialogProps = {
    currentPercentage?: number;
    currentAmount?: number;

    onCancel: () => void;

    onApplyPercentage: (
        value: number,
    ) => void;

    onApplyAmount: (
        value: number,
    ) => void;

    onRemove: () => void;
};

type DiscountMode =
    | "percentage"
    | "amount";

function TransactionDiscountDialog({
    currentPercentage = 0,
    currentAmount = 0,
    onCancel,
    onApplyPercentage,
    onApplyAmount,
    onRemove,
}: TransactionDiscountDialogProps) {
    const initialMode: DiscountMode =
        currentAmount > 0
            ? "amount"
            : "percentage";

    const [mode, setMode] =
        useState<DiscountMode>(
            initialMode,
        );

    const [value, setValue] =
        useState(
            initialMode === "percentage"
                ? String(
                    currentPercentage || "",
                )
                : String(
                    currentAmount || "",
                ),
        );

    const numericValue =
        Number(value);

    const isValid =
        Number.isFinite(numericValue) &&
        numericValue > 0 &&
        (
            mode !== "percentage" ||
            numericValue <= 100
        );

    const apply = () => {
        if (!isValid) {
            return;
        }

        if (mode === "percentage") {
            onApplyPercentage(
                numericValue,
            );

            return;
        }

        onApplyAmount(
            numericValue,
        );
    };

    return (
        <div
            className="transaction-discount-dialog__backdrop"
            onMouseDown={onCancel}
        >
            <section
                className="transaction-discount-dialog"
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
            >
                <header>
                    <div>
                        <span>
                            הנחת עסקה
                        </span>

                        <h2>
                            הגדרת הנחה
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onCancel}
                    >
                        ×
                    </button>
                </header>

                <div className="transaction-discount-dialog__modes">
                    <button
                        type="button"
                        className={
                            mode === "percentage"
                                ? "transaction-discount-dialog__mode transaction-discount-dialog__mode--active"
                                : "transaction-discount-dialog__mode"
                        }
                        onClick={() => {
                            setMode(
                                "percentage",
                            );

                            setValue("");
                        }}
                    >
                        אחוז %
                    </button>

                    <button
                        type="button"
                        className={
                            mode === "amount"
                                ? "transaction-discount-dialog__mode transaction-discount-dialog__mode--active"
                                : "transaction-discount-dialog__mode"
                        }
                        onClick={() => {
                            setMode("amount");
                            setValue("");
                        }}
                    >
                        סכום ₪
                    </button>
                </div>

                <label>
                    <span>
                        {mode === "percentage"
                            ? "אחוז הנחה"
                            : "סכום הנחה"}
                    </span>

                    <input
                        type="number"
                        min="0"
                        max={
                            mode === "percentage"
                                ? 100
                                : undefined
                        }
                        step="0.01"
                        inputMode="decimal"
                        autoFocus
                        value={value}
                        onChange={(event) =>
                            setValue(
                                event.target.value,
                            )
                        }
                        onKeyDown={(event) => {
                            if (
                                event.key === "Enter"
                            ) {
                                apply();
                            }

                            if (
                                event.key === "Escape"
                            ) {
                                onCancel();
                            }
                        }}
                    />
                </label>

                <footer>
                    <button
                        type="button"
                        className="transaction-discount-dialog__remove"
                        onClick={onRemove}
                    >
                        הסר הנחה
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
                            className="transaction-discount-dialog__apply"
                            disabled={!isValid}
                            onClick={apply}
                        >
                            החל
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    );
}

export default TransactionDiscountDialog;