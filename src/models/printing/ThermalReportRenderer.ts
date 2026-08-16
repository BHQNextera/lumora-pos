import type {
    ThermalPrintDocument,
} from "./ThermalPrintDocument";

import type {
    ThermalPrintProfile,
} from "./ThermalPrintProfile";

function escapeHtml(
    value: string,
) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

export function renderThermalDocumentHtml(
    document: ThermalPrintDocument,
    profile: ThermalPrintProfile,
) {
    const blocks =
        document.blocks
            .map((block) => {
                if (
                    block.type ===
                    "separator"
                ) {
                    return (
                        '<div class="separator"></div>'
                    );
                }

                if (
                    block.type ===
                    "spacer"
                ) {
                    return (
                        '<div class="spacer"></div>'
                    );
                }

                if (
                    block.type ===
                    "row"
                ) {
                    return `
                        <div class="row ${
                            block.bold
                                ? "bold"
                                : ""
                        }">
                            <span>${escapeHtml(
                                block.label,
                            )}</span>
                            <span>${escapeHtml(
                                block.value,
                            )}</span>
                        </div>
                    `;
                }

                return `
                    <div
                        class="text ${
                            block.bold
                                ? "bold"
                                : ""
                        }"
                        style="text-align:${
                            block.alignment ??
                            "start"
                        }"
                    >
                        ${escapeHtml(
                            block.value,
                        )}
                    </div>
                `;
            })
            .join("");

    return `<!doctype html>
<html lang="he" dir="${document.direction}">
<head>
<meta charset="utf-8" />

<title>${escapeHtml(document.title)}</title>

<style>
    @page {
        size:
            ${profile.paperWidthMm}mm
            auto;

        margin: 0;
    }

    * {
        box-sizing: border-box;
    }

    html,
    body {
        margin: 0;
        padding: 0;
        background: #fff;
    }

    body {
        width:
            ${profile.paperWidthMm}mm;

        font-family:
            Arial,
            sans-serif;

        font-size:
            ${profile.fontSizePx}px;

        line-height:
            ${profile.lineHeight};

        color: #000;
    }

    .receipt {
        width:
            ${profile.contentWidthMm}mm;

        margin:
            0 auto;

        padding:
            3mm 0;
    }

    .text {
        white-space:
            pre-wrap;

        overflow-wrap:
            anywhere;
    }

    .row {
        display:
            flex;

        justify-content:
            space-between;

        gap:
            3mm;

        margin:
            1.2mm 0;
    }

    .row span:last-child {
        text-align:
            left;

        white-space:
            nowrap;
    }

    .bold {
        font-weight:
            700;
    }

    .separator {
        margin:
            2mm 0;

        border-top:
            1px dashed #000;
    }

    .spacer {
        height:
            2mm;
    }

    @media screen {
        body {
            margin:
                20px auto;

            box-shadow:
                0 0 18px
                rgba(
                    15,
                    23,
                    42,
                    .18
                );
        }
    }

    @media print {
        body {
            box-shadow:
                none;
        }
    }
</style>
</head>

<body>
    <main class="receipt">
        ${blocks}
    </main>
</body>
</html>`;
}

export function openThermalPrintPreview(
    document: ThermalPrintDocument,
    profile: ThermalPrintProfile,
) {
    const preview =
        window.open(
            "",
            "_blank",
            "width=520,height=760",
        );

    if (!preview) {
        throw new Error(
            "PRINT_PREVIEW_BLOCKED",
        );
    }

    preview.document.open();

    preview.document.write(
        renderThermalDocumentHtml(
            document,
            profile,
        ),
    );

    preview.document.close();

    preview.focus();

    return preview;
}