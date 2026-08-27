import {
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    formatMoney,
} from "../../../utils/MoneyFormatter";

type ExternalCreditMethodProps = {
    remainingAmount: number;
    onApprove: (
        amount: number,
        externalReference: string,
    ) => void;
};

function ExternalCreditMethod({
    remainingAmount,
    onApprove,
}: ExternalCreditMethodProps) {
    const [
        chargeAmountInput,
        setChargeAmountInput,
    ] = useState(
        remainingAmount.toFixed(2),
    );

    const [
        externalReference,
        setExternalReference,
    ] = useState("");

    const [
        attempted,
        setAttempted,
    ] = useState(false);

    useEffect(() => {
        setChargeAmountInput(
            remainingAmount.toFixed(2),
        );

        setExternalReference("");
        setAttempted(false);
    }, [remainingAmount]);

    const chargeAmount =
        useMemo(() => {
            const value =
                Number(
                    chargeAmountInput,
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
        }, [chargeAmountInput]);

    const normalizedReference =
        externalReference.trim();

    const isValidAmount =
        chargeAmount > 0 &&
        chargeAmount <=
            remainingAmount;

    const isValidReference =
        normalizedReference.length > 0;

    const approve = () => {
        setAttempted(true);

        if (
            !isValidAmount ||
            !isValidReference
        ) {
            return;
        }

        onApprove(
            chargeAmount,
            normalizedReference,
        );
    };

    return (
        <div className="card-payment-v2">
            <div className="card-payment-v2__header">
                <div>
                    <span>
                        אשראי חיצוני
                    </span>

                    <strong>
                        תיעוד חיוב שאושר במסוף
                    </strong>
                </div>

                <span className="card-payment-v2__status">
                    רישום ידני
                </span>
            </div>

            <label className="card-payment-v2__amount card-payment-v2__amount--editable">
                <div>
                    <span>
                        סכום שחויב
                    </span>

                    <small>
                        עד{" "}
                        <bdi className="lumora-money-value">
                            {formatMoney(remainingAmount)}
                        </bdi>
                    </small>
                </div>

                <div className="card-payment-v2__amount-input">
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
                            chargeAmountInput
                        }
                        onChange={(
                            event,
                        ) =>
                            setChargeAmountInput(
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
                        aria-label="סכום שחויב במסוף החיצוני"
                    />
                </div>
            </label>

            {attempted &&
                !isValidAmount && (
                <div className="card-payment-v2__amount-error">
                    יש להזין סכום גדול מ־0 ועד{" "}
                    <bdi className="lumora-money-value">
                        {formatMoney(remainingAmount)}
                    </bdi>
                </div>
            )}

            <label className="external-credit-v1__reference">
                <span>
                    מספר אישור / אסמכתה
                </span>

                <input
                    value={
                        externalReference
                    }
                    maxLength={80}
                    autoComplete="off"
                    inputMode="text"
                    dir="ltr"
                    placeholder="לדוגמה: 482913"
                    onChange={(
                        event,
                    ) =>
                        setExternalReference(
                            event.target.value,
                        )
                    }
                    onKeyDown={(
                        event,
                    ) => {
                        if (
                            event.key ===
                            "Enter"
                        ) {
                            approve();
                        }
                    }}
                />
            </label>

            {attempted &&
                !isValidReference && (
                <div className="card-payment-v2__amount-error">
                    חובה להזין את האסמכתה שהתקבלה מהמסוף.
                </div>
            )}

            <div className="card-payment-v2__hint">
                <span
                    aria-hidden="true"
                    className="card-payment-v2__terminal-icon"
                >
                    ▤
                </span>

                <p>
                    יש לבצע קודם את החיוב במסוף החיצוני.
                    Lumora מתעדת עסקה שאושרה ואינה מחייבת
                    את הכרטיס בעצמה. אין להזין מספר כרטיס.
                </p>
            </div>

            <button
                type="button"
                disabled={
                    !isValidAmount ||
                    !isValidReference
                }
                onClick={approve}
                className="payment-page__confirm card-payment-v2__confirm"
            >
                {isValidAmount
                    ? `תעד חיוב מאושר · ${formatMoney(
                          chargeAmount,
                      )}`
                    : "הזן סכום לחיוב"}
            </button>
        </div>
    );
}

export default ExternalCreditMethod;
