export type PosActionAuthorization = {
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
