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
    EmployeeAttendance,
} from "./EmployeeAttendance";

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

    attendance = [
        entry,
        ...attendance,
    ];

    notifyAttendanceListeners();
    persistAttendance();

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