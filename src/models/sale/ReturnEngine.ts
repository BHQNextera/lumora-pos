import {
    getReturnPolicy,
    isWithinReturnWindow,
} from "../../config/ReturnPolicy";
import {
    calculateIncludedTax,
} from "../tax/TaxPolicy";

import type {
    Sale,
} from "./Sale";

import type {
    ReturnDocument,
    ReturnLine,
} from "./Return";

export function validateReturn(
    sale: Sale,
    lines: ReturnLine[],
): string[] {
    const errors:
        string[] = [];

    const policy =
        getReturnPolicy();

    if (
        !policy.returnsEnabled
    ) {
        errors.push(
            "RETURN_DISABLED",
        );
    }

    if (
        !isWithinReturnWindow(
            sale.completedAt,
            sale.createdAt,
            policy,
        )
    ) {
        errors.push(
            "RETURN_WINDOW_EXPIRED",
        );
    }

    for (
        const line
        of lines
    ) {
        const original =
            sale.lines.find(
                (item) =>
                    item.id ===
                    line.saleLineId,
            );

        if (!original) {
            errors.push(
                `Line ${line.saleLineId} not found`,
            );

            continue;
        }

        if (
            line.quantity <= 0
        ) {
            errors.push(
                `${original.productName}: invalid quantity`,
            );
        }

        if (
            line.quantity >
            original.quantity
        ) {
            errors.push(
                `${original.productName}: quantity exceeds original sale`,
            );
        }

        if (
            line.discountAmount < 0
        ) {
            errors.push(
                `${original.productName}: invalid discount`,
            );
        }

        const expectedNet =
            line.grossAmount -
            line.discountAmount;

        if (
            Math.abs(
                expectedNet -
                line.netAmount,
            ) > 0.01
        ) {
            errors.push(
                `${original.productName}: net amount mismatch`,
            );
        }
    }

    return errors;
}

function calculateReturnTax(
    sale:
        Sale,
    lines:
        ReturnLine[],
) {
    return lines.reduce(
        (
            sum,
            line,
        ) => {
            const original =
                sale.lines.find(
                    (item) =>
                        item.id ===
                        line.saleLineId,
                );

            if (
                !original
            ) {
                return sum;
            }

            if (
                original
                    .taxSnapshot
            ) {
                const originalNet =
                    Math.abs(
                        original
                            .taxSnapshot
                            .taxableAmount,
                    );

                if (
                    originalNet >
                    0.001
                ) {
                    const ratio =
                        Math.min(
                            1,
                            Math.max(
                                0,
                                line.netAmount /
                                    originalNet,
                            ),
                        );

                    return (
                        sum +
                        Math.abs(
                            original
                                .taxSnapshot
                                .taxAmount,
                        ) *
                            ratio
                    );
                }

                return sum;
            }

            return (
                sum +
                calculateIncludedTax(
                    line.netAmount,
                )
            );
        },
        0,
    );
}

export function createReturn(
    sale: Sale,
    lines: ReturnLine[],
): ReturnDocument {
    const validation =
        validateReturn(
            sale,
            lines,
        );

    if (
        validation.length > 0
    ) {
        throw new Error(
            validation.join("\n"),
        );
    }

    const subtotal =
        lines.reduce(
            (sum, line) =>
                sum +
                line.grossAmount,
            0,
        );

    const discount =
        lines.reduce(
            (sum, line) =>
                sum +
                line.discountAmount,
            0,
        );

    const total =
        lines.reduce(
            (sum, line) =>
                sum +
                line.netAmount,
            0,
        );

    return {
        id:
            crypto.randomUUID(),

        originalSaleId:
            sale.id,

        lines,

        subtotal,
        discount,

        tax:
            Math.round(
                (
                    calculateReturnTax(
                        sale,
                        lines,
                    ) +
                    Number.EPSILON
                ) *
                    100,
            ) / 100,

        total,

        createdAt:
            new Date()
                .toISOString(),
    };
}