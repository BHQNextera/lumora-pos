import {
    createAccountingDocument,
} from "../document/DocumentFactory";
import type {
    Payment,
} from "../Payment";
import {
    saveReturn,
} from "../transaction/ReturnRepository";
import {
    getTransaction,
    saveSale,
} from "../transaction/TransactionRepository";
import type {
    ReturnLine,
} from "./Return";
import {
    createReturn,
} from "./ReturnEngine";
import type {
    AppliedSaleCoupon,
    Sale,
    TransactionType,
} from "./Sale";
import type {
    SaleLine,
} from "./SaleLine";

const SALE_SEQUENCE_KEY =
    "lumora.sale.sequence";

function roundMoney(
    value: number,
) {
    return (
        Math.round(
            (value + Number.EPSILON) *
            100,
        ) / 100
    );
}

function getNextSequence() {
    const current = Number(
        localStorage.getItem(
            SALE_SEQUENCE_KEY,
        ) ?? "1",
    );

    const safeCurrent =
        Number.isFinite(current) &&
            current > 0
            ? Math.floor(current)
            : 1;

    localStorage.setItem(
        SALE_SEQUENCE_KEY,
        String(safeCurrent + 1),
    );

    return safeCurrent;
}

function createSaleNumber() {
    const sequence =
        getNextSequence();

    return `S-${sequence
        .toString()
        .padStart(6, "0")}`;
}

function determineTransactionType(
    lines: SaleLine[],
): TransactionType {
    const hasSales =
        lines.some(
            (line) =>
                line.kind === "sale",
        );

    const hasReturns =
        lines.some(
            (line) =>
                line.kind === "return",
        );

    if (
        hasSales &&
        hasReturns
    ) {
        return "exchange";
    }

    if (hasReturns) {
        return "return";
    }

    return "sale";
}

function registerLinkedReturns(
    transaction: Sale,
) {
    const linkedReturnLines =
        transaction.lines.filter(
            (line) =>
                line.kind ===
                "return" &&
                Boolean(
                    line.originalSaleId,
                ) &&
                Boolean(
                    line.originalSaleLineId,
                ),
        );

    if (
        linkedReturnLines.length ===
        0
    ) {
        return;
    }

    const groupedByOriginalSale =
        new Map<
            string,
            SaleLine[]
        >();

    for (
        const line of
        linkedReturnLines
    ) {
        const originalSaleId =
            line.originalSaleId;

        if (!originalSaleId) {
            continue;
        }

        const current =
            groupedByOriginalSale.get(
                originalSaleId,
            ) ?? [];

        current.push(line);

        groupedByOriginalSale.set(
            originalSaleId,
            current,
        );
    }

    for (
        const [
            originalSaleId,
            lines,
        ] of
        groupedByOriginalSale
    ) {
        const originalSale =
            getTransaction(
                originalSaleId,
            );

        if (!originalSale) {
            continue;
        }

        const returnLines:
            ReturnLine[] =
            lines.flatMap(
                (line) => {
                    if (
                        !line.originalSaleLineId
                    ) {
                        return [];
                    }

                    const originalLine =
                        originalSale.lines.find(
                            (item) =>
                                item.id ===
                                line.originalSaleLineId,
                        );

                    if (!originalLine) {
                        return [];
                    }

                    const quantity =
                        line.quantity;

                    const grossAmount =
                        originalLine.unitPrice *
                        quantity;

                    const netAmount =
                        Math.abs(
                            line.netAmount,
                        );

                    const discountAmount =
                        Math.max(
                            0,
                            grossAmount -
                            netAmount,
                        );

                    return [
                        {
                            saleLineId:
                                originalLine.id,

                            quantity,

                            unitPrice:
                                originalLine.unitPrice,

                            grossAmount,

                            discountAmount,

                            netAmount,

                            reason:
                                "other",
                        },
                    ];
                },
            );

        if (
            returnLines.length ===
            0
        ) {
            continue;
        }

        const returnDocument =
            createReturn(
                originalSale,
                returnLines,
            );

        saveReturn(
            returnDocument,
        );
    }
}

export type CompleteSaleOptions = {
    transactionId?: string;
    coupon?: AppliedSaleCoupon;
};

export function completeSale(
    lines: SaleLine[],
    payments: Payment[],
    customer: Sale["customer"] = {
        name: "לקוח מזדמן",
    },
    options: CompleteSaleOptions = {},
): Sale {
    const now =
        new Date().toISOString();

    const subtotal =
        roundMoney(
            lines.reduce(
                (sum, line) =>
                    sum +
                    line.grossAmount,
                0,
            ),
        );

    const lineDiscount =
        roundMoney(
            lines.reduce(
                (sum, line) =>
                    sum +
                    line.lineDiscountAmount +
                    line.allocatedSaleDiscountAmount,
                0,
            ),
        );

    const preCouponTotal =
        roundMoney(
            lines.reduce(
                (sum, line) =>
                    sum +
                    line.netAmount,
                0,
            ),
        );

    const couponDiscount =
        options.coupon
            ? roundMoney(
                Math.min(
                    Math.max(
                        0,
                        preCouponTotal,
                    ),
                    Math.max(
                        0,
                        options.coupon
                            .discountApplied,
                    ),
                ),
            )
            : 0;

    const total =
        roundMoney(
            preCouponTotal -
            couponDiscount,
        );

    const sale: Sale = {
        id:
            options.transactionId ??
            crypto.randomUUID(),

        number:
            createSaleNumber(),

        status:
            "completed",

        transactionType:
            determineTransactionType(
                lines,
            ),

        customer,

        lines,

        subtotal,

        discount:
            roundMoney(
                lineDiscount +
                couponDiscount,
            ),

        coupon:
            options.coupon
                ? {
                    ...options.coupon,
                    discountApplied:
                        couponDiscount,
                }
                : undefined,

        tax: 0,

        total,

        payments,

        createdAt: now,
        completedAt: now,
    };

    saveSale(sale);

    registerLinkedReturns(
        sale,
    );

    createAccountingDocument(
        sale,
    );

    return sale;
}

export function getNextSaleNumber() {
    const current = Number(
        localStorage.getItem(
            SALE_SEQUENCE_KEY,
        ) ?? "1",
    );

    const safeCurrent =
        Number.isFinite(current) &&
            current > 0
            ? Math.floor(current)
            : 1;

    return `S-${safeCurrent
        .toString()
        .padStart(6, "0")}`;
}