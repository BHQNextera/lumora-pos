import {
    applyNexteraCustomerSnapshot,
} from "../../models/customer/CustomerRepository";

import {
    flushLumoraCustomerSyncOutbox,
} from "./CustomerNexteraOutbox";

type NexteraCustomerProjection = {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    identity_number?: string | null;
    birth_date?: string | null;
    address_text?: string | null;
    notes?: string | null;
    is_active?: boolean;
    updated_at?: string;
};

type NexteraCustomerPullResponse = {
    schema_version?: string;
    customers?: NexteraCustomerProjection[];
};

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

export async function pullAndApplyNexteraCustomers():
Promise<number> {
    await flushLumoraCustomerSyncOutbox();

    const config =
        readConfig();

    if (!config) {
        return 0;
    }

    const response =
        await fetch(
            `${config.baseUrl}/rest/v1/rpc/pull_lumora_customers_v1`,
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
                    }),
            },
        );

    if (!response.ok) {
        throw new Error(
            await response.text(),
        );
    }

    const payload =
        await response.json() as
            NexteraCustomerPullResponse;

    const rows =
        Array.isArray(
            payload.customers,
        )
            ? payload.customers
            : [];

    let applied =
        0;

    for (
        const row
        of rows
    ) {
        if (
            typeof row.id !==
                "string" ||
            !row.id.trim() ||
            typeof row.name !==
                "string" ||
            !row.name.trim()
        ) {
            continue;
        }

        applyNexteraCustomerSnapshot({
            id:
                row.id,

            name:
                row.name.trim(),

            phone:
                row.phone?.trim() ||
                undefined,

            email:
                row.email?.trim() ||
                undefined,

            externalId:
                row.identity_number?.trim() ||
                undefined,

            birthDate:
                row.birth_date?.trim() ||
                undefined,

            address:
                row.address_text?.trim() ||
                undefined,

            notes:
                row.notes?.trim() ||
                undefined,

            isActive:
                row.is_active ===
                true,

            updatedAt:
                row.updated_at?.trim() ||
                new Date().toISOString(),
        });

        applied +=
            1;
    }

    return applied;
}