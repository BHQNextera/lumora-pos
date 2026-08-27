import {
    employeeSeed,
} from "../employee/EmployeeSeed";
import {
    getActiveRegisterShift,
} from "../shift/RegisterShiftRepository";

import type {
    StoreCreditManagerApproval,
} from "./StoreCreditService";

export type StoreCreditManagerApprovalAvailability =
    | {
        canApprove: true;
        managerEmployeeId: string;
        managerEmployeeName: string;
    }
    | {
        canApprove: false;
        reason:
            | "no_active_shift"
            | "employee_not_found"
            | "employee_inactive"
            | "manager_role_required";
    };

export function getStoreCreditManagerApprovalAvailability():
StoreCreditManagerApprovalAvailability {
    const activeShift =
        getActiveRegisterShift();

    if (!activeShift) {
        return {
            canApprove: false,
            reason:
                "no_active_shift",
        };
    }

    const employee =
        employeeSeed.find(
            (item) =>
                item.id ===
                activeShift.openedBy
                    .employeeId,
        );

    if (!employee) {
        return {
            canApprove: false,
            reason:
                "employee_not_found",
        };
    }

    if (!employee.isActive) {
        return {
            canApprove: false,
            reason:
                "employee_inactive",
        };
    }

    if (
        !employee.roles.includes(
            "manager",
        )
    ) {
        return {
            canApprove: false,
            reason:
                "manager_role_required",
        };
    }

    return {
        canApprove: true,

        managerEmployeeId:
            employee.id,

        managerEmployeeName:
            employee.name,
    };
}

export function createStoreCreditManagerApproval(
    input: {
        customerId: string;
        approvedAmount: number;
        overLimitAmount: number;
        reason?: string;
    },
): StoreCreditManagerApproval {
    const availability =
        getStoreCreditManagerApprovalAvailability();

    if (!availability.canApprove) {
        throw new Error(
            "STORE_CREDIT_MANAGER_APPROVAL_NOT_ALLOWED",
        );
    }

    return {
        approvalId:
            crypto.randomUUID(),

        customerId:
            input.customerId,

        managerEmployeeId:
            availability
                .managerEmployeeId,

        managerEmployeeName:
            availability
                .managerEmployeeName,

        approvedAmount:
            input.approvedAmount,

        overLimitAmount:
            input.overLimitAmount,

        approvedAt:
            new Date().toISOString(),

        reason:
            input.reason
                ?.trim() ||
            undefined,
    };
}