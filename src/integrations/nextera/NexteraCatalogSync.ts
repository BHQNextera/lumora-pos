import {
    applyNexteraEmployeeIdentityProjection,
    hydrateEmployees,
} from "../../models/employee/EmployeeRepository";

import {
    reconcileRegisterLocalBinding,
} from "../../config/RegisterLocalSettings";

import { replaceNexteraRegisters } from "../../models/organization/RegisterRepository";
import {
    replaceNexteraBranches,
} from "../../models/organization/BranchRepository";

import {
    getCatalogProducts,
    saveCatalogProducts,
} from "../../models/catalog/CatalogRepository";

import type {
    Product,
} from "../../types/product";

const CONFIG_KEY =
    "lumora:nextera:catalog-sync:v1:config";

const STATE_KEY =
    "lumora:nextera:catalog-sync:v1:state";

type JsonRecord = Record<string, unknown>;

type CatalogSyncConfig = {
    enabled: boolean;
    baseUrl: string;
    anonKey: string;
    connectionId: string;
    pullToken: string;
};

type CatalogSyncState = {
    managedProductIds: string[];
    appliedIdempotencyKeys: string[];
    lastCatalogVersion?: string;
    lastSyncedAt?: string;
};

type ProjectionClassification = {
    id: string;
    parent_id?: string | null;
    level: string;
    name: string;
    name_en?: string | null;
    name_el?: string | null;
    is_active: boolean;
};

type ProjectionEmployee = {
    id: string;
    tenant_id: string;
    name: string;
    code?: string | null;
    is_active: boolean;
    can_sell?: boolean;
    updated_at: string;
};

type ProjectionBranch = {
    id: string;
    tenant_id: string;
    code: string;
    name: string;
    is_active: boolean;
    can_sell?: boolean;
    updated_at: string;
};

type ProjectionRegister = {
    id: string;
    tenant_id: string;
    branch_id: string;
    branch_code?: string | null;
    code: string;
    name: string;
    is_active: boolean;
    can_sell?: boolean;
    updated_at: string;
};

type ProjectionVariant = {
    id: string;
    external_id?: string | null;
    sku: string;
    barcode?: string | null;
    style_code?: string | null;
    attributes?: JsonRecord;
    metadata?: JsonRecord;
    price?: number | string | null;
    stock_on_hand?: number | string | null;
    status: string;
};

type ProjectionProduct = {
    id: string;
    external_id?: string | null;
    sku: string;
    name: string;
    status: string;
    metadata?: JsonRecord;
    variants?: ProjectionVariant[];
};

type CatalogProjection = {
    schema_version: "nextera.catalog.projection.v1";
    catalog_version?: string;
    classifications: ProjectionClassification[];
    products: ProjectionProduct[];

    organization_branches?: ProjectionBranch[];
    organization_registers?: ProjectionRegister[];    employees?: ProjectionEmployee[];
};

type ClaimedEvent = {
    event_id: string;
    idempotency_key: string;
    schema_version: string;
    payload: CatalogProjection;
};

type ClaimResponse = {
    events?: ClaimedEvent[];
};

export type NexteraCatalogSyncResult = {
    applied: boolean;
    products: Product[];
};

function isRecord(
    value: unknown,
): value is JsonRecord {
    return Boolean(
        value &&
        typeof value === "object" &&
        !Array.isArray(value),
    );
}

function readNumber(
    value: unknown,
    fallback = 0,
) {
    const result =
        typeof value === "number"
            ? value
            : typeof value === "string"
                ? Number(value)
                : Number.NaN;

    return Number.isFinite(result)
        ? result
        : fallback;
}

function readString(
    value: unknown,
) {
    return typeof value === "string"
        ? value
        : undefined;
}

function readConfig():
    CatalogSyncConfig | null {
    let stored:
        Partial<CatalogSyncConfig> = {};

    try {
        const raw =
            window.localStorage.getItem(
                CONFIG_KEY,
            );

        if (raw) {
            const parsed =
                JSON.parse(raw);

            if (isRecord(parsed)) {
                stored =
                    parsed as Partial<CatalogSyncConfig>;
            }
        }
    } catch {
        stored = {};
    }

    const config:
        CatalogSyncConfig = {
            enabled: Boolean(import.meta.env.VITE_NEXTERA_SYNC_URL && import.meta.env.VITE_NEXTERA_SYNC_ANON_KEY && import.meta.env.VITE_NEXTERA_CONNECTION_ID && import.meta.env.VITE_NEXTERA_CATALOG_PULL_TOKEN) ? true : (stored.enabled ?? true),

            baseUrl:
                import.meta.env.VITE_NEXTERA_SYNC_URL ?? stored.baseUrl ?? "",

            anonKey:
                import.meta.env.VITE_NEXTERA_SYNC_ANON_KEY ?? stored.anonKey ?? "",

            connectionId:
                import.meta.env.VITE_NEXTERA_CONNECTION_ID ?? stored.connectionId ?? "",

            pullToken:
                import.meta.env.VITE_NEXTERA_CATALOG_PULL_TOKEN ?? stored.pullToken ?? "",
        };

    if (
        !config.enabled ||
        !config.baseUrl ||
        !config.anonKey ||
        !config.connectionId ||
        !config.pullToken
    ) {
        return null;
    }

    return {
        ...config,
        baseUrl:
            config.baseUrl.replace(
                /\/+$/,
                "",
            ),
    };
}

function readState():
    CatalogSyncState {
    try {
        const raw =
            window.localStorage.getItem(
                STATE_KEY,
            );

        if (!raw) {
            throw new Error();
        }

        const parsed =
            JSON.parse(raw);

        if (!isRecord(parsed)) {
            throw new Error();
        }

        return {
            managedProductIds:
                Array.isArray(
                    parsed.managedProductIds,
                )
                    ? parsed.managedProductIds.filter(
                        (
                            value,
                        ): value is string =>
                            typeof value ===
                            "string",
                    )
                    : [],

            appliedIdempotencyKeys:
                Array.isArray(
                    parsed.appliedIdempotencyKeys,
                )
                    ? parsed.appliedIdempotencyKeys.filter(
                        (
                            value,
                        ): value is string =>
                            typeof value ===
                            "string",
                    )
                    : [],

            lastCatalogVersion:
                readString(
                    parsed.lastCatalogVersion,
                ),

            lastSyncedAt:
                readString(
                    parsed.lastSyncedAt,
                ),
        };
    } catch {
        return {
            managedProductIds: [],
            appliedIdempotencyKeys: [],
        };
    }
}

function writeState(
    state: CatalogSyncState,
) {
    window.localStorage.setItem(
        STATE_KEY,
        JSON.stringify(state),
    );
}

function resolveCategory(
    product: ProjectionProduct,
): Product["category"] {
    const raw =
        readString(
            product.metadata?.category,
        );

    const supported =
        new Set<Product["category"]>([
            "hot-drinks",
            "cold-drinks",
            "pastries",
            "sandwiches",
            "desserts",
            "manual",
            "fashion",
        ]);

    if (
        raw &&
        supported.has(
            raw as Product["category"],
        )
    ) {
        return raw as Product["category"];
    }

    return (
        product.variants?.length ?? 0
    ) > 0
        ? "fashion"
        : "manual";
}

function resolveHierarchy(
    product: ProjectionProduct,
    nodes: ProjectionClassification[],
): Product["hierarchy"] {
    const leafId =
        readString(
            product.metadata
                ?.classification_node_id,
        );

    if (!leafId) {
        return undefined;
    }

    const byId =
        new Map(
            nodes.map(
                (node) => [
                    node.id,
                    node,
                ],
            ),
        );

    const path:
        ProjectionClassification[] = [];

    let current =
        byId.get(leafId);

    let guard = 0;

    while (
        current &&
        guard < 10
    ) {
        path.unshift(
            current,
        );

        current =
            current.parent_id
                ? byId.get(
                    current.parent_id,
                )
                : undefined;

        guard += 1;
    }

    const findName = (
        level: string,
    ) =>
        path.find(
            (node) =>
                node.level === level,
        )?.name;

    return {
        department:
            findName(
                "department",
            ),
        category:
            findName(
                "category",
            ),
        subcategory:
            findName(
                "sub-category",
            ),
    };
}

function mapProduct(
    source: ProjectionProduct,
    nodes: ProjectionClassification[],
    existing?: Product,
): Product {
    const metadata =
        source.metadata ?? {};

    const activeVariants =
        (
            source.variants ??
            []
        ).filter(
            (variant) =>
                variant.status ===
                "active",
        );

    const variants =
        activeVariants.map(
            (variant) => {
                const attributes =
                    variant.attributes ??
                    {};

                return {
                    id:
                        variant.id,
                    variantId:
                        variant.id,
                    productId:
                        existing?.id ??
                        source.id,
                    externalId:
                        variant.external_id ??
                        undefined,
                    sku:
                        variant.sku,
                    barcode:
                        variant.barcode ??
                        "",
                    styleCode:
                        variant.style_code ??
                        undefined,
                    imageUrl:
                        readString(
                            variant.metadata?.image_url,
                        ) ??
                        readString(
                            variant.metadata?.imageUrl,
                        ),
                    color: { code: readString(attributes.color) ?? "", name: readString(attributes.color) ?? "" },
                    size: { code: readString(attributes.size) ?? "", name: readString(attributes.size) ?? "" },
                    attributes,
                    price:
                        variant.price ===
                        null
                            ? undefined
                            : readNumber(
                                variant.price,
                            ),
                    stockOnHand:
                        variant.stock_on_hand == null
                            ? undefined
                            : readNumber(
                                variant.stock_on_hand,
                            ),
                    isActive:
                        true,
                };
            },
        ) as NonNullable<
            Product["variants"]
        >;

    const nameHe =
        readString(
            metadata.name_he,
        ) ??
        source.name;

    const nameEn =
        readString(
            metadata.name_en,
        );

    const nameEl =
        readString(
            metadata.name_el,
        );

    return {
        ...existing,

        id:
            existing?.id ??
            source.id,

        name:
            nameHe,

        names: {
            he:
                nameHe,
            en:
                nameEn,
            el:
                nameEl,
        },

        price:
            readNumber(
                metadata.price,
            ),

        costPrice:
            metadata.cost_price ===
            undefined
                ? existing?.costPrice
                : readNumber(
                    metadata.cost_price,
                ),

        category:
            resolveCategory(
                source,
            ),

        hierarchy:
            resolveHierarchy(
                source,
                nodes,
            ),

        stockOnHand:
            existing?.stockOnHand,

        imageUrl:
            readString(
                metadata.image_url,
            ) ??
            existing?.imageUrl ??
            "",

        barcode:
            readString(
                metadata.barcode,
            ) ??
            existing?.barcode ??
            "",

        sku:
            source.sku,

        styleCode:
            readString(
                metadata.style_code,
            ) ??
            activeVariants.find(
                (variant) =>
                    variant.style_code,
            )?.style_code ??
            existing?.styleCode,

        variants,

        isActive:
            source.status ===
            "active",
    };
}

async function applyProjection(
    projection: CatalogProjection,
) {
    // EMPLOYEE_HYDRATION_BARRIER_V1
    // Prevent late SQLite hydration from overwriting
    // employees that just arrived from Nextera.
    await hydrateEmployees();

    // EMPLOYEE_PROJECTION_APPLY_V1
    if (
        Array.isArray(
            projection.employees,
        )
    ) {
        applyNexteraEmployeeIdentityProjection(
            projection.employees.map(
                (employee) => ({
                    id: employee.id,
                    name: employee.name,
                    code:
                        employee.code ??
                        "",
                    isActive: employee.is_active, canSell: employee.can_sell === true,}),
            ),
        );
    }

    // BRANCH_PROJECTION_APPLY_V1
    if (
        Array.isArray(
            projection.organization_branches,
        )
    ) {
        replaceNexteraBranches(
            projection.organization_branches.map(
                (branch) => ({
                    id: branch.id,
                    tenantId:
                        branch.tenant_id,
                    code: branch.code,
                    name: branch.name,
                    isActive:
                        branch.is_active !==
                        false,
                    updatedAt:
                        branch.updated_at,
                }),
            ),
        );
    }

    // REGISTER_PROJECTION_APPLY_V1
    if (Array.isArray(projection.organization_registers)) {
        replaceNexteraRegisters(
            projection.organization_registers.map((item) => ({
                id: item.id,
                tenantId: item.tenant_id,
                branchId: item.branch_id,
                branchCode: item.branch_code ?? "",
                code: item.code,
                name: item.name,
                isActive: item.is_active,
                updatedAt: item.updated_at,
            })),
        );
    }

    // REGISTER_BINDING_RECONCILE_V1
    reconcileRegisterLocalBinding();

    if (
        projection.schema_version !==
        "nextera.catalog.projection.v1"
    ) {
        throw new Error(
            "Unsupported Nextera catalog projection.",
        );
    }

    const state =
        readState();

    const current =
        getCatalogProducts();

    const bySku =
        new Map(
            current.map(
                (product) => [
                    product.sku
                        .trim()
                        .toUpperCase(),
                    product,
                ],
            ),
        );

    const incoming =
        projection.products.map(
            (source) => {
                const existing =
                    current.find(
                        (product) =>
                            product.id ===
                            source.id,
                    ) ??
                    bySku.get(
                        source.sku
                            .trim()
                            .toUpperCase(),
                    );

                return mapProduct(
                    source,
                    projection.classifications ??
                    [],
                    existing,
                );
            },
        );

    const incomingIds =
        new Set(
            incoming.map(
                (product) =>
                    product.id,
            ),
        );

    const incomingSkus =
        new Set(
            incoming.map(
                (product) =>
                    product.sku
                        .trim()
                        .toUpperCase(),
            ),
        );

    const previousManaged =
        new Set(
            state.managedProductIds,
        );

    const untouched =
        current.filter(
            (product) =>
                !previousManaged.has(
                    product.id,
                ) &&
                !incomingIds.has(
                    product.id,
                ) &&
                !incomingSkus.has(
                    product.sku
                        .trim()
                        .toUpperCase(),
                ),
        );

    const staleManaged =
        current
            .filter(
                (product) =>
                    previousManaged.has(
                        product.id,
                    ) &&
                    !incomingIds.has(
                        product.id,
                    ) &&
                    !incomingSkus.has(
                        product.sku
                            .trim()
                            .toUpperCase(),
                    ),
            )
            .map(
                (product) => ({
                    ...product,
                    isActive: false,
                }),
            );

    const next = [
        ...untouched,
        ...staleManaged,
        ...incoming,
    ];

    saveCatalogProducts(
        next,
    );

    return {
        products:
            next,

        managedProductIds: [
            ...new Set([
                ...staleManaged.map(
                    (product) =>
                        product.id,
                ),
                ...incoming.map(
                    (product) =>
                        product.id,
                ),
            ]),
        ],
    };
}

async function rpc(
    config: CatalogSyncConfig,
    functionName: string,
    body: JsonRecord,
) {
    const response =
        await fetch(
            `${config.baseUrl}/rest/v1/rpc/${functionName}`,
            {
                method:
                    "POST",

                headers: {
                    apikey:
                        config.anonKey,
                    "Content-Type":
                        "application/json",
                },

                body:
                    JSON.stringify(
                        body,
                    ),
            },
        );

    if (!response.ok) {
        throw new Error(
            await response.text(),
        );
    }

    return response.json();
}

async function acknowledge(
    config: CatalogSyncConfig,
    eventId: string,
    success: boolean,
    error?: string,
) {
    await rpc(
        config,
        "ack_lumora_catalog_event_v1",
        {
            requested_connection_id:
                config.connectionId,
            requested_token:
                config.pullToken,
            requested_event_id:
                eventId,
            requested_success:
                success,
            requested_error:
                error ?? null,
        },
    );
}

export async function pullAndApplyNexteraCatalog():
    Promise<NexteraCatalogSyncResult> {
    const config =
        readConfig();

    const existingProducts =
        getCatalogProducts();

    if (!config) {
        return {
            applied: false,
            products:
                existingProducts,
        };
    }

    const claimed =
        await rpc(
            config,
            "claim_lumora_catalog_events_v1",
            {
                requested_connection_id:
                    config.connectionId,
                requested_token:
                    config.pullToken,
                requested_limit:
                    5,
            },
        ) as ClaimResponse;

    const events =
        claimed.events ??
        [];

    if (
        events.length ===
        0
    ) {
        // CATALOG_SNAPSHOT_RECONCILE_V1
        // The queue is delivery-oriented and may already have been
        // consumed by an earlier poll/runtime. Reconcile against the
        // latest projection so this device cannot remain stale.
        const snapshot =
            await rpc(
                config,
                "get_lumora_catalog_snapshot_v1",
                {
                    requested_connection_id:
                        config.connectionId,
                    requested_token:
                        config.pullToken,
                },
            ) as {
                found?: boolean;
                idempotency_key?: string;
                payload?: CatalogProjection | null;
            };

        if (
            snapshot.found &&
            snapshot.payload
        ) {
            const result =
                await applyProjection(
                    snapshot.payload,
                );

            const state =
                readState();

            const snapshotKey =
                snapshot.idempotency_key;

            writeState({
                managedProductIds:
                    result.managedProductIds,

                appliedIdempotencyKeys:
                    snapshotKey
                        ? Array.from(
                            new Set([
                                ...state
                                    .appliedIdempotencyKeys,
                                snapshotKey,
                            ]),
                        ).slice(-100)
                        : state
                            .appliedIdempotencyKeys,

                lastCatalogVersion:
                    snapshot.payload
                        .catalog_version,

                lastSyncedAt:
                    new Date()
                        .toISOString(),
            });

            return {
                applied: true,
                products:
                    result.products,
            };
        }

        return {
            applied: false,
            products:
                existingProducts,
        };
    }

    let products =
        existingProducts;

    let applied = false;

    for (
        const event of events
    ) {
        const state =
            readState();

        if (
            state.appliedIdempotencyKeys.includes(
                event.idempotency_key,
            )
        ) {
            await acknowledge(
                config,
                event.event_id,
                true,
            );

            continue;
        }

        try {
            const result =
                await applyProjection(
                    event.payload,
                );

            products =
                result.products;

            writeState({
                managedProductIds:
                    result.managedProductIds,

                appliedIdempotencyKeys: [
                    ...state
                        .appliedIdempotencyKeys,
                    event.idempotency_key,
                ].slice(-100),

                lastCatalogVersion:
                    event.payload
                        .catalog_version,

                lastSyncedAt:
                    new Date()
                        .toISOString(),
            });

            await acknowledge(
                config,
                event.event_id,
                true,
            );

            applied = true;
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : String(error);

            try {
                await acknowledge(
                    config,
                    event.event_id,
                    false,
                    message,
                );
            } catch {
                // Keep local-first operation alive.
            }

            throw error;
        }
    }

    return {
        applied,
        products,
    };
}
