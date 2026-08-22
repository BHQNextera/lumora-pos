import {
    useState,
} from "react";

import {
    validateMonetaryValueForPayment,
} from "../../models/monetary-value/MonetaryValueService";

type GiftCardBalanceDialogProps = {
    open: boolean;
    onClose: () => void;
};

type BalanceResult =
    | {
          type: "balance";
          amount: number;
          statusLabel: string;
      }
    | {
          type: "error";
          message: string;
      };

function getStatusLabel(
    reason?: string,
) {
    switch (reason) {
        case "not_active":
            return "לא פעיל";

        case "expired":
            return "פג תוקף";

        case "empty":
            return "יתרה אפס";

        default:
            return "פעיל וזמין";
    }
}

function GiftCardBalanceDialog({
    open,
    onClose,
}: GiftCardBalanceDialogProps) {
    const [
        number,
        setNumber,
    ] = useState("");

    const [
        result,
        setResult,
    ] =
        useState<
            BalanceResult | null
        >(null);

    if (!open) {
        return null;
    }

    const close = () => {
        setNumber("");
        setResult(null);
        onClose();
    };

    const checkBalance = () => {
        const normalized =
            number.trim();

        setResult(null);

        if (!normalized) {
            setResult({
                type: "error",
                message:
                    "יש להזין או לסרוק מספר Gift Card",
            });

            return;
        }

        const validation =
            validateMonetaryValueForPayment(
                normalized,
            );

        if (!validation.valid) {
            if (
                validation.reason ===
                "not_found"
            ) {
                setResult({
                    type: "error",
                    message:
                        "Gift Card לא נמצא",
                });

                return;
            }

            const value =
                "value" in validation
                    ? validation.value
                    : undefined;

            if (
                !value ||
                value.type !==
                    "gift_card"
            ) {
                setResult({
                    type: "error",
                    message:
                        "המספר שהוזן אינו Gift Card",
                });

                return;
            }

            setResult({
                type: "balance",
                amount:
                    value.remainingAmount,
                statusLabel:
                    getStatusLabel(
                        validation.reason,
                    ),
            });

            return;
        }

        if (
            validation.value.type !==
            "gift_card"
        ) {
            setResult({
                type: "error",
                message:
                    "המספר שהוזן אינו Gift Card",
            });

            return;
        }

        setResult({
            type: "balance",
            amount:
                validation.value
                    .remainingAmount,
            statusLabel:
                "פעיל וזמין",
        });
    };

    return (
        <div
            className="gift-card-balance-dialog__backdrop"
            onMouseDown={close}
        >
            <section
                className="gift-card-balance-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="בדיקת יתרת Gift Card"
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
            >
                <header className="gift-card-balance-dialog__header">
                    <div>
                        <strong>
                            בדיקת יתרת Gift Card
                        </strong>

                        <span>
                            בדיקת מידע בלבד — ללא מימוש
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={close}
                        aria-label="סגור"
                    >
                        ×
                    </button>
                </header>

                <label className="gift-card-balance-dialog__field">
                    <span>
                        מספר Gift Card
                    </span>

                    <input
                        type="text"
                        autoFocus
                        value={number}
                        placeholder="סרוק או הזן מספר"
                        onChange={(event) => {
                            setNumber(
                                event.target.value,
                            );

                            setResult(
                                null,
                            );
                        }}
                        onKeyDown={(event) => {
                            if (
                                event.key ===
                                "Enter"
                            ) {
                                event
                                    .preventDefault();

                                checkBalance();
                            }
                        }}
                    />
                </label>

                <button
                    type="button"
                    className="gift-card-balance-dialog__check"
                    disabled={
                        !number.trim()
                    }
                    onClick={
                        checkBalance
                    }
                >
                    בדוק יתרה
                </button>

                {result?.type ===
                    "error" && (
                    <div className="gift-card-balance-dialog__error">
                        {result.message}
                    </div>
                )}

                {result?.type ===
                    "balance" && (
                    <div className="gift-card-balance-dialog__result">
                        <span>
                            יתרה נוכחית
                        </span>

                        <strong>
                            ₪
                            {result.amount.toFixed(
                                2,
                            )}
                        </strong>

                        <small>
                            {
                                result.statusLabel
                            }
                        </small>
                    </div>
                )}
            </section>
        </div>
    );
}

export default GiftCardBalanceDialog;
