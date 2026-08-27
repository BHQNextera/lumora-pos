import {
    useMemo,
    useState,
} from "react";
import {
    formatMoney,
} from "../../../utils/MoneyFormatter";

type CashMethodProps = {
    remainingAmount: number;
    onAddPayment: (payment: {
        amount: number;
        tenderedAmount: number;
        changeAmount: number;
    }) => void;
};

const banknoteValues = [
    200,
    100,
    50,
    20,
];

const coinValues = [
    10,
    5,
    2,
    1,
    0.5,
    0.1,
];

function roundCurrency(
    value: number,
) {
    return (
        Math.round(
            (value + Number.EPSILON) *
                100,
        ) / 100
    );
}

function formatDenomination(
    value: number,
) {
    return Number.isInteger(value)
        ? `₪${value}`
        : `₪${value.toFixed(1)}`;
}

function CashMethod({
    remainingAmount,
    onAddPayment,
}: CashMethodProps) {
    const [
        cashReceived,
        setCashReceived,
    ] = useState<number | null>(null);

    /*
     * Empty input means "exact cash payment".
     * As soon as the cashier enters/taps an amount,
     * the entered tender drives partial/change logic.
     */
    const effectiveCashReceived =
        cashReceived ??
        remainingAmount;

    const calculation = useMemo(() => {
        const paymentAmount =
            Math.min(
                effectiveCashReceived,
                remainingAmount,
            );

        const changeAmount =
            Math.max(
                0,
                effectiveCashReceived -
                    remainingAmount,
            );

        return {
            paymentAmount:
                roundCurrency(
                    paymentAmount,
                ),

            changeAmount:
                roundCurrency(
                    changeAmount,
                ),

            isPartial:
                effectiveCashReceived > 0 &&
                effectiveCashReceived <
                    remainingAmount,

            isExact:
                remainingAmount > 0 &&
                Math.abs(
                    effectiveCashReceived -
                        remainingAmount,
                ) < 0.001,

            isOver:
                effectiveCashReceived >
                remainingAmount,
        };
    }, [
        effectiveCashReceived,
        remainingAmount,
    ]);

    const canAddPayment =
        remainingAmount > 0 &&
        effectiveCashReceived > 0;

    const addDenomination = (
        value: number,
    ) => {
        setCashReceived(
            (current) =>
                roundCurrency(
                    (current ?? 0) +
                        value,
                ),
        );
    };

    const clearCashReceived = () => {
        setCashReceived(null);
    };

    const getButtonLabel = () => {
        if (cashReceived === null) {
            return `תשלום במזומן · ${formatMoney(
                remainingAmount,
            )}`;
        }

        if (calculation.isPartial) {
            return `הוסף תשלום · ${formatMoney(
                calculation.paymentAmount,
            )}`;
        }

        if (calculation.isExact) {
            return `תשלום במזומן · ${formatMoney(
                remainingAmount,
            )}`;
        }

        if (calculation.isOver) {
            return `אישור תשלום · עודף ${formatMoney(
                calculation.changeAmount,
            )}`;
        }

        return "תשלום במזומן";
    };

    const submitPayment = () => {
        if (!canAddPayment) {
            return;
        }

        onAddPayment({
            amount:
                calculation.paymentAmount,

            tenderedAmount:
                roundCurrency(
                    effectiveCashReceived,
                ),

            changeAmount:
                calculation.isOver
                    ? calculation.changeAmount
                    : 0,
        });

        setCashReceived(null);
    };

    return (
        <div className="cash-payment cash-payment-v2 cash-payment-v2--compact">
            <section
                className="cash-payment-v2__group"
                aria-label="שטרות"
            >
                <div className="cash-payment-v2__group-label">
                    שטרות
                </div>

                <div className="cash-payment-v2__banknotes">
                    {banknoteValues.map(
                        (value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() =>
                                    addDenomination(
                                        value,
                                    )
                                }
                                className="cash-payment-v2__denomination cash-payment-v2__denomination--note"
                            >
                                <span>
                                    {formatDenomination(
                                        value,
                                    )}
                                </span>
                            </button>
                        ),
                    )}
                </div>
            </section>

            <section
                className="cash-payment-v2__group"
                aria-label="מטבעות"
            >
                <div className="cash-payment-v2__group-label">
                    מטבעות
                </div>

                <div className="cash-payment-v2__coins">
                    {coinValues.map(
                        (value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() =>
                                    addDenomination(
                                        value,
                                    )
                                }
                                className="cash-payment-v2__denomination cash-payment-v2__denomination--coin"
                            >
                                {formatDenomination(
                                    value,
                                )}
                            </button>
                        ),
                    )}
                </div>
            </section>

            <label className="cash-payment-v2__custom">
                <span>
                    סכום שהתקבל
                </span>

                <div className="cash-payment-v2__input-shell">
                    <span aria-hidden="true">
                        ₪
                    </span>

                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        value={
                            cashReceived ===
                            null
                                ? ""
                                : cashReceived
                        }
                        placeholder={
                            remainingAmount.toFixed(
                                2,
                            )
                        }
                        onChange={(
                            event,
                        ) => {
                            const rawValue =
                                event.target
                                    .value;

                            if (
                                rawValue ===
                                ""
                            ) {
                                setCashReceived(
                                    null,
                                );
                                return;
                            }

                            const value =
                                Number(
                                    rawValue,
                                );

                            setCashReceived(
                                Number.isFinite(
                                    value,
                                )
                                    ? Math.max(
                                        0,
                                        roundCurrency(
                                            value,
                                        ),
                                    )
                                    : null,
                            );
                        }}
                    />

                    {cashReceived !==
                        null && (
                        <button
                            type="button"
                            onClick={
                                clearCashReceived
                            }
                            aria-label="נקה סכום שהתקבל"
                        >
                            נקה
                        </button>
                    )}
                </div>
            </label>

            {cashReceived !== null && (
                <div className="cash-payment-v2__result">
                    <div>
                        <span>
                            התקבל
                        </span>

                        <strong className="lumora-money-value">
                            {formatMoney(
                                effectiveCashReceived,
                            )}
                        </strong>
                    </div>

                    {calculation.isPartial && (
                        <div>
                            <span>
                                יישאר לתשלום
                            </span>

                            <strong className="lumora-money-value">
                                {formatMoney(
                                    remainingAmount -
                                        calculation.paymentAmount,
                                )}
                            </strong>
                        </div>
                    )}

                    {calculation.isOver && (
                        <div className="cash-payment-v2__change">
                            <span>
                                עודף
                            </span>

                            <strong className="lumora-money-value">
                                {formatMoney(
                                    calculation.changeAmount,
                                )}
                            </strong>
                        </div>
                    )}
                </div>
            )}

            <button
                type="button"
                className="payment-page__confirm cash-payment-v2__confirm"
                disabled={
                    !canAddPayment
                }
                onClick={
                    submitPayment
                }
            >
                {getButtonLabel()}
            </button>
        </div>
    );
}

export default CashMethod;
