import {
    useMemo,
    useState,
} from "react";

import type {
    Payment,
} from "../../models/Payment";
import type {
    OriginalGiftCardRefundSource,
} from "../../models/refund/RefundStoredValueService";

import "./refund-page.css";

type RefundMethod =
    | "cash"
    | "card_terminal"
    | "credit_voucher"
    | "gift_card";

type RefundPageProps = {
    total: number;
    giftCardRefundSource:
        OriginalGiftCardRefundSource | null;
    onBack: () => void;
    onComplete: (
        payments: Payment[],
        applyCancellationFee?: boolean,
    ) => void | Promise<void>;
};

const refundMethods: {
    code: RefundMethod;
    title: string;
    description: string;
}[] = [
    {
        code: "cash",
        title: "מזומן",
        description: "החזר מזומן",
    },
    {
        code: "card_terminal",
        title: "אשראי",
        description: "זיכוי בכרטיס",
    },
    {
        code: "credit_voucher",
        title: "שובר זיכוי",
        description: "הנפקת זיכוי ללקוח",
    },
    {
        code: "gift_card",
        title: "Gift Card",
        description: "החזר לכרטיס המקורי",
    },
];

function roundMoney(
    value: number,
) {
    return (
        Math.round(
            (value + Number.EPSILON) *
            100,
        ) / 100
    );
}

function RefundPage({
    total,
    giftCardRefundSource,
    onBack,
    onComplete,
}: RefundPageProps) {
    const grossRefundAmount =
        roundMoney(
            Math.abs(total),
        );

    const [
        payments,
        setPayments,
    ] =
        useState<Payment[]>([]);

    const [
        selectedMethod,
        setSelectedMethod,
    ] =
        useState<RefundMethod | null>(
            null,
        );

    const [
        amountInput,
        setAmountInput,
    ] =
        useState("");

    const [
        cancellationFeeApplied,
        setCancellationFeeApplied,
    ] =
        useState(false);

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null,
        );

    const cancellationFeeAmount =
        cancellationFeeApplied
            ? Math.min(
                  roundMoney(
                      grossRefundAmount *
                      0.05,
                  ),
                  100,
              )
            : 0;

    const netRefundAmount =
        roundMoney(
            grossRefundAmount -
            cancellationFeeAmount,
        );

    const allocatedAmount =
        useMemo(
            () =>
                roundMoney(
                    payments.reduce(
                        (
                            sum,
                            payment,
                        ) =>
                            sum +
                            Math.abs(
                                payment.amount,
                            ),
                        0,
                    ),
                ),
            [payments],
        );

    const remainingAmount =
        roundMoney(
            Math.max(
                0,
                netRefundAmount -
                allocatedAmount,
            ),
        );

    const selectMethod = (
        method: RefundMethod,
    ) => {
        setError(null);
        setSelectedMethod(
            method,
        );
        const methodLimit =
            method === "gift_card"
                ? Math.min(
                      remainingAmount,
                      giftCardRefundSource
                          ?.availableAmount ?? 0,
                  )
                : remainingAmount;

        setAmountInput(
            methodLimit.toFixed(
                2,
            ),
        );
    };

    const addAllocation = () => {
        if (
            !selectedMethod ||
            remainingAmount <= 0
        ) {
            return;
        }

        if (
            payments.some(
                (payment) =>
                    payment.method ===
                    selectedMethod,
            )
        ) {
            setError(
                "אמצעי ההחזר כבר הוקצה. ניתן להסיר אותו ולהזין מחדש.",
            );
            return;
        }

        const parsed =
            Number(
                amountInput,
            );

        const amount =
            roundMoney(
                parsed,
            );

        if (
            !Number.isFinite(
                amount,
            ) ||
            amount <= 0
        ) {
            setError(
                "יש להזין סכום החזר תקין.",
            );
            return;
        }

        if (
            amount >
            remainingAmount + 0.001
        ) {
            setError(
                `לא ניתן לעבור את היתרה להחזר: ₪${remainingAmount.toFixed(
                    2,
                )}`,
            );
            return;
        }

        if (
            selectedMethod === "gift_card"
        ) {
            const giftCardLimit =
                Math.min(
                    remainingAmount,
                    giftCardRefundSource
                        ?.availableAmount ?? 0,
                );

            if (
                amount >
                giftCardLimit + 0.001
            ) {
                setError(
                    "לא ניתן להחזיר ל-Gift Card יותר מ-₪" +
                    giftCardLimit.toFixed(2),
                );
                return;
            }
        }

        const payment: Payment = {
            id:
                crypto.randomUUID(),
            method:
                selectedMethod,
            status:
                "approved",
            amount:
                -amount,
            externalReference:
                selectedMethod === "gift_card"
                    ? giftCardRefundSource?.number
                    : undefined,
            createdAt:
                new Date()
                    .toISOString(),
        };

        setPayments(
            (current) => [
                ...current,
                payment,
            ],
        );

        setSelectedMethod(
            null,
        );

        setAmountInput("");
        setError(null);
    };

    const removeAllocation = (
        paymentId: string,
    ) => {
        setPayments(
            (current) =>
                current.filter(
                    (payment) =>
                        payment.id !==
                        paymentId,
                ),
        );

        setError(null);
    };

    const toggleCancellationFee =
        () => {
            if (
                payments.length >
                0
            ) {
                return;
            }

            setCancellationFeeApplied(
                (current) =>
                    !current,
            );

            setSelectedMethod(
                null,
            );

            setAmountInput("");
            setError(null);
        };

    const completeRefund =
        () => {
            if (
                payments.length ===
                    0 ||
                remainingAmount >
                    0.001
            ) {
                return;
            }

            void onComplete(
                payments,
                cancellationFeeApplied,
            );
        };

    return (
        <section className="refund-page">
            <header className="refund-page__header">
                <button
                    type="button"
                    onClick={onBack}
                >
                    חזרה
                </button>

                <div>
                    <p>
                        החזר כספי
                    </p>

                    <h1>
                        ₪
                        {grossRefundAmount.toFixed(
                            2,
                        )}
                    </h1>
                </div>
            </header>

            <div className="refund-page__refund-summary">
                <div>
                    <span>
                        החזר ברוטו
                    </span>
                    <strong>
                        ₪{grossRefundAmount.toFixed(2)}
                    </strong>
                </div>

                <div>
                    <span>
                        דמי ביטול
                    </span>
                    <strong>
                        ₪{cancellationFeeAmount.toFixed(2)}
                    </strong>
                </div>

                <div>
                    <span>
                        להחזר נטו
                    </span>
                    <strong>
                        ₪{netRefundAmount.toFixed(2)}
                    </strong>
                </div>

                <div>
                    <span>
                        הוקצה
                    </span>
                    <strong>
                        ₪{allocatedAmount.toFixed(2)}
                    </strong>
                </div>

                <div>
                    <span>
                        נותר
                    </span>
                    <strong>
                        ₪{remainingAmount.toFixed(2)}
                    </strong>
                </div>
            </div>

            <button
                type="button"
                className="refund-page__fee"
                disabled={
                    payments.length >
                    0
                }
                onClick={
                    toggleCancellationFee
                }
            >
                {cancellationFeeApplied
                    ? `הסר דמי ביטול · ₪${cancellationFeeAmount.toFixed(
                          2,
                      )}`
                    : "החל דמי ביטול"}
            </button>

            <div className="refund-page__methods">
                {refundMethods
                    .filter(
                        (method) =>
                            method.code !==
                                "gift_card" ||
                            Boolean(
                                giftCardRefundSource,
                            ),
                    )
                    .map(
                    (method) => {
                        const used =
                            payments.some(
                                (
                                    payment,
                                ) =>
                                    payment.method ===
                                    method.code,
                            );

                        return (
                            <button
                                key={
                                    method.code
                                }
                                type="button"
                                disabled={
                                    used ||
                                    remainingAmount <=
                                        0
                                }
                                className={
                                    selectedMethod ===
                                    method.code
                                        ? "refund-method refund-method--active"
                                        : "refund-method"
                                }
                                onClick={() =>
                                    selectMethod(
                                        method.code,
                                    )
                                }
                            >
                                <strong>
                                    {
                                        method.title
                                    }
                                </strong>
                                <span>
                                    {
                                        method.code ===
                                            "gift_card" &&
                                        giftCardRefundSource
                                            ? "לכרטיס ••••" +
                                              giftCardRefundSource.number.slice(
                                                  -4,
                                              ) +
                                              " · עד ₪" +
                                              giftCardRefundSource.availableAmount.toFixed(
                                                  2,
                                              )
                                            : method.description
                                    }
                                </span>
                            </button>
                        );
                    },
                )}
            </div>

            {selectedMethod && (
                <div className="refund-page__allocation-entry">
                    <label>
                        סכום להקצאה
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            max={
                                remainingAmount
                            }
                            value={
                                amountInput
                            }
                            onChange={(
                                event,
                            ) =>
                                setAmountInput(
                                    event
                                        .target
                                        .value,
                                )
                            }
                        />
                    </label>

                    <button
                        type="button"
                        onClick={
                            addAllocation
                        }
                    >
                        הוסף להחזר
                    </button>
                </div>
            )}

            {payments.length > 0 && (
                <div className="refund-page__allocations">
                    {payments.map(
                        (payment) => {
                            const method =
                                refundMethods.find(
                                    (
                                        item,
                                    ) =>
                                        item.code ===
                                        payment.method,
                                );

                            return (
                                <div
                                    key={
                                        payment.id
                                    }
                                >
                                    <strong>
                                        {method?.title ??
                                            payment.method}
                                    </strong>

                                    <span>
                                        ₪
                                        {Math.abs(
                                            payment.amount,
                                        ).toFixed(
                                            2,
                                        )}
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            removeAllocation(
                                                payment.id,
                                            )
                                        }
                                    >
                                        הסר
                                    </button>
                                </div>
                            );
                        },
                    )}
                </div>
            )}

            {error && (
                <div className="refund-page__error">
                    {error}
                </div>
            )}

            <button
                type="button"
                className="refund-page__confirm"
                disabled={
                    payments.length ===
                        0 ||
                    remainingAmount >
                        0.001
                }
                onClick={
                    completeRefund
                }
            >
                סיים החזר · ₪
                {netRefundAmount.toFixed(
                    2,
                )}
            </button>
        </section>
    );
}

export default RefundPage;
