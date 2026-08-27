import {
    getActiveBusinessOperatingProfile,
} from "../../config/ActiveBusinessConfiguration";
import type {
    Customer,
} from "../customer/Customer";

export type CustomerCreditSnapshot = {
    customerId: string;
    customerName: string;

    storeCreditEnabled: boolean;

    creditLimit: number;

    /**
     * Positive = customer debt.
     * Negative = customer credit with the business.
     */
    accountBalance: number;

    pendingTransactionAmount: number;
    availableCredit: number;
};

export type StoreCreditDecision =
    | {
        status:
            "customer_required";
        requestedAmount: number;
    }
    | {
        status:
            "customer_not_enabled";
        requestedAmount: number;
    }
    | {
        status:
            "invalid_amount";
        requestedAmount: number;
    }
    | {
        status:
            "allowed";
        requestedAmount: number;
        availableCredit: number;
        overLimitAmount: 0;
    }
    | {
        status:
            "manager_approval_required";
        requestedAmount: number;
        availableCredit: number;
        overLimitAmount: number;
    };

export type StoreCreditManagerApproval = {
    approvalId: string;

    customerId: string;

    managerEmployeeId: string;
    managerEmployeeName: string;

    approvedAmount: number;
    overLimitAmount: number;

    approvedAt: string;

    reason?: string;
};

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

function normalizeNonNegativeMoney(
    value: number | undefined,
) {
    if (
        value === undefined ||
        !Number.isFinite(value)
    ) {
        return 0;
    }

    return Math.max(
        0,
        roundMoney(
            value,
        ),
    );
}

function normalizeSignedMoney(
    value: number | undefined,
) {
    if (
        value === undefined ||
        !Number.isFinite(value)
    ) {
        return 0;
    }

    return roundMoney(
        value,
    );
}

export function isCustomerCreditBalanceAllowed() {
    return (
        getActiveBusinessOperatingProfile()
            .storeCreditPolicy
            ?.allowCustomerCreditBalance ??
        true
    );
}

export function getCustomerCreditSnapshot(
    customer: Customer,
    pendingTransactionAmount = 0,
): CustomerCreditSnapshot {
    const creditLimit =
        normalizeNonNegativeMoney(
            customer.creditLimit,
        );

    const accountBalance =
        normalizeSignedMoney(
            customer.accountBalance,
        );

    const normalizedPendingAmount =
        normalizeNonNegativeMoney(
            pendingTransactionAmount,
        );

    return {
        customerId:
            customer.id,

        customerName:
            customer.name,

        storeCreditEnabled:
            customer.storeCreditEnabled ===
            true,

        creditLimit,

        accountBalance,

        pendingTransactionAmount:
            normalizedPendingAmount,

        availableCredit:
            Math.max(
                0,
                roundMoney(
                    creditLimit -
                        accountBalance -
                        normalizedPendingAmount,
                ),
            ),
    };
}

export function evaluateStoreCreditPayment(
    customer: Customer,
    requestedAmount: number,
    pendingTransactionAmount = 0,
): StoreCreditDecision {
    const normalizedAmount =
        normalizeNonNegativeMoney(
            requestedAmount,
        );

    if (
        customer.id === "walk-in"
    ) {
        return {
            status:
                "customer_required",
            requestedAmount:
                normalizedAmount,
        };
    }

    const snapshot =
        getCustomerCreditSnapshot(
            customer,
            pendingTransactionAmount,
        );

    if (
        !snapshot.storeCreditEnabled
    ) {
        return {
            status:
                "customer_not_enabled",
            requestedAmount:
                normalizedAmount,
        };
    }

    if (
        normalizedAmount <= 0
    ) {
        return {
            status:
                "invalid_amount",
            requestedAmount:
                normalizedAmount,
        };
    }

    if (
        normalizedAmount <=
        snapshot.availableCredit
    ) {
        return {
            status:
                "allowed",
            requestedAmount:
                normalizedAmount,
            availableCredit:
                snapshot.availableCredit,
            overLimitAmount: 0,
        };
    }

    return {
        status:
            "manager_approval_required",
        requestedAmount:
            normalizedAmount,
        availableCredit:
            snapshot.availableCredit,
        overLimitAmount:
            roundMoney(
                normalizedAmount -
                    snapshot.availableCredit,
            ),
    };
}

export function commitStoreCreditCharge(
    customer: Customer,
    amount: number,
): Customer {
    const normalizedAmount =
        normalizeNonNegativeMoney(
            amount,
        );

    if (
        customer.id === "walk-in" ||
        normalizedAmount <= 0
    ) {
        return customer;
    }

    return {
        ...customer,

        accountBalance:
            normalizeSignedMoney(
                normalizeSignedMoney(
                    customer.accountBalance,
                ) +
                    normalizedAmount,
            ),

        updatedAt:
            new Date().toISOString(),
    };
}

export function applyStoreCreditBalanceMovement(
    customer: Customer,
    movementAmount: number,
): Customer {
    if (
        customer.id === "walk-in" ||
        !Number.isFinite(
            movementAmount,
        ) ||
        Math.abs(
            movementAmount,
        ) < 0.001
    ) {
        return customer;
    }

    const currentBalance =
        normalizeSignedMoney(
            customer.accountBalance,
        );

    const signedMovement =
        normalizeSignedMoney(
            movementAmount,
        );

    let nextBalance =
        normalizeSignedMoney(
            currentBalance +
                signedMovement,
        );

    if (
        !isCustomerCreditBalanceAllowed()
    ) {
        /*
         * Policy OFF:
         * - a debt may be reduced only to zero;
         * - an existing historical credit is not erased;
         * - further negative movement cannot deepen that credit.
         */
        if (
            currentBalance >= 0
        ) {
            nextBalance =
                Math.max(
                    0,
                    nextBalance,
                );
        }
        else if (
            signedMovement < 0
        ) {
            nextBalance =
                currentBalance;
        }
    }

    return {
        ...customer,

        accountBalance:
            nextBalance,

        updatedAt:
            new Date().toISOString(),
    };
}
