import {
    useMemo,
} from "react";

import bwipjs from "@bwip-js/browser";

type DocumentBarcodeProps = {
    value: string;
    displayValue: string;

    compact?: boolean;
};

function DocumentBarcode({
    value,
    displayValue,
    compact = false,
}: DocumentBarcodeProps) {
    const svg =
        useMemo(
            () => {
                try {
                    return bwipjs.toSVG({
                        bcid:
                            "code128",

                        text:
                            value,

                        height:
                            compact
                                ? 10
                                : 12,

                        scaleX:
                            2,

                        scaleY:
                            2,

                        includetext:
                            false,

                        paddingwidth:
                            0,

                        paddingheight:
                            0,
                    });
                } catch (error) {
                    console.error(
                        "Failed to render document barcode",
                        error,
                    );

                    return null;
                }
            },
            [
                value,
                compact,
            ],
        );

    if (!svg) {
        return (
            <div className="document-barcode document-barcode--error">
                <strong dir="ltr">
                    {displayValue}
                </strong>
            </div>
        );
    }

    return (
        <div
            className={
                compact
                    ? "document-barcode document-barcode--compact"
                    : "document-barcode"
            }
        >
            <div
                className="document-barcode__graphic"
                aria-label={`ברקוד מסמך ${displayValue}`}
                dangerouslySetInnerHTML={{
                    __html:
                        svg,
                }}
            />

            <strong
                className="document-barcode__value"
                dir="ltr"
            >
                {displayValue}
            </strong>
        </div>
    );
}

export default DocumentBarcode;