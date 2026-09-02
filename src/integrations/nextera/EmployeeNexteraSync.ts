export type LumoraEmployeeIdentitySnapshot = {
    id: string;
    name: string;
    code?: string;
    isActive: boolean;
    canSell: boolean;
    roles: string[];
};

type EmployeeSyncEvent = {
    id: string;
    idempotencyKey: string;
    employee: LumoraEmployeeIdentitySnapshot;
    createdAt: string;
    attemptCount: number;
    lastError?: string;
};

const OUTBOX_KEY =
    "lumora:nextera:employee-outbox:v1";

let flushPromise:
    Promise<void> | null =
    null;

function readOutbox():
    EmployeeSyncEvent[] {
    try {
        const raw =
            window.localStorage.getItem(
                OUTBOX_KEY,
            );

        if (!raw) {
            return [];
        }

        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? parsed
            : [];
    } catch {
        return [];
    }
}

function writeOutbox(
    events: EmployeeSyncEvent[],
): void {
    window.localStorage.setItem(
        OUTBOX_KEY,
        JSON.stringify(events),
    );
}

function readConfig() {
    const baseUrl =
        import.meta.env
            .VITE_NEXTERA_SYNC_URL ??
        "";

    const anonKey =
        import.meta.env
            .VITE_NEXTERA_SYNC_ANON_KEY ??
        "";

    const connectionId =
        import.meta.env
            .VITE_NEXTERA_CONNECTION_ID ??
        "";

    const token =
        import.meta.env
            .VITE_NEXTERA_CATALOG_PULL_TOKEN ??
        "";

    if (
        !baseUrl ||
        !anonKey ||
        !connectionId ||
        !token
    ) {
        return null;
    }

    return {
        baseUrl:
            baseUrl.replace(/\/+$/, ""),
        anonKey,
        connectionId,
        token,
    };
}

async function sendEvent(
    event: EmployeeSyncEvent,
): Promise<void> {
    const config =
        readConfig();

    if (!config) {
        return;
    }

    const response =
        await fetch(
            `${config.baseUrl}/rest/v1/rpc/receive_lumora_employee_v5`,
            {
                method: "POST",
                headers: {
                    apikey:
                        config.anonKey,
                    "Content-Type":
                        "application/json",
                },
                body:
                    JSON.stringify({
                        requested_connection_id:
                            config.connectionId,
                        requested_token:
                            config.token,
                        requested_idempotency_key:
                            event.idempotencyKey,
                        requested_payload: {
                            employee_id:
                                event.employee.id,
                            name:
                                event.employee.name,
                            code:
                                event.employee.code ??
                                "",
                            is_active:
                                event.employee.isActive,
                    can_sell:
                        event.employee.canSell,
                    roles:
                        event.employee.roles,
                        },
                    }),
            },
        );

    if (!response.ok) {
        throw new Error(
            await response.text(),
        );
    }
}

async function doFlush():
Promise<void> {
    if (
        typeof navigator !==
            "undefined" &&
        !navigator.onLine
    ) {
        return;
    }

    if (!readConfig()) {
        return;
    }

    let events =
        readOutbox();

    for (const event of [...events]) {
        try {
            await sendEvent(event);

            events =
                events.filter(
                    (candidate) =>
                        candidate.id !==
                        event.id,
                );

            writeOutbox(events);
        } catch (error) {
            events =
                events.map(
                    (candidate) =>
                        candidate.id ===
                        event.id
                            ? {
                                ...candidate,
                                attemptCount:
                                    candidate.attemptCount +
                                    1,
                                lastError:
                                    error instanceof Error
                                        ? error.message
                                        : String(error),
                            }
                            : candidate,
                );

            writeOutbox(events);
            break;
        }
    }
}

export function flushLumoraEmployeeSyncOutbox():
Promise<void> {
    if (!flushPromise) {
        flushPromise =
            doFlush().finally(
                () => {
                    flushPromise =
                        null;
                },
            );
    }

    return flushPromise;
}

function createEmployeeSyncEvent(
    employee:
        LumoraEmployeeIdentitySnapshot,
): EmployeeSyncEvent {
    const eventId =
        crypto.randomUUID();

    return {
        id: eventId,
        idempotencyKey:
            `lumora:employee:${employee.id}:${eventId}`,
        employee: {
            ...employee,
        },
        createdAt:
            new Date().toISOString(),
        attemptCount:
            0,
    };
}

export function enqueueLumoraEmployeeSync(
    employee:
        LumoraEmployeeIdentitySnapshot,
): void {
    writeOutbox([
        ...readOutbox(),
        createEmployeeSyncEvent(
            employee,
        ),
    ]);

    void flushLumoraEmployeeSyncOutbox();
}

export async function syncLumoraEmployeeIdentitySnapshot(
    employees:
        LumoraEmployeeIdentitySnapshot[],
): Promise<void> {
    await flushLumoraEmployeeSyncOutbox();

    if (employees.length === 0) {
        return;
    }

    const events =
        employees.map(
            createEmployeeSyncEvent,
        );

    writeOutbox([
        ...readOutbox(),
        ...events,
    ]);

    await flushLumoraEmployeeSyncOutbox();
}

if (
    typeof window !==
    "undefined"
) {
    window.addEventListener(
        "online",
        () => {
            void flushLumoraEmployeeSyncOutbox();
        },
    );

    window.setInterval(
        () => {
            void flushLumoraEmployeeSyncOutbox();
        },
        5000,
    );

    window.setTimeout(
        () => {
            void flushLumoraEmployeeSyncOutbox();
        },
        1000,
    );
}
