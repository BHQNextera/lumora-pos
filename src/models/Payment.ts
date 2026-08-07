import type {
    PaymentMethodCode,
} from "./PaymentMethod";

export type PaymentStatus =
    | "draft"
    | "pending"
    | "approved"
    | "declined"
    | "cancelled"
    | "refunded";

export type Payment = {
    id: string;

    method: PaymentMethodCode;
    status: PaymentStatus;

    amount: number;

    /**
     * Relevant mainly for cash.
     * Example:
     * sale amount = 80
     * customer gives = 100
     */
    tenderedAmount?: number;

    /**
     * Change returned to the customer.
     * Never treated as part of the payment amount.
     */
    changeAmount?: number;

    externalReference?: string;
    providerReference?: string;

    createdAt: string;
};

export type PaymentTotals = {
    saleTotal: number;
    paidAmount: number;
    remainingAmount: number;
    changeAmount: number;
    isFullyPaid: boolean;
};

export function calculatePaymentTotals(
    saleTotal: number,
    payments: Payment[],
): PaymentTotals {
    const approvedPayments = payments.filter(
        (payment) =>
            payment.status === "approved",
    );

    const paidAmount = approvedPayments.reduce(
        (sum, payment) =>
            sum + payment.amount,
        0,
    );

    const changeAmount = approvedPayments.reduce(
        (sum, payment) =>
            sum + (payment.changeAmount ?? 0),
        0,
    );

    const remainingAmount = Math.max(
        0,
        saleTotal - paidAmount,
    );

    return {
        saleTotal,
        paidAmount,
        remainingAmount,
        changeAmount,
        isFullyPaid:
            saleTotal > 0 &&
            remainingAmount < 0.001,
    };
}