import type {
    Payment,
} from "../Payment";
import {
    flushMonetaryValuePersistence,
    getMonetaryValueByNumber,
} from "../monetary-value/MonetaryValueRepository";
import {
    restoreMonetaryValue,
} from "../monetary-value/MonetaryValueService";
import type {
    SaleLine,
} from "../sale/SaleLine";
import {
    getTransaction,
    getTransactions,
} from "../transaction/TransactionRepository";

export type OriginalGiftCardRefundSource = {
    number: string;
    availableAmount: number;
};

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

export function getOriginalGiftCardRefundSource(
    lines: SaleLine[],
): OriginalGiftCardRefundSource | null {
    const originalSaleIds =
        Array.from(
            new Set(
                lines
                    .filter(
                        (line) =>
                            line.kind ===
                                "return" &&
                            Boolean(
                                line.originalSaleId,
                            ),
                    )
                    .map(
                        (line) =>
                            line.originalSaleId!,
                    ),
            ),
        );

    if (originalSaleIds.length !== 1) {
        return null;
    }

    const originalSale =
        getTransaction(
            originalSaleIds[0],
        );

    if (!originalSale) {
        return null;
    }

    const giftCardPayments =
        originalSale.payments.filter(
            (payment) =>
                payment.method ===
                    "gift_card" &&
                payment.amount > 0 &&
                Boolean(
                    payment.externalReference,
                ),
        );

    if (giftCardPayments.length !== 1) {
        return null;
    }

    const originalPayment =
        giftCardPayments[0];

    const number =
        originalPayment.externalReference!;

    const value =
        getMonetaryValueByNumber(
            number,
        );

    if (
        !value ||
        value.type !== "gift_card"
    ) {
        return null;
    }

    const previouslyRefunded =
        getTransactions()
            .filter(
                (transaction) =>
                    transaction.id !==
                        originalSale.id &&
                    transaction.lines.some(
                        (line) =>
                            line.originalSaleId ===
                            originalSale.id,
                    ),
            )
            .reduce(
                (sum, transaction) =>
                    sum +
                    transaction.payments
                        .filter(
                            (payment) =>
                                payment.method ===
                                    "gift_card" &&
                                payment.amount <
                                    0 &&
                                payment.externalReference ===
                                    number,
                        )
                        .reduce(
                            (
                                paymentSum,
                                payment,
                            ) =>
                                paymentSum +
                                Math.abs(
                                    payment.amount,
                                ),
                            0,
                        ),
                0,
            );

    const paymentCapacity =
        roundMoney(
            Math.max(
                0,
                originalPayment.amount -
                    previouslyRefunded,
            ),
        );

    const balanceCapacity =
        roundMoney(
            Math.max(
                0,
                value.originalAmount -
                    value.remainingAmount,
            ),
        );

    const availableAmount =
        roundMoney(
            Math.min(
                paymentCapacity,
                balanceCapacity,
            ),
        );

    return availableAmount > 0
        ? {
              number,
              availableAmount,
          }
        : null;
}

export function validateGiftCardRefundPayments(
    lines: SaleLine[],
    payments: Payment[],
) {
    const giftCardRefunds =
        payments.filter(
            (payment) =>
                payment.method ===
                    "gift_card" &&
                payment.amount < 0,
        );

    if (giftCardRefunds.length === 0) {
        return;
    }

    const source =
        getOriginalGiftCardRefundSource(
            lines,
        );

    if (!source) {
        throw new Error(
            "Original Gift Card refund source not available",
        );
    }

    const total =
        roundMoney(
            giftCardRefunds.reduce(
                (sum, payment) =>
                    sum +
                    Math.abs(
                        payment.amount,
                    ),
                0,
            ),
        );

    if (
        giftCardRefunds.some(
            (payment) =>
                payment.externalReference !==
                source.number,
        ) ||
        total >
            source.availableAmount + 0.001
    ) {
        throw new Error(
            "Gift Card refund exceeds original payment capacity",
        );
    }
}

export async function restoreGiftCardRefundPayments(
    payments: Payment[],
    transactionId: string,
) {
    const giftCardRefunds =
        payments.filter(
            (payment) =>
                payment.method ===
                    "gift_card" &&
                payment.amount < 0,
        );

    for (
        const payment of
        giftCardRefunds
    ) {
        if (!payment.externalReference) {
            throw new Error(
                "Gift Card refund reference missing",
            );
        }

        const amount =
            Math.abs(
                payment.amount,
            );

        const result =
            restoreMonetaryValue({
                number:
                    payment.externalReference,
                amount,
                transactionId,
                paymentId:
                    payment.id,
                reason:
                    "refund_to_original_gift_card",
            });

        if (
            Math.abs(
                result.restoredAmount -
                    amount,
            ) > 0.001
        ) {
            throw new Error(
                "Gift Card restore mismatch",
            );
        }
    }

    if (giftCardRefunds.length > 0) {
        await flushMonetaryValuePersistence();
    }
}
