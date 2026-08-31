import {
    requireEmployeePinAuthorization,
} from "../../security/EmployeePinGate";

import {
    isTauri,
} from "@tauri-apps/api/core";

import {
    getActiveBusinessConfiguration,
} from "../../config/ActiveBusinessConfiguration";

import {
    BrowserLocalStorageAdapter,
} from "../../runtime/storage/BrowserLocalStorageAdapter";

import type {
    RuntimeStorage,
} from "../../runtime/storage/RuntimeStorage";

import type {
    AttendanceCorrection,
    AttendanceManualEntry,
    EmployeeAttendance,
} from "./EmployeeAttendance";
import {
    getAttendanceCorrectionAvailability,
} from "./AttendanceManagerApprovalService";

const STORAGE_KEY =
    "lumora.employee-attendance";

let attendance:
    EmployeeAttendance[] = [];

type AttendanceListener =
    () => void;

const attendanceListeners =
    new Set<AttendanceListener>();

let attendanceStoragePromise:
    Promise<RuntimeStorage> | null =
        null;

let persistenceQueue:
    Promise<void> =
        Promise.resolve();

function notifyAttendanceListeners() {
    for (
        const listener
        of attendanceListeners
    ) {
        listener();
    }
}

export function subscribeAttendance(
    listener: AttendanceListener,
): () => void {
    attendanceListeners.add(
        listener,
    );

    return () => {
        attendanceListeners.delete(
            listener,
        );
    };
}

function getAttendanceStorage():
Promise<RuntimeStorage> {
    if (!attendanceStoragePromise) {
        attendanceStoragePromise =
            (
                async ():
                Promise<RuntimeStorage> => {
                    if (!isTauri()) {
                        return new BrowserLocalStorageAdapter();
                    }

                    const {
                        SQLiteRuntimeStorageAdapter,
                    } = await import(
                        "../../runtime/storage/SQLiteRuntimeStorageAdapter"
                    );

                    return new SQLiteRuntimeStorageAdapter();
                }
            )();
    }

    return attendanceStoragePromise;
}

function parseAttendance(
    raw: string | null,
): EmployeeAttendance[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? parsed
            : [];
    }
    catch {
        return [];
    }
}

async function readStoredAttendance(
    storage: RuntimeStorage,
): Promise<string | null> {
    let raw =
        await storage.getItem(
            STORAGE_KEY,
        );

    if (
        raw === null &&
        isTauri()
    ) {
        const legacy =
            window.localStorage.getItem(
                STORAGE_KEY,
            );

        if (legacy !== null) {
            await storage.setItem(
                STORAGE_KEY,
                legacy,
            );

            window.localStorage.removeItem(
                STORAGE_KEY,
            );

            raw = legacy;
        }
    }

    return raw;
}

export async function hydrateAttendance():
Promise<void> {
    const storage =
        await getAttendanceStorage();

    const raw =
        await readStoredAttendance(
            storage,
        );

    attendance =
        parseAttendance(raw);

    notifyAttendanceListeners();
}

function persistAttendance() {
    const snapshot =
        JSON.stringify(
            attendance,
        );

    persistenceQueue =
        persistenceQueue.then(
            async () => {
                const storage =
                    await getAttendanceStorage();

                await storage.setItem(
                    STORAGE_KEY,
                    snapshot,
                );
            },
        );
}

export function flushAttendancePersistence():
Promise<void> {
    return persistenceQueue;
}

export function getAttendance() {
    return [
        ...attendance,
    ];
}

export function getPresentAttendance() {
    const configuration =
        getActiveBusinessConfiguration();

    return attendance.filter(
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

export async function clockInEmployee(
    input:
        ClockInEmployeeInput,
) {
    // EMPLOYEE_PIN_CLOCK_IN_GATE_V1
    const authorized =
        await requireEmployeePinAuthorization(
            input.employeeId,
            input.employeeName,
            "clock_in",
        );

    if (!authorized) {
        return undefined;
    }

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

    attendance = [
        entry,
        ...attendance,
    ];

    notifyAttendanceListeners();
    persistAttendance();

    return entry;
}

export async function clockOutEmployee(
    employeeId: string,
) {
    // EMPLOYEE_PIN_CLOCK_OUT_GATE_V1
    const present =
        getEmployeePresence(
            employeeId,
        );

    if (!present) {
        return undefined;
    }

    const authorized =
        await requireEmployeePinAuthorization(
            employeeId,
            present.employeeName,
            "clock_out",
        );

    if (!authorized) {
        return undefined;
    }

    const configuration =
        getActiveBusinessConfiguration();

    const now =
        new Date()
            .toISOString();

    let changed:
        EmployeeAttendance |
        undefined;

    const next =
        attendance.map(
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
        attendance = next;

        notifyAttendanceListeners();
        persistAttendance();
    }

    return changed;
}


export type AddManualAttendanceEntryInput = {
    employeeId: string;
    employeeName: string;
    clockedInAt: string;
    clockedOutAt: string;
    reason: string;
};

export function addManualAttendanceEntry(
    input: AddManualAttendanceEntryInput,
) {
    const configuration =
        getActiveBusinessConfiguration();

    const approval =
        getAttendanceCorrectionAvailability(
            input.employeeId,
        );

    if (!approval.canCorrect) {
        throw new Error(
            `ATTENDANCE_MANUAL_ENTRY_NOT_ALLOWED:${approval.reason}`,
        );
    }

    const reason =
        input.reason.trim();

    if (!reason) {
        throw new Error(
            "ATTENDANCE_MANUAL_ENTRY_REASON_REQUIRED",
        );
    }

    const clockedInAt =
        new Date(
            input.clockedInAt,
        );

    const clockedOutAt =
        new Date(
            input.clockedOutAt,
        );

    if (
        !Number.isFinite(
            clockedInAt.getTime(),
        )
    ) {
        throw new Error(
            "ATTENDANCE_MANUAL_ENTRY_INVALID_CLOCK_IN",
        );
    }

    if (
        !Number.isFinite(
            clockedOutAt.getTime(),
        )
    ) {
        throw new Error(
            "ATTENDANCE_MANUAL_ENTRY_INVALID_CLOCK_OUT",
        );
    }

    if (
        clockedOutAt <=
        clockedInAt
    ) {
        throw new Error(
            "ATTENDANCE_MANUAL_ENTRY_CLOCK_OUT_BEFORE_CLOCK_IN",
        );
    }

    const manualEntry:
        AttendanceManualEntry = {
        id:
            crypto.randomUUID(),

        createdAt:
            new Date()
                .toISOString(),

        createdBy: {
            employeeId:
                approval.managerEmployeeId,
            employeeName:
                approval.managerEmployeeName,
        },

        reason,
    };

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
            "clocked_out",

        clockedInAt:
            clockedInAt
                .toISOString(),

        clockedOutAt:
            clockedOutAt
                .toISOString(),

        manualEntry,
    };

    attendance = [
        entry,
        ...attendance,
    ];

    notifyAttendanceListeners();
    persistAttendance();

    return entry;
}

export type CorrectAttendanceEntryInput = {
    entryId: string;
    correctedClockedInAt: string;
    correctedClockedOutAt?: string;
    reason: string;
};

export function correctAttendanceEntry(
    input: CorrectAttendanceEntryInput,
) {
    const configuration =
        getActiveBusinessConfiguration();

    const target =
        attendance.find(
            (entry) =>
                entry.id ===
                    input.entryId &&
                entry.tenantId ===
                    configuration.tenantId &&
                entry.storeCode ===
                    configuration.storeCode,
        );

    if (!target) {
        throw new Error(
            "ATTENDANCE_ENTRY_NOT_FOUND",
        );
    }

    const approval =
        getAttendanceCorrectionAvailability(
            target.employeeId,
        );

    if (!approval.canCorrect) {
        throw new Error(
            `ATTENDANCE_CORRECTION_NOT_ALLOWED:${approval.reason}`,
        );
    }

    const reason =
        input.reason.trim();

    if (!reason) {
        throw new Error(
            "ATTENDANCE_CORRECTION_REASON_REQUIRED",
        );
    }

    const correctedClockedInAt =
        new Date(
            input.correctedClockedInAt,
        );

    if (
        !Number.isFinite(
            correctedClockedInAt.getTime(),
        )
    ) {
        throw new Error(
            "ATTENDANCE_CORRECTION_INVALID_CLOCK_IN",
        );
    }

    let correctedClockedOutAt:
        Date | undefined;

    if (input.correctedClockedOutAt) {
        correctedClockedOutAt =
            new Date(
                input.correctedClockedOutAt,
            );

        if (
            !Number.isFinite(
                correctedClockedOutAt.getTime(),
            )
        ) {
            throw new Error(
                "ATTENDANCE_CORRECTION_INVALID_CLOCK_OUT",
            );
        }

        if (
            correctedClockedOutAt <=
            correctedClockedInAt
        ) {
            throw new Error(
                "ATTENDANCE_CORRECTION_CLOCK_OUT_BEFORE_CLOCK_IN",
            );
        }
    }

    const correctedAt =
        new Date()
            .toISOString();

    let changed:
        EmployeeAttendance |
        undefined;

    attendance =
        attendance.map(
            (entry) => {
                if (
                    entry.id !==
                    target.id
                ) {
                    return entry;
                }

                const correction:
                    AttendanceCorrection = {
                    id:
                        crypto.randomUUID(),
                    correctedAt,
                    correctedBy: {
                        employeeId:
                            approval.managerEmployeeId,
                        employeeName:
                            approval.managerEmployeeName,
                    },
                    reason,
                    originalClockedInAt:
                        entry.clockedInAt,
                    originalClockedOutAt:
                        entry.clockedOutAt,
                    correctedClockedInAt:
                        correctedClockedInAt
                            .toISOString(),
                    correctedClockedOutAt:
                        correctedClockedOutAt
                            ?.toISOString(),
                };

                changed = {
                    ...entry,
                    clockedInAt:
                        correction
                            .correctedClockedInAt,
                    clockedOutAt:
                        correction
                            .correctedClockedOutAt,
                    status:
                        correction
                            .correctedClockedOutAt
                            ? "clocked_out"
                            : "present",
                    corrections: [
                        ...(entry.corrections ?? []),
                        correction,
                    ],
                };

                return changed;
            },
        );

    if (!changed) {
        throw new Error(
            "ATTENDANCE_CORRECTION_FAILED",
        );
    }

    notifyAttendanceListeners();
    persistAttendance();

    return changed;
}
