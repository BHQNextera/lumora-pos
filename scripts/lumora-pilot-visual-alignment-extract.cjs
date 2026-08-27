const fs = require("fs");
const path = require("path");

const repo = process.cwd();
const auditPath = path.join(
    repo,
    "docs",
    "VISUAL_CONTRACT_POS_AUDIT.md",
);

const outputPath = path.join(
    repo,
    "docs",
    "VISUAL_ALIGNMENT_PILOT_EXTRACT.md",
);

if (!fs.existsSync(auditPath)) {
    throw new Error(
        `Audit not found: ${auditPath}`,
    );
}

const audit =
    fs.readFileSync(
        auditPath,
        "utf8",
    );

const targetSections = new Set([
    "Sale workspace",
    "Payment workspace",
    "Refund workspace",
    "Post-transaction workspace",
]);

const lines =
    audit.split(/\r?\n/);

const rows = [];
let currentSection = null;

for (const line of lines) {
    const heading =
        line.match(
            /^##\s+(.+)$/,
        );

    if (heading) {
        currentSection =
            targetSections.has(
                heading[1].trim(),
            )
                ? heading[1].trim()
                : null;

        continue;
    }

    if (!currentSection) {
        continue;
    }

    const row =
        line.match(
            /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|$/,
        );

    if (!row) {
        continue;
    }

    const kind =
        row[1].trim();

    if (
        kind === "Kind" ||
        kind === "---"
    ) {
        continue;
    }

    rows.push({
        section:
            currentSection,
        kind,
        file:
            row[2].trim(),
        line:
            Number(
                row[3],
            ),
        value:
            row[4].trim(),
    });
}

if (rows.length === 0) {
    throw new Error(
        "No pilot violations parsed from audit.",
    );
}

function groupBy(
    values,
    keyFn,
) {
    const map =
        new Map();

    for (const value of values) {
        const key =
            keyFn(
                value,
            );

        if (!map.has(key)) {
            map.set(
                key,
                [],
            );
        }

        map.get(key)
            .push(
                value,
            );
    }

    return map;
}

const out = [];

out.push(
    "# Lumora Pilot Visual Alignment Extract V1.1",
    "",
    "Source: docs/VISUAL_CONTRACT_POS_AUDIT.md",
    "",
    "Shared/global foundation is intentionally excluded from this first repair pass.",
    "",
    "## Summary",
    "",
    "| Workspace | Violations | Files |",
    "|---|---:|---:|",
);

for (
    const section of
    targetSections
) {
    const sectionRows =
        rows.filter(
            (row) =>
                row.section ===
                section,
        );

    const files =
        new Set(
            sectionRows.map(
                (row) =>
                    row.file,
            ),
        );

    out.push(
        `| ${section} | ${sectionRows.length} | ${files.size} |`,
    );
}

out.push(
    "",
    "## Highest-risk pilot files",
    "",
    "| File | Violations |",
    "|---|---:|",
);

const byFile =
    [...groupBy(
        rows,
        (row) =>
            row.file,
    ).entries()]
        .sort(
            (a, b) =>
                b[1].length -
                a[1].length,
        );

for (
    const [file, fileRows] of
    byFile
) {
    out.push(
        `| ${file} | ${fileRows.length} |`,
    );
}

for (
    const section of
    targetSections
) {
    out.push(
        "",
        `## ${section}`,
        "",
    );

    const sectionRows =
        rows.filter(
            (row) =>
                row.section ===
                section,
        );

    const files =
        [...groupBy(
            sectionRows,
            (row) =>
                row.file,
        ).entries()]
            .sort(
                (a, b) =>
                    b[1].length -
                    a[1].length,
            );

    for (
        const [file, fileRows] of
        files
    ) {
        out.push(
            "",
            `### ${file}`,
            "",
            `Violations: ${fileRows.length}`,
            "",
            "| Line | Kind | Value |",
            "|---:|---|---|",
        );

        for (
            const row of
            fileRows.sort(
                (a, b) =>
                    a.line -
                    b.line,
            )
        ) {
            out.push(
                `| ${row.line} | ${row.kind} | ${String(row.value).replace(/\|/g, "/")} |`,
            );
        }

        const sourcePath =
            path.join(
                repo,
                file.replace(
                    /\//g,
                    path.sep,
                ),
            );

        if (
            !fs.existsSync(
                sourcePath,
            )
        ) {
            out.push(
                "",
                "SOURCE FILE MISSING",
            );

            continue;
        }

        const sourceLines =
            fs.readFileSync(
                sourcePath,
                "utf8",
            )
                .split(/\r?\n/);

        const wanted =
            [...new Set(
                fileRows.map(
                    (row) =>
                        row.line,
                ),
            )]
                .sort(
                    (a, b) =>
                        a - b,
                );

        const ranges = [];

        for (
            const lineNumber of
            wanted
        ) {
            const start =
                Math.max(
                    1,
                    lineNumber - 3,
                );

            const end =
                Math.min(
                    sourceLines.length,
                    lineNumber + 3,
                );

            const last =
                ranges[
                    ranges.length - 1
                ];

            if (
                last &&
                start <=
                    last.end + 2
            ) {
                last.end =
                    Math.max(
                        last.end,
                        end,
                    );
            }
            else {
                ranges.push({
                    start,
                    end,
                });
            }
        }

        for (
            const range of
            ranges
        ) {
            out.push(
                "",
                `#### Lines ${range.start}-${range.end}`,
                "",
                "~~~text",
            );

            for (
                let index =
                    range.start;
                index <=
                    range.end;
                index++
            ) {
                const prefix =
                    String(
                        index,
                    ).padStart(
                        5,
                        " ",
                    );

                out.push(
                    `${prefix}: ${sourceLines[index - 1] ?? ""}`,
                );
            }

            out.push(
                "~~~",
            );
        }
    }
}

fs.writeFileSync(
    outputPath,
    out.join("\n"),
    "utf8",
);

console.log("");
console.log(
    "PILOT VISUAL ALIGNMENT EXTRACT COMPLETE",
);
console.log(
    `Pilot violations: ${rows.length}`,
);
console.log(
    `Output: ${outputPath}`,
);
console.log(
    "No source file was changed.",
);