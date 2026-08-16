import {
    useEffect,
    useState,
} from "react";

import "./calculator-sale-entry.css";

type CalculatorSaleEntryProps = {
    onAddAmount: (
        amount: number,
        description: string,
    ) => void;
};

const keypadRows = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
];

function CalculatorSaleEntry({
    onAddAmount,
}: CalculatorSaleEntryProps) {
    const [
        amountText,
        setAmountText,
    ] =
        useState("0");

    const [
        description,
        setDescription,
    ] =
        useState("");

    const amount =
        Number(
            amountText,
        );

    const append = (
        value: string,
    ) => {
        setAmountText(
            (current) => {
                if (
                    value === "." &&
                    current.includes(".")
                ) {
                    return current;
                }

                if (
                    current === "0" &&
                    value !== "."
                ) {
                    return value === "00"
                        ? "0"
                        : value;
                }

                return current + value;
            },
        );
    };

    const backspace = () => {
        setAmountText(
            (current) =>
                current.length <= 1
                    ? "0"
                    : current.slice(0, -1),
        );
    };

    const clear = () => {
        setAmountText("0");
    };

    const addToSale = () => {
        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            return;
        }

        onAddAmount(
            amount,
            description.trim(),
        );

        setAmountText("0");
        setDescription("");
    };

    useEffect(() => {
        const handleKeyDown = (
            event: KeyboardEvent,
        ) => {
            const target =
                event.target as HTMLElement | null;

            const isDescriptionInput =
                target?.tagName === "INPUT";

            if (
                event.key === "Enter"
            ) {
                event.preventDefault();
                addToSale();
                return;
            }

            if (isDescriptionInput) {
                return;
            }

            if (
                /^[0-9]$/.test(
                    event.key,
                )
            ) {
                event.preventDefault();
                append(
                    event.key,
                );
                return;
            }

            if (
                event.key === "." ||
                event.key === ","
            ) {
                event.preventDefault();
                append(".");
                return;
            }

            if (
                event.key === "Backspace"
            ) {
                event.preventDefault();
                backspace();
                return;
            }

            if (
                event.key === "Delete" ||
                event.key === "Escape"
            ) {
                event.preventDefault();
                clear();
            }
        };

        window.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            window.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    });

    return (
        <section
            className="sale-page__catalog calculator-sale-entry"
            aria-label="קופה במצב מחשבון"
        >
            <div className="calculator-sale-entry__header">
                <div>
                    <p className="calculator-sale-entry__eyebrow">
                        מצב מחשבון
                    </p>

                    <h2>
                        הזנת סכום
                    </h2>
                </div>
            </div>

            <div
                className="calculator-sale-entry__amount"
                dir="ltr"
                aria-live="polite"
            >
                <span>
                    ₪
                </span>

                <strong>
                    {amountText}
                </strong>
            </div>

            <label className="calculator-sale-entry__description">
                <span>
                    תיאור
                </span>

                <input
                    type="text"
                    value={description}
                    onChange={(event) =>
                        setDescription(
                            event.target.value,
                        )
                    }
                    placeholder="פריט כללי"
                />
            </label>

            <div className="calculator-sale-entry__keypad" dir="ltr">
                {keypadRows.flat().map(
                    (key) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() =>
                                append(key)
                            }
                        >
                            {key}
                        </button>
                    ),
                )}

                <button
                    type="button"
                    className="calculator-sale-entry__utility"
                    onClick={backspace}
                >
                    מחיקה
                </button>

                <button
                    type="button"
                    className="calculator-sale-entry__utility"
                    onClick={clear}
                >
                    נקה
                </button>

                <button
                    type="button"
                    className="calculator-sale-entry__enter"
                    disabled={
                        !Number.isFinite(amount) ||
                        amount <= 0
                    }
                    onClick={addToSale}
                >
                    ENTER
                </button>
            </div>

            <button
                type="button"
                className="calculator-sale-entry__add"
                disabled={
                    !Number.isFinite(amount) ||
                    amount <= 0
                }
                onClick={addToSale}
            >
                הוסף לעסקה
            </button>
        </section>
    );
}

export default CalculatorSaleEntry;
