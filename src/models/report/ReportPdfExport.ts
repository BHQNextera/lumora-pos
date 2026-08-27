import type {
    ReportResult,
} from "./Report";

export type ReportPdfContext = {
    businessName?: string;
    storeCode?: string;
    registerCode?: string;
    periodLabel: string;
};

type PdfPageImage = {
    width: number;
    height: number;
    widthPt: number;
    heightPt: number;
    jpegBytes: Uint8Array;
};

type PdfLayout = {
    widthPx: number;
    heightPx: number;
    widthPt: number;
    heightPt: number;
    marginX: number;
    topY: number;
    headerHeight: number;
    tableHeaderHeight: number;
    rowHeight: number;
    footerHeight: number;
    headerFontSize: number;
    rowFontSize: number;
    minCellFontSize: number;
    cellPadding: number;
};

const PORTRAIT_WIDTH_PX = 1240;
const PORTRAIT_HEIGHT_PX = 1754;
const LANDSCAPE_WIDTH_PX = 1754;
const LANDSCAPE_HEIGHT_PX = 1240;
const A4_WIDTH_PT = 595.28;
const A4_HEIGHT_PT = 841.89;
const FONT_STACK =
    'Inter, "Segoe UI", Arial, sans-serif';

function createLayout(
    report: ReportResult,
): PdfLayout {
    const useLandscape =
        report.columns.length >= 8;

    if (useLandscape) {
        return {
            widthPx: LANDSCAPE_WIDTH_PX,
            heightPx: LANDSCAPE_HEIGHT_PX,
            widthPt: A4_HEIGHT_PT,
            heightPt: A4_WIDTH_PT,
            marginX: 56,
            topY: 54,
            headerHeight: 250,
            tableHeaderHeight: 68,
            rowHeight: 54,
            footerHeight: 58,
            headerFontSize: 15,
            rowFontSize: 15,
            minCellFontSize: 9,
            cellPadding: 18,
        };
    }

    return {
        widthPx: PORTRAIT_WIDTH_PX,
        heightPx: PORTRAIT_HEIGHT_PX,
        widthPt: A4_WIDTH_PT,
        heightPt: A4_HEIGHT_PT,
        marginX: 72,
        topY: 74,
        headerHeight: 276,
        tableHeaderHeight: 64,
        rowHeight: 52,
        footerHeight: 70,
        headerFontSize: 17,
        rowFontSize: 16,
        minCellFontSize: 10,
        cellPadding: 20,
    };
}

function createCanvas(
    layout: PdfLayout,
) {
    const canvas =
        document.createElement(
            "canvas",
        );

    canvas.width = layout.widthPx;
    canvas.height = layout.heightPx;

    return canvas;
}

function canvasContext(
    canvas: HTMLCanvasElement,
) {
    const context =
        canvas.getContext(
            "2d",
        );

    if (!context) {
        throw new Error(
            "PDF_CANVAS_UNAVAILABLE",
        );
    }

    return context;
}

function textDirection(
    value: unknown,
) {
    return /[\u0590-\u05ff]/.test(
        String(value ?? ""),
    )
        ? "rtl"
        : "ltr";
}

function drawRightText(
    context: CanvasRenderingContext2D,
    value: unknown,
    x: number,
    y: number,
) {
    context.textAlign = "right";
    context.direction =
        textDirection(value);
    context.fillText(
        String(value ?? ""),
        x,
        y,
    );
}

function drawLeftText(
    context: CanvasRenderingContext2D,
    value: unknown,
    x: number,
    y: number,
) {
    context.textAlign = "left";
    context.direction = "ltr";
    context.fillText(
        String(value ?? ""),
        x,
        y,
    );
}

function setFont(
    context: CanvasRenderingContext2D,
    weight: number,
    size: number,
) {
    context.font =
        `${weight} ${size}px ${FONT_STACK}`;
}

function fittedFontSize(
    context: CanvasRenderingContext2D,
    value: unknown,
    maxWidth: number,
    weight: number,
    preferredSize: number,
    minimumSize: number,
) {
    const text = String(
        value ?? "",
    );

    for (
        let size = preferredSize;
        size >= minimumSize;
        size -= 1
    ) {
        setFont(
            context,
            weight,
            size,
        );

        if (
            context.measureText(text)
                .width <= maxWidth
        ) {
            return size;
        }
    }

    return minimumSize;
}

function splitLongToken(
    context: CanvasRenderingContext2D,
    token: string,
    maxWidth: number,
) {
    const pieces: string[] = [];
    let current = "";

    for (const character of token) {
        const candidate =
            current + character;

        if (
            current &&
            context.measureText(
                candidate,
            ).width > maxWidth
        ) {
            pieces.push(current);
            current = character;
        }
        else {
            current = candidate;
        }
    }

    if (current) {
        pieces.push(current);
    }

    return pieces;
}

function wrapText(
    context: CanvasRenderingContext2D,
    value: unknown,
    maxWidth: number,
) {
    const text = String(
        value ?? "",
    ).trim();

    if (!text) {
        return [""];
    }

    const words =
        text.split(/\s+/);
    const lines: string[] = [];
    let current = "";

    const pushToken = (
        token: string,
    ) => {
        const candidate =
            current
                ? `${current} ${token}`
                : token;

        if (
            context.measureText(
                candidate,
            ).width <= maxWidth
        ) {
            current = candidate;
            return;
        }

        if (current) {
            lines.push(current);
            current = "";
        }

        if (
            context.measureText(token)
                .width <= maxWidth
        ) {
            current = token;
            return;
        }

        const pieces =
            splitLongToken(
                context,
                token,
                maxWidth,
            );

        pieces.forEach(
            (piece, index) => {
                if (
                    index ===
                    pieces.length - 1
                ) {
                    current = piece;
                }
                else {
                    lines.push(piece);
                }
            },
        );
    };

    words.forEach(pushToken);

    if (current) {
        lines.push(current);
    }

    return lines;
}

function drawCellText(
    context: CanvasRenderingContext2D,
    value: unknown,
    right: number,
    top: number,
    width: number,
    height: number,
    options: {
        weight: number;
        preferredSize: number;
        minimumSize: number;
        maxLines: number;
    },
) {
    const maxWidth =
        Math.max(
            12,
            width - 28,
        );
    const text = String(
        value ?? "",
    );
    const fittedSize =
        fittedFontSize(
            context,
            text,
            maxWidth,
            options.weight,
            options.preferredSize,
            options.minimumSize,
        );

    setFont(
        context,
        options.weight,
        fittedSize,
    );

    if (
        context.measureText(text)
            .width <= maxWidth
    ) {
        drawRightText(
            context,
            text,
            right - 14,
            top +
                height / 2 +
                fittedSize * 0.34,
        );
        return;
    }

    const wrapped =
        wrapText(
            context,
            text,
            maxWidth,
        );
    const lines =
        wrapped.slice(
            0,
            options.maxLines,
        );
    const lineHeight =
        fittedSize + 4;
    const totalHeight =
        lines.length * lineHeight;
    let baseline =
        top +
        (height - totalHeight) / 2 +
        fittedSize;

    lines.forEach(
        (line) => {
            drawRightText(
                context,
                line,
                right - 14,
                baseline,
            );
            baseline += lineHeight;
        },
    );
}

function drawHeader(
    context: CanvasRenderingContext2D,
    report: ReportResult,
    pdfContext: ReportPdfContext,
    pageNumber: number,
    pageCount: number,
    layout: PdfLayout,
) {
    context.fillStyle = "#ffffff";
    context.fillRect(
        0,
        0,
        layout.widthPx,
        layout.heightPx,
    );

    context.fillStyle = "#20242a";
    setFont(
        context,
        700,
        layout.widthPx >
            PORTRAIT_WIDTH_PX
            ? 34
            : 40,
    );
    drawRightText(
        context,
        report.title,
        layout.widthPx -
            layout.marginX,
        layout.topY,
    );

    context.fillStyle = "#8b9198";
    setFont(
        context,
        500,
        20,
    );
    drawRightText(
        context,
        pdfContext.businessName ||
            "LUMORA",
        layout.widthPx -
            layout.marginX,
        layout.topY + 42,
    );

    const locationParts = [
        pdfContext.storeCode
            ? `חנות ${pdfContext.storeCode}`
            : null,
        pdfContext.registerCode
            ? `קופה ${pdfContext.registerCode}`
            : null,
    ].filter(Boolean);

    if (locationParts.length > 0) {
        drawRightText(
            context,
            locationParts.join(" · "),
            layout.widthPx -
                layout.marginX,
            layout.topY + 75,
        );
    }

    context.fillStyle = "#20242a";
    setFont(
        context,
        600,
        20,
    );
    drawRightText(
        context,
        pdfContext.periodLabel,
        layout.widthPx -
            layout.marginX,
        layout.topY + 118,
    );

    context.fillStyle = "#8b9198";
    setFont(
        context,
        400,
        17,
    );
    drawRightText(
        context,
        `הופק: ${new Date(
            report.generatedAt,
        ).toLocaleString("he-IL")}`,
        layout.widthPx -
            layout.marginX,
        layout.topY + 150,
    );

    context.fillStyle = "#c9942f";
    context.fillRect(
        layout.marginX,
        layout.topY + 174,
        layout.widthPx -
            layout.marginX * 2,
        4,
    );

    context.fillStyle = "#8b9198";
    setFont(
        context,
        500,
        16,
    );
    drawLeftText(
        context,
        `LUMORA · ${pageNumber}/${pageCount}`,
        layout.marginX,
        layout.topY + 150,
    );
}

function calculateColumnWidths(
    report: ReportResult,
    context: CanvasRenderingContext2D,
    layout: PdfLayout,
) {
    const available =
        layout.widthPx -
        layout.marginX * 2;
    const count =
        Math.max(
            report.columns.length,
            1,
        );
    const minimum =
        Math.max(
            66,
            Math.min(
                112,
                available /
                    count * 0.72,
            ),
        );

    const desired =
        report.columns.map(
            (column) => {
                setFont(
                    context,
                    700,
                    layout.headerFontSize,
                );
                let measured =
                    context.measureText(
                        column.label,
                    ).width;

                setFont(
                    context,
                    500,
                    layout.rowFontSize,
                );

                report.rows
                    .slice(0, 60)
                    .forEach(
                        (row) => {
                            measured =
                                Math.max(
                                    measured,
                                    context.measureText(
                                        String(
                                            row.values[
                                                column.id
                                            ] ?? "",
                                        ),
                                    ).width,
                                );
                        },
                    );

                return Math.min(
                    layout.widthPx >
                        PORTRAIT_WIDTH_PX
                        ? 300
                        : 320,
                    Math.max(
                        minimum,
                        measured +
                            layout.cellPadding * 2,
                    ),
                );
            },
        );

    const totalDesired =
        desired.reduce(
            (sum, width) =>
                sum + width,
            0,
        );

    if (totalDesired <= available) {
        const extra =
            available -
            totalDesired;
        const extraPerColumn =
            extra / count;

        return desired.map(
            (width) =>
                width +
                extraPerColumn,
        );
    }

    const shrinkCapacity =
        desired.reduce(
            (sum, width) =>
                sum +
                Math.max(
                    0,
                    width - minimum,
                ),
            0,
        );
    const shortage =
        totalDesired -
        available;

    if (
        shrinkCapacity <= 0 ||
        shortage >= shrinkCapacity
    ) {
        return new Array<number>(
            count,
        ).fill(
            available / count,
        );
    }

    return desired.map(
        (width) => {
            const capacity =
                Math.max(
                    0,
                    width - minimum,
                );
            const reduction =
                shortage *
                capacity /
                shrinkCapacity;

            return width - reduction;
        },
    );
}

function drawTableHeader(
    context: CanvasRenderingContext2D,
    report: ReportResult,
    widths: number[],
    y: number,
    layout: PdfLayout,
) {
    let right =
        layout.widthPx -
        layout.marginX;

    context.fillStyle = "#faf3e4";
    context.fillRect(
        layout.marginX,
        y,
        layout.widthPx -
            layout.marginX * 2,
        layout.tableHeaderHeight,
    );

    context.fillStyle = "#20242a";

    report.columns.forEach(
        (column, index) => {
            const width =
                widths[index];

            drawCellText(
                context,
                column.label,
                right,
                y,
                width,
                layout.tableHeaderHeight,
                {
                    weight: 700,
                    preferredSize:
                        layout.headerFontSize,
                    minimumSize: 10,
                    maxLines: 2,
                },
            );

            right -= width;
        },
    );
}

function drawRows(
    context: CanvasRenderingContext2D,
    report: ReportResult,
    widths: number[],
    rows: ReportResult["rows"],
    startY: number,
    layout: PdfLayout,
) {
    rows.forEach(
        (row, rowIndex) => {
            const y =
                startY +
                rowIndex *
                    layout.rowHeight;

            context.fillStyle =
                rowIndex % 2 === 0
                    ? "#ffffff"
                    : "#f8f9fa";
            context.fillRect(
                layout.marginX,
                y,
                layout.widthPx -
                    layout.marginX * 2,
                layout.rowHeight,
            );

            context.strokeStyle =
                "#eceeef";
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(
                layout.marginX,
                y + layout.rowHeight,
            );
            context.lineTo(
                layout.widthPx -
                    layout.marginX,
                y + layout.rowHeight,
            );
            context.stroke();

            let right =
                layout.widthPx -
                layout.marginX;

            report.columns.forEach(
                (column, index) => {
                    const width =
                        widths[index];
                    const value =
                        row.values[
                            column.id
                        ] ?? "";

                    context.fillStyle =
                        "#20242a";

                    drawCellText(
                        context,
                        value,
                        right,
                        y,
                        width,
                        layout.rowHeight,
                        {
                            weight: 500,
                            preferredSize:
                                layout.rowFontSize,
                            minimumSize:
                                layout.minCellFontSize,
                            maxLines: 2,
                        },
                    );

                    right -= width;
                },
            );
        },
    );
}

function drawTotals(
    context: CanvasRenderingContext2D,
    report: ReportResult,
    y: number,
    layout: PdfLayout,
) {
    if (
        !report.totals ||
        report.totals.length === 0
    ) {
        return;
    }

    const totals =
        report.totals;
    const cardWidth =
        Math.min(
            340,
            (
                layout.widthPx -
                layout.marginX * 2 -
                18 *
                    (totals.length - 1)
            ) /
                totals.length,
        );

    let right =
        layout.widthPx -
        layout.marginX;

    totals.forEach(
        (total) => {
            context.fillStyle =
                "#faf3e4";
            context.fillRect(
                right - cardWidth,
                y,
                cardWidth,
                84,
            );

            context.fillStyle =
                "#8b9198";
            drawCellText(
                context,
                total.label,
                right,
                y + 4,
                cardWidth,
                34,
                {
                    weight: 500,
                    preferredSize: 15,
                    minimumSize: 10,
                    maxLines: 1,
                },
            );

            context.fillStyle =
                "#20242a";
            drawCellText(
                context,
                total.value,
                right,
                y + 34,
                cardWidth,
                46,
                {
                    weight: 700,
                    preferredSize: 19,
                    minimumSize: 11,
                    maxLines: 1,
                },
            );

            right -=
                cardWidth + 18;
        },
    );
}

function base64ToBytes(
    base64: string,
) {
    const binary = atob(base64);
    const bytes =
        new Uint8Array(
            binary.length,
        );

    for (
        let index = 0;
        index < binary.length;
        index += 1
    ) {
        bytes[index] =
            binary.charCodeAt(
                index,
            );
    }

    return bytes;
}

function canvasToJpegBytes(
    canvas: HTMLCanvasElement,
) {
    const dataUrl =
        canvas.toDataURL(
            "image/jpeg",
            0.92,
        );
    const comma =
        dataUrl.indexOf(",");

    if (comma < 0) {
        throw new Error(
            "PDF_IMAGE_ENCODING_FAILED",
        );
    }

    return base64ToBytes(
        dataUrl.slice(
            comma + 1,
        ),
    );
}

function ascii85Encode(
    bytes: Uint8Array,
) {
    let result = "";

    for (
        let offset = 0;
        offset < bytes.length;
        offset += 4
    ) {
        const remaining =
            Math.min(
                4,
                bytes.length - offset,
            );
        let value = 0;

        for (
            let index = 0;
            index < 4;
            index += 1
        ) {
            value =
                value * 256 +
                (
                    index < remaining
                        ? bytes[
                            offset + index
                        ]
                        : 0
                );
        }

        if (
            remaining === 4 &&
            value === 0
        ) {
            result += "z";
            continue;
        }

        const encoded =
            new Array<number>(5);

        for (
            let index = 4;
            index >= 0;
            index -= 1
        ) {
            encoded[index] =
                value % 85;
            value =
                Math.floor(
                    value / 85,
                );
        }

        const count =
            remaining < 4
                ? remaining + 1
                : 5;

        for (
            let index = 0;
            index < count;
            index += 1
        ) {
            result +=
                String.fromCharCode(
                    encoded[index] +
                        33,
                );
        }
    }

    return result + "~>";
}

function buildAsciiPdf(
    pages: PdfPageImage[],
) {
    if (pages.length === 0) {
        throw new Error(
            "PDF_NO_PAGES",
        );
    }

    const catalogId = 1;
    const pagesId = 2;
    const pageIds =
        pages.map(
            (_, index) =>
                3 + index * 3,
        );

    const objects =
        new Map<number, string>();

    objects.set(
        catalogId,
        `<< /Type /Catalog /Pages ${pagesId} 0 R >>`,
    );

    objects.set(
        pagesId,
        `<< /Type /Pages /Count ${pages.length} /Kids [${pageIds
            .map(
                (id) =>
                    `${id} 0 R`,
            )
            .join(" ")}] >>`,
    );

    pages.forEach(
        (page, index) => {
            const pageId =
                3 + index * 3;
            const contentId =
                pageId + 1;
            const imageId =
                pageId + 2;
            const imageName =
                `Im${index + 1}`;
            const content =
                `q\n${page.widthPt} 0 0 ${page.heightPt} 0 0 cm\n/${imageName} Do\nQ\n`;
            const encodedImage =
                ascii85Encode(
                    page.jpegBytes,
                );

            objects.set(
                pageId,
                `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${page.widthPt} ${page.heightPt}] /Resources << /XObject << /${imageName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
            );

            objects.set(
                contentId,
                `<< /Length ${content.length} >>\nstream\n${content}endstream`,
            );

            objects.set(
                imageId,
                `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCII85Decode /DCTDecode] /Length ${encodedImage.length} >>\nstream\n${encodedImage}\nendstream`,
            );
        },
    );

    const maxObjectId =
        Math.max(
            ...objects.keys(),
        );

    let pdf =
        "%PDF-1.4\n%LUMORA\n";
    const offsets =
        new Array<number>(
            maxObjectId + 1,
        ).fill(0);

    for (
        let id = 1;
        id <= maxObjectId;
        id += 1
    ) {
        const body =
            objects.get(id);

        if (!body) {
            throw new Error(
                `PDF_OBJECT_MISSING_${id}`,
            );
        }

        offsets[id] =
            pdf.length;
        pdf +=
            `${id} 0 obj\n${body}\nendobj\n`;
    }

    const xrefOffset =
        pdf.length;

    pdf +=
        `xref\n0 ${maxObjectId + 1}\n`;
    pdf +=
        "0000000000 65535 f \n";

    for (
        let id = 1;
        id <= maxObjectId;
        id += 1
    ) {
        pdf +=
            `${String(
                offsets[id],
            ).padStart(10, "0")} 00000 n \n`;
    }

    pdf +=
        `trailer\n<< /Size ${maxObjectId + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    return pdf;
}

function rowsPerPage(
    layout: PdfLayout,
) {
    const usable =
        layout.heightPx -
        layout.headerHeight -
        layout.tableHeaderHeight -
        layout.footerHeight -
        112;

    return Math.max(
        1,
        Math.floor(
            usable /
            layout.rowHeight,
        ),
    );
}

export async function buildReportPdf(
    report: ReportResult,
    pdfContext: ReportPdfContext,
): Promise<string> {
    if (
        typeof document ===
        "undefined"
    ) {
        throw new Error(
            "PDF_BROWSER_CONTEXT_REQUIRED",
        );
    }

    if (document.fonts?.ready) {
        await document.fonts.ready;
    }

    const layout =
        createLayout(report);
    const sizingCanvas =
        createCanvas(layout);
    const sizingContext =
        canvasContext(
            sizingCanvas,
        );
    const widths =
        calculateColumnWidths(
            report,
            sizingContext,
            layout,
        );
    const pageCapacity =
        rowsPerPage(layout);
    const rowGroups:
        ReportResult["rows"][] = [];

    if (report.rows.length === 0) {
        rowGroups.push([]);
    }
    else {
        for (
            let offset = 0;
            offset < report.rows.length;
            offset += pageCapacity
        ) {
            rowGroups.push(
                report.rows.slice(
                    offset,
                    offset +
                        pageCapacity,
                ),
            );
        }
    }

    const pageImages:
        PdfPageImage[] = [];

    rowGroups.forEach(
        (rows, pageIndex) => {
            const canvas =
                createCanvas(layout);
            const context =
                canvasContext(
                    canvas,
                );

            drawHeader(
                context,
                report,
                pdfContext,
                pageIndex + 1,
                rowGroups.length,
                layout,
            );

            const tableY =
                layout.headerHeight;

            drawTableHeader(
                context,
                report,
                widths,
                tableY,
                layout,
            );

            if (rows.length === 0) {
                context.fillStyle =
                    "#8b9198";
                setFont(
                    context,
                    500,
                    20,
                );
                drawRightText(
                    context,
                    "אין נתונים להצגה",
                    layout.widthPx -
                        layout.marginX,
                    tableY +
                        layout.tableHeaderHeight +
                        54,
                );
            }
            else {
                drawRows(
                    context,
                    report,
                    widths,
                    rows,
                    tableY +
                        layout.tableHeaderHeight,
                    layout,
                );
            }

            if (
                pageIndex ===
                    rowGroups.length - 1 &&
                report.totals &&
                report.totals.length > 0
            ) {
                const totalsY =
                    Math.min(
                        layout.heightPx -
                            layout.footerHeight -
                            104,
                        tableY +
                            layout.tableHeaderHeight +
                            Math.max(
                                rows.length,
                                1,
                            ) *
                                layout.rowHeight +
                            28,
                    );

                drawTotals(
                    context,
                    report,
                    totalsY,
                    layout,
                );
            }

            pageImages.push({
                width:
                    canvas.width,
                height:
                    canvas.height,
                widthPt:
                    layout.widthPt,
                heightPt:
                    layout.heightPt,
                jpegBytes:
                    canvasToJpegBytes(
                        canvas,
                    ),
            });
        },
    );

    return buildAsciiPdf(
        pageImages,
    );
}

export function reportPdfToBase64(
    pdf: string,
) {
    return btoa(pdf);
}
