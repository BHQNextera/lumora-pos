import type {
    Employee,
} from "./Employee";

import {
    getEmployees,
} from "./EmployeeRepository";

import {
    employeeRolesHavePermission,
} from "./EmployeeRoleCatalog";

import {
    verifyEmployeePin,
} from "./EmployeePinService";

export type PosManagerApproval = {
    approvalId: string;

    actionPermissionKey: string;

    actor: {
        employeeId: string;
        employeeName: string;
    };

    approver: {
        employeeId: string;
        employeeName: string;
    };

    approvedAt: string;
};

export type PosManagerApprovalResult =
    | {
        ok: true;
        approval: PosManagerApproval;
    }
    | {
        ok: false;
        reason:
            | "approver_not_found"
            | "approver_inactive"
            | "approval_permission_required"
            | "pin_failed";
    };

export function getPosManagerApprovers():
Employee[] {
    return getEmployees()
        .filter(
            (employee) =>
                employee.isActive &&
                employeeRolesHavePermission(
                    employee.roles,
                    "pos.manager_approval",
                ),
        );
}

export async function verifyPosManagerApproval(
    input: {
        actor: Employee;
        approverEmployeeId: string;
        approverPin: string;
        actionPermissionKey: string;
    },
): Promise<PosManagerApprovalResult> {
    const approver =
        getEmployees().find(
            (employee) =>
                employee.id ===
                input.approverEmployeeId,
        );

    if (!approver) {
        return {
            ok: false,
            reason:
                "approver_not_found",
        };
    }

    if (!approver.isActive) {
        return {
            ok: false,
            reason:
                "approver_inactive",
        };
    }

    if (
        !employeeRolesHavePermission(
            approver.roles,
            "pos.manager_approval",
        )
    ) {
        return {
            ok: false,
            reason:
                "approval_permission_required",
        };
    }

    const verification =
        await verifyEmployeePin(
            approver.id,
            input.approverPin,
        );

    if (!verification.ok) {
        return {
            ok: false,
            reason:
                "pin_failed",
        };
    }

    return {
        ok: true,

        approval: {
            approvalId:
                crypto.randomUUID(),

            actionPermissionKey:
                input.actionPermissionKey,

            actor: {
                employeeId:
                    input.actor.id,

                employeeName:
                    input.actor.name,
            },

            approver: {
                employeeId:
                    approver.id,

                employeeName:
                    approver.name,
            },

            approvedAt:
                new Date()
                    .toISOString(),
        },
    };
}