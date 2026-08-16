$ErrorActionPreference = "Stop"
Set-Location "C:\PROJECT\lumora-pos"

$utf8 = New-Object System.Text.UTF8Encoding($false)

$receiptPagePath = ".\src\pages\receipt\ReceiptPage.tsx"
$receiptCssPath = ".\src\pages\receipt\receipt-page.css"
$thermalCssPath = ".\src\pages\receipt\thermal-receipt.css"

$receiptPage = @'
import {
    useEffect,
    useMemo,
    useState,
} from "react";

import AccountingDocumentStandardRenderer from "../../components/document/AccountingDocumentStandardRenderer";
import AccountingDocumentThermalRenderer from "../../components/document/AccountingDocumentThermalRenderer";
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
import type { Sale } from "../../models/sale/Sale";

import "./receipt-page.css";
import "./thermal-receipt.css";

type ReceiptPageProps = {
    sale: Sale;
    document: SaleDocument | null;
    onBack: () => void;
};

type PreviewFormat =
    | "standard"
    | "thermal80";

function ReceiptPage({
    sale,
    document,
    onBack,
}: ReceiptPageProps) {
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

    const [
        previewFormat,
        setPreviewFormat,
    ] =
        useState<PreviewFormat>(
            "standard",
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

    const data = useMemo(
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
                        {data.identity.title}
                    </h1>
                </div>
            </header>

            <div className="receipt-page__workspace">
                {previewFormat ===
                "standard" ? (
                    <AccountingDocumentStandardRenderer
                        data={data}
                    />
                ) : (
                    <AccountingDocumentThermalRenderer
                        data={data}
                    />
                )}

                <aside className="receipt-page__actions">
                    <div className="receipt-page__format-switch">
                        <button
                            type="button"
                            className={
                                previewFormat ===
                                "standard"
                                    ? "receipt-page__format-button receipt-page__format-button--active"
                                    : "receipt-page__format-button"
                            }
                            onClick={() =>
                                setPreviewFormat(
                                    "standard",
                                )
                            }
                        >
                            רגיל
                        </button>

                        <button
                            type="button"
                            className={
                                previewFormat ===
                                "thermal80"
                                    ? "receipt-page__format-button receipt-page__format-button--active"
                                    : "receipt-page__format-button"
                            }
                            onClick={() =>
                                setPreviewFormat(
                                    "thermal80",
                                )
                            }
                        >
                            סליפ 80 מ״מ
                        </button>
                    </div>

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

'@

$receiptCss = @'
.receipt-page {
    display: flex;
    height: 100%;
    flex-direction: column;
    padding: 18px;
    direction: rtl;
}

.receipt-page__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 56px;
    padding-bottom: 12px;
}

.receipt-page__header span {
    color: var(--text-secondary);
    font-size: 10px;
}

.receipt-page__header h1 {
    margin: 2px 0 0;
    font-size: 24px;
}

.receipt-page__back {
    min-height: 38px;
    padding: 0 14px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    font-weight: 650;
}

.receipt-page__workspace {
    display: grid;
    flex: 1;
    grid-template-columns: minmax(520px, 720px) 220px;
    justify-content: center;
    gap: 18px;
    min-height: 0;
    overflow-y: auto;
    align-items: start;
}

.receipt {
    padding: 28px 32px;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--surface);
    box-shadow: var(--shadow-sm);
}

.receipt__business {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 18px;
}

.receipt__business-mark {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border: 1px solid var(--border);
    border-radius: 12px;
    font-size: 12px;
    font-weight: 800;
}

.receipt__business>div:last-child {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.receipt__business strong {
    font-size: 18px;
}

.receipt__business span {
    color: var(--text-secondary);
    font-size: 11px;
}

.receipt__identity {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    padding: 18px 0;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
}

.receipt__identity-main {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px 12px;
}

.receipt__identity h2 {
    margin: 0;
    font-size: 20px;
}

.receipt__document-number {
    font-size: 17px;
    font-variant-numeric: tabular-nums;
}

.receipt__copy-badge {
    flex: 0 0 auto;
    padding: 5px 9px;
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--text-secondary);
    font-size: 10px;
    font-weight: 750;
}

.receipt__meta,
.receipt__customer-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 18px;
}

.receipt__meta {
    padding: 16px 0;
}

.receipt__meta div,
.receipt__customer-grid div {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 3px;
}

.receipt__meta--wide {
    grid-column: 1 / -1;
}

.receipt__meta span,
.receipt__customer span {
    color: var(--text-secondary);
    font-size: 10px;
}

.receipt__meta strong,
.receipt__customer strong {
    font-size: 12px;
    overflow-wrap: anywhere;
}

.receipt__customer,
.receipt__items,
.receipt__payments {
    padding-top: 14px;
    border-top: 1px solid var(--border);
}

.receipt__customer {
    padding-bottom: 16px;
}

.receipt__section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    color: var(--text-secondary);
    font-size: 10px;
    font-weight: 750;
}

.receipt__lines {
    display: flex;
    flex-direction: column;
}

.receipt-line {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    padding: 12px 0;
    border-bottom: 1px solid var(--border);
}

.receipt-line:last-child {
    border-bottom: 0;
}

.receipt-line__main {
    min-width: 0;
    flex: 1;
}

.receipt-line__main>strong,
.receipt-line__main>span {
    display: block;
}

.receipt-line__main>strong {
    font-size: 12px;
}

.receipt-line__main>span {
    margin-top: 3px;
    color: var(--text-secondary);
    font-size: 10px;
}

.receipt-line__description {
    color: var(--text) !important;
}

.receipt-line__origin {
    margin-top: 6px !important;
}

.receipt-line__origin strong {
    font-size: inherit;
}

.receipt-line__promotion {
    font-weight: 650;
}

.receipt-line__amount {
    flex: 0 0 auto;
    padding-top: 1px;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
}

.receipt__summary {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 18px 0;
    border-top: 1px solid var(--border);
}

.receipt__summary>div,
.receipt__payment {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
}

.receipt__summary span {
    color: var(--text-secondary);
    font-size: 11px;
}

.receipt__summary strong {
    font-size: 12px;
    font-variant-numeric: tabular-nums;
}

.receipt__grand-total {
    margin-top: 6px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
}

.receipt__grand-total span {
    color: var(--text);
    font-size: 14px;
    font-weight: 750;
}

.receipt__grand-total strong {
    font-size: 22px;
}

.receipt__payments {
    padding-bottom: 16px;
}

.receipt__payment {
    padding: 6px 0;
}

.receipt__payment>div {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.receipt__payment span {
    color: var(--text-secondary);
    font-size: 10px;
}

.receipt__payment strong {
    font-size: 11px;
    font-variant-numeric: tabular-nums;
}

.receipt__empty {
    padding: 8px 0;
    color: var(--text-secondary);
    font-size: 11px;
}

.receipt__barcode {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 18px 0 10px;
    border-top: 1px solid var(--border);
    text-align: center;
}

.receipt__barcode-placeholder {
    display: flex;
    width: min(280px, 80%);
    height: 54px;
    align-items: stretch;
    justify-content: center;
    gap: 3px;
    padding: 4px 10px;
    border: 1px dashed var(--border);
    border-radius: 8px;
    overflow: hidden;
}

.receipt__barcode-placeholder span {
    display: block;
    width: 3px;
    background: currentColor;
}

.receipt__barcode-placeholder span:nth-child(3n) {
    width: 6px;
}

.receipt__barcode-placeholder span:nth-child(4n) {
    width: 2px;
}

.receipt__barcode>strong {
    font-size: 11px;
    font-variant-numeric: tabular-nums;
}

.receipt__barcode>span {
    color: var(--text-secondary);
    font-size: 9px;
}

.receipt__legal {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-top: 12px;
    color: var(--text-secondary);
    font-size: 9px;
    text-align: center;
}

.receipt-page__actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.receipt-page__actions button {
    min-height: 46px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    font-weight: 650;
}

.receipt-page__actions button:disabled {
    cursor: default;
    opacity: 0.45;
}

.receipt-page__actions .receipt-page__primary {
    border-color: var(--primary);
    background: var(--primary);
    color: #fff;
}

.receipt-page__format-switch {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-bottom: 4px;
}

.receipt-page__actions .receipt-page__format-button {
    min-height: 38px;
    padding: 0 8px;
    font-size: 10px;
}

.receipt-page__actions .receipt-page__format-button--active {
    border-color: var(--text);
    background: var(--text);
    color: var(--surface);
}

@media (max-width: 900px) {
    .receipt-page__workspace {
        grid-template-columns: 1fr;
    }

    .receipt-page__actions {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .receipt-page__format-switch {
        grid-column: 1 / -1;
    }
}

@media print {
    .receipt-page {
        height: auto;
        padding: 0;
    }

    .receipt-page__header,
    .receipt-page__actions,
    .receipt-page__format-switch {
        display: none !important;
    }

    .receipt-page__workspace {
        display: block;
        overflow: visible;
    }

    .receipt {
        width: 100%;
        padding: 0;
        border: 0;
        border-radius: 0;
        box-shadow: none;
    }
}

'@

$thermalCss = @'
.thermal-receipt {
    width: 80mm;
    max-width: 100%;
    box-sizing: border-box;
    padding: 5mm 4mm;
    background: #fff;
    color: #111;
    direction: rtl;
    font-family: Arial, "Noto Sans Hebrew", sans-serif;
    font-size: 11px;
    line-height: 1.35;
}

.thermal-receipt__business,
.thermal-receipt__identity,
.thermal-receipt__barcode,
.thermal-receipt__legal {
    text-align: center;
}

.thermal-receipt__business {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-bottom: 8px;
}

.thermal-receipt__business>strong {
    font-size: 16px;
}

.thermal-receipt__business span {
    font-size: 9px;
}

.thermal-receipt__identity {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 0;
    border-top: 1px dashed #777;
    border-bottom: 1px dashed #777;
}

.thermal-receipt__identity>strong {
    font-size: 14px;
}

.thermal-receipt__identity>span {
    font-size: 12px;
    font-weight: 700;
}

.thermal-receipt__identity>b {
    font-size: 9px;
}

.thermal-receipt__meta,
.thermal-receipt__customer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 10px;
    padding: 7px 0;
    border-bottom: 1px dashed #999;
}

.thermal-receipt__meta div,
.thermal-receipt__customer div {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.thermal-receipt__meta span,
.thermal-receipt__customer span {
    color: #555;
    font-size: 8px;
}

.thermal-receipt__meta strong,
.thermal-receipt__customer strong {
    font-size: 9px;
    overflow-wrap: anywhere;
}

.thermal-receipt__lines {
    padding: 4px 0;
}

.thermal-line {
    padding: 6px 0;
    border-bottom: 1px dotted #aaa;
}

.thermal-line:last-child {
    border-bottom: 0;
}

.thermal-line__top,
.thermal-line__quantity,
.thermal-receipt__totals>div,
.thermal-payment {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
}

.thermal-line__top>strong:first-child {
    min-width: 0;
    flex: 1;
}

.thermal-line__top>strong:last-child,
.thermal-receipt__totals strong,
.thermal-payment>strong {
    flex: 0 0 auto;
    font-variant-numeric: tabular-nums;
}

.thermal-line__description,
.thermal-line__origin,
.thermal-line__promotion,
.thermal-line__quantity {
    display: block;
    margin-top: 2px;
    font-size: 8px;
}

.thermal-line__description {
    color: #333;
}

.thermal-line__quantity {
    color: #555;
}

.thermal-line__origin {
    font-weight: 700;
}

.thermal-line__promotion {
    color: #444;
}

.thermal-receipt__totals {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 0;
    border-top: 1px dashed #777;
    border-bottom: 1px dashed #777;
}

.thermal-receipt__totals span {
    color: #444;
}

.thermal-receipt__grand-total {
    margin-top: 3px;
    padding-top: 5px;
    border-top: 1px solid #333;
    font-size: 14px;
    font-weight: 800;
}

.thermal-receipt__payments {
    padding: 8px 0;
    border-bottom: 1px dashed #777;
}

.thermal-receipt__section-title {
    display: block;
    margin-bottom: 5px;
    font-size: 10px;
}

.thermal-payment {
    flex-wrap: wrap;
    padding: 3px 0;
}

.thermal-payment small {
    width: 100%;
    color: #555;
    font-size: 8px;
}

.thermal-receipt__source {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    padding: 7px 0;
    border-bottom: 1px dashed #777;
    font-size: 9px;
}

.thermal-receipt__barcode {
    padding: 10px 0 4px;
}

.thermal-receipt__barcode-placeholder {
    display: flex;
    width: 62mm;
    max-width: 100%;
    height: 18mm;
    margin: 0 auto 4px;
    align-items: stretch;
    justify-content: center;
    gap: 1.2mm;
    padding: 1.5mm 2mm;
    box-sizing: border-box;
    overflow: hidden;
}

.thermal-receipt__barcode-placeholder span {
    display: block;
    width: 0.7mm;
    background: #111;
}

.thermal-receipt__barcode-placeholder span:nth-child(3n) {
    width: 1.4mm;
}

.thermal-receipt__barcode-placeholder span:nth-child(4n) {
    width: 0.4mm;
}

.thermal-receipt__barcode>strong {
    font-size: 9px;
    font-variant-numeric: tabular-nums;
}

.thermal-receipt__legal {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-top: 8px;
    font-size: 7px;
}

@media screen {
    .thermal-receipt {
        margin: 0 auto;
        border: 1px solid var(--border);
        box-shadow: var(--shadow-sm);
    }
}

@media print {
    @page {
        size: 80mm auto;
        margin: 0;
    }

    .thermal-receipt {
        width: 80mm;
        max-width: 80mm;
        margin: 0;
        padding: 4mm 3mm;
        border: 0;
        box-shadow: none;
    }
}

'@

[IO.File]::WriteAllText($receiptPagePath, $receiptPage, $utf8)
Write-Host "REPLACED $receiptPagePath"

[IO.File]::WriteAllText($receiptCssPath, $receiptCss, $utf8)
Write-Host "REPLACED $receiptCssPath"

[IO.File]::WriteAllText($thermalCssPath, $thermalCss, $utf8)
Write-Host "CREATED/REPLACED $thermalCssPath"

Write-Host "`n=== TYPECHECK ==="
npx tsc -b --pretty false
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== BUILD ==="
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== STATUS ==="
git status --short

Write-Host "`nTHERMAL PREVIEW V1 APPLIED"
