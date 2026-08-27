import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    validateMonetaryValueForPayment,
} from "../../../models/monetary-value/MonetaryValueService";
import {
    formatMoney,
} from "../../../utils/MoneyFormatter";

type CreditVoucherMethodProps = {
    remainingAmount: number;

    onRedeem: (
        number: string,
        amount: number,
    ) => void;
};

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

function CreditVoucherMethod({
    remainingAmount,
    onRedeem,
}: CreditVoucherMethodProps) {
    const [
        number,
        setNumber,
    ] = useState("");

    const [
        balance,
        setBalance,
    ] = useState<number | null>(
        null,
    );

    const [
        redeemAmountInput,
        setRedeemAmountInput,
    ] = useState("");

    const [
        error,
        setError,
    ] = useState("");

    const normalizedNumber =
        number.trim();

    useEffect(() => {
        if (balance === null) {
            setRedeemAmountInput("");
            return;
        }

        setRedeemAmountInput(
            Math.min(
                balance,
                remainingAmount,
            ).toFixed(2),
        );
    }, [
        balance,
        remainingAmount,
    ]);

    const redeemAmount =
        useMemo(() => {
            const value =
                Number(
                    redeemAmountInput,
                );

            if (
                !Number.isFinite(value)
            ) {
                return 0;
            }

            return roundCurrency(
                value,
            );
        }, [redeemAmountInput]);

    const maxRedeemAmount =
        balance === null
            ? 0
            : Math.min(
                balance,
                remainingAmount,
            );

    const isValidRedeemAmount =
        balance !== null &&
        redeemAmount > 0 &&
        redeemAmount <=
            maxRedeemAmount;

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
            !isValidRedeemAmount
        ) {
            return;
        }

        onRedeem(
            normalizedNumber,
            redeemAmount,
        );
    };

    return (
        <div className="credit-voucher-v2">
            <div className="credit-voucher-v2__header">
                <div>
                    <span>
                        שובר זיכוי
                    </span>

                    <strong>
                        מימוש שובר
                    </strong>
                </div>

                {balance !== null && (
                    <span className="credit-voucher-v2__status">
                        נמצא
                    </span>
                )}
            </div>

            <label className="credit-voucher-v2__field">
                <span>
                    מספר שובר
                </span>

                <div className="credit-voucher-v2__voucher-input">
                    <input
                        type="text"
                        value={number}
                        autoFocus
                        onChange={(
                            event,
                        ) => {
                            setNumber(
                                event
                                    .target
                                    .value,
                            );
                            setBalance(
                                null,
                            );
                            setError("");
                        }}
                        onKeyDown={(
                            event,
                        ) => {
                            if (
                                event.key ===
                                "Enter"
                            ) {
                                checkVoucher();
                            }
                        }}
                    />

                    <button
                        type="button"
                        disabled={
                            !normalizedNumber
                        }
                        onClick={
                            checkVoucher
                        }
                    >
                        בדיקה
                    </button>
                </div>
            </label>

            {error && (
                <div
                    className="credit-voucher-v2__error"
                    role="alert"
                >
                    {error}
                </div>
            )}

            {balance !== null && (
                <>
                    <div className="credit-voucher-v2__balance">
                        <div>
                            <span>
                                יתרת שובר
                            </span>

                            <strong className="lumora-money-value">
                                {formatMoney(balance)}
                            </strong>
                        </div>

                        <div>
                            <span>
                                נותר בעסקה
                            </span>

                            <strong className="lumora-money-value">
                                {formatMoney(remainingAmount)}
                            </strong>
                        </div>
                    </div>

                    <label className="credit-voucher-v2__amount">
                        <div>
                            <span>
                                סכום למימוש
                            </span>

                            <small>
                                עד{" "}
                                <bdi className="lumora-money-value">
                                    {formatMoney(maxRedeemAmount)}
                                </bdi>
                            </small>
                        </div>

                        <div className="credit-voucher-v2__amount-input">
                            <span aria-hidden="true">
                                ₪
                            </span>

                            <input
                                type="number"
                                min="0.01"
                                max={
                                    maxRedeemAmount
                                }
                                step="0.01"
                                inputMode="decimal"
                                value={
                                    redeemAmountInput
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setRedeemAmountInput(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                onFocus={(
                                    event,
                                ) =>
                                    event.currentTarget.select()
                                }
                                aria-label="סכום למימוש משובר זיכוי"
                            />
                        </div>
                    </label>

                    {!isValidRedeemAmount &&
                        redeemAmountInput !==
                            "" && (
                        <div className="credit-voucher-v2__error">
                            יש להזין סכום גדול מ־0 ועד{" "}
                            <bdi className="lumora-money-value">
                                {formatMoney(maxRedeemAmount)}
                            </bdi>
                        </div>
                    )}

                    <button
                        type="button"
                        className="payment-page__confirm credit-voucher-v2__confirm"
                        disabled={
                            !isValidRedeemAmount
                        }
                        onClick={
                            redeem
                        }
                    >
                        {isValidRedeemAmount
                            ? `ממש שובר · ${formatMoney(
                                  redeemAmount,
                              )}`
                            : "הזן סכום למימוש"}
                    </button>
                </>
            )}
        </div>
    );
}

export default CreditVoucherMethod;
