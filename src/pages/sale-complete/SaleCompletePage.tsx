import { useMemo, useState } from "react";

import {
    getDocumentsForTransaction,
} from "../../models/document/DocumentRepository";
import type { Sale } from "../../models/sale/Sale";
import ReceiptPage from "../receipt/ReceiptPage";

import "./sale-complete-page.css";

type SaleCompletePageProps = {
    sale: Sale;
    onNewSale: () => void;
};

function SaleCompletePage({
    sale,
    onNewSale,
}: SaleCompletePageProps) {
    const [showReceipt, setShowReceipt] =
        useState(false);

    const accountingDocument =
        useMemo(
            () =>
                getDocumentsForTransaction(
                    sale.id,
                )[0] ?? null,
            [sale.id],
        );

    if (showReceipt) {
        return (
            <ReceiptPage
                sale={sale}
                document={
                    accountingDocument
                }
                onBack={() =>
                    setShowReceipt(false)
                }
            />
        );
    }

    return (
        <section className="sale-complete-page">
            <div className="sale-complete-card">
                <div className="sale-complete-card__icon">
                    ✓
                </div>

                <h1>העסקה הושלמה</h1>

                <div className="sale-complete-card__meta">
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
                            סה״כ
                        </span>
                        <strong>
                            ₪
                            {sale.total.toFixed(
                                2,
                            )}
                        </strong>
                    </div>

                    {accountingDocument && (
                        <div>
                            <span>
                                מספר מסמך
                            </span>
                            <strong>
                                {
                                    accountingDocument.number
                                }
                            </strong>
                        </div>
                    )}
                </div>

                <div className="sale-complete-card__actions">
                    <button
                        type="button"
                        className="sale-complete-card__primary"
                        onClick={onNewSale}
                    >
                        עסקה חדשה
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            setShowReceipt(
                                true,
                            )
                        }
                        disabled={
                            !accountingDocument
                        }
                    >
                        הצג מסמך
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setShowReceipt(
                                true,
                            );
                        }}
                        disabled={
                            !accountingDocument
                        }
                    >
                        הדפס מסמך
                    </button>

                    <button
                        type="button"
                        disabled={
                            !accountingDocument
                        }
                    >
                        שלח מסמך
                    </button>
                </div>
            </div>
        </section>
    );
}

export default SaleCompletePage;
