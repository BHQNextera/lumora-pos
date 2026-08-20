import type {
    AccountingDocumentData,
} from "../../models/document/AccountingDocumentData";

import DocumentBarcode from "./DocumentBarcode";

export type ThermalPaperFormat =
    | "80mm"
    | "57mm";

type AccountingDocumentThermalRendererProps = {
    data: AccountingDocumentData;
    format?: ThermalPaperFormat;
};

function formatMoney(
    value: number,
) {
    const sign =
        value < 0
            ? "-"
            : "";

    return `${sign}₪${Math.abs(
        value,
    ).toFixed(2)}`;
}

function formatDateTime(
    value: string,
) {
    return new Date(
        value,
    ).toLocaleString(
        "he-IL",
        {
            dateStyle:
                "short",

            timeStyle:
                "short",
        },
    );
}

function AccountingDocumentThermalRenderer({
    data,
    format = "80mm",
}: AccountingDocumentThermalRendererProps) {
    return (
        <article
            className={`thermal-receipt thermal-receipt--${format}`}
            aria-label={`${data.identity.title} ${data.identity.number}`}
        >
            <header className="thermal-receipt__business">
                <strong>
                    {data.business.name}
                </strong>

                {data.business.branchName && (
                    <span>
                        {data.business.branchName}
                    </span>
                )}
            </header>

            <section className="thermal-receipt__identity">
                <strong>
                    {data.identity.title}
                </strong>

                <b dir="ltr">
                    {data.identity.number}
                </b>

                <span>
                    {data.identity.copyType ===
                    "copy"
                        ? "העתק"
                        : "מקור"}
                </span>
            </section>

            <section className="thermal-receipt__meta">
                <div className="thermal-receipt__meta-row">
                    <span>
                        תאריך
                    </span>

                    <strong>
                        {formatDateTime(
                            data.identity.issuedAt,
                        )}
                    </strong>
                </div>

                <div className="thermal-receipt__meta-inline">
                    {data.identity.registerCode && (
                        <span>
                            קופה{" "}
                            <strong dir="ltr">
                                {
                                    data.identity
                                        .registerCode
                                }
                            </strong>
                        </span>
                    )}

                    {data.identity.storeCode && (
                        <span>
                            חנות{" "}
                            <strong dir="ltr">
                                {
                                    data.identity
                                        .storeCode
                                }
                            </strong>
                        </span>
                    )}

                    <span>
                        עסקה{" "}
                        <strong dir="ltr">
                            {
                                data.identity
                                    .transactionNumber
                            }
                        </strong>
                    </span>
                </div>
            </section>

            <section className="thermal-receipt__customer">
                <div>
                    <span>
                        לקוח:
                    </span>

                    <strong>
                        {data.customer.name}
                    </strong>
                </div>

                {data.customer.phone && (
                    <div>
                        <span>
                            טלפון:
                        </span>

                        <strong dir="ltr">
                            {data.customer.phone}
                        </strong>
                    </div>
                )}
            </section>

            {data.identity.originalDocument && (
                <section className="thermal-receipt__document-source">
                    <span>
                        מסמך מקור:
                    </span>

                    <strong dir="ltr">
                        {
                            data.identity
                                .originalDocument
                                .number
                        }
                    </strong>
                </section>
            )}

            <section className="thermal-receipt__lines">
                {data.lines.map(
                    (line) => (
                        <div
                            className={`thermal-line ${
                                line.kind ===
                                "return"
                                    ? "thermal-line--return"
                                    : ""
                            }`}
                            key={
                                line.id
                            }
                        >
                            <div className="thermal-line__top">
                                <strong>
                                    {
                                        line.productName
                                    }
                                </strong>

                                <strong
                                    dir="ltr"
                                    className="thermal-money"
                                >
                                    {formatMoney(
                                        line.netAmount,
                                    )}
                                </strong>
                            </div>

                            {line.description && (
                                <span className="thermal-line__description">
                                    {
                                        line.description
                                    }
                                </span>
                            )}

                            <div className="thermal-line__quantity">
                                <span dir="ltr">
                                    {
                                        line.quantity
                                    }{" "}
                                    ×{" "}
                                    {formatMoney(
                                        line.unitPrice,
                                    )}
                                </span>
                            </div>

                            {line.lineDiscountAmount >
                                0 && (
                                <div className="thermal-line__detail">
                                    <span>
                                        הנחת פריט
                                    </span>

                                    <strong
                                        dir="ltr"
                                        className="thermal-money"
                                    >
                                        {formatMoney(
                                            -line.lineDiscountAmount,
                                        )}
                                    </strong>
                                </div>
                            )}

                            {line.promotionNames.length >
                                0 && (
                                <div className="thermal-line__promotion">
                                    <span>
                                        מבצע:
                                    </span>

                                    <strong>
                                        {line.promotionNames.join(
                                            " · ",
                                        )}
                                    </strong>
                                </div>
                            )}

                            {line.sourceDocument && (
                                <div className="thermal-line__origin">
                                    <span>
                                        הוחזר ממסמך:
                                    </span>

                                    <strong dir="ltr">
                                        {
                                            line.sourceDocument
                                                .number
                                        }
                                    </strong>
                                </div>
                            )}
                        </div>
                    ),
                )}
            </section>

            {/* CANCELLATION_FEE_V1 */}
            {(data.cancellationFeeAmount ?? 0) > 0 && (
                <div className="thermal-line">
                    <div className="thermal-line__main">
                        <strong>
                            דמי ביטול
                        </strong>

                        <strong
                            dir="ltr"
                            className="thermal-money"
                        >
                            {formatMoney(
                                data.cancellationFeeAmount ?? 0,
                            )}
                        </strong>
                    </div>

                    <span className="thermal-line__description">
                        5% או ₪100 — הנמוך מביניהם
                    </span>
                </div>
            )}
            <section className="thermal-receipt__totals">
                <div>
                    <span>
                        סכום ביניים
                    </span>

                    <strong
                        dir="ltr"
                        className="thermal-money"
                    >
                        {formatMoney(
                            data.totals.subtotal,
                        )}
                    </strong>
                </div>

                {data.totals.discount >
                    0 && (
                    <div>
                        <span>
                            סה״כ הנחות
                        </span>

                        <strong
                            dir="ltr"
                            className="thermal-money"
                        >
                            {formatMoney(
                                -data.totals.discount,
                            )}
                        </strong>
                    </div>
                )}

                <div>
                    <span>
                        לפני מע״מ
                    </span>

                    <strong
                        dir="ltr"
                        className="thermal-money"
                    >
                        {formatMoney(
                            data.totals.beforeTax,
                        )}
                    </strong>
                </div>

                <div>
                    <span>
                        מע״מ
                    </span>

                    <strong
                        dir="ltr"
                        className="thermal-money"
                    >
                        {formatMoney(
                            data.totals.tax,
                        )}
                    </strong>
                </div>

                <div className="thermal-receipt__grand-total">
                    <span>
                        {data.totals.total < 0
                            ? "סה״כ להחזר"
                            : "סה״כ"}
                    </span>

                    <strong
                        dir="ltr"
                        className="thermal-money"
                    >
                        {formatMoney(
                            data.totals.total,
                        )}
                    </strong>
                </div>
            </section>

            <section className="thermal-receipt__payments">
                <strong className="thermal-receipt__section-title">
                    תשלומים / החזרים
                </strong>

                {data.payments.length ===
                0 ? (
                    <span className="thermal-receipt__empty">
                        ללא תשלום
                    </span>
                ) : (
                    data.payments.map(
                        (payment) => (
                            <div
                                className="thermal-payment"
                                key={
                                    payment.id
                                }
                            >
                                <div className="thermal-payment__main">
                                    <span>
                                        {
                                            payment.label
                                        }
                                    </span>

                                    <strong
                                        dir="ltr"
                                        className="thermal-money"
                                    >
                                        {formatMoney(
                                            payment.amount,
                                        )}
                                    </strong>
                                </div>

                                {payment.tenderedAmount !==
                                    undefined && (
                                    <small>
                                        התקבל{" "}

                                        <span dir="ltr">
                                            {formatMoney(
                                                payment.tenderedAmount,
                                            )}
                                        </span>
                                    </small>
                                )}

                                {(payment.changeAmount ??
                                    0) >
                                    0 && (
                                    <small>
                                        עודף{" "}

                                        <span dir="ltr">
                                            {formatMoney(
                                                payment.changeAmount ??
                                                    0,
                                            )}
                                        </span>
                                    </small>
                                )}
                            </div>
                        ),
                    )
                )}
            </section>

            <section className="thermal-receipt__barcode">
                <DocumentBarcode
                    value={
                        data.barcode.value
                    }
                    displayValue={
                        data.barcode
                            .displayValue
                    }
                    compact={
                        format === "57mm"
                    }
                />
            </section>

            {data.legalLines.length >
                0 && (
                <section className="thermal-receipt__legal">
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

export default AccountingDocumentThermalRenderer;
