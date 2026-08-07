import {
    useMemo,
    useState,
} from "react";

import PaymentSummary from "../../components/payment/PaymentSummary";
import {
    calculatePaymentTotals,
    type Payment,
} from "../../models/Payment";

import "./payment-page.css";

type PaymentMethod =
    | "cash"
    | "terminal"
    | "echo"
    | "external";

type PaymentPageProps = {
    total: number;
    onBack: () => void;
    onComplete: (
        payments: Payment[],
    ) => void;
};

const cashQuickValues = [
    20,
    50,
    100,
    200,
    500,
];

function PaymentPage({
    total,
    onBack,
    onComplete,
}: PaymentPageProps) {
    const [
        selectedMethod,
        setSelectedMethod,
    ] =
        useState<PaymentMethod | null>(
            null,
        );

    const [
        cashReceived,
        setCashReceived,
    ] =
        useState<number | null>(
            null,
        );

    const [
        payments,
        setPayments,
    ] =
        useState<Payment[]>([]);

    const paymentTotals =
        useMemo(
            () =>
                calculatePaymentTotals(
                    total,
                    payments,
                ),
            [total, payments],
        );

    const remainingAmount =
        paymentTotals.remainingAmount;

    const effectiveCashReceived =
        selectedMethod === "cash"
            ? cashReceived ??
            remainingAmount
            : 0;

    const paymentAmount =
        Math.min(
            effectiveCashReceived,
            remainingAmount,
        );

    const change =
        Math.max(
            0,
            effectiveCashReceived -
            remainingAmount,
        );

    const isPartialCash =
        selectedMethod === "cash" &&
        effectiveCashReceived > 0 &&
        effectiveCashReceived <
        remainingAmount;

    const isExactCash =
        selectedMethod === "cash" &&
        remainingAmount > 0 &&
        Math.abs(
            effectiveCashReceived -
            remainingAmount,
        ) < 0.001;

    const isOverCash =
        selectedMethod === "cash" &&
        effectiveCashReceived >
        remainingAmount;

    const canAddCashPayment =
        selectedMethod === "cash" &&
        remainingAmount > 0 &&
        effectiveCashReceived > 0;

    const selectMethod = (
        method: PaymentMethod,
    ) => {
        setSelectedMethod(method);
        setCashReceived(null);
    };

    const addQuickCash = (
        value: number,
    ) => {
        setCashReceived(
            (current) =>
                (current ?? 0) +
                value,
        );
    };

    const addCashPayment = () => {
        if (
            !canAddCashPayment
        ) {
            return;
        }

        const payment: Payment = {
            id: crypto.randomUUID(),

            method: "cash",

            status: "approved",

            amount:
                paymentAmount,

            tenderedAmount:
                effectiveCashReceived,

            changeAmount:
                isOverCash
                    ? change
                    : 0,

            createdAt:
                new Date().toISOString(),
        };

        const nextPayments = [
            ...payments,
            payment,
        ];

        const willComplete =
            paymentAmount >=
            remainingAmount -
            0.001;

        if (willComplete) {
            onComplete(
                nextPayments,
            );

            return;
        }

        setPayments(
            nextPayments,
        );

        setCashReceived(null);
        setSelectedMethod(null);
    };

    const removePayment = (
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
    };

    const getCashButtonLabel =
        () => {
            if (isPartialCash) {
                return `הוסף תשלום · ₪${paymentAmount.toFixed(
                    2,
                )}`;
            }

            if (isExactCash) {
                return `תשלום במזומן · ₪${remainingAmount.toFixed(
                    2,
                )}`;
            }

            if (isOverCash) {
                return "אישור תשלום";
            }

            return "הזן סכום";
        };

    return (
        <section
            className="payment-page"
            aria-labelledby="payment-page-title"
        >
            <header className="payment-page__header">
                <button
                    type="button"
                    className="payment-page__back"
                    onClick={onBack}
                >
                    חזרה למכירה
                </button>

                <div>
                    <p className="payment-page__eyebrow">
                        תשלום
                    </p>

                    <h1 id="payment-page-title">
                        בחירת אמצעי
                        תשלום
                    </h1>
                </div>
            </header>

            <div className="payment-page__layout">
                <section className="payment-page__methods">
                    <button
                        type="button"
                        className={`payment-method-card ${selectedMethod ===
                            "cash"
                            ? "payment-method-card--active"
                            : ""
                            }`}
                        disabled={
                            remainingAmount <= 0
                        }
                        onClick={() =>
                            selectMethod(
                                "cash",
                            )
                        }
                    >
                        <span className="payment-method-card__icon">
                            ₪
                        </span>

                        <strong>
                            מזומן
                        </strong>

                        <span>
                            תשלום מלא או
                            חלקי
                        </span>
                    </button>

                    <button
                        type="button"
                        className={`payment-method-card ${selectedMethod ===
                            "terminal"
                            ? "payment-method-card--active"
                            : ""
                            }`}
                        disabled={
                            remainingAmount <= 0
                        }
                        onClick={() =>
                            selectMethod(
                                "terminal",
                            )
                        }
                    >
                        <span className="payment-method-card__icon">
                            ▤
                        </span>

                        <strong>
                            אשראי
                        </strong>

                        <span>
                            תשלום דרך מסופון
                        </span>
                    </button>

                    <button
                        type="button"
                        className={`payment-method-card ${selectedMethod ===
                            "echo"
                            ? "payment-method-card--active"
                            : ""
                            }`}
                        disabled={
                            remainingAmount <= 0
                        }
                        onClick={() =>
                            selectMethod(
                                "echo",
                            )
                        }
                    >
                        <span className="payment-method-card__icon">
                            ◉
                        </span>

                        <strong>
                            Echo
                        </strong>

                        <span>
                            בקשת תשלום
                            דיגיטלית
                        </span>
                    </button>

                    <button
                        type="button"
                        className={`payment-method-card ${selectedMethod ===
                            "external"
                            ? "payment-method-card--active"
                            : ""
                            }`}
                        disabled={
                            remainingAmount <= 0
                        }
                        onClick={() =>
                            selectMethod(
                                "external",
                            )
                        }
                    >
                        <span className="payment-method-card__icon">
                            +
                        </span>

                        <strong>
                            אמצעי נוסף
                        </strong>

                        <span>
                            Bit, העברה,
                            המחאה ועוד
                        </span>
                    </button>
                </section>

                <aside className="payment-page__summary">
                    <PaymentSummary
                        saleTotal={total}
                        payments={payments}
                        remainingAmount={
                            remainingAmount
                        }
                        onRemovePayment={
                            removePayment
                        }
                    />

                    {selectedMethod ===
                        null ? (
                        <div className="payment-page__empty">
                            בחר אמצעי תשלום
                        </div>
                    ) : selectedMethod ===
                        "cash" ? (
                        <div className="cash-payment">
                            <div className="cash-payment__quick">
                                {cashQuickValues.map(
                                    (value) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() =>
                                                addQuickCash(
                                                    value,
                                                )
                                            }
                                        >
                                            ₪{value}
                                        </button>
                                    ),
                                )}
                            </div>

                            <label className="cash-payment__custom">
                                <span>
                                    סכום שהתקבל
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
                                    placeholder={remainingAmount.toFixed(
                                        2,
                                    )}
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
                                                ? value
                                                : null,
                                        );
                                    }}
                                />
                            </label>

                            <div className="cash-payment__calculation">
                                <div>
                                    <span>
                                        התקבל
                                    </span>

                                    <strong>
                                        ₪
                                        {effectiveCashReceived.toFixed(
                                            2,
                                        )}
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        נותר לתשלום
                                    </span>

                                    <strong>
                                        ₪
                                        {remainingAmount.toFixed(
                                            2,
                                        )}
                                    </strong>
                                </div>

                                {isPartialCash && (
                                    <div>
                                        <span>
                                            יתרה לאחר
                                            התשלום
                                        </span>

                                        <strong>
                                            ₪
                                            {(
                                                remainingAmount -
                                                paymentAmount
                                            ).toFixed(
                                                2,
                                            )}
                                        </strong>
                                    </div>
                                )}

                                {isOverCash && (
                                    <div className="cash-payment__change">
                                        <span>
                                            עודף
                                        </span>

                                        <strong>
                                            ₪
                                            {change.toFixed(
                                                2,
                                            )}
                                        </strong>
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                className="payment-page__confirm"
                                disabled={
                                    !canAddCashPayment
                                }
                                onClick={
                                    addCashPayment
                                }
                            >
                                {getCashButtonLabel()}
                            </button>
                        </div>
                    ) : (
                        <div className="payment-page__method-state">
                            <span className="payment-page__method-state-icon">
                                {selectedMethod ===
                                    "terminal"
                                    ? "▤"
                                    : selectedMethod ===
                                        "echo"
                                        ? "◉"
                                        : "+"}
                            </span>

                            <strong>
                                {selectedMethod ===
                                    "terminal"
                                    ? "אשראי במסופון"
                                    : selectedMethod ===
                                        "echo"
                                        ? "Echo"
                                        : "אמצעי תשלום נוסף"}
                            </strong>

                            <p>
                                יתווסף בהמשך
                                ה־Checkout.
                            </p>

                            <button
                                type="button"
                                disabled
                            >
                                המשך
                            </button>
                        </div>
                    )}
                </aside>
            </div>
        </section>
    );
}

export default PaymentPage;