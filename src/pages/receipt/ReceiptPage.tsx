import type { Sale } from "../../models/sale/Sale";

import "./receipt-page.css";

type ReceiptPageProps = {
    sale: Sale;
    onBack: () => void;
};

function ReceiptPage({
    sale,
    onBack,
}: ReceiptPageProps) {
    return (
        <section className="receipt-page">
            <header className="receipt-page__header">
                <button
                    type="button"
                    className="receipt-page__back"
                    onClick={onBack}
                >
                    חזרה
                </button>

                <div>
                    <span>מסמך עסקה</span>
                    <h1>חשבונית מס / קבלה</h1>
                </div>
            </header>

            <div className="receipt-page__workspace">
                <article className="receipt">
                    <header className="receipt__business">
                        <strong>Coffee Time</strong>
                        <span>סניף רחובות</span>
                    </header>

                    <div className="receipt__document-title">
                        <strong>חשבונית מס / קבלה</strong>
                        <span>מקור</span>
                    </div>

                    <div className="receipt__meta">
                        <div>
                            <span>מספר עסקה</span>
                            <strong>{sale.number}</strong>
                        </div>

                        <div>
                            <span>תאריך</span>
                            <strong>
                                {new Date(
                                    sale.completedAt ?? sale.createdAt,
                                ).toLocaleString("he-IL")}
                            </strong>
                        </div>
                    </div>

                    <div className="receipt__lines">
                        {sale.lines.map((line) => (
                            <div
                                className="receipt-line"
                                key={line.id}
                            >
                                <div className="receipt-line__main">
                                    <strong>
                                        {line.productName}
                                    </strong>

                                    <span>
                                        {line.quantity} × ₪
                                        {line.unitPrice.toFixed(2)}
                                    </span>
                                </div>

                                <strong>
                                    ₪{line.netAmount.toFixed(2)}
                                </strong>
                            </div>
                        ))}
                    </div>

                    <div className="receipt__totals">
                        <div>
                            <span>סכום ביניים</span>
                            <strong>
                                ₪{sale.subtotal.toFixed(2)}
                            </strong>
                        </div>

                        {sale.discount > 0 && (
                            <div className="receipt__discount">
                                <span>הנחות</span>
                                <strong>
                                    ‎-₪{sale.discount.toFixed(2)}
                                </strong>
                            </div>
                        )}

                        <div className="receipt__grand-total">
                            <span>סה״כ</span>
                            <strong>
                                ₪{sale.total.toFixed(2)}
                            </strong>
                        </div>
                    </div>

                    <div className="receipt__payments">
                        <h2>תשלומים</h2>

                        {sale.payments.map((payment) => (
                            <div
                                className="receipt__payment"
                                key={payment.id}
                            >
                                <span>
                                    {payment.method === "cash"
                                        ? "מזומן"
                                        : payment.method}
                                </span>

                                <strong>
                                    ₪{payment.amount.toFixed(2)}
                                </strong>
                            </div>
                        ))}
                    </div>

                    <footer className="receipt__footer">
                        תודה ולהתראות
                    </footer>
                </article>

                <aside className="receipt-page__actions">
                    <button
                        type="button"
                        className="receipt-page__primary"
                    >
                        הדפס מסמך
                    </button>

                    <button type="button">
                        שלח ב־WhatsApp
                    </button>

                    <button type="button">
                        פתק החלפה
                    </button>
                </aside>
            </div>
        </section>
    );
}

export default ReceiptPage;