import type {
    Customer,
} from "../customer/Customer";
import type {
    SaleLine,
} from "../sale/SaleLine";
import {
    getTransaction,
    getTransactions,
} from "../transaction/TransactionRepository";
import {
    isCustomerCreditBalanceAllowed,
} from "./StoreCreditService";

function roundMoney(
    value: number,
) {
    return (
        Math.round(
            (
                value +
                Number.EPSILON
            ) * 100,
        ) / 100
    );
}

function getApprovedStoreCreditAmount(
    payments: ReturnType<
        typeof getTransactions
    >[number]["payments"],
) {
    return roundMoney(
        payments
            .filter(
                (payment) =>
                    payment.status ===
                        "approved" &&
                    payment.method ===
                        "store_credit",
            )
            .reduce(
                (sum, payment) =>
                    sum +
                    payment.amount,
                0,
            ),
    );
}

function getCurrentDebt(
    customer: Customer,
) {
    if (
        customer.id ===
        "walk-in"
    ) {
        return 0;
    }

    return Math.max(
        0,
        roundMoney(
            customer.accountBalance ??
                0,
        ),
    );
}

function getReturnAmount(
    returnLines: SaleLine[],
) {
    return roundMoney(
        returnLines
            .filter(
                (line) =>
                    line.netAmount <
                    -0.001,
            )
            .reduce(
                (sum, line) =>
                    sum +
                    Math.abs(
                        line.netAmount,
                    ),
                0,
            ),
    );
}

export function getStoreCreditRefundLimit(
    returnLines: SaleLine[],
    customer: Customer,
): number {
    if (
        customer.id ===
        "walk-in"
    ) {
        return 0;
    }

    const returnAmount =
        getReturnAmount(
            returnLines,
        );

    if (
        returnAmount <=
        0.001
    ) {
        return 0;
    }

    const allowCreditBalance =
        isCustomerCreditBalanceAllowed();

    const currentDebt =
        getCurrentDebt(
            customer,
        );

    const originalSaleIds =
        Array.from(
            new Set(
                returnLines
                    .filter(
                        (line) =>
                            line.netAmount <
                            -0.001,
                    )
                    .map(
                        (line) =>
                            line.originalSaleId,
                    )
                    .filter(
                        (
                            saleId,
                        ): saleId is string =>
                            Boolean(
                                saleId,
                            ),
                    ),
            ),
        );

    /*
     * Return without a source document:
     * when credit balance is allowed, the refund may cross
     * zero and create customer credit.
     */
    if (
        originalSaleIds.length ===
        0
    ) {
        return allowCreditBalance
            ? returnAmount
            : Math.min(
                  returnAmount,
                  currentDebt,
              );
    }

    /*
     * Conservative V1:
     * do not guess how to allocate one store-credit refund
     * across multiple original transactions.
     */
    if (
        originalSaleIds.length !==
        1
    ) {
        return 0;
    }

    const originalSaleId =
        originalSaleIds[0];

    const originalSale =
        getTransaction(
            originalSaleId,
        );

    if (!originalSale) {
        return 0;
    }

    /*
     * A linked return belongs to the customer on the
     * original transaction. Never reduce another customer's account.
     */
    if (
        !originalSale.customer.id ||
        originalSale.customer.id ===
            "walk-in" ||
        originalSale.customer.id !==
            customer.id
    ) {
        return 0;
    }

    const originalStoreCredit =
        Math.max(
            0,
            getApprovedStoreCreditAmount(
                originalSale.payments,
            ),
        );

    if (
        originalStoreCredit <=
        0.001
    ) {
        return 0;
    }

    const alreadyReduced =
        getTransactions()
            .filter(
                (transaction) =>
                    transaction.id !==
                        originalSaleId &&
                    transaction.lines.some(
                        (line) =>
                            line.originalSaleId ===
                            originalSaleId,
                    ),
            )
            .map(
                (transaction) =>
                    getApprovedStoreCreditAmount(
                        transaction.payments,
                    ),
            )
            .filter(
                (amount) =>
                    amount < -0.001,
            )
            .reduce(
                (sum, amount) =>
                    sum +
                    Math.abs(
                        amount,
                    ),
                0,
            );

    const remainingOriginalStoreCredit =
        Math.max(
            0,
            roundMoney(
                originalStoreCredit -
                    alreadyReduced,
            ),
        );

    const linkedLimit =
        Math.min(
            returnAmount,
            remainingOriginalStoreCredit,
        );

    return allowCreditBalance
        ? linkedLimit
        : Math.min(
              linkedLimit,
              currentDebt,
          );
}
