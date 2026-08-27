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

type GiftCardMethodProps = {
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

function GiftCardMethod({
    remainingAmount,
    onRedeem,
}: GiftCardMethodProps) {
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

    const checkGiftCard = () => {
        setError("");
        setBalance(null);

        if (!normalizedNumber) {
            setError(
                "יש להזין מספר כרטיס מתנה",
            );
            return;
        }

        const validation =
            validateMonetaryValueForPayment(
                normalizedNumber,
            );

        if (!validation.valid) {
            setError(
                "כרטיס המתנה אינו זמין למימוש",
            );
            return;
        }

        if (
            validation.value.type !==
            "gift_card"
        ) {
            setError(
                "המספר שהוזן אינו כרטיס מתנה",
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
        <div className="gift-card-v2">
            <div className="gift-card-v2__header">
                <div>
                    <span>
                        כרטיס מתנה
                    </span>

                    <strong>
                        מימוש יתרה
                    </strong>
                </div>

                {balance !== null && (
                    <span className="gift-card-v2__status">
                        נמצא
                    </span>
                )}
            </div>

            <label className="gift-card-v2__field">
                <span>
                    מספר כרטיס מתנה
                </span>

                <div className="gift-card-v2__card-input">
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
                                checkGiftCard();
                            }
                        }}
                    />

                    <button
                        type="button"
                        disabled={
                            !normalizedNumber
                        }
                        onClick={
                            checkGiftCard
                        }
                    >
                        בדיקה
                    </button>
                </div>
            </label>

            {error && (
                <div
                    className="gift-card-v2__error"
                    role="alert"
                >
                    {error}
                </div>
            )}

            {balance !== null && (
                <>
                    <div className="gift-card-v2__balance">
                        <div>
                            <span>
                                יתרה זמינה
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

                    <label className="gift-card-v2__amount">
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

                        <div className="gift-card-v2__amount-input">
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
                                aria-label="סכום למימוש מכרטיס מתנה"
                            />
                        </div>
                    </label>

                    {!isValidRedeemAmount &&
                        redeemAmountInput !==
                            "" && (
                        <div className="gift-card-v2__error">
                            יש להזין סכום גדול מ־0 ועד{" "}
                            <bdi className="lumora-money-value">
                                {formatMoney(maxRedeemAmount)}
                            </bdi>
                        </div>
                    )}

                    <button
                        type="button"
                        className="payment-page__confirm gift-card-v2__confirm"
                        disabled={
                            !isValidRedeemAmount
                        }
                        onClick={
                            redeem
                        }
                    >
                        {isValidRedeemAmount
                            ? `ממש כרטיס מתנה · ${formatMoney(
                                  redeemAmount,
                              )}`
                            : "הזן סכום למימוש"}
                    </button>
                </>
            )}
        </div>
    );
}

export default GiftCardMethod;
