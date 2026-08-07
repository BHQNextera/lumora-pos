import { useState } from "react";

import "./line-discount-dialog.css";

type DiscountMode =
    | "percentage"
    | "amount";

type LineDiscountDialogProps = {
    productName: string;
    currentDiscount?: number;

    onCancel: () => void;

    onApplyPercentage: (
        value: number,
    ) => void;

    onApplyAmount: (
        value: number,
    ) => void;

    onRemove: () => void;
};

function LineDiscountDialog({
    productName,
    onCancel,
    onApplyPercentage,
    onApplyAmount,
    onRemove,
}: LineDiscountDialogProps) {
    const [mode, setMode] =
        useState<DiscountMode>(
            "percentage",
        );

    const [value, setValue] =
        useState("");

    const numericValue =
        Number(value);

    const isValid =
        Number.isFinite(
            numericValue,
        ) &&
        numericValue > 0 &&
        (
            mode !==
            "percentage" ||
            numericValue <= 100
        );

    const apply = () => {
        if (!isValid) {
            return;
        }

        if (
            mode === "percentage"
        ) {
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
            className="line-discount-dialog__backdrop"
            onMouseDown={onCancel}
        >
            <section
                className="line-discount-dialog"
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
            >
                <header>
                    <div>
                        <span>הנחת פריט</span>
                        <h2>{productName}</h2>
                    </div>

                    <button
                        type="button"
                        onClick={onCancel}
                    >
                        ×
                    </button>
                </header>

                <div className="line-discount-dialog__modes">
                    <button
                        type="button"
                        className={
                            mode ===
                                "percentage"
                                ? "line-discount-dialog__mode line-discount-dialog__mode--active"
                                : "line-discount-dialog__mode"
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
                                ? "line-discount-dialog__mode line-discount-dialog__mode--active"
                                : "line-discount-dialog__mode"
                        }
                        onClick={() => {
                            setMode("amount");
                            setValue("");
                        }}
                    >
                        סכום ₪
                    </button>
                </div>

                <input
                    type="number"
                    min="0"
                    max={
                        mode ===
                            "percentage"
                            ? 100
                            : undefined
                    }
                    step="0.01"
                    value={value}
                    autoFocus
                    onChange={(event) =>
                        setValue(
                            event.target.value,
                        )
                    }
                    onKeyDown={(event) => {
                        if (
                            event.key ===
                            "Enter"
                        ) {
                            apply();
                        }

                        if (
                            event.key ===
                            "Escape"
                        ) {
                            onCancel();
                        }
                    }}
                />

                <footer>
                    <button
                        type="button"
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
                            className="line-discount-dialog__apply"
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

export default LineDiscountDialog;