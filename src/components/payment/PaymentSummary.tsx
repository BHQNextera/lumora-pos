import type { Payment } from "../../models/Payment";

import "./PaymentSummary.css";

type PaymentSummaryProps = {
    saleTotal: number;
    payments: Payment[];
    remainingAmount: number;
    onRemovePayment?: (paymentId: string) => void;
};

function PaymentSummary({
    saleTotal,
    payments,
    remainingAmount,
    onRemovePayment,
}: PaymentSummaryProps) {
    return (
        <section className="payment-summary" aria-label="סיכום תשלומים">
            <div className="payment-summary__total">
                <span>סה״כ לתשלום</span>
                <strong>₪{saleTotal.toFixed(2)}</strong>
            </div>

            <div className="payment-summary__payments">
                {payments.length === 0 ? (
                    <div className="payment-summary__empty">
                        טרם נרשמו תשלומים
                    </div>
                ) : (
                    payments.map((payment) => (
                        <div
                            key={payment.id}
                            className="payment-summary__row"
                        >
                            <div>
                                <strong>{payment.method}</strong>
                                <span>₪{payment.amount.toFixed(2)}</span>
                            </div>

                            {onRemovePayment && (
                                <button
                                    type="button"
                                    onClick={() => onRemovePayment(payment.id)}
                                >
                                    הסר
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            <div className="payment-summary__remaining">
                <span>נותר לתשלום</span>
                <strong>₪{remainingAmount.toFixed(2)}</strong>
            </div>
        </section>
    );
}

export default PaymentSummary;