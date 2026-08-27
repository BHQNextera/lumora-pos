import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import AccountingDocumentThermalRenderer from "../../components/document/AccountingDocumentThermalRenderer";
import {
    resolvePostTransactionPolicy,
} from "../../config/PostTransactionPolicy";
import {
    getRegisterPrinterConfig,
} from "../../config/RegisterPrinterConfig";
import type {
    DocumentCopyType,
    SaleDocument,
} from "../../models/document/Document";
import {
    createAccountingDocumentData,
} from "../../models/document/AccountingDocumentMapper";
import {
    getNextDocumentCopyType,
    recordDocumentScreenView,
    registerDocumentOutput,
} from "../../models/document/DocumentOutputService";
import type {
    Sale,
} from "../../models/sale/Sale";
import {
    formatMoney,
} from "../../utils/MoneyFormatter";

import "./receipt-page.css";
import "./thermal-receipt.css";

type RefundVoucherSummary = {
    number: string;
    amount: number;
};

type ReceiptPageProps = {
    sale: Sale;
    document: SaleDocument | null;
    onBack: () => void;

    postTransaction?: boolean;
    onNewSale?: () => void;

    refundVoucher?:
        RefundVoucherSummary | null;

    onSendDocument?: (
        document: SaleDocument,
    ) => void | Promise<void>;

    onPrintExchangeSlip?: (
        copies: number,
    ) => void | Promise<void>;
};

function ReceiptPage({
    sale,
    document,
    onBack,
    postTransaction = false,
    onNewSale,
    refundVoucher = null,
    onSendDocument,
    onPrintExchangeSlip,
}: ReceiptPageProps) {
    const [
        displayCopyType,
        setDisplayCopyType,
    ] =
        useState<DocumentCopyType>(
            document
                ? getNextDocumentCopyType(
                      document.id,
                  )
                : "original",
        );

    const policy =
        useMemo(
            () =>
                resolvePostTransactionPolicy(),
            [],
        );

    const [
        secondsRemaining,
        setSecondsRemaining,
    ] =
        useState(
            policy.timeoutSeconds,
        );

    const [
        exchangeSlipCopies,
        setExchangeSlipCopies,
    ] =
        useState(
            policy.exchangeSlipDefaultCopies,
        );

    const autoPrintAttempted =
        useRef(false);

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

    const data =
        useMemo(
            () =>
                createAccountingDocumentData(
                    sale,
                    document,
                    displayCopyType,
                ),
            [
                sale,
                document,
                displayCopyType,
            ],
        );

    const printerConfig =
        useMemo(
            () =>
                getRegisterPrinterConfig(
                    data.identity.storeCode,
                    data.identity.registerCode,
                ),
            [
                data.identity.storeCode,
                data.identity.registerCode,
            ],
        );

    const resetTimeout =
        useCallback(() => {
            if (
                !postTransaction ||
                policy.timeoutSeconds <= 0
            ) {
                return;
            }

            setSecondsRemaining(
                policy.timeoutSeconds,
            );
        }, [
            policy.timeoutSeconds,
            postTransaction,
        ]);

    const printDocument =
        useCallback(() => {
            if (!document) {
                return;
            }

            resetTimeout();

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
        }, [
            document,
            resetTimeout,
        ]);

    useEffect(() => {
        if (
            !postTransaction ||
            !onNewSale ||
            policy.timeoutSeconds <= 0
        ) {
            return;
        }

        const timer =
            window.setTimeout(
                () => {
                    if (
                        secondsRemaining <=
                        1
                    ) {
                        onNewSale();
                        return;
                    }

                    setSecondsRemaining(
                        (current) =>
                            Math.max(
                                0,
                                current - 1,
                            ),
                    );
                },
                1000,
            );

        return () =>
            window.clearTimeout(
                timer,
            );
    }, [
        onNewSale,
        policy.timeoutSeconds,
        postTransaction,
        secondsRemaining,
    ]);

    useEffect(() => {
        if (
            !postTransaction ||
            !document ||
            !policy.autoPrintAccountingDocument ||
            autoPrintAttempted.current
        ) {
            return;
        }

        autoPrintAttempted.current =
            true;

        const timer =
            window.setTimeout(
                () => {
                    printDocument();
                },
                150,
            );

        return () =>
            window.clearTimeout(
                timer,
            );
    }, [
        document,
        policy.autoPrintAccountingDocument,
        postTransaction,
        printDocument,
    ]);

    const increaseExchangeCopies =
        () => {
            resetTimeout();

            setExchangeSlipCopies(
                (current) =>
                    Math.min(
                        policy.exchangeSlipMaxCopies,
                        current + 1,
                    ),
            );
        };

    const decreaseExchangeCopies =
        () => {
            resetTimeout();

            setExchangeSlipCopies(
                (current) =>
                    Math.max(
                        1,
                        current - 1,
                    ),
            );
        };

    const handleExchangeSlip =
        () => {
            if (
                !policy.exchangeSlipEnabled ||
                sale.transactionType === "return" ||
                !onPrintExchangeSlip
            ) {
                return;
            }

            resetTimeout();

            void onPrintExchangeSlip(
                exchangeSlipCopies,
            );
        };

    const handleSendDocument =
        () => {
            if (
                !document ||
                !policy.sendDocumentEnabled ||
                !onSendDocument
            ) {
                return;
            }

            resetTimeout();

            void onSendDocument(
                document,
            );
        };

    const completionTitle =
        sale.transactionType ===
        "return"
            ? "ההחזרה הושלמה"
            : sale.transactionType ===
                "exchange"
              ? "ההחלפה הושלמה"
              : "העסקה הושלמה";

    const canSend =
        Boolean(
            document &&
            policy.sendDocumentEnabled &&
            onSendDocument,
        );

    const canPrintExchangeSlip =
        Boolean(
            policy.exchangeSlipEnabled &&
            sale.transactionType !== "return" &&
            onPrintExchangeSlip,
        );

    return (
        <section
            className={
                postTransaction
                    ? "receipt-page receipt-page--post-transaction"
                    : "receipt-page"
            }
            onPointerDownCapture={
                resetTimeout
            }
            onKeyDownCapture={
                resetTimeout
            }
        >
            <header className="receipt-page__header">
                <button
                    type="button"
                    className="receipt-page__back"
                    onClick={
                        postTransaction &&
                        onNewSale
                            ? onNewSale
                            : onBack
                    }
                >
                    {postTransaction
                        ? "עסקה חדשה"
                        : "חזרה"}
                </button>

                <div>
                    <span>
                        {postTransaction
                            ? completionTitle
                            : "מסמך חשבונאי"}
                    </span>

                    <h1>
                        {
                            data.identity
                                .title
                        }
                    </h1>
                </div>
            </header>

            <div className="receipt-page__workspace">
                <div className="receipt-page__document-stage">
                    <AccountingDocumentThermalRenderer
                        data={data}
                        format={
                            printerConfig.paperFormat ===
                            "thermal57"
                                ? "57mm"
                                : "80mm"
                        }
                    />
                </div>

                <aside className="receipt-page__actions">
                    {postTransaction && (
                        <div className="receipt-page__completion-status">
                            <span>
                                {completionTitle}
                            </span>

                            <strong>
                                {sale.number}
                            </strong>

                            <div>
                                <span>
                                    סה״כ
                                </span>

                                <strong className="lumora-money-value">
                                    {formatMoney(
                                        sale.total,
                                    )}
                                </strong>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        className="receipt-page__primary"
                        onClick={
                            printDocument
                        }
                        disabled={
                            !document
                        }
                    >
                        {policy.autoPrintAccountingDocument
                            ? "הדפס שוב"
                            : "הדפס מסמך"}
                    </button>

                    <button
                        type="button"
                        onClick={
                            handleSendDocument
                        }
                        disabled={
                            !canSend
                        }
                        title={
                            canSend
                                ? undefined
                                : "שירות שליחת מסמכים טרם חובר"
                        }
                    >
                        שלח מסמך
                    </button>

                    {policy.exchangeSlipEnabled &&
                        sale.transactionType !== "return" && (
                        <div className="receipt-page__exchange-slip">
                            <div className="receipt-page__exchange-slip-head">
                                <span>
                                    פתק החלפה
                                </span>

                                <div className="receipt-page__copy-stepper">
                                    <button
                                        type="button"
                                        onClick={
                                            decreaseExchangeCopies
                                        }
                                        disabled={
                                            exchangeSlipCopies <=
                                            1
                                        }
                                    >
                                        −
                                    </button>

                                    <strong>
                                        {
                                            exchangeSlipCopies
                                        }
                                    </strong>

                                    <button
                                        type="button"
                                        onClick={
                                            increaseExchangeCopies
                                        }
                                        disabled={
                                            exchangeSlipCopies >=
                                            policy.exchangeSlipMaxCopies
                                        }
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={
                                    handleExchangeSlip
                                }
                                disabled={
                                    !canPrintExchangeSlip
                                }
                                title={
                                    canPrintExchangeSlip
                                        ? undefined
                                        : "שירות הדפסת פתק החלפה טרם חובר"
                                }
                            >
                                הדפס פתק החלפה
                            </button>
                        </div>
                    )}

                    {refundVoucher && (
                        <div className="receipt-page__voucher-card">
                            <span>
                                שובר זיכוי הופק
                            </span>

                            <strong
                                dir="ltr"
                            >
                                {
                                    refundVoucher.number
                                }
                            </strong>

                            <div>
                                <span>
                                    סכום
                                </span>

                                <strong className="lumora-money-value">
                                    {formatMoney(
                                        refundVoucher.amount,
                                    )}
                                </strong>
                            </div>
                        </div>
                    )}

                    {postTransaction &&
                        onNewSale && (
                        <button
                            type="button"
                            className="receipt-page__new-sale"
                            onClick={
                                onNewSale
                            }
                        >
                            עסקה חדשה
                        </button>
                    )}

                    {postTransaction &&
                        policy.timeoutSeconds >
                            0 && (
                        <div className="receipt-page__timeout">
                            <span>
                                חזרה למכירה בעוד{" "}
                                {
                                    secondsRemaining
                                }{" "}
                                שניות
                            </span>

                            <div>
                                <i
                                    style={{
                                        width:
                                            `${Math.max(
                                                0,
                                                Math.min(
                                                    100,
                                                    (
                                                        secondsRemaining /
                                                        policy.timeoutSeconds
                                                    ) *
                                                        100,
                                                ),
                                            )}%`,
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </section>
    );
}

export default ReceiptPage;
