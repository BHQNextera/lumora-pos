import type {
    MonetaryValue,
    MonetaryValueMovement,
    MonetaryValueType,
} from "./MonetaryValue";
import {
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

    expiresAt?: string;

    employeeId?: string;
    registerCode?: string;
};

export function issueMonetaryValue(
    input: IssueMonetaryValueInput,
) {
    const amount =
        roundMoney(input.amount);

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
        id:
            crypto.randomUUID(),

        number:
            createNumber(
                input.type,
            ),

        type:
            input.type,

        status:
            "active",

        originalAmount:
            amount,

        remainingAmount:
            amount,

        customerId:
            input.customerId,

        originTransactionId:
            input.originTransactionId,

        originDocumentId:
            input.originDocumentId,

        issuedAt:
            now,

        expiresAt:
            input.expiresAt,

        updatedAt:
            now,
    };

    saveMonetaryValue(value);

    const movement: MonetaryValueMovement = {
        id:
            crypto.randomUUID(),

        monetaryValueId:
            value.id,

        type:
            "issue",

        amount,

        balanceBefore: 0,
        balanceAfter:
            amount,

        transactionId:
            input.originTransactionId,

        employeeId:
            input.employeeId,

        registerCode:
            input.registerCode,

        createdAt:
            now,
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
            reason:
                "not_found" as const,
        };
    }

    if (
        value.status !== "active"
    ) {
        return {
            valid: false as const,
            reason:
                "not_active" as const,
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
            reason:
                "expired" as const,
            value,
        };
    }

    if (
        value.remainingAmount <= 0
    ) {
        return {
            valid: false as const,
            reason:
                "empty" as const,
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

    const updated: MonetaryValue = {
        ...value,

        remainingAmount:
            after,

        status:
            after <= 0
                ? "depleted"
                : "active",

        updatedAt:
            now,
    };

    saveMonetaryValue(
        updated,
    );

    const movement: MonetaryValueMovement = {
        id:
            crypto.randomUUID(),

        monetaryValueId:
            value.id,

        type:
            "redeem",

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

        createdAt:
            now,
    };

    saveMonetaryValueMovement(
        movement,
    );

    return {
        monetaryValue:
            updated,

        redeemedAmount,

        remainingAmount:
            after,
    };
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
        !Number.isFinite(amount) ||
        amount <= 0
    ) {
        throw new Error(
            "Invalid restore amount",
        );
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

    const now =
        new Date().toISOString();

    const updated: MonetaryValue = {
        ...value,

        remainingAmount:
            after,

        status:
            after > 0
                ? "active"
                : value.status,

        updatedAt:
            now,
    };

    saveMonetaryValue(
        updated,
    );

    const movement: MonetaryValueMovement = {
        id:
            crypto.randomUUID(),

        monetaryValueId:
            value.id,

        type:
            "restore",

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

        createdAt:
            now,
    };

    saveMonetaryValueMovement(
        movement,
    );

    return {
        monetaryValue:
            updated,

        restoredAmount,

        remainingAmount:
            after,
    };
}