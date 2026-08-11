import {
    useState,
} from "react";

import {
    storedValuePolicy,
} from "../../config/storedValuePolicy";
import type {
    Payment,
} from "../../models/Payment";

import "./refund-page.css";

type RefundMethod =
    | "cash"
    | "card_terminal"
    | "credit_voucher";

type RefundPageProps = {
    total: number;
    onBack: () => void;
    onComplete: (
        payments: Payment[],
    ) => void;
};

function RefundPage({
    total,
    onBack,
    onComplete,
}: RefundPageProps) {
    const refundAmount =
        Math.abs(total);

    const [
        selectedMethod,
        setSelectedMethod,
    ] =
        useState<RefundMethod | null>(
            null,
        );

    const [
        smallRefundNotice,
        setSmallRefundNotice,
    ] =
        useState(false);

    const voucherThreshold =
        storedValuePolicy
            .creditVoucherCashRemainderThreshold;

    const isSmallRefund =
        refundAmount > 0 &&
        refundAmount <=
            voucherThreshold;

    const selectMethod = (
        method: RefundMethod,
    ) => {
        if (
            method ===
                "credit_voucher" &&
            isSmallRefund
        ) {
            setSelectedMethod(
                "cash",
            );
            setSmallRefundNotice(
                true,
            );
            return;
        }

        setSelectedMethod(
            method,
        );
    };

    const completeRefund = () => {
        if (
            !selectedMethod
        ) {
            return;
        }

        const payment: Payment = {
            id:
                crypto.randomUUID(),
            method:
                selectedMethod,
            status:
                "approved",
            amount:
                -refundAmount,
            createdAt:
                new Date().toISOString(),
        };

        onComplete([
            payment,
        ]);
    };

    return (
        <section className="refund-page">
            <header className="refund-page__header">
                <button
                    type="button"
                    onClick={
                        onBack
                    }
                >
                    חזרה לעסקה
                </button>

                <div>
                    <p>
                        החזר כספי
                    </p>

                    <h1>
                        ₪
                        {refundAmount.toFixed(
                            2,
                        )}
                    </h1>
                </div>
            </header>

            <div className="refund-page__methods">
                <button
                    type="button"
                    className={
                        selectedMethod ===
                        "cash"
                            ? "refund-method refund-method--active"
                            : "refund-method"
                    }
                    onClick={() =>
                        selectMethod(
                            "cash",
                        )
                    }
                >
                    <strong>
                        מזומן
                    </strong>

                    <span>
                        החזר במזומן
                    </span>
                </button>

                <button
                    type="button"
                    className={
                        selectedMethod ===
                        "card_terminal"
                            ? "refund-method refund-method--active"
                            : "refund-method"
                    }
                    onClick={() =>
                        selectMethod(
                            "card_terminal",
                        )
                    }
                >
                    <strong>
                        זיכוי אשראי
                    </strong>

                    <span>
                        החזר לכרטיס
                    </span>
                </button>

                <button
                    type="button"
                    className={
                        selectedMethod ===
                        "credit_voucher"
                            ? "refund-method refund-method--active"
                            : "refund-method"
                    }
                    onClick={() =>
                        selectMethod(
                            "credit_voucher",
                        )
                    }
                >
                    <strong>
                        שובר זיכוי
                    </strong>

                    <span>
                        {isSmallRefund
                            ? `עד ₪${voucherThreshold.toFixed(
                                  2,
                              )} מוחזר במזומן`
                            : "לפי נהלי בית העסק"}
                    </span>
                </button>
            </div>

            <button
                type="button"
                className="refund-page__confirm"
                disabled={
                    !selectedMethod
                }
                onClick={
                    completeRefund
                }
            >
                אישור החזר · ₪
                {refundAmount.toFixed(
                    2,
                )}
            </button>

            {smallRefundNotice && (
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
                                "20px",
                            border:
                                "1px solid #dde4e1",
                            borderRadius:
                                "16px",
                            background:
                                "#ffffff",
                            boxShadow:
                                "0 20px 60px rgba(15, 23, 42, 0.18)",
                        }}
                    >
                        <div
                            style={{
                                color:
                                    "#78827d",
                                fontSize:
                                    "10px",
                                fontWeight:
                                    750,
                            }}
                        >
                            מדיניות החזר
                        </div>

                        <h2
                            style={{
                                margin:
                                    "7px 0 6px",
                                fontSize:
                                    "19px",
                                fontWeight:
                                    700,
                            }}
                        >
                            הסכום יוחזר במזומן
                        </h2>

                        <p
                            style={{
                                margin:
                                    0,
                                color:
                                    "#626d67",
                                fontSize:
                                    "12px",
                                lineHeight:
                                    1.6,
                            }}
                        >
                            סכום ההחזר הוא ₪
                            {refundAmount.toFixed(
                                2,
                            )}
                            , ולכן לא יונפק שובר זיכוי.
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                setSmallRefundNotice(
                                    false,
                                )
                            }
                            style={{
                                width:
                                    "100%",
                                minHeight:
                                    "40px",
                                marginTop:
                                    "15px",
                                border:
                                    0,
                                borderRadius:
                                    "10px",
                                background:
                                    "var(--primary)",
                                color:
                                    "#fff",
                                fontWeight:
                                    700,
                                cursor:
                                    "pointer",
                            }}
                        >
                            אישור
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}

export default RefundPage;
