import type {
    SaleDocument,
} from "../../models/document/Document";
import type { Payment } from "../../models/Payment";
import type { Sale } from "../../models/sale/Sale";

import "./receipt-page.css";

type ReceiptPageProps = {
    sale: Sale;
    document: SaleDocument | null;
    onBack: () => void;
};

function getDocumentTitle(
    document: SaleDocument | null,
): string {
    switch (document?.type) {
        case "tax_invoice_receipt":
            return "חשבונית מס / קבלה";

        case "receipt":
            return "קבלה";

        case "tax_credit_invoice":
            return "חשבונית מס זיכוי";

        case "credit_receipt":
            return "קבלת זיכוי";

        case "exchange_note":
            return "פתק החלפה";

        case "credit_voucher":
            return "שובר זיכוי";

        case "gift_card_receipt":
            return "קבלת Gift Card";

        default:
            return "מסמך עסקה";
    }
}

function getPaymentLabel(
    payment: Payment,
): string {
    switch (payment.method) {
        case "cash":
            return "מזומן";

        case "card_terminal":
            return "כרטיס אשראי";

        case "echo":
            return "Echo";

        case "credit_voucher":
            return "שובר זיכוי";

        case "gift_card":
            return "Gift Card";

        case "store_credit":
            return "זיכוי לקוח";

        case "bank_transfer":
            return "העברה בנקאית";

        case "bit":
            return "Bit";

        case "paybox":
            return "PayBox";

        case "cheque":
            return "המחאה";

        case "external_credit":
            return "אשראי חיצוני";

        default:
            return payment.method;
    }
}

function ReceiptPage({
    sale,
    document,
    onBack,
}: ReceiptPageProps) {
    const documentTitle =
        getDocumentTitle(document);

    const issueDate =
        document?.originalIssueAt ??
        sale.completedAt ??
        sale.createdAt;

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
                    <span>
                        מסמך עסקה
                    </span>
                    <h1>
                        {documentTitle}
                    </h1>
                </div>
            </header>

            <div className="receipt-page__workspace">
                <article className="receipt">
                    <header className="receipt__business">
                        <strong>
                            Coffee Time
                        </strong>
                        <span>
                            סניף רחובות
                        </span>
                    </header>

                    <div className="receipt__document-title">
                        <strong>
                            {documentTitle}
                        </strong>
                        <span>
                            {document?.status ===
                            "reissued_copy"
                                ? "העתק"
                                : "מקור"}
                        </span>
                    </div>

                    <div className="receipt__meta">
                        {document && (
                            <div>
                                <span>
                                    מספר מסמך
                                </span>
                                <strong>
                                    {
                                        document.number
                                    }
                                </strong>
                            </div>
                        )}

                        <div>
                            <span>
                                מספר עסקה
                            </span>
                            <strong>
                                {sale.number}
                            </strong>
                        </div>

                        <div>
                            <span>
                                תאריך
                            </span>
                            <strong>
                                {new Date(
                                    issueDate,
                                ).toLocaleString(
                                    "he-IL",
                                )}
                            </strong>
                        </div>

                        {document
                            ?.originalDocumentNumber && (
                            <div>
                                <span>
                                    מסמך מקור
                                </span>
                                <strong>
                                    {
                                        document
                                            .originalDocumentNumber
                                    }
                                </strong>
                            </div>
                        )}
                    </div>

                    <div className="receipt__lines">
                        {sale.lines.map(
                            (line) => (
                                <div
                                    className="receipt-line"
                                    key={
                                        line.id
                                    }
                                >
                                    <div className="receipt-line__main">
                                        <strong>
                                            {
                                                line.productName
                                            }
                                        </strong>

                                        <span>
                                            {
                                                line.quantity
                                            }{" "}
                                            × ₪
                                            {line.unitPrice.toFixed(
                                                2,
                                            )}
                                        </span>
                                    </div>

                                    <strong>
                                        ₪
                                        {line.netAmount.toFixed(
                                            2,
                                        )}
                                    </strong>
                                </div>
                            ),
                        )}
                    </div>

                    <div className="receipt__totals">
                        <div>
                            <span>
                                סכום ביניים
                            </span>
                            <strong>
                                ₪
                                {sale.subtotal.toFixed(
                                    2,
                                )}
                            </strong>
                        </div>

                        {sale.discount > 0 && (
                            <div className="receipt__discount">
                                <span>
                                    הנחות
                                </span>
                                <strong>
                                    ‎-₪
                                    {sale.discount.toFixed(
                                        2,
                                    )}
                                </strong>
                            </div>
                        )}

                        <div className="receipt__grand-total">
                            <span>
                                סה״כ
                            </span>
                            <strong>
                                ₪
                                {sale.total.toFixed(
                                    2,
                                )}
                            </strong>
                        </div>
                    </div>

                    <div className="receipt__payments">
                        <h2>
                            תשלומים
                        </h2>

                        {sale.payments.map(
                            (payment) => (
                                <div
                                    className="receipt__payment"
                                    key={
                                        payment.id
                                    }
                                >
                                    <span>
                                        {getPaymentLabel(
                                            payment,
                                        )}
                                    </span>

                                    <strong>
                                        ₪
                                        {payment.amount.toFixed(
                                            2,
                                        )}
                                    </strong>
                                </div>
                            ),
                        )}
                    </div>

                    <footer className="receipt__footer">
                        תודה ולהתראות
                    </footer>
                </article>

                <aside className="receipt-page__actions">
                    <button
                        type="button"
                        className="receipt-page__primary"
                        onClick={() =>
                            window.print()
                        }
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
