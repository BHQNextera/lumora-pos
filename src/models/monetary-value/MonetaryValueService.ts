import {
    storedValuePolicy,
} from "../../config/storedValuePolicy";
import type {
    MonetaryValue,
    MonetaryValueMovement,
    MonetaryValueType,
} from "./MonetaryValue";
import {
    getMonetaryValue,
    getMonetaryValueByNumber,
    saveMonetaryValue,
    saveMonetaryValueMovement,
} from "./MonetaryValueRepository";

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

function createNumber(
    type: MonetaryValueType,
) {
    const prefix =
        type === "credit_voucher"
            ? "CV"
            : type === "gift_card"
                ? "GC"
                : "SC";

    const timestamp =
        Date.now()
            .toString()
            .slice(-8);

    const random =
        Math.floor(
            1000 +
            Math.random() *
            9000,
        );

    return `${prefix}-${timestamp}-${random}`;
}

export type IssueMonetaryValueInput = {
    type: MonetaryValueType;
    amount: number;
    customerId?: string;
    originTransactionId?: string;
    originDocumentId?: string;
    previousMonetaryValueId?: string;
    expiresAt?: string;
    employeeId?: string;
    registerCode?: string;
};

export function issueMonetaryValue(
    input: IssueMonetaryValueInput,
) {
    const amount =
        roundMoney(
            input.amount,
        );

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        throw new Error(
            "Invalid monetary value amount",
        );
    }

    const now =
        new Date().toISOString();

    const value: MonetaryValue = {
        id: crypto.randomUUID(),
        number: createNumber(input.type),
        type: input.type,
        status: "active",
        originalAmount: amount,
        remainingAmount: amount,
        customerId: input.customerId,
        originTransactionId:
            input.originTransactionId,
        originDocumentId:
            input.originDocumentId,
        previousMonetaryValueId:
            input.previousMonetaryValueId,
        issuedAt: now,
        expiresAt: input.expiresAt,
        updatedAt: now,
    };

    saveMonetaryValue(
        value,
    );

    const movement: MonetaryValueMovement = {
        id: crypto.randomUUID(),
        monetaryValueId:
            value.id,
        type: "issue",
        amount,
        balanceBefore: 0,
        balanceAfter: amount,
        transactionId:
            input.originTransactionId,
        employeeId:
            input.employeeId,
        registerCode:
            input.registerCode,
        reason:
            input.previousMonetaryValueId
                ? `rollover_from:${input.previousMonetaryValueId}`
                : undefined,
        createdAt: now,
    };

    saveMonetaryValueMovement(
        movement,
    );

    return value;
}

export function validateMonetaryValueForPayment(
    number: string,
) {
    const value =
        getMonetaryValueByNumber(
            number,
        );

    if (!value) {
        return {
            valid: false as const,
            reason: "not_found" as const,
        };
    }

    if (
        value.status !==
        "active"
    ) {
        return {
            valid: false as const,
            reason: "not_active" as const,
            value,
        };
    }

    if (
        value.expiresAt &&
        new Date(
            value.expiresAt,
        ).getTime() <
        Date.now()
    ) {
        return {
            valid: false as const,
            reason: "expired" as const,
            value,
        };
    }

    if (
        value.remainingAmount <=
        0
    ) {
        return {
            valid: false as const,
            reason: "empty" as const,
            value,
        };
    }

    return {
        valid: true as const,
        value,
    };
}

export type RedeemMonetaryValueInput = {
    number: string;
    requestedAmount: number;
    transactionId?: string;
    paymentId?: string;
    employeeId?: string;
    registerCode?: string;
};

export function redeemMonetaryValue(
    input: RedeemMonetaryValueInput,
) {
    const validation =
        validateMonetaryValueForPayment(
            input.number,
        );

    if (!validation.valid) {
        throw new Error(
            `Monetary value cannot be redeemed: ${validation.reason}`,
        );
    }

    const value =
        validation.value;

    const requestedAmount =
        roundMoney(
            input.requestedAmount,
        );

    if (
        !Number.isFinite(
            requestedAmount,
        ) ||
        requestedAmount <= 0
    ) {
        throw new Error(
            "Invalid redemption amount",
        );
    }

    const redeemedAmount =
        roundMoney(
            Math.min(
                requestedAmount,
                value.remainingAmount,
            ),
        );

    const before =
        value.remainingAmount;

    const after =
        roundMoney(
            before -
            redeemedAmount,
        );

    const now =
        new Date().toISOString();

    if (
        value.type ===
        "credit_voucher"
    ) {
        const threshold =
            Math.max(
                0,
                storedValuePolicy
                    .creditVoucherCashRemainderThreshold,
            );

        const cashChangeAmount =
            after > 0 &&
            after <= threshold
                ? after
                : 0;

        const rolloverAmount =
            after > threshold
                ? after
                : 0;

        const consumedAmount =
            roundMoney(
                redeemedAmount +
                cashChangeAmount,
            );

        const depleted: MonetaryValue = {
            ...value,
            remainingAmount: 0,
            status: "depleted",
            lastRedemptionPaymentId:
                input.paymentId,
            lastCashChangeAmount:
                cashChangeAmount > 0
                    ? cashChangeAmount
                    : undefined,
            updatedAt: now,
        };

        saveMonetaryValue(
            depleted,
        );

        saveMonetaryValueMovement({
            id: crypto.randomUUID(),
            monetaryValueId:
                value.id,
            type: "redeem",
            amount:
                -consumedAmount,
            balanceBefore:
                before,
            balanceAfter: 0,
            transactionId:
                input.transactionId,
            paymentId:
                input.paymentId,
            employeeId:
                input.employeeId,
            registerCode:
                input.registerCode,
            reason:
                cashChangeAmount > 0
                    ? "small_balance_cash_change"
                    : rolloverAmount > 0
                        ? "partial_redemption_rollover"
                        : undefined,
            createdAt: now,
        });

        const replacement =
            rolloverAmount > 0
                ? issueMonetaryValue({
                      type:
                          "credit_voucher",
                      amount:
                          rolloverAmount,
                      customerId:
                          value.customerId,
                      originTransactionId:
                          input.transactionId,
                      originDocumentId:
                          value.originDocumentId,
                      previousMonetaryValueId:
                          value.id,
                      expiresAt:
                          value.expiresAt,
                      employeeId:
                          input.employeeId,
                      registerCode:
                          input.registerCode,
                  })
                : undefined;

        const finalOriginal =
            replacement
                ? {
                      ...depleted,
                      replacementMonetaryValueId:
                          replacement.id,
                  }
                : depleted;

        if (replacement) {
            saveMonetaryValue(
                finalOriginal,
            );
        }

        return {
            monetaryValue:
                finalOriginal,
            redeemedAmount,
            remainingAmount:
                rolloverAmount,
            replacementMonetaryValue:
                replacement,
            cashChangeAmount,
        };
    }

    const updated: MonetaryValue = {
        ...value,
        remainingAmount:
            after,
        status:
            after <= 0
                ? "depleted"
                : "active",
        lastRedemptionPaymentId:
            input.paymentId,
        updatedAt: now,
    };

    saveMonetaryValue(
        updated,
    );

    saveMonetaryValueMovement({
        id: crypto.randomUUID(),
        monetaryValueId:
            value.id,
        type: "redeem",
        amount:
            -redeemedAmount,
        balanceBefore:
            before,
        balanceAfter:
            after,
        transactionId:
            input.transactionId,
        paymentId:
            input.paymentId,
        employeeId:
            input.employeeId,
        registerCode:
            input.registerCode,
        createdAt: now,
    });

    return {
        monetaryValue:
            updated,
        redeemedAmount,
        remainingAmount:
            after,
        replacementMonetaryValue:
            undefined,
        cashChangeAmount:
            0,
    };
}

function cancelReplacementVoucher(
    original: MonetaryValue,
    now: string,
    paymentId?: string,
) {
    if (
        !original.replacementMonetaryValueId
    ) {
        return;
    }

    const replacement =
        getMonetaryValue(
            original.replacementMonetaryValueId,
        );

    if (
        !replacement ||
        replacement.status ===
            "cancelled"
    ) {
        return;
    }

    saveMonetaryValue({
        ...replacement,
        remainingAmount: 0,
        status: "cancelled",
        updatedAt: now,
    });

    saveMonetaryValueMovement({
        id: crypto.randomUUID(),
        monetaryValueId:
            replacement.id,
        type: "cancel",
        amount:
            -replacement.remainingAmount,
        balanceBefore:
            replacement.remainingAmount,
        balanceAfter: 0,
        paymentId,
        reason:
            `rollback_of:${original.id}`,
        createdAt: now,
    });
}

export type RestoreMonetaryValueInput = {
    number: string;
    amount: number;
    transactionId?: string;
    paymentId?: string;
    employeeId?: string;
    registerCode?: string;
    reason?: string;
};

export function restoreMonetaryValue(
    input: RestoreMonetaryValueInput,
) {
    const value =
        getMonetaryValueByNumber(
            input.number,
        );

    if (!value) {
        throw new Error(
            "Monetary value not found",
        );
    }

    const amount =
        roundMoney(
            input.amount,
        );

    if (
        !Number.isFinite(
            amount,
        ) ||
        amount <= 0
    ) {
        throw new Error(
            "Invalid restore amount",
        );
    }

    const now =
        new Date().toISOString();

    if (
        value.type ===
            "credit_voucher" &&
        value.status ===
            "depleted" &&
        value.lastRedemptionPaymentId ===
            input.paymentId
    ) {
        cancelReplacementVoucher(
            value,
            now,
            input.paymentId,
        );

        const restored: MonetaryValue = {
            ...value,
            remainingAmount:
                value.originalAmount,
            status: "active",
            replacementMonetaryValueId:
                undefined,
            lastRedemptionPaymentId:
                undefined,
            lastCashChangeAmount:
                undefined,
            updatedAt: now,
        };

        saveMonetaryValue(
            restored,
        );

        saveMonetaryValueMovement({
            id: crypto.randomUUID(),
            monetaryValueId:
                value.id,
            type: "restore",
            amount:
                value.originalAmount,
            balanceBefore: 0,
            balanceAfter:
                value.originalAmount,
            transactionId:
                input.transactionId,
            paymentId:
                input.paymentId,
            employeeId:
                input.employeeId,
            registerCode:
                input.registerCode,
            reason:
                input.reason,
            createdAt: now,
        });

        return {
            monetaryValue:
                restored,
            restoredAmount:
                value.originalAmount,
            remainingAmount:
                restored.remainingAmount,
        };
    }

    const before =
        value.remainingAmount;

    const after =
        roundMoney(
            Math.min(
                value.originalAmount,
                before + amount,
            ),
        );

    const restoredAmount =
        roundMoney(
            after - before,
        );

    const updated: MonetaryValue = {
        ...value,
        remainingAmount:
            after,
        status:
            after > 0
                ? "active"
                : value.status,
        lastRedemptionPaymentId:
            undefined,
        updatedAt: now,
    };

    saveMonetaryValue(
        updated,
    );

    saveMonetaryValueMovement({
        id: crypto.randomUUID(),
        monetaryValueId:
            value.id,
        type: "restore",
        amount:
            restoredAmount,
        balanceBefore:
            before,
        balanceAfter:
            after,
        transactionId:
            input.transactionId,
        paymentId:
            input.paymentId,
        employeeId:
            input.employeeId,
        registerCode:
            input.registerCode,
        reason:
            input.reason,
        createdAt: now,
    });

    return {
        monetaryValue:
            updated,
        restoredAmount,
        remainingAmount:
            after,
    };
}
