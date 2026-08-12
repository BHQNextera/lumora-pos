import {
    useEffect,
    useState,
} from "react";

import type {
    DocumentCopyType,
    SaleDocument,
} from "../../models/document/Document";
import {
    getNextDocumentCopyType,
    recordDocumentScreenView,
    registerDocumentOutput,
} from "../../models/document/DocumentOutputService";
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

function formatMoney(
    value: number,
) {
    const sign =
        value < 0
            ? "−"
            : "";

    return `${sign}₪${Math.abs(
        value,
    ).toFixed(2)}`;
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

    const [
        displayCopyType,
        setDisplayCopyType,
    ] = useState<DocumentCopyType>(
        document
            ? getNextDocumentCopyType(
                document.id,
            )
            : "original",
    );

    useEffect(() => {
        if (!document) {
            return;
        }

        recordDocumentScreenView(
            document.id,
        );

        setDisplayCopyType(
            getNextDocumentCopyType(
                document.id,
            ),
        );
    }, [document]);

    const printDocument = () => {
        if (!document) {
            return;
        }

        const output =
            registerDocumentOutput(
                document.id,
                "print",
            );

        setDisplayCopyType(
            output.copyType,
        );

        window.setTimeout(() => {
            window.print();

            setDisplayCopyType(
                getNextDocumentCopyType(
                    document.id,
                ),
            );
        }, 0);
    };

    const taxBase =
        sale.total - sale.tax;

    const hasIdentifiedCustomer =
        Boolean(
            sale.customer.id ||
            sale.customer.phone ||
            sale.customer.name !==
            "לקוח מזדמן",
        );

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
                        מסמך חשבונאי
                    </span>

                    <h1>
                        {documentTitle}
                    </h1>
                </div>
            </header>

            <div className="receipt-page__workspace">
                <article className="receipt">
                    <header className="receipt__business">
                        <div className="receipt__business-mark">
                            CT
                        </div>

                        <div>
                            <strong>
                                Coffee Time
                            </strong>

                            <span>
                                סניף רחובות
                            </span>
                        </div>
                    </header>

                    <section className="receipt__identity">
                        <div className="receipt__identity-main">
                            <h2>
                                {documentTitle}
                            </h2>

                            {document && (
                                <strong
                                    className="receipt__document-number"
                                    dir="ltr"
                                >
                                    {document.number}
                                </strong>
                            )}
                        </div>

                        <span className="receipt__copy-badge">
                            {displayCopyType ===
                                "copy"
                                ? "העתק"
                                : "מקור"}
                        </span>
                    </section>

                    <section className="receipt__meta">
                        <div>
                            <span>
                                מספר עסקה
                            </span>

                            <strong dir="ltr">
                                {sale.number}
                            </strong>
                        </div>

                        <div>
                            <span>
                                תאריך ושעה
                            </span>

                            <strong>
                                {new Date(
                                    issueDate,
                                ).toLocaleString(
                                    "he-IL",
                                )}
                            </strong>
                        </div>

                        {document && (
                            <>
                                <div>
                                    <span>
                                        קופה
                                    </span>

                                    <strong dir="ltr">
                                        {
                                            document.registerCode
                                        }
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        חנות
                                    </span>

                                    <strong dir="ltr">
                                        {
                                            document.storeCode
                                        }
                                    </strong>
                                </div>
                            </>
                        )}

                        {sale.transactionType !==
                            "exchange" &&
                            document
                                ?.originalDocumentNumber && (
                                <div className="receipt__meta--wide">
                                    <span>
                                        מסמך מקור
                                    </span>

                                    <strong dir="ltr">
                                        {
                                            document
                                                .originalDocumentNumber
                                        }
                                    </strong>
                                </div>
                            )}
                    </section>

                    {hasIdentifiedCustomer && (
                        <section className="receipt__customer">
                            <div className="receipt__section-heading">
                                <span>
                                    לקוח
                                </span>
                            </div>

                            <div className="receipt__customer-grid">
                                <div>
                                    <span>
                                        שם
                                    </span>

                                    <strong>
                                        {
                                            sale.customer.name
                                        }
                                    </strong>
                                </div>

                                {sale.customer.phone && (
                                    <div>
                                        <span>
                                            טלפון
                                        </span>

                                        <strong dir="ltr">
                                            {
                                                sale.customer.phone
                                            }
                                        </strong>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    <section className="receipt__items">
                        <div className="receipt__section-heading">
                            <span>
                                פריטים
                            </span>

                            <span>
                                {sale.lines.length}
                            </span>
                        </div>

                        <div className="receipt__lines">
                            {sale.lines.map(
                                (line) => (
                                    <div
                                        className={`receipt-line ${line.kind ===
                                            "return"
                                            ? "receipt-line--return"
                                            : ""
                                            }`}
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

                                            {line.descriptionOverride && (
                                                <span className="receipt-line__description">
                                                    {
                                                        line.descriptionOverride
                                                    }
                                                </span>
                                            )}

                                            <span>
                                                {
                                                    line.quantity
                                                }{" "}
                                                ×{" "}
                                                {formatMoney(
                                                    line.unitPrice,
                                                )}
                                            </span>

                                            {line.kind ===
                                                "return" &&
                                                line.originalDocumentNumber && (
                                                    <span className="receipt-line__origin">
                                                        הוחזר ממסמך{" "}
                                                        <strong dir="ltr">
                                                            {
                                                                line.originalDocumentNumber
                                                            }
                                                        </strong>
                                                    </span>
                                                )}

                                            {line.appliedPromotions &&
                                                line
                                                    .appliedPromotions
                                                    .length >
                                                0 && (
                                                    <span className="receipt-line__promotion">
                                                        {
                                                            line.appliedPromotions
                                                                .map(
                                                                    (
                                                                        promotion,
                                                                    ) =>
                                                                        promotion.name,
                                                                )
                                                                .join(
                                                                    " · ",
                                                                )
                                                        }
                                                    </span>
                                                )}
                                        </div>

                                        <strong className="receipt-line__amount">
                                            {formatMoney(
                                                line.netAmount,
                                            )}
                                        </strong>
                                    </div>
                                ),
                            )}
                        </div>
                    </section>

                    <section className="receipt__summary">
                        <div>
                            <span>
                                סכום ביניים
                            </span>

                            <strong>
                                {formatMoney(
                                    sale.subtotal,
                                )}
                            </strong>
                        </div>

                        {sale.discount > 0 && (
                            <div>
                                <span>
                                    הנחות
                                </span>

                                <strong>
                                    −₪
                                    {sale.discount.toFixed(
                                        2,
                                    )}
                                </strong>
                            </div>
                        )}

                        <div>
                            <span>
                                לפני מע״מ
                            </span>

                            <strong>
                                {formatMoney(
                                    taxBase,
                                )}
                            </strong>
                        </div>

                        <div>
                            <span>
                                מע״מ
                            </span>

                            <strong>
                                {formatMoney(
                                    sale.tax,
                                )}
                            </strong>
                        </div>

                        <div className="receipt__grand-total">
                            <span>
                                סה״כ
                            </span>

                            <strong>
                                {formatMoney(
                                    sale.total,
                                )}
                            </strong>
                        </div>
                    </section>

                    <section className="receipt__payments">
                        <div className="receipt__section-heading">
                            <span>
                                תשלומים / החזרים
                            </span>

                            <span>
                                {
                                    sale.payments
                                        .length
                                }
                            </span>
                        </div>

                        {sale.payments.length ===
                            0 ? (
                            <div className="receipt__empty">
                                ללא תשלום
                            </div>
                        ) : (
                            sale.payments.map(
                                (payment) => (
                                    <div
                                        className="receipt__payment"
                                        key={
                                            payment.id
                                        }
                                    >
                                        <div>
                                            <strong>
                                                {getPaymentLabel(
                                                    payment,
                                                )}
                                            </strong>

                                            {payment.tenderedAmount !==
                                                undefined && (
                                                    <span>
                                                        התקבל{" "}
                                                        {formatMoney(
                                                            payment.tenderedAmount,
                                                        )}
                                                    </span>
                                                )}

                                            {(payment.changeAmount ??
                                                0) >
                                                0 && (
                                                    <span>
                                                        עודף{" "}
                                                        {formatMoney(
                                                            payment.changeAmount ??
                                                            0,
                                                        )}
                                                    </span>
                                                )}
                                        </div>

                                        <strong>
                                            {formatMoney(
                                                payment.amount,
                                            )}
                                        </strong>
                                    </div>
                                ),
                            )
                        )}
                    </section>

                    <section className="receipt__barcode">
                        <div
                            className="receipt__barcode-placeholder"
                            aria-label="מזהה ברקוד למסמך"
                        >
                            <span />
                            <span />
                            <span />
                            <span />
                            <span />
                            <span />
                            <span />
                            <span />
                            <span />
                            <span />
                            <span />
                            <span />
                        </div>

                        <strong dir="ltr">
                            {document?.number ??
                                sale.number}
                        </strong>

                        <span>
                            מזהה לסריקת העסקה
                        </span>
                    </section>

                    <section className="receipt__legal">
                        <span>
                            אזור מידע חשבונאי /
                            משפטי לפי הגדרת בית
                            העסק והמדינה
                        </span>
                    </section>
                </article>

                <aside className="receipt-page__actions">
                    <button
                        type="button"
                        className="receipt-page__primary"
                        onClick={
                            printDocument
                        }
                        disabled={!document}
                    >
                        הדפס מסמך
                    </button>

                    <button type="button">
                        שלח מסמך
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