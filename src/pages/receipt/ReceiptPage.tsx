import {
    useEffect,
    useMemo,
    useState,
} from "react";

import AccountingDocumentThermalRenderer from "../../components/document/AccountingDocumentThermalRenderer";
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

import "./receipt-page.css";
import "./thermal-receipt.css";

type ReceiptPageProps = {
    sale: Sale;
    document: SaleDocument | null;
    onBack: () => void;
};

function ReceiptPage({
    sale,
    document,
    onBack,
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
                        {
                            data.identity
                                .title
                        }
                    </h1>
                </div>
            </header>

            <div className="receipt-page__workspace">
                <AccountingDocumentThermalRenderer
                    data={data}
                    format={
                        printerConfig.paperFormat ===
                        "thermal57"
                            ? "57mm"
                            : "80mm"
                    }
                />

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
