import type { Sale } from "./Sale";
import type {
    ReturnDocument,
    ReturnLine,
} from "./Return";

const RETURN_SEQUENCE_KEY =
    "lumora.return.sequence";

function getNextSequence() {
    const current = Number(
        localStorage.getItem(
            RETURN_SEQUENCE_KEY,
        ) ?? "1",
    );

    const safeCurrent =
        Number.isFinite(current) &&
            current > 0
            ? Math.floor(current)
            : 1;

    localStorage.setItem(
        RETURN_SEQUENCE_KEY,
        String(safeCurrent + 1),
    );

    return safeCurrent;
}

function createReturnNumber() {
    const sequence = getNextSequence();

    return `CN-${sequence
        .toString()
        .padStart(6, "0")}`;
}

export function validateReturn(
    sale: Sale,
    lines: ReturnLine[],
): string[] {
    const errors: string[] = [];

    for (const line of lines) {
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

        if (line.quantity <= 0) {
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
        id: crypto.randomUUID(),

        number:
            createReturnNumber(),

        originalSaleId:
            sale.id,

        lines,

        subtotal,
        discount,

        tax: 0,

        total,

        createdAt:
            new Date().toISOString(),
    };
}