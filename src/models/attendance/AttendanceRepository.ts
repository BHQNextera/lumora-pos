import {
    getActiveBusinessConfiguration,
} from "../../config/ActiveBusinessConfiguration";
import type {
    EmployeeAttendance,
} from "./EmployeeAttendance";

const STORAGE_KEY =
    "lumora.employee-attendance";

function loadAttendance():
EmployeeAttendance[] {
    try {
        const raw =
            window.localStorage.getItem(
                STORAGE_KEY,
            );

        if (!raw) {
            return [];
        }

        const parsed =
            JSON.parse(
                raw,
            );

        return Array.isArray(parsed)
            ? parsed
            : [];
    }
    catch {
        return [];
    }
}

function persist(
    attendance:
        EmployeeAttendance[],
) {
    window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
            attendance,
        ),
    );
}

export function getAttendance() {
    return loadAttendance();
}

export function getPresentAttendance() {
    const configuration =
        getActiveBusinessConfiguration();

    return loadAttendance().filter(
        (entry) =>
            entry.status === "present" &&
            entry.tenantId ===
                configuration.tenantId &&
            entry.storeCode ===
                configuration.storeCode,
    );
}

export function getEmployeePresence(
    employeeId: string,
) {
    return getPresentAttendance()
        .find(
            (entry) =>
                entry.employeeId ===
                employeeId,
        );
}

export type ClockInEmployeeInput = {
    employeeId: string;
    employeeName: string;
};

export function clockInEmployee(
    input:
        ClockInEmployeeInput,
) {
    const existing =
        getEmployeePresence(
            input.employeeId,
        );

    if (existing) {
        return existing;
    }

    const configuration =
        getActiveBusinessConfiguration();

    const entry:
        EmployeeAttendance = {
        id:
            crypto.randomUUID(),

        tenantId:
            configuration.tenantId,

        storeCode:
            configuration.storeCode,

        employeeId:
            input.employeeId,

        employeeName:
            input.employeeName,

        status:
            "present",

        clockedInAt:
            new Date()
                .toISOString(),
    };

    persist([
        entry,
        ...loadAttendance(),
    ]);

    return entry;
}

export function clockOutEmployee(
    employeeId: string,
) {
    const configuration =
        getActiveBusinessConfiguration();

    const now =
        new Date()
            .toISOString();

    let changed:
        EmployeeAttendance |
        undefined;

    const next =
        loadAttendance().map(
            (entry) => {
                if (
                    entry.employeeId !==
                        employeeId ||
                    entry.tenantId !==
                        configuration.tenantId ||
                    entry.storeCode !==
                        configuration.storeCode ||
                    entry.status !==
                        "present"
                ) {
                    return entry;
                }

                changed = {
                    ...entry,
                    status:
                        "clocked_out",
                    clockedOutAt:
                        now,
                };

                return changed;
            },
        );

    if (changed) {
        persist(next);
    }

    return changed;
}