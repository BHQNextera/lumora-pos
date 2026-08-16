import type {
    PaymentMethodCode,
} from "../PaymentMethod";
import {
    getTransactions,
} from "../transaction/TransactionRepository";

import {
    getCashMovementsForShift,
} from "../cash-movement/CashMovementRepository";
import type {
    RegisterShift,
} from "./RegisterShift";

export type ShiftPaymentTotal = {
    method: PaymentMethodCode;
    amount: number;
    paymentCount: number;
};

export type ShiftXReport = {
    shiftId: string;

    storeCode: string;
    registerCode: string;

    openedAt: string;
    generatedAt: string;

    openedBy: {
        employeeId: string;
        employeeName: string;
    };

    openingCash: number;

    transactionCount: number;
    saleCount: number;
    returnCount: number;
    exchangeCount: number;

    grossSales: number;
    returnsTotal: number;
    netSales: number;

    discountTotal: number;

    paymentTotals:
        ShiftPaymentTotal[];

    cashPayments: number;

    cashIn: number;
    cashOut: number;
    netCashMovement: number;

    expectedCash: number;
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

export function generateShiftXReport(
    shift: RegisterShift,
): ShiftXReport {
    const transactions =
        getTransactions().filter(
            (sale) =>
                sale.status ===
                    "completed" &&
                sale.shiftId ===
                    shift.id,
        );

    const saleTransactions =
        transactions.filter(
            (sale) =>
                sale.transactionType ===
                    "sale" ||
                (
                    sale.transactionType ===
                        "exchange" &&
                    sale.total > 0
                ),
        );

    const returnTransactions =
        transactions.filter(
            (sale) =>
                sale.transactionType ===
                    "return" ||
                (
                    sale.transactionType ===
                        "exchange" &&
                    sale.total < 0
                ),
        );

    const exchangeTransactions =
        transactions.filter(
            (sale) =>
                sale.transactionType ===
                    "exchange" &&
                Math.abs(
                    sale.total,
                ) < 0.001,
        );

    const grossSales =
        roundMoney(
            saleTransactions.reduce(
                (sum, sale) =>
                    sum +
                    Math.max(
                        0,
                        sale.total,
                    ),
                0,
            ),
        );

    const returnsTotal =
        roundMoney(
            returnTransactions.reduce(
                (sum, sale) =>
                    sum +
                    Math.abs(
                        sale.total,
                    ),
                0,
            ),
        );

    const netSales =
        roundMoney(
            transactions.reduce(
                (sum, sale) =>
                    sum +
                    sale.total,
                0,
            ),
        );

    const discountTotal =
        roundMoney(
            transactions.reduce(
                (sum, sale) =>
                    sum +
                    Math.max(
                        0,
                        sale.discount,
                    ),
                0,
            ),
        );

    const paymentMap =
        new Map<
            PaymentMethodCode,
            {
                amount: number;
                transactionIds: Set<string>;
            }
        >();

    transactions.forEach(
        (sale) => {
            sale.payments
                .filter(
                    (payment) =>
                        payment.status ===
                        "approved",
                )
                .forEach(
                    (payment) => {
                        const existing =
                            paymentMap.get(
                                payment.method,
                            ) ?? {
                                amount: 0,
                                transactionIds:
                                    new Set<string>(),
                            };

                        paymentMap.set(
                            payment.method,
                            {
                                amount:
                                    roundMoney(
                                        existing.amount +
                                            payment.amount,
                                    ),

                                transactionIds:
                                    new Set([
                                        ...existing.transactionIds,
                                        sale.id,
                                    ]),
                            },
                        );
                    },
                );
        },
    );

    const paymentTotals =
        Array.from(
            paymentMap.entries(),
        ).map(
            ([
                method,
                totals,
            ]) => ({
                method,
                amount:
                    roundMoney(
                        totals.amount,
                    ),
                paymentCount:
                    totals.transactionIds.size,
            }),
        );

    const cashPayments =
        roundMoney(
            paymentTotals.find(
                (payment) =>
                    payment.method ===
                    "cash",
            )?.amount ?? 0,
        );

    const cashMovements =
        getCashMovementsForShift(
            shift.id,
        );

    const cashIn =
        roundMoney(
            cashMovements
                .filter(
                    (movement) =>
                        movement.type ===
                        "cash_in",
                )
                .reduce(
                    (total, movement) =>
                        total +
                        movement.amount,
                    0,
                ),
        );

    const cashOut =
        roundMoney(
            cashMovements
                .filter(
                    (movement) =>
                        movement.type ===
                        "cash_out",
                )
                .reduce(
                    (total, movement) =>
                        total +
                        movement.amount,
                    0,
                ),
        );

    const netCashMovement =
        roundMoney(
            cashIn -
                cashOut,
        );

    const expectedCash =
        roundMoney(
            shift.openingCash +
                cashPayments +
                netCashMovement,
        );

    return {
        shiftId:
            shift.id,

        storeCode:
            shift.storeCode,

        registerCode:
            shift.registerCode,

        openedAt:
            shift.openedAt,

        generatedAt:
            new Date()
                .toISOString(),

        openedBy: {
            ...shift.openedBy,
        },

        openingCash:
            shift.openingCash,

        transactionCount:
            transactions.length,

        saleCount:
            saleTransactions.length,

        returnCount:
            returnTransactions.length,

        exchangeCount:
            exchangeTransactions.length,

        grossSales,
        returnsTotal,
        netSales,

        discountTotal,

        paymentTotals,

        cashPayments,

        cashIn,
        cashOut,
        netCashMovement,

        expectedCash,
    };
}