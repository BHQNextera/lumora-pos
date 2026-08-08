import {
    useState,
} from "react";

import {
    validateMonetaryValueForPayment,
} from "../../../models/monetary-value/MonetaryValueService";

type GiftCardMethodProps = {
    remainingAmount: number;

    onRedeem: (
        number: string,
        amount: number,
    ) => void;
};

function GiftCardMethod({
    remainingAmount,
    onRedeem,
}: GiftCardMethodProps) {
    const [
        number,
        setNumber,
    ] =
        useState("");

    const [
        balance,
        setBalance,
    ] =
        useState<number | null>(
            null,
        );

    const [
        error,
        setError,
    ] =
        useState("");

    const normalizedNumber =
        number.trim();

    const checkGiftCard = () => {
        setError("");
        setBalance(null);

        if (!normalizedNumber) {
            setError(
                "יש להזין מספר Gift Card",
            );

            return;
        }

        const validation =
            validateMonetaryValueForPayment(
                normalizedNumber,
            );

        if (!validation.valid) {
            setError(
                "ה־Gift Card אינו זמין למימוש",
            );

            return;
        }

        if (
            validation.value.type !==
            "gift_card"
        ) {
            setError(
                "המספר שהוזן אינו Gift Card",
            );

            return;
        }

        setBalance(
            validation.value
                .remainingAmount,
        );
    };

    const redeem = () => {
        if (
            balance === null ||
            balance <= 0 ||
            remainingAmount <= 0
        ) {
            return;
        }

        onRedeem(
            normalizedNumber,
            Math.min(
                balance,
                remainingAmount,
            ),
        );
    };

    return (
        <div className="cash-payment">
            <label className="cash-payment__custom">
                <span>
                    מספר Gift Card
                </span>

                <input
                    type="text"
                    value={number}
                    autoFocus
                    onChange={(event) => {
                        setNumber(
                            event.target.value,
                        );

                        setBalance(null);
                        setError("");
                    }}
                    onKeyDown={(event) => {
                        if (
                            event.key ===
                            "Enter"
                        ) {
                            checkGiftCard();
                        }
                    }}
                />
            </label>

            <button
                type="button"
                className="payment-page__confirm"
                disabled={
                    !normalizedNumber
                }
                onClick={checkGiftCard}
            >
                בדוק יתרה
            </button>

            {error && (
                <div className="payment-page__method-state">
                    <p>
                        {error}
                    </p>
                </div>
            )}

            {balance !== null && (
                <>
                    <div className="cash-payment__calculation">
                        <div>
                            <span>
                                יתרה זמינה
                            </span>

                            <strong>
                                ₪
                                {balance.toFixed(
                                    2,
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                ימומש כעת
                            </span>

                            <strong>
                                ₪
                                {Math.min(
                                    balance,
                                    remainingAmount,
                                ).toFixed(2)}
                            </strong>
                        </div>

                        <div>
                            <span>
                                יתרה לאחר מימוש
                            </span>

                            <strong>
                                ₪
                                {Math.max(
                                    0,
                                    balance -
                                    Math.min(
                                        balance,
                                        remainingAmount,
                                    ),
                                ).toFixed(2)}
                            </strong>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="payment-page__confirm"
                        disabled={
                            balance <= 0 ||
                            remainingAmount <=
                            0
                        }
                        onClick={redeem}
                    >
                        ממש Gift Card
                    </button>
                </>
            )}
        </div>
    );
}

export default GiftCardMethod;