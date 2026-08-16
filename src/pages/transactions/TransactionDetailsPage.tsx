import { useState } from "react";
import { flushSync } from "react-dom";

import type { SaleDocument } from "../../models/document/Document";
import {
    registerDocumentOutput,
} from "../../models/document/DocumentOutputService";
import type { Sale } from "../../models/sale/Sale";
import {
    getDocumentsForTransaction,
} from "../../models/document/DocumentRepository";
import {
    getReturnsForSale,
} from "../../models/transaction/ReturnRepository";

import ReceiptPage from "../receipt/ReceiptPage";

import "./transaction-details-page.css";

type TransactionDetailsPageProps = {
    sale: Sale;
    onBack: () => void;
    onOpenReturn: (sale: Sale) => void;
};

function getDocumentLabel(type: string) {
    switch (type) {
        case "tax_invoice":

            return "חשבונית מס";


        case "tax_invoice_receipt":
            return "חשבונית מס / קבלה";

        case "receipt":
            return "קבלה";

        case "tax_credit_invoice":
            return "חשבונית מס זיכוי";

        case "credit_receipt":
            return "זיכוי";

        case "exchange_note":
            return "פתק החלפה";

        case "credit_voucher":
            return "שובר זיכוי";

        case "gift_card_receipt":
            return "קבלת Gift Card";

        default:
            return type;
    }
}

function getPaymentLabel(method: string) {
    switch (method) {
        case "cash":
            return "מזומן";

        case "card_terminal":
            return "אשראי";

        case "echo":
            return "Echo";

        case "credit_voucher":
            return "שובר זיכוי";

        case "bit":
            return "Bit";

        case "paybox":
            return "PayBox";

        case "bank_transfer":
            return "העברה בנקאית";

        case "cheque":
            return "המחאה";

        default:
            return method;
    }
}

function getTransactionLabel(sale: Sale) {
    switch (sale.transactionType) {
        case "exchange":
            return "החלפה";

        case "return":
            return "החזרה";

        default:
            return "מכירה";
    }
}

function TransactionDetailsPage({
    sale,
    onBack,
    onOpenReturn,
}: TransactionDetailsPageProps) {
    const [selectedDocument, setSelectedDocument] =
        useState<SaleDocument | null>(null);

    const documents =
        getDocumentsForTransaction(sale.id);

    const priorReturns =
        getReturnsForSale(sale.id);

    const returnedByLine = new Map<string, number>();

    for (const returnDocument of priorReturns) {
        for (const line of returnDocument.lines) {
            returnedByLine.set(
                line.saleLineId,
                (returnedByLine.get(line.saleLineId) ?? 0) +
                line.quantity,
            );
        }
    }

    const totalSoldQuantity = sale.lines
        .filter((line) => line.kind !== "return")
        .reduce(
            (sum, line) => sum + line.quantity,
            0,
        );

    const totalReturnableQuantity = sale.lines
        .filter((line) => line.kind !== "return")
        .reduce((sum, line) => {
            const returned =
                returnedByLine.get(line.id) ?? 0;

            return (
                sum +
                Math.max(
                    0,
                    line.quantity - returned,
                )
            );
        }, 0);

    const canReturn =
        totalSoldQuantity > 0 &&
        totalReturnableQuantity > 0;

    if (selectedDocument) {
        return (
            <ReceiptPage
                sale={sale}
                document={selectedDocument}
                onBack={() =>
                    setSelectedDocument(null)
                }
            />
        );
    }

    return (
        <section className="transaction-details-page">
            <header className="transaction-details-page__header">
                <div>
                    <p>פרטי עסקה</p>

                    <div className="transaction-details-page__title-row">
                        <h1>{sale.number}</h1>

                        <span className="transaction-details-page__type">
                            {getTransactionLabel(sale)}
                        </span>
                    </div>
                </div>

                <button
                    type="button"
                    className="transaction-details-page__back"
                    onClick={onBack}
                >
                    חזרה לעסקאות
                </button>
            </header>

            <div className="transaction-details-page__layout">
                <main className="transaction-details-page__main">
                    <section className="transaction-details-card transaction-details-card--meta">
                        <div>
                            <span>תאריך ושעה</span>

                            <strong>
                                {new Date(
                                    sale.completedAt ??
                                    sale.createdAt,
                                ).toLocaleString("he-IL")}
                            </strong>
                        </div>

                        <div>
                            <span>לקוח</span>

                            <strong>
                                {sale.customer?.name ??
                                    "לקוח מזדמן"}
                            </strong>
                        </div>

                        <div>
                            <span>סטטוס</span>

                            <strong className="transaction-details-card__status">
                                הושלמה
                            </strong>
                        </div>

                        <div>
                            <span>קופה</span>
                            <strong>02</strong>
                        </div>
                    </section>

                    <section className="transaction-details-card">
                        <header className="transaction-details-card__header">
                            <div>
                                <h2>פריטים</h2>

                                <span>
                                    {sale.lines.reduce(
                                        (sum, line) =>
                                            sum + line.quantity,
                                        0,
                                    )}{" "}
                                    יחידות
                                </span>
                            </div>
                        </header>

                        <div className="transaction-details-lines">
                            {sale.lines.map((line) => {
                                const returnedQuantity =
                                    returnedByLine.get(line.id) ?? 0;

                                const remainingQuantity =
                                    line.kind === "return"
                                        ? 0
                                        : Math.max(
                                            0,
                                            line.quantity -
                                            returnedQuantity,
                                        );

                                return (
                                    <article
                                        className={`transaction-details-line ${line.kind === "return"
                                                ? "transaction-details-line--return"
                                                : ""
                                            }`}
                                        key={line.id}
                                    >
                                        <div className="transaction-details-line__product">
                                            <strong>
                                                {line.productName}
                                            </strong>

                                            {line.variant && (
                                                <span>
                                                    {line.variant.color.name}
                                                    {" / "}
                                                    {line.variant.size.name}
                                                    {" · "}
                                                    <span dir="ltr">
                                                        {line.sku}
                                                    </span>
                                                </span>
                                            )}

                                            <span>
                                                {line.kind === "return"
                                                    ? "החזרה · "
                                                    : ""}
                                                {line.quantity} × ₪
                                                {line.unitPrice.toFixed(2)}
                                            </span>

                                            {line.originalSaleNumber && (
                                                <span className="transaction-details-line__origin">
                                                    עסקת מקור:{" "}
                                                    {line.originalSaleNumber}
                                                </span>
                                            )}
                                        </div>

                                        {line.kind !== "return" && (
                                            <div className="transaction-details-line__return-state">
                                                {returnedQuantity > 0 && (
                                                    <span>
                                                        זוכו:{" "}
                                                        <strong>
                                                            {returnedQuantity}
                                                        </strong>
                                                    </span>
                                                )}

                                                <span>
                                                    ניתן להחזיר:{" "}
                                                    <strong>
                                                        {remainingQuantity}
                                                    </strong>
                                                </span>
                                            </div>
                                        )}

                                        <strong
                                            className={`transaction-details-line__amount ${line.netAmount < 0
                                                    ? "transaction-details-line__amount--negative"
                                                    : ""
                                                }`}
                                        >
                                            {line.netAmount < 0
                                                ? "‎-"
                                                : ""}
                                            ₪
                                            {Math.abs(
                                                line.netAmount,
                                            ).toFixed(2)}
                                        </strong>
                                    </article>
                                );
                            })}
                        </div>
                    </section>

                    <section className="transaction-details-card">
                        <header className="transaction-details-card__header">
                            <div>
                                <h2>מסמכים</h2>

                                <span>
                                    {documents.length} מסמכים
                                </span>
                            </div>
                        </header>

                        <div className="transaction-details-documents">
                            {documents.length === 0 ? (
                                <div className="transaction-details-card__empty">
                                    לא נמצאו מסמכים לעסקה
                                </div>
                            ) : (
                                documents.map((document) => (
                                    <article
                                        className="transaction-document"
                                        key={document.id}
                                    >
                                        <div>
                                            <span>
                                                {getDocumentLabel(
                                                    document.type,
                                                )}
                                            </span>

                                            <strong>
                                                {document.number}
                                            </strong>
                                        </div>

                                        <div className="transaction-document__meta">
                                            <span>
                                                {document.status ===
                                                    "issued_original"
                                                    ? "מקור"
                                                    : "העתק"}
                                            </span>

                                            <span>
                                                {new Date(
                                                    document.originalIssueAt,
                                                ).toLocaleString(
                                                    "he-IL",
                                                )}
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSelectedDocument(
                                                    document,
                                                )
                                            }
                                        >
                                            פתח
                                        </button>
                                    </article>
                                ))
                            )}
                        </div>
                    </section>

                    <section className="transaction-details-card">
                        <header className="transaction-details-card__header">
                            <div>
                                <h2>תשלומים</h2>

                                <span>
                                    {sale.payments.length} רשומות
                                </span>
                            </div>
                        </header>

                        <div className="transaction-details-payments">
                            {sale.payments.length === 0 ? (
                                <div className="transaction-details-card__empty">
                                    ללא תשלום
                                </div>
                            ) : (
                                sale.payments.map((payment) => (
                                    <div
                                        className="transaction-details-payment"
                                        key={payment.id}
                                    >
                                        <div>
                                            <strong>
                                                {getPaymentLabel(
                                                    payment.method,
                                                )}
                                            </strong>

                                            {payment.tenderedAmount !==
                                                undefined && (
                                                    <span>
                                                        התקבל ₪
                                                        {payment.tenderedAmount.toFixed(
                                                            2,
                                                        )}
                                                    </span>
                                                )}

                                            {(payment.changeAmount ??
                                                0) > 0 && (
                                                    <span>
                                                        עודף ₪
                                                        {payment.changeAmount?.toFixed(
                                                            2,
                                                        )}
                                                    </span>
                                                )}
                                        </div>

                                        <strong
                                            className={
                                                payment.amount < 0
                                                    ? "transaction-details-payment__negative"
                                                    : ""
                                            }
                                        >
                                            {payment.amount < 0
                                                ? "‎-"
                                                : ""}
                                            ₪
                                            {Math.abs(
                                                payment.amount,
                                            ).toFixed(2)}
                                        </strong>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </main>

                <aside className="transaction-details-page__sidebar">
                    <section className="transaction-details-summary">
                        <div>
                            <span>סכום ביניים</span>

                            <strong>
                                {sale.subtotal < 0
                                    ? "‎-"
                                    : ""}
                                ₪
                                {Math.abs(
                                    sale.subtotal,
                                ).toFixed(2)}
                            </strong>
                        </div>

                        {sale.discount > 0 && (
                            <div>
                                <span>הנחות</span>

                                <strong>
                                    ‎-₪
                                    {sale.discount.toFixed(2)}
                                </strong>
                            </div>
                        )}

                        <div className="transaction-details-summary__total">
                            <span>
                                {sale.total < 0
                                    ? "סה״כ לזיכוי"
                                    : "סה״כ עסקה"}
                            </span>

                            <strong
                                className={
                                    sale.total < 0
                                        ? "transaction-details-summary__negative"
                                        : ""
                                }
                            >
                                {sale.total < 0
                                    ? "‎-"
                                    : ""}
                                ₪
                                {Math.abs(
                                    sale.total,
                                ).toFixed(2)}
                            </strong>
                        </div>
                    </section>

                    <section className="transaction-details-actions">
                        <button
                            type="button"
                            disabled={
                                documents.length === 0
                            }
                            onClick={() => {
                                const document =
                                    documents[0];

                                if (!document) {
                                    return;
                                }

                                flushSync(() => {
                                    setSelectedDocument(
                                        document,
                                    );
                                });

                                window.print();

                                registerDocumentOutput(
                                    document.id,
                                    "print",
                                );
                            }}
                        >
                            הדפס מסמך
                        </button>

                        <button type="button">
                            שלח מסמך
                        </button>

                        <button
                            type="button"
                            className="transaction-details-actions__return"
                            disabled={!canReturn}
                            onClick={() =>
                                onOpenReturn(sale)
                            }
                        >
                            {canReturn
                                ? "החזרה / החלפה"
                                : "אין יתרה להחזרה"}
                        </button>
                    </section>
                </aside>
            </div>
        </section>
    );
}

export default TransactionDetailsPage;