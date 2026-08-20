import type {
    AccountingDocumentData,
} from "../../models/document/AccountingDocumentData";

type AccountingDocumentStandardRendererProps = {
    data: AccountingDocumentData;
};

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

function AccountingDocumentStandardRenderer({
    data,
}: AccountingDocumentStandardRendererProps) {
    return (
        <article className="receipt">
            <header className="receipt__business">
                <div className="receipt__business-mark">
                    CT
                </div>

                <div>
                    <strong>
                        {data.business.name}
                    </strong>

                    {data.business.branchName && (
                        <span>
                            {data.business.branchName}
                        </span>
                    )}
                </div>
            </header>

            <section className="receipt__identity">
                <div className="receipt__identity-main">
                    <h2>
                        {data.identity.title}
                    </h2>

                    <strong
                        className="receipt__document-number"
                        dir="ltr"
                    >
                        {data.identity.number}
                    </strong>
                </div>

                <span className="receipt__copy-badge">
                    {data.identity.copyType ===
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
                        {
                            data.identity
                                .transactionNumber
                        }
                    </strong>
                </div>

                <div>
                    <span>
                        תאריך ושעה
                    </span>

                    <strong>
                        {new Date(
                            data.identity.issuedAt,
                        ).toLocaleString(
                            "he-IL",
                        )}
                    </strong>
                </div>

                {data.identity.registerCode && (
                    <div>
                        <span>
                            קופה
                        </span>

                        <strong dir="ltr">
                            {
                                data.identity
                                    .registerCode
                            }
                        </strong>
                    </div>
                )}

                {data.identity.storeCode && (
                    <div>
                        <span>
                            חנות
                        </span>

                        <strong dir="ltr">
                            {
                                data.identity
                                    .storeCode
                            }
                        </strong>
                    </div>
                )}

                {data.identity.originalDocument && (
                    <div className="receipt__meta--wide">
                        <span>
                            מסמך מקור
                        </span>

                        <strong dir="ltr">
                            {
                                data.identity
                                    .originalDocument
                                    .number
                            }
                        </strong>
                    </div>
                )}
            </section>

            {data.customer && (
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
                                {data.customer.name}
                            </strong>
                        </div>

                        {data.customer.phone && (
                            <div>
                                <span>
                                    טלפון
                                </span>

                                <strong dir="ltr">
                                    {
                                        data.customer
                                            .phone
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
                        {data.lines.length}
                    </span>
                </div>

                <div className="receipt__lines">
                    {data.lines.map(
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

                                    {line.description && (
                                        <span className="receipt-line__description">
                                            {
                                                line.description
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

                                    {line.sourceDocument && (
                                        <span className="receipt-line__origin">
                                            הוחזר ממסמך{" "}
                                            <strong dir="ltr">
                                                {
                                                    line.sourceDocument
                                                        .number
                                                }
                                            </strong>
                                        </span>
                                    )}

                                    {line
                                        .promotionNames
                                        .length >
                                        0 && (
                                            <span className="receipt-line__promotion">
                                                {line.promotionNames.join(
                                                    " · ",
                                                )}
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

            {/* CANCELLATION_FEE_V1 */}
            {(data.cancellationFeeAmount ?? 0) > 0 && (
                <div className="receipt-line">
                    <div className="receipt-line__main">
                        <strong>
                            דמי ביטול
                        </strong>
                        <span>
                            5% או ₪100 — הנמוך מביניהם
                        </span>
                    </div>

                    <strong className="receipt-line__amount">
                        {formatMoney(
                            data.cancellationFeeAmount ?? 0,
                        )}
                    </strong>
                </div>
            )}
            <section className="receipt__summary">
                <div>
                    <span>
                        סכום ביניים
                    </span>

                    <strong>
                        {formatMoney(
                            data.totals
                                .subtotal,
                        )}
                    </strong>
                </div>

                {data.totals.discount >
                    0 && (
                        <div>
                            <span>
                                הנחות
                            </span>

                            <strong>
                                −₪
                                {data.totals.discount.toFixed(
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
                            data.totals
                                .beforeTax,
                        )}
                    </strong>
                </div>

                <div>
                    <span>
                        מע״מ
                    </span>

                    <strong>
                        {formatMoney(
                            data.totals.tax,
                        )}
                    </strong>
                </div>

                <div className="receipt__grand-total">
                    <span>
                        סה״כ
                    </span>

                    <strong>
                        {formatMoney(
                            data.totals.total,
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
                        {data.payments.length}
                    </span>
                </div>

                {data.payments.length ===
                    0 ? (
                    <div className="receipt__empty">
                        ללא תשלום
                    </div>
                ) : (
                    data.payments.map(
                        (payment) => (
                            <div
                                className="receipt__payment"
                                key={
                                    payment.id
                                }
                            >
                                <div>
                                    <strong>
                                        {
                                            payment.label
                                        }
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
                    {
                        data.barcode
                            .displayValue
                    }
                </strong>

                <span>
                    מזהה לסריקת העסקה
                </span>
            </section>

            {data.legalLines.length >
                0 && (
                    <section className="receipt__legal">
                        {data.legalLines.map(
                            (line) => (
                                <span
                                    key={
                                        line
                                    }
                                >
                                    {line}
                                </span>
                            ),
                        )}
                    </section>
                )}
        </article>
    );
}
export default AccountingDocumentStandardRenderer;
