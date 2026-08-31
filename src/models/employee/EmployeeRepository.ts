import {
    enqueueLumoraEmployeeSync,
} from "../../integrations/nextera/EmployeeNexteraSync";

import {
    isTauri,
} from "@tauri-apps/api/core";

import {
    BrowserLocalStorageAdapter,
} from "../../runtime/storage/BrowserLocalStorageAdapter";

import type {
    RuntimeStorage,
} from "../../runtime/storage/RuntimeStorage";

import type {
    Employee,
    EmployeeRole,
} from "./Employee";

import {
    employeeSeed,
} from "./EmployeeSeed";

// LUMORA EMPLOYEE DURABILITY V1
const STORAGE_KEY =
    "lumora.employees";

const PENDING_STORAGE_KEY =
    "lumora.employees.pending";

let employees:
    Employee[] =
        employeeSeed.map(
            (employee) => ({
                ...employee,
                roles: [
                    ...employee.roles,
                ],
            }),
        );

type EmployeeListener =
    () => void;

const listeners =
    new Set<EmployeeListener>();

let storagePromise:
    Promise<RuntimeStorage> | null =
        null;

let persistenceQueue:
    Promise<void> =
        Promise.resolve();

let hydrationPromise:
    Promise<void> | null =
        null;

let hydrationComplete =
    false;

function getStorage():
Promise<RuntimeStorage> {
    if (!storagePromise) {
        storagePromise =
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

    return storagePromise;
}

function enqueueEmployeeIdentitySync(
    employee: Employee,
): void {
    enqueueLumoraEmployeeSync({
        id: employee.id,
        name: employee.name,
        code: employee.code,
        isActive:
            employee.isActive,
    });
}

function cloneEmployee(
    employee: Employee,
): Employee {
    return {
        ...employee,
        roles: [
            ...employee.roles,
        ],
    };
}

function normalizeRoles(
    roles:
        EmployeeRole[],
): EmployeeRole[] {
    const allowed =
        new Set<EmployeeRole>([
            "seller",
            "cashier",
            "manager",
        ]);

    return Array.from(
        new Set(
            roles.filter(
                (role) =>
                    allowed.has(
                        role,
                    ),
            ),
        ),
    );
}

function isValidEmployeeNumber(
    value: unknown,
): value is number {
    return (
        typeof value ===
            "number" &&
        Number.isInteger(
            value,
        ) &&
        value > 0
    );
}

function assignEmployeeNumbers(
    source:
        Employee[],
): Employee[] {
    const used =
        new Set<number>();

    const maxExisting =
        source.reduce(
            (
                max,
                employee,
            ) =>
                isValidEmployeeNumber(
                    employee.employeeNumber,
                )
                    ? Math.max(
                        max,
                        employee.employeeNumber,
                    )
                    : max,
            0,
        );

    let nextNumber =
        maxExisting > 0
            ? maxExisting + 1
            : 1;

    return source.map(
        (employee) => {
            if (
                isValidEmployeeNumber(
                    employee.employeeNumber,
                ) &&
                !used.has(
                    employee.employeeNumber,
                )
            ) {
                used.add(
                    employee.employeeNumber,
                );

                return employee;
            }

            while (
                used.has(
                    nextNumber,
                )
            ) {
                nextNumber +=
                    1;
            }

            const numberedEmployee:
                Employee = {
                ...employee,
                employeeNumber:
                    nextNumber,
            };

            used.add(
                nextNumber,
            );

            nextNumber +=
                1;

            return numberedEmployee;
        },
    );
}

function getNextEmployeeNumber():
number {
    const highest =
        employees.reduce(
            (
                max,
                employee,
            ) =>
                isValidEmployeeNumber(
                    employee.employeeNumber,
                )
                    ? Math.max(
                        max,
                        employee.employeeNumber,
                    )
                    : max,
            0,
        );

    return highest + 1;
}

function parseEmployees(
    raw: string | null,
): Employee[] {
    if (!raw) {
        return assignEmployeeNumbers(
            employeeSeed.map(
                cloneEmployee,
            ),
        );
    }

    try {
        const parsed =
            JSON.parse(raw);

        if (!Array.isArray(parsed)) {
            return assignEmployeeNumbers(
                employeeSeed.map(
                    cloneEmployee,
                ),
            );
        }

        const normalized =
            (
                parsed as unknown[]
            ).reduce<Employee[]>(
                (
                    result,
                    candidate,
                ) => {
                    if (
                        !candidate ||
                        typeof candidate !==
                            "object"
                    ) {
                        return result;
                    }

                    const item =
                        candidate as
                            Partial<Employee>;

                    const roles =
                        normalizeRoles(
                            Array.isArray(
                                item.roles,
                            )
                                ? item.roles
                                : [],
                        );

                    if (
                        !item.id ||
                        typeof item.id !==
                            "string" ||
                        !item.name ||
                        typeof item.name !==
                            "string" ||
                        roles.length ===
                            0
                    ) {
                        return result;
                    }

                    const code =
                        typeof item.code ===
                            "string"
                            ? item.code.trim()
                            : "";

                    const employee:
                        Employee = {
                        id:
                            item.id,
                        name:
                            item.name.trim(),
                        roles,
                        isActive:
                            item.isActive !==
                            false,
                        ...(isValidEmployeeNumber(
                            item.employeeNumber,
                        )
                            ? {
                                employeeNumber:
                                    item.employeeNumber,
                            }
                            : {}),
                        ...(code
                            ? {
                                code,
                            }
                            : {}),
                    };

                    result.push(
                        employee,
                    );

                    return result;
                },
                [],
            );

        return assignEmployeeNumbers(
            normalized.length > 0
                ? normalized
                : employeeSeed.map(
                    cloneEmployee,
                ),
        );
    }
    catch {
        return assignEmployeeNumbers(
            employeeSeed.map(
                cloneEmployee,
            ),
        );
    }
}

function syncLegacyEmployeeSeed() {
    employeeSeed.splice(
        0,
        employeeSeed.length,
        ...employees.map(
            cloneEmployee,
        ),
    );
}

function notify() {
    for (
        const listener
        of listeners
    ) {
        listener();
    }
}

function stagePendingSnapshot(
    snapshot: string,
) {
    if (!isTauri()) {
        return;
    }

    window.localStorage.setItem(
        PENDING_STORAGE_KEY,
        snapshot,
    );
}

function clearPendingSnapshot(
    snapshot: string,
) {
    if (!isTauri()) {
        return;
    }

    if (
        window.localStorage.getItem(
            PENDING_STORAGE_KEY,
        ) === snapshot
    ) {
        window.localStorage.removeItem(
            PENDING_STORAGE_KEY,
        );
    }
}

function persistEmployees():
Promise<void> {
    const snapshot =
        JSON.stringify(
            employees,
        );

    /*
     * Tauri uses async SQLite writes. Keep a tiny local write-ahead
     * snapshot so an immediate reload cannot lose a just-saved employee.
     */
    stagePendingSnapshot(
        snapshot,
    );

    persistenceQueue =
        persistenceQueue
            .catch(
                (error) => {
                    console.error(
                        "EMPLOYEE_PREVIOUS_PERSISTENCE_FAILED",
                        error,
                    );
                },
            )
            .then(
                async () => {
                    const storage =
                        await getStorage();

                    await storage.setItem(
                        STORAGE_KEY,
                        snapshot,
                    );

                    clearPendingSnapshot(
                        snapshot,
                    );
                },
            );

    return persistenceQueue;
}

async function readStoredEmployees(
    storage: RuntimeStorage,
): Promise<string | null> {
    if (isTauri()) {
        const pending =
            window.localStorage.getItem(
                PENDING_STORAGE_KEY,
            );

        if (pending !== null) {
            try {
                await storage.setItem(
                    STORAGE_KEY,
                    pending,
                );

                clearPendingSnapshot(
                    pending,
                );
            }
            catch (error) {
                console.error(
                    "EMPLOYEE_PENDING_RECOVERY_WRITE_FAILED",
                    error,
                );
            }

            return pending;
        }
    }

    let raw =
        await storage.getItem(
            STORAGE_KEY,
        );

    if (isTauri()) {
        const legacy =
            window.localStorage.getItem(
                STORAGE_KEY,
            );

        if (
            raw === null &&
            legacy !== null
        ) {
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

export async function hydrateEmployees():
Promise<void> {
    if (hydrationComplete) {
        return;
    }

    if (!hydrationPromise) {
        hydrationPromise =
            (async () => {
                const storage =
                    await getStorage();

                const raw =
                    await readStoredEmployees(
                        storage,
                    );

                employees =
                    parseEmployees(
                        raw,
                    );

                syncLegacyEmployeeSeed();
                notify();

                const normalizedSnapshot =
                    JSON.stringify(
                        employees,
                    );

                if (
                    raw !==
                    normalizedSnapshot
                ) {
                    stagePendingSnapshot(
                        normalizedSnapshot,
                    );

                    await storage.setItem(
                        STORAGE_KEY,
                        normalizedSnapshot,
                    );

                    clearPendingSnapshot(
                        normalizedSnapshot,
                    );
                }

                hydrationComplete =
                    true;
            })();
    }

    try {
        await hydrationPromise;
    }
    finally {
        hydrationPromise =
            null;
    }
}

export function subscribeEmployees(
    listener:
        EmployeeListener,
): () => void {
    listeners.add(
        listener,
    );

    return () => {
        listeners.delete(
            listener,
        );
    };
}

export function getEmployees():
Employee[] {
    return employees.map(
        cloneEmployee,
    );
}

export function flushEmployeePersistence():
Promise<void> {
    return persistenceQueue;
}

export type SaveEmployeeInput = {
    name: string;
    code: string;
    roles:
        EmployeeRole[];
    isActive: boolean;
};

function validateInput(
    input:
        SaveEmployeeInput,
    currentEmployeeId?: string,
) {
    const name =
        input.name.trim();

    const code =
        input.code.trim();

    const roles =
        normalizeRoles(
            input.roles,
        );

    if (!name) {
        throw new Error(
            "EMPLOYEE_NAME_REQUIRED",
        );
    }

    if (!code) {
        throw new Error(
            "EMPLOYEE_CODE_REQUIRED",
        );
    }

    if (
        roles.length ===
        0
    ) {
        throw new Error(
            "EMPLOYEE_ROLE_REQUIRED",
        );
    }

    const duplicateCode =
        employees.some(
            (employee) =>
                employee.id !==
                    currentEmployeeId &&
                employee.code?.trim()
                    .toLocaleLowerCase() ===
                    code.toLocaleLowerCase(),
        );

    if (duplicateCode) {
        throw new Error(
            "EMPLOYEE_CODE_DUPLICATE",
        );
    }

    return {
        name,
        code,
        roles,
        isActive:
            input.isActive,
    };
}

export function createEmployee(
    input:
        SaveEmployeeInput,
): Employee {
    const normalized =
        validateInput(
            input,
        );

    const employee:
        Employee = {
        id:
            crypto.randomUUID(),
        employeeNumber:
            getNextEmployeeNumber(),
        ...normalized,
    };

    employees = [
        ...employees,
        employee,
    ];

    syncLegacyEmployeeSeed();
    notify();
    persistEmployees();

    enqueueEmployeeIdentitySync(
        employee,
    );

    return cloneEmployee(
        employee,
    );
}

export function updateEmployee(
    employeeId: string,
    input:
        SaveEmployeeInput,
): Employee {
    const existing =
        employees.find(
            (employee) =>
                employee.id ===
                employeeId,
        );

    if (!existing) {
        throw new Error(
            "EMPLOYEE_NOT_FOUND",
        );
    }

    const normalized =
        validateInput(
            input,
            employeeId,
        );

    const updated:
        Employee = {
        ...existing,
        ...normalized,
        employeeNumber:
            existing.employeeNumber ??
            getNextEmployeeNumber(),
    };

    employees =
        employees.map(
            (employee) =>
                employee.id ===
                    employeeId
                    ? updated
                    : employee,
        );

    syncLegacyEmployeeSeed();
    notify();
    persistEmployees();

    enqueueEmployeeIdentitySync(
        updated,
    );

    return cloneEmployee(
        updated,
    );
}

export function setEmployeeActive(
    employeeId: string,
    isActive: boolean,
): Employee {
    const existing =
        employees.find(
            (employee) =>
                employee.id ===
                employeeId,
        );

    if (!existing) {
        throw new Error(
            "EMPLOYEE_NOT_FOUND",
        );
    }

    return updateEmployee(
        employeeId,
        {
            name:
                existing.name,
            code:
                existing.code ?? "",
            roles:
                existing.roles,
            isActive,
        },
    );
}


export type NexteraEmployeeIdentityProjection = {
    id: string;
    name: string;
    code?: string;
    isActive: boolean;
};

export function applyNexteraEmployeeIdentityProjection(
    incoming:
        NexteraEmployeeIdentityProjection[],
): void {
    if (incoming.length === 0) {
        return;
    }

    const byId =
        new Map(
            employees.map(
                (employee) => [
                    employee.id,
                    employee,
                ],
            ),
        );

    let nextEmployeeNumber =
        employees.reduce(
            (max, employee) =>
                Math.max(
                    max,
                    employee.employeeNumber ?? 0,
                ),
            0,
        ) + 1;

    let changed =
        false;

    for (const item of incoming) {
        const existing =
            byId.get(item.id);

        const next:
            Employee = {
            id: item.id,
            name:
                item.name.trim(),
            employeeNumber:
                existing?.employeeNumber ??
                nextEmployeeNumber++,
            code:
                item.code?.trim() ||
                undefined,
            roles:
                existing
                    ? [...existing.roles]
                    : [],
            isActive:
                item.isActive,
        };

        if (
            !existing ||
            JSON.stringify(existing) !==
                JSON.stringify(next)
        ) {
            byId.set(
                item.id,
                next,
            );
            changed = true;
        }
    }

    if (!changed) {
        return;
    }

    employees =
        Array.from(
            byId.values(),
        );

    syncLegacyEmployeeSeed();
    notify();
    persistEmployees();
}
