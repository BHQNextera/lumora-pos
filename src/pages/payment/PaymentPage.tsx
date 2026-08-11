import {
    useMemo,
    useState,
} from "react";

import PaymentMethodRenderer from "../../components/payment/PaymentMethodRenderer";
import PaymentSummary from "../../components/payment/PaymentSummary";
import {
    redeemMonetaryValue,
    restoreMonetaryValue,
} from "../../models/monetary-value/MonetaryValueService";
import {
    calculatePaymentTotals,
    type Payment,
} from "../../models/Payment";
import type {
    PaymentMethodCode,
} from "../../models/PaymentMethod";

import "./payment-page.css";

type PaymentPageProps = {
    total: number;

    onBack: () => void;

    onComplete: (
        payments: Payment[],
    ) => void;
};

type PrimaryPaymentMethod = {
    code: PaymentMethodCode;
    icon: string;
    title: string;
    description: string;
};

const primaryPaymentMethods: PrimaryPaymentMethod[] = [
    {
        code: "cash",
        icon: "₪",
        title: "מזומן",
        description: "תשלום מלא או חלקי",
    },
    {
        code: "card_terminal",
        icon: "▤",
        title: "אשראי",
        description: "תשלום דרך מסופון",
    },
    {
        code: "echo",
        icon: "◉",
        title: "Echo",
        description: "בקשת תשלום דיגיטלית",
    },
    {
        code: "credit_voucher",
        icon: "₪",
        title: "שובר זיכוי",
        description: "מימוש מלא או חלקי",
    },
    {
        code: "gift_card",
        icon: "G",
        title: "Gift Card",
        description: "מימוש יתרה קיימת",
    },
    {
        code: "custom",
        icon: "+",
        title: "אמצעי נוסף",
        description: "Bit, העברה, המחאה ועוד",
    },
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
        useState<PaymentMethodCode | null>(
            null,
        );

    const [
        payments,
        setPayments,
    ] =
        useState<Payment[]>([]);

    const [
        cashChangeNotice,
        setCashChangeNotice,
    ] =
        useState<number | null>(
            null,
        );

    const [
        pendingCompletionPayments,
        setPendingCompletionPayments,
    ] =
        useState<Payment[] | null>(
            null,
        );

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

    const finalizeOrStore = (
        nextPayments: Payment[],
    ) => {
        const nextTotals =
            calculatePaymentTotals(
                total,
                nextPayments,
            );

        if (
            nextTotals.isFullyPaid
        ) {
            onComplete(
                nextPayments,
            );
            return;
        }

        setPayments(
            nextPayments,
        );
        setSelectedMethod(
            null,
        );
    };

    const addCashPayment = (
        cashPayment: {
            amount: number;
            tenderedAmount: number;
            changeAmount: number;
        },
    ) => {
        if (
            remainingAmount <= 0 ||
            cashPayment.amount <= 0
        ) {
            return;
        }

        const payment: Payment = {
            id:
                crypto.randomUUID(),
            method:
                "cash",
            status:
                "approved",
            amount:
                cashPayment.amount,
            tenderedAmount:
                cashPayment.tenderedAmount,
            changeAmount:
                cashPayment.changeAmount,
            createdAt:
                new Date().toISOString(),
        };

        finalizeOrStore([
            ...payments,
            payment,
        ]);
    };

    const addElectronicPayment = (
        method:
            | "card_terminal"
            | "echo",
        amount: number,
        providerReference: string,
    ) => {
        if (
            remainingAmount <= 0 ||
            amount <= 0
        ) {
            return;
        }

        const payment: Payment = {
            id:
                crypto.randomUUID(),
            method,
            status:
                "approved",
            amount:
                Math.min(
                    amount,
                    remainingAmount,
                ),
            providerReference,
            createdAt:
                new Date().toISOString(),
        };

        finalizeOrStore([
            ...payments,
            payment,
        ]);
    };

    const redeemStoredValue = (
        method:
            | "credit_voucher"
            | "gift_card",
        number: string,
        amount: number,
    ) => {
        if (
            remainingAmount <= 0 ||
            amount <= 0
        ) {
            return;
        }

        const paymentId =
            crypto.randomUUID();

        const redemption =
            redeemMonetaryValue({
                number,
                requestedAmount:
                    Math.min(
                        amount,
                        remainingAmount,
                    ),
                paymentId,
            });

        const cashChangeAmount =
            method ===
                "credit_voucher"
                ? redemption.cashChangeAmount
                : 0;

        const voucherPayment: Payment = {
            id:
                paymentId,
            method,
            status:
                "approved",
            amount:
                redemption.redeemedAmount +
                cashChangeAmount,
            externalReference:
                number,
            providerReference:
                redemption.monetaryValue.id,
            createdAt:
                new Date().toISOString(),
        };

        const cashChangePayment:
            Payment | null =
            cashChangeAmount > 0
                ? {
                      id:
                          crypto.randomUUID(),
                      method:
                          "cash",
                      status:
                          "approved",
                      amount:
                          -cashChangeAmount,
                      externalReference:
                          `change-for:${number}`,
                      createdAt:
                          new Date().toISOString(),
                  }
                : null;

        const nextPayments = [
            ...payments,
            voucherPayment,
            ...(cashChangePayment
                ? [
                      cashChangePayment,
                  ]
                : []),
        ];

        if (
            cashChangeAmount > 0
        ) {
            setPayments(
                nextPayments,
            );
            setPendingCompletionPayments(
                nextPayments,
            );
            setCashChangeNotice(
                cashChangeAmount,
            );
            setSelectedMethod(
                null,
            );
            return;
        }

        finalizeOrStore(
            nextPayments,
        );
    };

    const restoreStoredValuePayment = (
        payment: Payment,
    ) => {
        if (
            (
                payment.method !==
                    "credit_voucher" &&
                payment.method !==
                    "gift_card"
            ) ||
            !payment.externalReference
        ) {
            return;
        }

        restoreMonetaryValue({
            number:
                payment.externalReference,
            amount:
                payment.amount -
                (
                    payment.changeAmount ??
                    0
                ),
            paymentId:
                payment.id,
            reason:
                "payment_removed",
        });
    };

    const removePayment = (
        paymentId: string,
    ) => {
        const payment =
            payments.find(
                (item) =>
                    item.id ===
                    paymentId,
            );

        if (
            payment
        ) {
            restoreStoredValuePayment(
                payment,
            );
        }

        setPayments(
            (current) =>
                current.filter(
                    (item) =>
                        item.id !==
                        paymentId,
                ),
        );
    };

    const handleBack = () => {
        for (
            const payment
            of payments
        ) {
            restoreStoredValuePayment(
                payment,
            );
        }

        onBack();
    };

    const confirmCashChange = () => {
        const next =
            pendingCompletionPayments;

        setCashChangeNotice(
            null,
        );
        setPendingCompletionPayments(
            null,
        );

        if (
            next
        ) {
            onComplete(
                next,
            );
        }
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
                    onClick={
                        handleBack
                    }
                >
                    חזרה למכירה
                </button>

                <div>
                    <p className="payment-page__eyebrow">
                        תשלום
                    </p>

                    <h1 id="payment-page-title">
                        בחירת אמצעי תשלום
                    </h1>
                </div>
            </header>

            <div className="payment-page__layout">
                <section className="payment-page__methods">
                    {primaryPaymentMethods.map(
                        (
                            method,
                        ) => (
                            <button
                                key={
                                    method.code
                                }
                                type="button"
                                className={`payment-method-card ${
                                    selectedMethod ===
                                    method.code
                                        ? "payment-method-card--active"
                                        : ""
                                }`}
                                disabled={
                                    remainingAmount <=
                                    0
                                }
                                onClick={() =>
                                    setSelectedMethod(
                                        method.code,
                                    )
                                }
                            >
                                <span className="payment-method-card__icon">
                                    {
                                        method.icon
                                    }
                                </span>

                                <strong>
                                    {
                                        method.title
                                    }
                                </strong>

                                <span>
                                    {
                                        method.description
                                    }
                                </span>
                            </button>
                        ),
                    )}
                </section>

                <aside className="payment-page__summary">
                    <PaymentSummary
                        saleTotal={
                            total
                        }
                        payments={
                            payments
                        }
                        remainingAmount={
                            remainingAmount
                        }
                        onRemovePayment={
                            removePayment
                        }
                    />

                    <PaymentMethodRenderer
                        selectedMethod={
                            selectedMethod
                        }
                        remainingAmount={
                            remainingAmount
                        }
                        onAddCashPayment={
                            addCashPayment
                        }
                        onApproveElectronicPayment={
                            addElectronicPayment
                        }
                        onRedeemStoredValue={
                            redeemStoredValue
                        }
                    />
                </aside>
            </div>

            {cashChangeNotice !== null && (
                <div
                    role="presentation"
                    style={{
                        position:
                            "fixed",
                        inset:
                            0,
                        zIndex:
                            6000,
                        display:
                            "grid",
                        placeItems:
                            "center",
                        padding:
                            "24px",
                        background:
                            "rgba(17, 24, 39, 0.34)",
                    }}
                >
                    <div
                        dir="rtl"
                        role="dialog"
                        aria-modal="true"
                        style={{
                            width:
                                "min(430px, 100%)",
                            padding:
                                "22px",
                            border:
                                "1px solid #dde4e1",
                            borderRadius:
                                "18px",
                            background:
                                "#ffffff",
                            boxShadow:
                                "0 24px 70px rgba(15, 23, 42, 0.20)",
                        }}
                    >
                        <div
                            style={{
                                color:
                                    "#7a8580",
                                fontSize:
                                    "10px",
                                fontWeight:
                                    800,
                                letterSpacing:
                                    "0.08em",
                            }}
                        >
                            יתרה קטנה
                        </div>

                        <h2
                            style={{
                                margin:
                                    "8px 0 6px",
                                fontSize:
                                    "22px",
                            }}
                        >
                            החזר במזומן
                        </h2>

                        <p
                            style={{
                                margin:
                                    0,
                                color:
                                    "#5f6964",
                                fontSize:
                                    "13px",
                                lineHeight:
                                    1.6,
                            }}
                        >
                            יתרת השובר נמוכה מסף ההנפקה.
                            יש להחזיר ללקוח במזומן:
                        </p>

                        <div
                            style={{
                                marginTop:
                                    "16px",
                                padding:
                                    "14px",
                                borderRadius:
                                    "12px",
                                background:
                                    "#f5f8f6",
                                fontSize:
                                    "28px",
                                fontWeight:
                                    850,
                                textAlign:
                                    "center",
                            }}
                        >
                            ₪
                            {cashChangeNotice.toFixed(
                                2,
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={
                                confirmCashChange
                            }
                            style={{
                                width:
                                    "100%",
                                minHeight:
                                    "42px",
                                marginTop:
                                    "16px",
                                border:
                                    0,
                                borderRadius:
                                    "10px",
                                background:
                                    "var(--primary)",
                                color:
                                    "#fff",
                                fontWeight:
                                    750,
                                cursor:
                                    "pointer",
                            }}
                        >
                            אישור והמשך
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}

export default PaymentPage;
