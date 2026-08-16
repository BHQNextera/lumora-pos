import {
    employeeSeed,
} from "./EmployeeSeed";
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

    return employeeSeed.filter(
        (employee) =>
            canEmployeeSell(
                employee,
            ) &&
            presentEmployeeIds.has(
                employee.id,
            ),
    );
}