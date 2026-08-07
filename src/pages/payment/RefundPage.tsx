import { useState } from "react";

import type { Payment } from "../../models/Payment";

import "./refund-page.css";

type RefundMethod =
    | "cash"
    | "card_terminal"
    | "credit_voucher";

type RefundPageProps = {
    total: number;
    onBack: () => void;
    onComplete: (payments: Payment[]) => void;
};

function RefundPage({
    total,
    onBack,
    onComplete,
}: RefundPageProps) {
    const refundAmount = Math.abs(total);

    const [selectedMethod, setSelectedMethod] =
        useState<RefundMethod | null>(null);

    const completeRefund = () => {
        if (!selectedMethod) {
            return;
        }

        const payment: Payment = {
            id: crypto.randomUUID(),
            method: selectedMethod,
            status: "approved",
            amount: -refundAmount,
            createdAt: new Date().toISOString(),
        };

        onComplete([payment]);
    };

    return (
        <section className="refund-page">
            <header className="refund-page__header">
                <button
                    type="button"
                    onClick={onBack}
                >
                    חזרה לעסקה
                </button>

                <div>
                    <p>החזר כספי</p>
                    <h1>
                        ₪{refundAmount.toFixed(2)}
                    </h1>
                </div>
            </header>

            <div className="refund-page__methods">
                <button
                    type="button"
                    className={
                        selectedMethod === "cash"
                            ? "refund-method refund-method--active"
                            : "refund-method"
                    }
                    onClick={() =>
                        setSelectedMethod("cash")
                    }
                >
                    <strong>מזומן</strong>
                    <span>החזר במזומן</span>
                </button>

                <button
                    type="button"
                    className={
                        selectedMethod === "card_terminal"
                            ? "refund-method refund-method--active"
                            : "refund-method"
                    }
                    onClick={() =>
                        setSelectedMethod(
                            "card_terminal",
                        )
                    }
                >
                    <strong>זיכוי אשראי</strong>
                    <span>החזר לכרטיס</span>
                </button>

                <button
                    type="button"
                    className={
                        selectedMethod === "credit_voucher"
                            ? "refund-method refund-method--active"
                            : "refund-method"
                    }
                    onClick={() =>
                        setSelectedMethod(
                            "credit_voucher",
                        )
                    }
                >
                    <strong>שובר זיכוי</strong>
                    <span>
                        לפי נהלי בית העסק
                    </span>
                </button>
            </div>

            <button
                type="button"
                className="refund-page__confirm"
                disabled={!selectedMethod}
                onClick={completeRefund}
            >
                אישור החזר · ₪
                {refundAmount.toFixed(2)}
            </button>
        </section>
    );
}

export default RefundPage;