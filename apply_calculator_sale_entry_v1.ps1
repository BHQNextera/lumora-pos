$ErrorActionPreference = "Stop"

Set-Location "C:\PROJECT\lumora-pos"

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

# ============================================================
# 1. EXTEND PRODUCT CATEGORY WITH MANUAL/CALCULATOR ITEM
# ============================================================

$path = ".\src\types\product.ts"
$text = Get-Content $path -Raw -Encoding UTF8

$old = @'
export type ProductCategory =
| "all"
| "hot-drinks"
| "cold-drinks"
| "pastries"
| "sandwiches"
| "desserts";
'@

$new = @'
export type ProductCategory =
| "all"
| "hot-drinks"
| "cold-drinks"
| "pastries"
| "sandwiches"
| "desserts"
| "manual";
'@

if (-not $text.Contains($old)) {
    throw "ProductCategory anchor not found"
}

$text = $text.Replace($old, $new)

[IO.File]::WriteAllText(
    $path,
    $text,
    $utf8NoBom
)

Write-Host "UPDATED $path"

# ============================================================
# 2. CREATE CalculatorSaleEntry.tsx
# ============================================================

$path = ".\src\components\pos\CalculatorSaleEntry.tsx"

$content = @'
import {
    useState,
} from "react";

import "./calculator-sale-entry.css";

type CalculatorSaleEntryProps = {
    onAddAmount: (
        amount: number,
        description: string,
    ) => void;
};

const keypadRows = [
    ["7", "8", "9"],
    ["4", "5", "6"],
    ["1", "2", "3"],
    ["0", "00", "."],
];

function CalculatorSaleEntry({
    onAddAmount,
}: CalculatorSaleEntryProps) {
    const [
        amountText,
        setAmountText,
    ] =
        useState("0");

    const [
        description,
        setDescription,
    ] =
        useState("");

    const amount =
        Number(
            amountText,
        );

    const append = (
        value: string,
    ) => {
        setAmountText(
            (current) => {
                if (
                    value === "." &&
                    current.includes(".")
                ) {
                    return current;
                }

                if (
                    current === "0" &&
                    value !== "."
                ) {
                    return value === "00"
                        ? "0"
                        : value;
                }

                return (
                    current +
                    value
                );
            },
        );
    };

    const backspace = () => {
        setAmountText(
            (current) => {
                if (
                    current.length <= 1
                ) {
                    return "0";
                }

                return current.slice(
                    0,
                    -1,
                );
            },
        );
    };

    const clear = () => {
        setAmountText("0");
    };

    const addToSale = () => {
        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            return;
        }

        onAddAmount(
            amount,
            description.trim(),
        );

        setAmountText("0");
        setDescription("");
    };

    return (
        <section
            className="sale-page__catalog calculator-sale-entry"
            aria-label="קופה במצב מחשבון"
        >
            <div className="calculator-sale-entry__header">
                <div>
                    <p className="calculator-sale-entry__eyebrow">
                        מצב מחשבון
                    </p>

                    <h2>
                        הזנת סכום
                    </h2>
                </div>
            </div>

            <div
                className="calculator-sale-entry__amount"
                dir="ltr"
                aria-live="polite"
            >
                <span>
                    ₪
                </span>

                <strong>
                    {amountText}
                </strong>
            </div>

            <label className="calculator-sale-entry__description">
                <span>
                    תיאור
                </span>

                <input
                    type="text"
                    value={description}
                    onChange={(event) =>
                        setDescription(
                            event.target.value,
                        )
                    }
                    placeholder="פריט כללי"
                />
            </label>

            <div className="calculator-sale-entry__keypad">
                {keypadRows.flat().map(
                    (key) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() =>
                                append(key)
                            }
                        >
                            {key}
                        </button>
                    ),
                )}

                <button
                    type="button"
                    className="calculator-sale-entry__utility"
                    onClick={backspace}
                >
                    מחיקה
                </button>

                <button
                    type="button"
                    className="calculator-sale-entry__utility"
                    onClick={clear}
                >
                    נקה
                </button>
            </div>

            <button
                type="button"
                className="calculator-sale-entry__add"
                disabled={
                    !Number.isFinite(amount) ||
                    amount <= 0
                }
                onClick={addToSale}
            >
                הוסף לעסקה
            </button>
        </section>
    );
}

export default CalculatorSaleEntry;
'@

[IO.File]::WriteAllText(
    $path,
    $content,
    $utf8NoBom
)

Write-Host "CREATED $path"

# ============================================================
# 3. CREATE Calculator CSS
# ============================================================

$path = ".\src\components\pos\calculator-sale-entry.css"

$content = @'
.calculator-sale-entry {
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.calculator-sale-entry__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.calculator-sale-entry__header h2 {
    margin: 3px 0 0;
    font-size: 22px;
}

.calculator-sale-entry__eyebrow {
    margin: 0;
    color: #6f7b76;
    font-size: 11px;
    font-weight: 700;
}

.calculator-sale-entry__amount {
    min-height: 104px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 18px 22px;
    border: 1px solid #dfe5e2;
    border-radius: 16px;
    background: #f8faf9;
    font-variant-numeric: tabular-nums;
}

.calculator-sale-entry__amount span {
    font-size: 24px;
    color: #68736f;
}

.calculator-sale-entry__amount strong {
    font-size: clamp(42px, 6vw, 68px);
    line-height: 1;
    font-weight: 750;
    letter-spacing: -0.04em;
}

.calculator-sale-entry__description {
    display: grid;
    gap: 7px;
}

.calculator-sale-entry__description span {
    font-size: 12px;
    font-weight: 700;
    color: #59645f;
}

.calculator-sale-entry__description input {
    width: 100%;
    min-height: 46px;
    padding: 0 14px;
    border: 1px solid #d7dfdb;
    border-radius: 10px;
    background: #fff;
    font: inherit;
}

.calculator-sale-entry__keypad {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
}

.calculator-sale-entry__keypad button {
    min-height: 64px;
    border: 1px solid #d9e0dd;
    border-radius: 12px;
    background: #fff;
    font: inherit;
    font-size: 22px;
    font-weight: 700;
    cursor: pointer;
}

.calculator-sale-entry__keypad button:hover {
    background: #f4f7f5;
}

.calculator-sale-entry__keypad .calculator-sale-entry__utility {
    font-size: 14px;
    font-weight: 700;
}

.calculator-sale-entry__add {
    min-height: 54px;
    border: 0;
    border-radius: 12px;
    background: var(--primary);
    color: #fff;
    font: inherit;
    font-size: 17px;
    font-weight: 800;
    cursor: pointer;
}

.calculator-sale-entry__add:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}
'@

[IO.File]::WriteAllText(
    $path,
    $content,
    $utf8NoBom
)

Write-Host "CREATED $path"

# ============================================================
# 4. PATCH SalePage.tsx
# ============================================================

$path = ".\src\pages\sale\SalePage.tsx"
$text = Get-Content $path -Raw -Encoding UTF8

$importAnchor = 'import CartPanel from "../../components/pos/CartPanel";'

$importReplacement = @'
import CalculatorSaleEntry from "../../components/pos/CalculatorSaleEntry";
import CartPanel from "../../components/pos/CartPanel";
'@

if (-not $text.Contains($importAnchor)) {
    throw "SalePage CartPanel import anchor not found"
}

$text = $text.Replace(
    $importAnchor,
    $importReplacement
)

$addProductAnchor = @'
    const addReturnLines = (
        lines: CartLine[],
    ) => {
'@

$calculatorFunction = @'
    const addCalculatorAmount = (
        amount: number,
        description: string,
    ) => {
        const productId =
            crypto.randomUUID();

        const product: Product = {
            id:
                productId,

            name:
                description ||
                "פריט כללי",

            names: {
                he:
                    description ||
                    "פריט כללי",
            },

            price:
                amount,

            category:
                "manual",

            imageUrl:
                "",

            barcode:
                "",

            sku:
                `CALC-${productId}`,

            isActive:
                true,
        };

        const line: CartLine = {
            id:
                crypto.randomUUID(),

            kind:
                "sale",

            source:
                "calculator",

            product,

            quantity:
                1,

            unitPrice:
                amount,

            lineDiscountAmount:
                0,

            allocatedSaleDiscountAmount:
                0,
        };

        updateCartLines(
            (current) => [
                ...current,
                line,
            ],
        );

        setSelectedLineId(
            line.id,
        );
    };

    const addReturnLines = (
        lines: CartLine[],
    ) => {
'@

if (-not $text.Contains($addProductAnchor)) {
    throw "SalePage addReturnLines anchor not found"
}

$text = $text.Replace(
    $addProductAnchor,
    $calculatorFunction
)

$contentAnchor = @'
                <div className="sale-page__content">
                    <section className="sale-page__catalog">
'@

$contentReplacement = @'
                <div className="sale-page__content">
                    {activeProfile.operatingModel ===
                        "calculator" && (
                        <CalculatorSaleEntry
                            onAddAmount={
                                addCalculatorAmount
                            }
                        />
                    )}

                    <section
                        className="sale-page__catalog"
                        hidden={
                            activeProfile.operatingModel ===
                            "calculator"
                        }
                    >
'@

if (-not $text.Contains($contentAnchor)) {
    throw "SalePage content/catalog anchor not found"
}

$text = $text.Replace(
    $contentAnchor,
    $contentReplacement
)

[IO.File]::WriteAllText(
    $path,
    $text,
    $utf8NoBom
)

Write-Host "UPDATED $path"

# ============================================================
# 5. VERIFY
# ============================================================

Write-Host "`n=== CALCULATOR ENTRY CHECK ==="

$saleCheck =
    Get-Content $path -Raw -Encoding UTF8

if ($saleCheck -notmatch 'CalculatorSaleEntry') {
    throw "CalculatorSaleEntry connection missing"
}

if ($saleCheck -notmatch 'source:\s*"calculator"') {
    throw "Calculator CartLine source missing"
}

if ($saleCheck -notmatch 'operatingModel ===\s*"calculator"') {
    throw "Calculator profile routing missing"
}

Write-Host "CALCULATOR ENTRY CONNECTED"
Write-Host "CATALOG IS HIDDEN ONLY FOR CALCULATOR PROFILE"

# ============================================================
# 6. TYPECHECK + BUILD
# ============================================================

Write-Host "`n=== TYPECHECK ==="

npx tsc -b --pretty false

if ($LASTEXITCODE -ne 0) {
    throw "TYPECHECK FAILED"
}

Write-Host "`n=== BUILD ==="

npm run build

if ($LASTEXITCODE -ne 0) {
    throw "BUILD FAILED"
}

Write-Host "`nCALCULATOR SALE ENTRY V1 CONNECTED"
