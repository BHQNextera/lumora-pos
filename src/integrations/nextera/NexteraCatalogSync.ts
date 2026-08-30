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

function applyProjection(
    projection: CatalogProjection,
) {
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
                applyProjection(
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
