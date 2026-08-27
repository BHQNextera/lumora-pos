import {
    employeeSeed,
} from "../employee/EmployeeSeed";
import {
    getActiveRegisterShift,
} from "../shift/RegisterShiftRepository";

export type AttendanceCorrectionAvailability =
    | {
        canCorrect: true;
        managerEmployeeId: string;
        managerEmployeeName: string;
    }
    | {
        canCorrect: false;
        reason:
            | "no_active_shift"
            | "employee_not_found"
            | "employee_inactive"
            | "manager_role_required"
            | "self_correction_not_allowed";
    };

export function getAttendanceCorrectionAvailability(
    targetEmployeeId: string,
): AttendanceCorrectionAvailability {
    const activeShift =
        getActiveRegisterShift();

    if (!activeShift) {
        return {
            canCorrect: false,
            reason:
                "no_active_shift",
        };
    }

    const manager =
        employeeSeed.find(
            (employee) =>
                employee.id ===
                activeShift.openedBy
                    .employeeId,
        );

    if (!manager) {
        return {
            canCorrect: false,
            reason:
                "employee_not_found",
        };
    }

    if (!manager.isActive) {
        return {
            canCorrect: false,
            reason:
                "employee_inactive",
        };
    }

    if (
        !manager.roles.includes(
            "manager",
        )
    ) {
        return {
            canCorrect: false,
            reason:
                "manager_role_required",
        };
    }

    if (
        manager.id ===
        targetEmployeeId
    ) {
        return {
            canCorrect: false,
            reason:
                "self_correction_not_allowed",
        };
    }

    return {
        canCorrect: true,
        managerEmployeeId:
            manager.id,
        managerEmployeeName:
            manager.name,
    };
}
