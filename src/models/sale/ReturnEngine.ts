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
            calculateIncludedTax(
                total,
            ),

        total,

        createdAt:
            new Date()
                .toISOString(),
    };
}