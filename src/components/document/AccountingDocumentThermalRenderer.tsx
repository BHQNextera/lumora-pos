import { formatMoney } from "../../utils/MoneyFormatter";

import type {
    AccountingDocumentData,
} from "../../models/document/AccountingDocumentData";
import {
    getDocumentFooterSettings,
} from "../../config/DocumentFooterSettings";

import DocumentBarcode from "./DocumentBarcode";

export type ThermalPaperFormat =
    | "80mm"
    | "57mm";

type AccountingDocumentThermalRendererProps = {
    data: AccountingDocumentData;
    format?: ThermalPaperFormat;
};


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
    const footer =
        getDocumentFooterSettings();

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
                            {line.note && (
                                <span className="thermal-line__note">
                                    <strong>
                                        הערה:
                                    </strong>{" "}
                                    {line.note}
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
            {data.documentNote && (
                <section className="thermal-receipt__document-note">
                    <strong>
                        הערה
                    </strong>

                    <p>
                        {data.documentNote}
                    </p>
                </section>
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

                        {data.storeCreditObligo && (
                <section className="thermal-receipt__payments">
                    <strong className="thermal-receipt__section-title">
                        חשבון לקוח
                    </strong>

                    <div className="thermal-payment thermal-payment--summary">
                        <span>
                            {data.storeCreditObligo.beforeBalance <
                            -0.001
                                ? "יתרת זכות קודמת"
                                : "חוב קודם"}
                        </span>

                        <strong
                            dir="ltr"
                            className="thermal-money"
                        >
                            {formatMoney(
                                Math.abs(
                                    data.storeCreditObligo.beforeBalance,
                                ),
                            )}
                        </strong>
                    </div>

                    <div className="thermal-payment thermal-payment--summary">
                        <span>
                            {data.storeCreditObligo.afterBalance <
                            -0.001
                                ? "יתרת זכות נוכחית"
                                : "חוב נוכחי"}
                        </span>

                        <strong
                            dir="ltr"
                            className="thermal-money"
                        >
                            {formatMoney(
                                Math.abs(
                                    data.storeCreditObligo.afterBalance,
                                ),
                            )}
                        </strong>
                    </div>

                    <div className="thermal-payment thermal-payment--summary">
                        <span>
                            יתרה זמינה להקפה
                        </span>

                        <strong
                            dir="ltr"
                            className="thermal-money"
                        >
                            {formatMoney(
                                Math.max(
                                    0,
                                    data.storeCreditObligo.creditLimit -
                                        data.storeCreditObligo.afterBalance,
                                ),
                            )}
                        </strong>
                    </div>
                </section>
            )}
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

            {footer.enabled && (
                <footer className="thermal-receipt__custom-footer">
                    {footer.thankYouText && (
                        <strong>
                            {footer.thankYouText}
                        </strong>
                    )}

                    {footer.returnPolicyText && (
                        <span>
                            {footer.returnPolicyText}
                        </span>
                    )}

                    {footer.businessPhone && (
                        <span dir="ltr">
                            {footer.businessPhone}
                        </span>
                    )}

                    {footer.website && (
                        <span dir="ltr">
                            {footer.website}
                        </span>
                    )}

                    {footer.instagram && (
                        <span dir="ltr">
                            Instagram · {footer.instagram}
                        </span>
                    )}

                    {footer.facebook && (
                        <span dir="ltr">
                            Facebook · {footer.facebook}
                        </span>
                    )}

                    {footer.customText && (
                        <span className="thermal-receipt__custom-footer-note">
                            {footer.customText}
                        </span>
                    )}
                </footer>
            )}
        </article>
    );
}

export default AccountingDocumentThermalRenderer;
