import type { Payment } from "../../models/Payment";
import {
    formatMoney,
} from "../../utils/MoneyFormatter";

import "./PaymentSummary.css";

type PaymentSummaryProps = {
    saleTotal: number;
    payments: Payment[];
    remainingAmount: number;
    onRemovePayment?: (paymentId: string) => void;
};
function formatPaymentMethod(
    method: string,
) {
    const labels: Record<
        string,
        string
    > = {
        cash: "מזומן",
        card_terminal: "אשראי",
        echo: "Echo",
        credit_voucher: "שובר זיכוי",
        gift_card: "כרטיס מתנה",
        store_credit: "יתרת לקוח",
        bit: "Bit",
        paybox: "PayBox",
        bank_transfer: "העברה בנקאית",
        cheque: "המחאה",
        external_credit: "אשראי חיצוני",
        custom: "אמצעי תשלום נוסף",
    };

    return labels[method] ?? method;
}

function PaymentSummary({
    saleTotal,
    payments,
    remainingAmount,
    onRemovePayment,
}: PaymentSummaryProps) {
    const paidAmount =
        payments.reduce(
            (sum, payment) =>
                sum + payment.amount,
            0,
        );

    return (
        <section
            className="payment-summary"
            aria-label="סיכום תשלומים"
        >
            <div className="payment-summary__metrics">
                <div className="payment-summary__metric">
                    <span>סה״כ עסקה</span>
                    <strong className="lumora-money-value">
                        {formatMoney(saleTotal)}
                    </strong>
                </div>

                <div className="payment-summary__metric payment-summary__metric--paid">
                    <span>שולם</span>
                    <strong className="lumora-money-value">
                        {formatMoney(paidAmount)}
                    </strong>
                </div>

                <div className="payment-summary__metric payment-summary__metric--remaining">
                    <span>נותר לתשלום</span>
                    <strong className="lumora-money-value">
                        {formatMoney(remainingAmount)}
                    </strong>
                </div>
            </div>

            {payments.length > 0 && (
                <div className="payment-summary__payments">
                    <div className="payment-summary__payments-label">
                        תשלומים שנרשמו
                    </div>

                    {payments.map((payment) => (
                        <div
                            key={payment.id}
                            className="payment-summary__row"
                        >
                            <div>
                                <strong>
                                    {formatPaymentMethod(
                                        payment.method,
                                    )}
                                </strong>

                                <span className="lumora-money-value">
                                    {formatMoney(payment.amount)}
                                </span>
                            </div>

                            {onRemovePayment && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        onRemovePayment(
                                            payment.id,
                                        )
                                    }
                                >
                                    הסר
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

export default PaymentSummary;
