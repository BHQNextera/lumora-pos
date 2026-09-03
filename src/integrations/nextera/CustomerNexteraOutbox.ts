import type {
    Customer,
} from "../../models/customer/Customer";

export type LumoraCustomerIdentitySnapshot = {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    identityNumber?: string;
    birthDate?: string;
    address?: string;
    notes?: string;
    isActive: boolean;
    sourceUpdatedAt: string;
};

type CustomerSyncEvent = {
    id: string;
    idempotencyKey: string;
    customer: LumoraCustomerIdentitySnapshot;
    createdAt: string;
    attemptCount: number;
    lastError?: string;
};

const OUTBOX_KEY =
    "lumora:nextera:customer-outbox:v1";

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let flushPromise:
    Promise<void> | null =
        null;

function readOutbox():
CustomerSyncEvent[] {
    if (
        typeof window ===
        "undefined"
    ) {
        return [];
    }

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
    }
    catch {
        return [];
    }
}

function writeOutbox(
    events:
        CustomerSyncEvent[],
): void {
    if (
        typeof window ===
        "undefined"
    ) {
        return;
    }

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

function isSyncableCustomerId(
    customerId: string,
): boolean {
    return (
        customerId !==
            "walk-in" &&
        UUID_PATTERN.test(
            customerId,
        )
    );
}

function toIdentitySnapshot(
    customer: Customer,
): LumoraCustomerIdentitySnapshot {
    return {
        id:
            customer.id,

        name:
            customer.name,

        phone:
            customer.phone,

        email:
            customer.email,

        identityNumber:
            customer.externalId,

        birthDate:
            customer.birthDate,

        address:
            customer.address,

        notes:
            customer.notes,

        isActive:
            customer.isActive !==
            false,

        sourceUpdatedAt:
            customer.updatedAt ??
            new Date().toISOString(),
    };
}

async function sendEvent(
    event:
        CustomerSyncEvent,
): Promise<void> {
    const config =
        readConfig();

    if (!config) {
        return;
    }

    const response =
        await fetch(
            `${config.baseUrl}/rest/v1/rpc/receive_lumora_customer_v1`,
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
                            customer_id:
                                event.customer.id,

                            name:
                                event.customer.name,

                            phone:
                                event.customer.phone ??
                                "",

                            email:
                                event.customer.email ??
                                "",

                            identity_number:
                                event.customer.identityNumber ??
                                "",

                            birth_date:
                                event.customer.birthDate ??
                                "",

                            address_text:
                                event.customer.address ??
                                "",

                            notes:
                                event.customer.notes ??
                                "",

                            is_active:
                                event.customer.isActive,

                            source_updated_at:
                                event.customer.sourceUpdatedAt,
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

    for (
        const event
        of [...events]
    ) {
        try {
            await sendEvent(
                event,
            );

            events =
                events.filter(
                    (candidate) =>
                        candidate.id !==
                        event.id,
                );

            writeOutbox(
                events,
            );
        }
        catch (error) {
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

            writeOutbox(
                events,
            );

            break;
        }
    }
}

export function flushLumoraCustomerSyncOutbox():
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

function createCustomerSyncEvent(
    customer:
        LumoraCustomerIdentitySnapshot,
): CustomerSyncEvent {
    const eventId =
        crypto.randomUUID();

    return {
        id:
            eventId,

        idempotencyKey:
            `lumora:customer:${customer.id}:${eventId}`,

        customer: {
            ...customer,
        },

        createdAt:
            new Date().toISOString(),

        attemptCount:
            0,
    };
}

export function enqueueLumoraCustomerSync(
    customer: Customer,
): void {
    if (
        !isSyncableCustomerId(
            customer.id,
        )
    ) {
        return;
    }

    const snapshot =
        toIdentitySnapshot(
            customer,
        );

    writeOutbox([
        ...readOutbox(),
        createCustomerSyncEvent(
            snapshot,
        ),
    ]);

    void flushLumoraCustomerSyncOutbox();
}

if (
    typeof window !==
    "undefined"
) {
    window.addEventListener(
        "online",
        () => {
            void flushLumoraCustomerSyncOutbox();
        },
    );

    window.setInterval(
        () => {
            void flushLumoraCustomerSyncOutbox();
        },
        5000,
    );

    window.setTimeout(
        () => {
            void flushLumoraCustomerSyncOutbox();
        },
        1000,
    );
}