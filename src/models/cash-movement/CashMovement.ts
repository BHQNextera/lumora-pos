export type CashMovementType =
    | "cash_in"
    | "cash_out";

export type CashMovementReason =
    | "float_addition"
    | "safe_drop"
    | "petty_cash"
    | "change_fund"
    | "bank_deposit"
    | "other";

export type CashMovement = {
    id: string;

    tenantId: string;
    storeCode: string;
    registerCode: string;
    shiftId: string;

    type:
        CashMovementType;

    amount: number;

    reason:
        CashMovementReason;

    note?: string;

    employee: {
        employeeId: string;
        employeeName: string;
    };

    createdAt: string;
};

export function getCashMovementSignedAmount(
    movement: CashMovement,
) {
    return movement.type === "cash_in"
        ? movement.amount
        : -movement.amount;
}