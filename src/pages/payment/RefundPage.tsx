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

import PaymentMethodIcon from "../../components/payment/PaymentMethodIcon";
import {
    formatMoney,
} from "../../utils/MoneyFormatter";

import "./refund-page.css";

type RefundMethod =
    | "cash"
    | "card_terminal"
    | "credit_voucher"
    | "gift_card"
    | "store_credit";

type RefundPageProps = {
    total: number;
    giftCardRefundSource:
        OriginalGiftCardRefundSource | null;
    storeCreditRefundLimit: number;
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
    shortLabel: string;
}[] = [
    {
        code: "cash",
        title: "מזומן",
        description: "החזר מזומן",
        shortLabel: "₪",
    },
    {
        code: "card_terminal",
        title: "אשראי",
        description: "זיכוי בכרטיס",
        shortLabel: "CARD",
    },
    {
        code: "credit_voucher",
        title: "שובר זיכוי",
        description: "הנפקת זיכוי ללקוח",
        shortLabel: "V",
    },
    {
        code: "gift_card",
        title: "Gift Card",
        description: "החזר לכרטיס המקורי",
        shortLabel: "GIFT",
    },
    {
        code: "store_credit",
        title: "הקפה",
        description: "הפחתת חוב בחשבון הלקוח",
        shortLabel: "A/C",
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
    storeCreditRefundLimit,
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
                : method ===
                    "store_credit"
                  ? Math.min(
                        remainingAmount,
                        storeCreditRefundLimit,
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
                `לא ניתן לעבור את היתרה להחזר: ${formatMoney(
                    remainingAmount,
                )}`,
            );
            return;
        }

        if (
            selectedMethod ===
                "store_credit" &&
            amount >
                storeCreditRefundLimit +
                    0.001
        ) {
            setError(
                "הסכום אינו זמין להחזר בהקפה.",
            );

            return;
        }

        if (
            selectedMethod ===
            "gift_card"
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
                    `לא ניתן להחזיר ל-Gift Card יותר מ-${formatMoney(
                        giftCardLimit,
                    )}`,
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
        const nextPayments = [
            ...payments,
            payment,
        ];

        const closesRefund =
            Math.abs(
                remainingAmount -
                    amount,
            ) <= 0.001;

        if (closesRefund) {
            void onComplete(
                nextPayments,
                cancellationFeeApplied,
            );

            return;
        }

        setPayments(
            nextPayments,
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
return (
        <section className="refund-page">
            <header className="refund-page__header">
                <div className="refund-page__title-block">
                    <span className="refund-page__eyebrow">
                        החזר עסקה
                    </span>

                    <div className="refund-page__title-row">
                        <h1>
                            החזר כספי
                        </h1>

                        <strong className="lumora-money-value">
                            {formatMoney(grossRefundAmount)}
                        </strong>
                    </div>
                </div>

                <button
                    type="button"
                    className="refund-page__back"
                    onClick={onBack}
                >
                    חזרה
                </button>
            </header>

            <div className="refund-page__summary-strip">
                <div>
                    <span>
                        ברוטו
                    </span>
                    <strong className="lumora-money-value">
                        {formatMoney(grossRefundAmount)}
                    </strong>
                </div>

                <div>
                    <span>
                        דמי ביטול
                    </span>
                    <strong className="lumora-money-value">
                        {formatMoney(cancellationFeeAmount)}
                    </strong>
                </div>

                <div className="refund-page__summary-strip-main">
                    <span>
                        להחזר נטו
                    </span>
                    <strong className="lumora-money-value">
                        {formatMoney(netRefundAmount)}
                    </strong>
                </div>

                <div>
                    <span>
                        הוקצה
                    </span>
                    <strong className="lumora-money-value">
                        {formatMoney(allocatedAmount)}
                    </strong>
                </div>

                <div>
                    <span>
                        נותר
                    </span>
                    <strong className="lumora-money-value">
                        {formatMoney(remainingAmount)}
                    </strong>
                </div>
            </div>

            <div className="refund-page__content">
                <div className="refund-page__methods-card">
                    <div className="refund-page__section-head">
                        <div>
                            <span>
                                אמצעי החזר
                            </span>
                            <strong>
                                בחר כיצד לזכות את הלקוח
                            </strong>
                        </div>

                        <button
                            type="button"
                            className={
                                cancellationFeeApplied
                                    ? "refund-page__fee refund-page__fee--active"
                                    : "refund-page__fee"
                            }
                            disabled={
                                payments.length >
                                0
                            }
                            onClick={
                                toggleCancellationFee
                            }
                        >
                            {cancellationFeeApplied
                                ? `דמי ביטול פעילים · ${formatMoney(
                                      cancellationFeeAmount,
                                  )}`
                                : "החל דמי ביטול"}
                        </button>
                    </div>

                    <div className="refund-page__methods">
                        {refundMethods
                            .filter(
                                (method) =>
                                    (
                                        method.code !==
                                            "gift_card" ||
                                        Boolean(
                                            giftCardRefundSource,
                                        )
                                    ) &&
                                    (
                                        method.code !==
                                            "store_credit" ||
                                        storeCreditRefundLimit >
                                            0.001
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
                                            <span className="refund-method__mark">
                                                <PaymentMethodIcon code={method.code} />
                                            </span>

                                            <div>
                                                <strong>
                                                    {
                                                        method.title
                                                    }
                                                </strong>

                                                {method.code !==
                                                    "store_credit" && (
                                                    <span>
                                                        {method.code ===
                                                            "gift_card" &&
                                                        giftCardRefundSource
                                                            ? "לכרטיס ••••" +
                                                              giftCardRefundSource.number.slice(
                                                                  -4,
                                                              )
                                                            : method.description}
                                                    </span>
                                                )}
                                            </div>

                                            {used && (
                                                <span className="refund-method__used">
                                                    הוקצה
                                                </span>
                                            )}
                                        </button>
                                    );
                                },
                            )}
                    </div>

                    {selectedMethod && (
                        <div className="refund-page__allocation-entry">
                            <label>
                                <span>
                                    סכום להקצאה
                                </span>

                                <div className="refund-page__amount-input">
                                    <span>
                                        ₪
                                    </span>

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
                                </div>
                            </label>

                            <button
                                type="button"
                                onClick={
                                    addAllocation
                                }
                            >
                                {Math.abs(
                                    remainingAmount -
                                        Number(
                                            amountInput,
                                        ),
                                ) <= 0.001
                                    ? "סיים החזר"
                                    : "הוסף להחזר"}
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="refund-page__error">
                            {error}
                        </div>
                    )}
                </div>

                <aside className="refund-page__allocation-card">
                    <div className="refund-page__section-head">
                        <div>
                            <span>
                                הקצאת החזר
                            </span>
                            <strong>
                                {payments.length ===
                                0
                                    ? "טרם הוקצה"
                                    : `${payments.length} אמצעי החזר`}
                            </strong>
                        </div>
                    </div>

                    {payments.length === 0 ? (
                        <div className="refund-page__empty">
                            בחר אמצעי החזר כדי להתחיל
                        </div>
                    ) : (
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
                                            <div>
                                                <strong>
                                                    {method?.title ??
                                                        payment.method}
                                                </strong>

                                                <span className="lumora-money-value">
                                                    {formatMoney(
                                                        Math.abs(payment.amount),
                                                    )}
                                                </span>
                                            </div>

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

                    <div className="refund-page__allocation-total">
                        <span>
                            נותר להקצאה
                        </span>

                        <strong className="lumora-money-value">
                            {formatMoney(remainingAmount)}
                        </strong>
                    </div>
                </aside>
            </div>

            <footer className="refund-page__footer">
                <div>
                    <span>
                        החזר נטו
                    </span>

                    <strong className="lumora-money-value">
                        {formatMoney(netRefundAmount)}
                    </strong>
                </div>

                <span className="refund-page__footer-hint">
                    ההחזר יושלם עם הקצאת הסכום האחרון
                </span>
            </footer>
        </section>
    );
}

export default RefundPage;
