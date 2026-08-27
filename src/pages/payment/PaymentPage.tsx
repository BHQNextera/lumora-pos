import {
    useMemo,
    useState,
} from "react";

import PaymentMethodRenderer from "../../components/payment/PaymentMethodRenderer";
import PaymentSummary from "../../components/payment/PaymentSummary";

import {
    getActiveBusinessOperatingProfile,
    getActiveRegisterProfile,
} from "../../config/ActiveBusinessConfiguration";

import {
    requestCashDrawerOpen,
} from "../../models/drawer/CashDrawerService";
import {
    getMonetaryValue,
} from "../../models/monetary-value/MonetaryValueRepository";
import {
    redeemMonetaryValue,
    restoreMonetaryValue,
} from "../../models/monetary-value/MonetaryValueService";
import {
    calculatePaymentTotals,
    type Payment,
} from "../../models/Payment";
import {
    isPaymentMethodRuntimeAvailable,
    resolvePaymentMethods,
    type PaymentMethodCode,
} from "../../models/PaymentMethod";

import PaymentMethodIcon from "../../components/payment/PaymentMethodIcon";

import "./payment-page.css";

type PaymentPageProps = {
    total: number;
    onBack: () => void;
    onComplete: (payments: Payment[]) => void;
};

type PrimaryPaymentMethod = {
    code: PaymentMethodCode;
    icon: string;
    title: string;
    description: string;
};

type VoucherNotice = {
    number: string;
    amount: number;
};

const paymentMethodPresentation:
    Record<
        PaymentMethodCode,
        {
            icon: string;
            description: string;
        }
    > = {
    cash: {
        icon: "₪",
        description:
            "תשלום מלא או חלקי",
    },

    card_terminal: {
        icon: "▤",
        description:
            "תשלום דרך מסופון",
    },

    echo: {
        icon: "◉",
        description:
            "בקשת תשלום דיגיטלית",
    },

    credit_voucher: {
        icon: "₪",
        description:
            "מימוש מלא או חלקי",
    },

    gift_card: {
        icon: "G",
        description:
            "מימוש יתרה קיימת",
    },

    store_credit: {
        icon: "ח",
        description:
            "תשלום בהקפה / יתרת לקוח",
    },

    bit: {
        icon: "B",
        description:
            "תשלום מתועד ב-Bit",
    },

    paybox: {
        icon: "P",
        description:
            "תשלום מתועד ב-PayBox",
    },

    bank_transfer: {
        icon: "↔",
        description:
            "תשלום בהעברה בנקאית",
    },

    cheque: {
        icon: "▱",
        description:
            "תשלום בהמחאה",
    },

    external_credit: {
        icon: "▤",
        description:
            "אשראי שסולק מחוץ ל-Lumora",
    },

    custom: {
        icon: "+",
        description:
            "אמצעי תשלום תיעודי",
    },
};

function PaymentPage({
    total,
    onBack,
    onComplete,
}: PaymentPageProps) {
    const activeBusinessProfile =
        getActiveBusinessOperatingProfile();

    const activeRegisterProfile =
        getActiveRegisterProfile();

    const primaryPaymentMethods:
        PrimaryPaymentMethod[] =
        resolvePaymentMethods(
            activeBusinessProfile
                .paymentMethods,
        )
            .filter(
                (method) =>
                    method.isActive &&
                    isPaymentMethodRuntimeAvailable(
                        method.code,
                    ) &&
                    (
                        method.code !==
                            "external_credit" ||
                        activeRegisterProfile
                            .hardware
                            .paymentTerminalEnabled
                    ),
            )
            .map((method) => ({
                code:
                    method.code,

                icon:
                    paymentMethodPresentation[
                        method.code
                    ].icon,

                title:
                    method.name,

                description:
                    paymentMethodPresentation[
                        method.code
                    ].description,
            }));
    const [selectedMethod, setSelectedMethod] =
        useState<PaymentMethodCode | null>(null);
    const [payments, setPayments] =
        useState<Payment[]>([]);
    const [cashChangeNotice, setCashChangeNotice] =
        useState<number | null>(null);
    const [replacementVoucherNotice, setReplacementVoucherNotice] =
        useState<VoucherNotice | null>(null);
    const [pendingCompletionPayments, setPendingCompletionPayments] =
        useState<Payment[] | null>(null);

    const paymentTotals =
        useMemo(
            () => calculatePaymentTotals(total, payments),
            [total, payments],
        );

    const remainingAmount =
        paymentTotals.remainingAmount;

    const pendingStoreCreditAmount =
        payments
            .filter(
                (payment) =>
                    payment.status ===
                        "approved" &&
                    payment.method ===
                        "store_credit",
            )
            .reduce(
                (sum, payment) =>
                    sum +
                    payment.amount,
                0,
            );

    const finalizeOrStore = (
        nextPayments: Payment[],
    ) => {
        const nextTotals =
            calculatePaymentTotals(
                total,
                nextPayments,
            );

        if (nextTotals.isFullyPaid) {
            onComplete(nextPayments);
            return;
        }

        setPayments(nextPayments);
        setSelectedMethod(null);
    };
    const addStoreCreditPayment = (
        amount: number,
        customerId: string,
        managerApproval?:
            Payment["storeCreditManagerApproval"],
    ) => {
        const normalizedAmount =
            Math.round(
                (
                    amount +
                    Number.EPSILON
                ) * 100,
            ) / 100;

        if (
            remainingAmount <= 0 ||
            normalizedAmount <= 0 ||
            normalizedAmount >
                remainingAmount + 0.001
        ) {
            return;
        }

        const payment: Payment = {
            id:
                crypto.randomUUID(),

            method:
                "store_credit",

            status:
                "approved",

            amount:
                normalizedAmount,

            externalReference:
                customerId,

            storeCreditManagerApproval:
                managerApproval,

            createdAt:
                new Date().toISOString(),
        };

        finalizeOrStore([
            ...payments,
            payment,
        ]);
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
            id: crypto.randomUUID(),
            method: "cash",
            status: "approved",
            amount: cashPayment.amount,
            tenderedAmount:
                cashPayment.tenderedAmount,
            changeAmount:
                cashPayment.changeAmount,
            createdAt:
                new Date().toISOString(),
        };

        /*
         * Drawer opening is triggered by the approved
         * cash payment itself, not by receipt printing.
         *
         * This is important for split payments:
         * cash may be accepted while the transaction
         * remains open for another payment method.
         */
        requestCashDrawerOpen(
            "cash_payment",
        );

        const nextPayments = [
            ...payments,
            payment,
        ];

        const nextTotals =
            calculatePaymentTotals(
                total,
                nextPayments,
            );

        /*
         * When change must be returned, preserve the
         * payment immediately and stop on the change
         * notice before continuing/completing.
         */
        if (
            cashPayment.changeAmount >
            0
        ) {
            setPayments(
                nextPayments,
            );

            setPendingCompletionPayments(
                nextTotals.isFullyPaid
                    ? nextPayments
                    : null,
            );

            setCashChangeNotice(
                cashPayment.changeAmount,
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

    const addReferencedPayment = (
        method:
            | "echo"
            | "external_credit",
        amount: number,
        reference: string,
    ) => {
        if (
            remainingAmount <= 0 ||
            amount <= 0
        ) {
            return;
        }

        const payment: Payment = {
            id: crypto.randomUUID(),
            method,
            status: "approved",
            amount: Math.min(
                amount,
                remainingAmount,
            ),
            ...(method ===
            "external_credit"
                ? {
                      externalReference:
                          reference,
                  }
                : {
                      providerReference:
                          reference,
                  }),
            createdAt:
                new Date().toISOString(),
        };

        finalizeOrStore([
            ...payments,
            payment,
        ]);
    };

    const redeemStoredValue = (
        method: "credit_voucher" | "gift_card",
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
            method === "credit_voucher"
                ? redemption.cashChangeAmount
                : 0;

        const voucherPayment: Payment = {
            id: paymentId,
            method,
            status: "approved",
            amount:
                redemption.redeemedAmount +
                cashChangeAmount,
            externalReference: number,
            providerReference:
                redemption.monetaryValue.id,
            createdAt:
                new Date().toISOString(),
        };

        const cashChangePayment:
            Payment | null =
            cashChangeAmount > 0
                ? {
                      id: crypto.randomUUID(),
                      method: "cash",
                      status: "approved",
                      amount: -cashChangeAmount,
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
                ? [cashChangePayment]
                : []),
        ];

        const nextTotals =
            calculatePaymentTotals(
                total,
                nextPayments,
            );

        if (cashChangeAmount > 0) {
            setPayments(nextPayments);
            setPendingCompletionPayments(
                nextTotals.isFullyPaid
                    ? nextPayments
                    : null,
            );
            setCashChangeNotice(
                cashChangeAmount,
            );
            setSelectedMethod(null);
            return;
        }

        const replacement =
            redemption
                .replacementMonetaryValue ??
            (
                redemption
                    .monetaryValue
                    .replacementMonetaryValueId
                    ? getMonetaryValue(
                          redemption
                              .monetaryValue
                              .replacementMonetaryValueId,
                      )
                    : undefined
            );

        if (
            method === "credit_voucher" &&
            replacement
        ) {
            setPayments(nextPayments);
            setPendingCompletionPayments(
                nextTotals.isFullyPaid
                    ? nextPayments
                    : null,
            );
            setReplacementVoucherNotice({
                number:
                    replacement.number,
                amount:
                    replacement.originalAmount,
            });
            setSelectedMethod(null);
            return;
        }

        finalizeOrStore(nextPayments);
    };

    const restoreStoredValuePayment = (
        payment: Payment,
    ) => {
        if (
            (
                payment.method !== "credit_voucher" &&
                payment.method !== "gift_card"
            ) ||
            !payment.externalReference
        ) {
            return;
        }

        restoreMonetaryValue({
            number:
                payment.externalReference,
            amount:
                payment.amount,
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
                    item.id === paymentId,
            );

        if (payment) {
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

    const finishPendingCompletion =
        () => {
            const next =
                pendingCompletionPayments;

            setPendingCompletionPayments(
                null,
            );

            if (next) {
                onComplete(next);
            }
        };

    const noticeShell = (
        title: string,
        body: React.ReactNode,
        onConfirm: () => void,
    ) => (
        <div
            role="presentation"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 6000,
                display: "grid",
                placeItems: "center",
                padding: "24px",
                background:
                    "rgb(20 23 27 / 32%)",
            }}
        >
            <div
                dir="rtl"
                role="dialog"
                aria-modal="true"
                style={{
                    width:
                        "min(420px, 100%)",
                    padding: "20px",
                    border:
                        "1px solid #e4e5e7",
                    borderRadius: "14px",
                    background: "#fff",
                    boxShadow:
                        "0 18px 50px rgb(15 18 21 / 22%)",
                }}
            >
                <h2
                    style={{
                        margin: "0 0 12px",
                        fontSize: "18px",
                        fontWeight: 700,
                    }}
                >
                    {title}
                </h2>

                {body}

                <button
                    type="button"
                    onClick={onConfirm}
                    style={{
                        width: "100%",
                        minHeight: "40px",
                        marginTop: "14px",
                        border: 0,
                        borderRadius: "9px",
                        background:
                            "var(--primary)",
                        color: "#fff",
                        fontWeight: 700,
                        cursor: "pointer",
                    }}
                >
                    אישור והמשך
                </button>
            </div>
        </div>
    );

    return (
        <section
            className="payment-page"
            aria-labelledby="payment-page-title"
        >
            <header className="payment-page__header">
                <button
                    type="button"
                    className="payment-page__back"
                    onClick={handleBack}
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
                        (method) => (
                            <button
                                key={method.code}
                                type="button"
                                className={`payment-method-card ${
                                    selectedMethod ===
                                    method.code
                                        ? "payment-method-card--active"
                                        : ""
                                }`}
                                disabled={
                                    remainingAmount <= 0
                                }
                                onClick={() =>
                                    setSelectedMethod(
                                        method.code,
                                    )
                                }
                            >
                                <span className="payment-method-card__icon">
                                    <PaymentMethodIcon code={method.code} />
                                </span>

                                <strong>
                                    {method.title}
                                </strong>

                                <span>
                                    {method.description}
                                </span>
                            </button>
                        ),
                    )}
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

                    <PaymentMethodRenderer
                        selectedMethod={
                            selectedMethod
                        }
                        remainingAmount={
                            remainingAmount
                        }
                        pendingStoreCreditAmount={
                            pendingStoreCreditAmount
                        }
                        onAddCashPayment={
                            addCashPayment
                        }
                        onApproveReferencedPayment={
                            addReferencedPayment
                        }                        onAddStoreCreditPayment={
                            addStoreCreditPayment
                        }

                        onRedeemStoredValue={
                            redeemStoredValue
                        }
                    />
                </aside>
            </div>

            {cashChangeNotice !== null &&
                noticeShell(
                    "עודף ללקוח",
                    <div
                        style={{
                            display: "flex",
                            justifyContent:
                                "space-between",
                            padding:
                                "12px 0",
                            borderTop:
                                "1px solid #eceeef",
                            borderBottom:
                                "1px solid #eceeef",
                        }}
                    >
                        <span>
                            עודף להחזרה
                        </span>

                        <strong>
                            ₪
                            {cashChangeNotice.toFixed(
                                2,
                            )}
                        </strong>
                    </div>,
                    () => {
                        setCashChangeNotice(
                            null,
                        );
                        finishPendingCompletion();
                    },
                )}

            {replacementVoucherNotice &&
                noticeShell(
                    "הונפק זיכוי חדש",
                    <div
                        style={{
                            display: "grid",
                            gap: "10px",
                            padding:
                                "12px 0",
                            borderTop:
                                "1px solid #eceeef",
                            borderBottom:
                                "1px solid #eceeef",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent:
                                    "space-between",
                            }}
                        >
                            <span>
                                מספר זיכוי
                            </span>

                            <strong dir="ltr">
                                {
                                    replacementVoucherNotice.number
                                }
                            </strong>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                justifyContent:
                                    "space-between",
                            }}
                        >
                            <span>
                                יתרה חדשה
                            </span>

                            <strong>
                                ₪
                                {replacementVoucherNotice.amount.toFixed(
                                    2,
                                )}
                            </strong>
                        </div>
                    </div>,
                    () => {
                        setReplacementVoucherNotice(
                            null,
                        );
                        finishPendingCompletion();
                    },
                )}
        </section>
    );
}

export default PaymentPage;
