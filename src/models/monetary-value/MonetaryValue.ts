export type MonetaryValueType =
    | "credit_voucher"
    | "gift_card"
    | "store_credit";

export type MonetaryValueStatus =
    | "active"
    | "depleted"
    | "expired"
    | "blocked"
    | "cancelled";

export type MonetaryValue = {
    id: string;

    number: string;

    type: MonetaryValueType;

    status: MonetaryValueStatus;

    originalAmount: number;
    remainingAmount: number;

    customerId?: string;

    originTransactionId?: string;
    originDocumentId?: string;

    issuedAt: string;
    expiresAt?: string;

    updatedAt: string;
};

export type MonetaryValueMovementType =
    | "issue"
    | "redeem"
    | "restore"
    | "adjustment"
    | "cancel";

export type MonetaryValueMovement = {
    id: string;

    monetaryValueId: string;

    type: MonetaryValueMovementType;

    amount: number;

    balanceBefore: number;
    balanceAfter: number;

    transactionId?: string;
    paymentId?: string;

    employeeId?: string;
    registerCode?: string;

    reason?: string;

    createdAt: string;
};