export type CashDrawerOpenReason =
    | "cash_payment"
    | "closing_count"
    | "manual";

export type CashDrawerCommandStatus =
    | "simulated"
    | "sent"
    | "failed";

export type CashDrawerCommand = {
    id: string;

    reason:
        CashDrawerOpenReason;

    createdAt: string;

    status:
        CashDrawerCommandStatus;

    adapter:
        string;

    errorCode?: string;
};