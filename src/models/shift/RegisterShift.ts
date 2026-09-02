import type {
    CashDeclaration,
} from "../cash/CashDeclaration";
export type RegisterShiftStatus =
    | "open"
    | "closed";

export type RegisterShiftAuthorization = {
    actionPermissionKey: string;

    actor: {
        employeeId: string;
        employeeName: string;
    };

    approver?: {
        approvalId: string;
        employeeId: string;
        employeeName: string;
        approvedAt: string;
    };

    authorizedAt: string;
};

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

    openingAuthorization?: RegisterShiftAuthorization;


    closingAuthorization?: RegisterShiftAuthorization;
};
