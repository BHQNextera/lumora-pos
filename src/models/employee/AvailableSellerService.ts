// LUMORA DYNAMIC SELLER SOURCE V1
import {
    getEmployees,
} from "./EmployeeRepository";
import {
    getPresentAttendance,
} from "../attendance/AttendanceRepository";
import {
    canEmployeeSell,
    type Employee,
} from "./Employee";

import {
    getActiveRegisterProfile,
} from "../../config/ActiveBusinessConfiguration";

import {
    getRegisterLocalSettings,
} from "../../config/RegisterLocalSettings";

function isSellerEligibleForActiveRegister(
    employee: Employee,
): boolean {
    const scopes =
        employee.sellerScopes ?? [];

    if (scopes.length === 0) {
        return true;
    }

    const settings =
        getRegisterLocalSettings(
            getActiveRegisterProfile(),
        );

    if (
        !settings.branchId ||
        !settings.registerId
    ) {
        return false;
    }

    return scopes.some(
        (scope) =>
            scope.branchId ===
                settings.branchId &&
            (
                !scope.registerId ||
                scope.registerId ===
                    settings.registerId
            ),
    );
}

export function getPresentSellers() {
    const presentEmployeeIds =
        new Set(
            getPresentAttendance()
                .map(
                    (attendance) =>
                        attendance.employeeId,
                ),
        );

    return getEmployees().filter(
        (employee) =>
            canEmployeeSell(
                employee,
            ) &&
            isSellerEligibleForActiveRegister(
                employee,
            ) &&
            presentEmployeeIds.has(
                employee.id,
            ),
    );
}