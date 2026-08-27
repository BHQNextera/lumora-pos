export type AttendanceStatus =
    | "present"
    | "clocked_out";

export type AttendanceCorrection = {
    id: string;

    correctedAt: string;

    correctedBy: {
        employeeId: string;
        employeeName: string;
    };

    reason: string;

    originalClockedInAt: string;
    originalClockedOutAt?: string;

    correctedClockedInAt: string;
    correctedClockedOutAt?: string;
};

export type AttendanceManualEntry = {
    id: string;

    createdAt: string;

    createdBy: {
        employeeId: string;
        employeeName: string;
    };

    reason: string;
};

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

    corrections?:
        AttendanceCorrection[];

    manualEntry?:
        AttendanceManualEntry;
};
