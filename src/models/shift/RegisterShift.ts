import type {
    CashDeclaration,
} from "../cash/CashDeclaration";
export type RegisterShiftStatus =
    | "open"
    | "closed";

export type RegisterShift = {
    id: string;

    tenantId: string;

    storeCode: string;
    registerCode: string;

    status:
        RegisterShiftStatus;

    openedAt: string;

    openedBy: {
        employeeId: string;
        employeeName: string;
    };

    openingCash: number;

    openingCashDeclaration?: CashDeclaration;

    closedAt?: string;

    closedBy?: {
        employeeId: string;
        employeeName: string;
    };

    closingCash?: number;

    closingCashDeclaration?: CashDeclaration;
};