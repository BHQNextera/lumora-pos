import {
    useState,
} from "react";

import {
    validateMonetaryValueForPayment,
} from "../../../models/monetary-value/MonetaryValueService";

type CreditVoucherMethodProps = {
    remainingAmount: number;

    onRedeem: (
        number: string,
        amount: number,
    ) => void;
};

function CreditVoucherMethod({
    remainingAmount,
    onRedeem,
}: CreditVoucherMethodProps) {
    const [number, setNumber] =
        useState("");

    const [balance, setBalance] =
        useState<number | null>(
            null,
        );

    const [error, setError] =
        useState("");

    const normalizedNumber =
        number.trim();

    const checkVoucher = () => {
        setError("");
        setBalance(null);

        if (!normalizedNumber) {
            setError(
                "יש להזין מספר שובר",
            );
            return;
        }

        const validation =
            validateMonetaryValueForPayment(
                normalizedNumber,
            );

        if (!validation.valid) {
            setError(
                "השובר אינו זמין למימוש",
            );
            return;
        }

        if (
            validation.value.type !==
            "credit_voucher"
        ) {
            setError(
                "המספר שהוזן אינו שובר זיכוי",
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
                    מספר שובר זיכוי
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
                            checkVoucher();
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
                onClick={checkVoucher}
            >
                בדוק שובר
            </button>

            {error && (
                <div className="payment-page__method-state">
                    <p>{error}</p>
                </div>
            )}

            {balance !== null && (
                <>
                    <div className="cash-payment__calculation">
                        <div>
                            <span>
                                יתרת שובר
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
                        ממש שובר
                    </button>
                </>
            )}
        </div>
    );
}

export default CreditVoucherMethod;