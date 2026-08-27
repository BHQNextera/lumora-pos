import {
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    formatMoney,
} from "../../../utils/MoneyFormatter";

type EchoMethodProps = {
    remainingAmount: number;
    onApprove: (
        amount: number,
        providerReference: string,
    ) => void;
};

function EchoMethod({
    remainingAmount,
    onApprove,
}: EchoMethodProps) {
    const [
        isProcessing,
        setIsProcessing,
    ] = useState(false);

    const [
        requestAmountInput,
        setRequestAmountInput,
    ] = useState(
        remainingAmount.toFixed(2),
    );

    useEffect(() => {
        setRequestAmountInput(
            remainingAmount.toFixed(2),
        );
    }, [remainingAmount]);

    const requestAmount =
        useMemo(() => {
            const value =
                Number(
                    requestAmountInput,
                );

            if (
                !Number.isFinite(value)
            ) {
                return 0;
            }

            return (
                Math.round(
                    (value +
                        Number.EPSILON) *
                        100,
                ) / 100
            );
        }, [requestAmountInput]);

    const isValidAmount =
        requestAmount > 0 &&
        requestAmount <=
            remainingAmount;

    const approve = () => {
        if (
            isProcessing ||
            !isValidAmount
        ) {
            return;
        }

        setIsProcessing(true);

        const providerReference =
            `ECHO-${Date.now()}`;

        onApprove(
            requestAmount,
            providerReference,
        );
    };

    return (
        <div className="echo-payment-v2">
            <div className="echo-payment-v2__header">
                <div>
                    <span>
                        ECHO
                    </span>

                    <strong>
                        בקשת תשלום דיגיטלית
                    </strong>
                </div>

                <span className="echo-payment-v2__status">
                    תשלום מרחוק
                </span>
            </div>

            <label className="echo-payment-v2__amount">
                <div>
                    <span>
                        סכום לבקשה
                    </span>

                    <small>
                        עד{" "}
                        <bdi className="lumora-money-value">
                            {formatMoney(remainingAmount)}
                        </bdi>
                    </small>
                </div>

                <div className="echo-payment-v2__amount-input">
                    <span aria-hidden="true">
                        ₪
                    </span>

                    <input
                        type="number"
                        min="0.01"
                        max={
                            remainingAmount
                        }
                        step="0.01"
                        inputMode="decimal"
                        value={
                            requestAmountInput
                        }
                        onChange={(
                            event,
                        ) =>
                            setRequestAmountInput(
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
                        aria-label="סכום לבקשת Echo"
                    />
                </div>
            </label>

            {!isValidAmount &&
                requestAmountInput !==
                    "" && (
                <div className="echo-payment-v2__amount-error">
                    יש להזין סכום גדול מ־0 ועד{" "}
                    <bdi className="lumora-money-value">
                        {formatMoney(remainingAmount)}
                    </bdi>
                </div>
            )}

            <div className="echo-payment-v2__hint">
                <span
                    aria-hidden="true"
                    className="echo-payment-v2__icon"
                >
                    ◉
                </span>

                <p>
                    Lumora תיצור בקשת תשלום דרך
                    Echo ותמתין לאישור העסקה.
                </p>
            </div>

            <button
                type="button"
                disabled={
                    isProcessing ||
                    !isValidAmount
                }
                onClick={approve}
                className="payment-page__confirm echo-payment-v2__confirm"
            >
                {isProcessing
                    ? "שולח בקשה..."
                    : isValidAmount
                      ? `שלח בקשת Echo · ${formatMoney(
                            requestAmount,
                        )}`
                      : "הזן סכום לבקשה"}
            </button>
        </div>
    );
}

export default EchoMethod;
