// LUMORA DYNAMIC SELLER SOURCE V1
import {
    getEmployees,
} from "./EmployeeRepository";
import {
    getPresentAttendance,
} from "../attendance/AttendanceRepository";
import {
    canEmployeeSell,
} from "./Employee";

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
            presentEmployeeIds.has(
                employee.id,
            ),
    );
}