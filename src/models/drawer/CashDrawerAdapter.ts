import type {
    CashDrawerOpenReason,
} from "./CashDrawer";

export type CashDrawerOpenResult = {
    status:
        | "simulated"
        | "sent"
        | "failed";

    adapter:
        string;

    errorCode?: string;
};

export interface CashDrawerAdapter {
    open(
        reason:
            CashDrawerOpenReason,
    ): CashDrawerOpenResult;
}