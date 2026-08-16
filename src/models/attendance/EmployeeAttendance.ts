export type AttendanceStatus =
    | "present"
    | "clocked_out";

export type EmployeeAttendance = {
    id: string;

    tenantId: string;
    storeCode: string;

    employeeId: string;
    employeeName: string;

    status:
        AttendanceStatus;

    clockedInAt: string;

    clockedOutAt?: string;
};