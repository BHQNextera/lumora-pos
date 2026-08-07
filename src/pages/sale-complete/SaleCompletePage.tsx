import { useState } from "react";

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

    if (showReceipt) {
        return (
            <ReceiptPage
                sale={sale}
                onBack={() => setShowReceipt(false)}
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
                        <span>מספר עסקה</span>
                        <strong>{sale.number}</strong>
                    </div>

                    <div>
                        <span>סה״כ</span>
                        <strong>
                            ₪{sale.total.toFixed(2)}
                        </strong>
                    </div>
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
                        onClick={() => window.print()}
                    >
                        הדפס קבלה
                    </button>

                    <button type="button">
                        שלח קבלה
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowReceipt(true)}
                    >
                        הצג חשבונית
                    </button>
                </div>
            </div>
        </section>
    );
}

export default SaleCompletePage;