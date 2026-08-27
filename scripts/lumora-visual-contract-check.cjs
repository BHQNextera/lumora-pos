const fs = require("fs");
const path = require("path");

const repo = process.cwd();
const strict = process.argv.includes("--strict");

const allowedColors = new Set([
    "#c9942f",
    "#b47d1e",
    "#faf3e4",
    "#e5d2aa",
    "#dedfe1",
    "#e4e5e7",
    "#eceeef",
    "#20242a",
    "#8b9198",
    "#ffffff",
    "#fff",
    "#000000",
    "#000",
    "#f6f7f8",
    "#fafafa",

    // Documented semantic exceptions.
    "#a53e3e",
    "#fff2f2",
    "#65966e",
]);

const allowedEffects = new Set([
    "rgb(20 23 27 / 32%)",
    "rgb(15 18 21 / 22%)",
    "rgb(15 18 21 / 18%)",
    "rgb(15 18 21 / 6%)",
    "rgb(201 148 47 / 12%)",
    "rgb(201 148 47 / 10%)",
    "rgb(201 148 47 / 28%)",
    "rgb(180 125 30 / 18%)",
    "rgb(187 68 68 / 22%)",
    "rgb(187 68 68 / 6%)",
]);

const allowedFontSizes = new Set([
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    20,
    22,
    24,
    28,
    30,
]);

const allowedRadii = new Set([
    0,
    8,
    9,
    10,
    12,
    14,
    16,
    999,
]);

const excludedFiles = new Set([
    "src/pages/receipt/thermal-receipt.css",
]);

const groups = [
    {
        name: "Sale workspace",
        entries: [
            "src/pages/sale",
            "src/components/pos/cart-panel.css",
            "src/components/pos/calculator-sale-entry.css",
            "src/components/pos/SaleCustomerQuickCreateDialog.css",
            "src/components/sales-coach",
        ],
    },
    {
        name: "Payment workspace",
        entries: [
            "src/pages/payment/payment-page.css",
            "src/pages/payment/PaymentPage.tsx",
            "src/components/payment/PaymentMethodIcon.tsx",
            "src/components/payment/payment-method-icon.css",
        ],
    },
    {
        name: "Refund workspace",
        entries: [
            "src/pages/payment/refund-page.css",
            "src/pages/payment/RefundPage.tsx",
            "src/pages/return-item",
        ],
    },
    {
        name: "Post-transaction workspace",
        entries: [
            "src/pages/sale-complete",
            "src/pages/receipt/receipt-page.css",
            "src/pages/receipt/ReceiptPage.tsx",
        ],
    },
];

const colorPattern =
    /#[0-9a-f]{3,8}|rgba?\([^)]+\)|rgb\([^)]+\)/gi;

const fontSizePattern =
    /font-size\s*:\s*([0-9.]+)px/gi;

const fontFamilyPattern =
    /font-family\s*:\s*([^;}{]+)/gi;

const radiusPattern =
    /border-radius\s*:\s*([0-9.]+)px/gi;

function normalizeSlash(value) {
    return value.replace(/\\/g, "/");
}

function normalizeEffect(value) {
    return value
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function collectFiles(entry) {
    const absolute =
        path.join(repo, entry);

    if (!fs.existsSync(absolute)) {
        return [];
    }

    const stat =
        fs.statSync(absolute);

    if (stat.isFile()) {
        const relative =
            normalizeSlash(entry);

        return excludedFiles.has(relative)
            ? []
            : [relative];
    }

    const results = [];

    for (
        const child of
        fs.readdirSync(
            absolute,
            { withFileTypes: true },
        )
    ) {
        const childEntry =
            normalizeSlash(
                path.join(
                    entry,
                    child.name,
                ),
            );

        if (child.isDirectory()) {
            results.push(
                ...collectFiles(
                    childEntry,
                ),
            );
            continue;
        }

        if (
            /\.(css|tsx|ts)$/i.test(
                child.name,
            ) &&
            !excludedFiles.has(
                childEntry,
            )
        ) {
            results.push(
                childEntry,
            );
        }
    }

    return results;
}

function unique(values) {
    return [...new Set(values)];
}

function lineNumberForIndex(
    text,
    index,
) {
    return (
        text
            .slice(
                0,
                index,
            )
            .split("\n")
            .length
    );
}

const results = [];

for (const group of groups) {
    const files =
        unique(
            group.entries.flatMap(
                collectFiles,
            ),
        );

    const violations = [];

    for (const relative of files) {
        const absolute =
            path.join(
                repo,
                relative,
            );

        const text =
            fs.readFileSync(
                absolute,
                "utf8",
            );

        for (
            const match of
            text.matchAll(
                colorPattern,
            )
        ) {
            const raw =
                match[0];

            const lower =
                raw.toLowerCase();

            if (
                lower.startsWith(
                    "rgb",
                )
            ) {
                if (
                    !allowedEffects.has(
                        normalizeEffect(
                            raw,
                        ),
                    )
                ) {
                    violations.push({
                        kind:
                            "color-expression",
                        file:
                            relative,
                        line:
                            lineNumberForIndex(
                                text,
                                match.index,
                            ),
                        value:
                            raw,
                    });
                }

                continue;
            }

            if (
                !allowedColors.has(
                    lower,
                )
            ) {
                violations.push({
                    kind:
                        "color",
                    file:
                        relative,
                    line:
                        lineNumberForIndex(
                            text,
                            match.index,
                        ),
                    value:
                        raw,
                });
            }
        }

        for (
            const match of
            text.matchAll(
                fontSizePattern,
            )
        ) {
            const value =
                Number(
                    match[1],
                );

            if (
                !allowedFontSizes.has(
                    value,
                )
            ) {
                violations.push({
                    kind:
                        "font-size",
                    file:
                        relative,
                    line:
                        lineNumberForIndex(
                            text,
                            match.index,
                        ),
                    value:
                        `${value}px`,
                });
            }
        }

        for (
            const match of
            text.matchAll(
                fontFamilyPattern,
            )
        ) {
            const value =
                match[1].trim();

            if (
                !/\bInter\b/i.test(
                    value,
                ) &&
                !/^inherit$/i.test(
                    value,
                )
            ) {
                violations.push({
                    kind:
                        "font-family",
                    file:
                        relative,
                    line:
                        lineNumberForIndex(
                            text,
                            match.index,
                        ),
                    value,
                });
            }
        }

        for (
            const match of
            text.matchAll(
                radiusPattern,
            )
        ) {
            const value =
                Number(
                    match[1],
                );

            if (
                !allowedRadii.has(
                    value,
                )
            ) {
                violations.push({
                    kind:
                        "border-radius",
                    file:
                        relative,
                    line:
                        lineNumberForIndex(
                            text,
                            match.index,
                        ),
                    value:
                        `${value}px`,
                });
            }
        }
    }

    results.push({
        name:
            group.name,
        files,
        violations,
    });
}

const allViolations =
    results.flatMap(
        (result) =>
            result.violations,
    );

const report = [];

report.push(
    "# Lumora Visual Contract Gate",
    "",
    "| Workspace | Violations |",
    "|---|---:|",
);

for (const result of results) {
    report.push(
        `| ${result.name} | ${result.violations.length} |`,
    );
}

report.push(
    "",
    `Total violations: ${allViolations.length}`,
    "",
);

for (const result of results) {
    report.push(
        `## ${result.name}`,
        "",
    );

    if (
        result.violations.length ===
        0
    ) {
        report.push(
            "- GREEN",
            "",
        );

        continue;
    }

    report.push(
        "| Kind | File | Line | Value |",
        "|---|---|---:|---|",
    );

    for (
        const violation of
        result.violations
    ) {
        report.push(
            `| ${violation.kind} | ${violation.file} | ${violation.line} | ${String(violation.value).replace(/\|/g, "/")} |`,
        );
    }

    report.push("");
}

const reportPath =
    path.join(
        repo,
        "docs",
        "VISUAL_CONTRACT_POS_AUDIT.md",
    );

fs.writeFileSync(
    reportPath,
    report.join("\n"),
    "utf8",
);

console.log("");
console.log(
    "VISUAL CONTRACT CHECK COMPLETE",
);

for (const result of results) {
    console.log(
        `${result.name}: ${result.violations.length}`,
    );
}

console.log(
    `Total violations: ${allViolations.length}`,
);

console.log(
    "Report: docs/VISUAL_CONTRACT_POS_AUDIT.md",
);

if (
    strict &&
    allViolations.length > 0
) {
    process.exitCode = 1;
}