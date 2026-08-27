import type {
    SaleDocument,
} from "../../models/document/Document";

import type {
    Payment,
} from "../../models/Payment";

import type {
    Sale,
} from "../../models/sale/Sale";

import type {
    SaleLine,
} from "../../models/sale/SaleLine";

import {
    getPendingLumoraNexteraOutbox,
    markLumoraNexteraOutboxDelivered,
    markLumoraNexteraOutboxFailed,
    markLumoraNexteraOutboxSending,
} from "../../models/transaction/TransactionRepository";

type NexteraReceiverResult = {
    status:
        | "processed"
        | "duplicate"
        | "in_progress"
        | "failed";
    event_id?: string;
    transaction_id?: string;
    external_id?: string;
    error?: string;
};

type JsonRecord =
    Record<string, unknown>;

const RETRY_DELAY_MS =
    15_000;

const REQUEST_TIMEOUT_MS =
    8_000;

let drainPromise:
    Promise<void> | null =
        null;

let retryTimer:
    number | null =
        null;

function envValue(
    key: string,
): string {
    const environment =
        import.meta.env as
        Record<string, string | undefined>;

    return (
        environment[key]?.trim() ??
        ""
    );
}

function isConfigured(): boolean {
    return (
        envValue(
            "VITE_NEXTERA_SYNC_ENABLED",
        ) === "true" &&
        envValue(
            "VITE_NEXTERA_API_URL",
        ).length > 0 &&
        envValue(
            "VITE_NEXTERA_ANON_KEY",
        ).length > 0 &&
        envValue(
            "VITE_NEXTERA_CONNECTION_ID",
        ).length > 0 &&
        envValue(
            "VITE_NEXTERA_CONNECTION_SECRET",
        ).length > 0
    );
}

function asRecord(
    value: unknown,
): JsonRecord | null {
    if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(
            value,
        )
    ) {
        return null;
    }

    return value as JsonRecord;
}

function firstString(
    record: JsonRecord | null,
    keys: string[],
): string | undefined {
    if (!record) {
        return undefined;
    }

    for (const key of keys) {
        const value =
            record[key];

        if (
            typeof value === "string" &&
            value.trim()
        ) {
            return value.trim();
        }
    }

    return undefined;
}

function variantExternalId(
    line: SaleLine,
): string | undefined {
    if (!line.variant) {
        return undefined;
    }

    const variant =
        asRecord(
            line.variant,
        );

    const discoveredId =
        firstString(
            variant,
            [
                "id",
                "variantId",
                "externalId",
                "code",
                "sku",
            ],
        );

    if (discoveredId) {
        return discoveredId;
    }

    if (line.sku) {
        return line.sku;
    }

    return `variant:${line.productId}:${line.id}`;
}

function lineDiscountTotal(
    line: SaleLine,
): number {
    return (
        line.lineDiscountAmount +
        line.allocatedSaleDiscountAmount
    );
}

function mapLine(
    line: SaleLine,
) {
    return {
        external_line_item_id:
            line.id,

        external_product_id:
            line.productId,

        external_variation_id:
            variantExternalId(
                line,
            ),

        sku:
            line.sku,

        name:
            line.descriptionOverride ??
            line.productName,

        line_kind:
            line.kind,

        quantity:
            line.quantity,

        unit_price:
            line.unitPrice,

        subtotal:
            line.grossAmount,

        discount_total:
            lineDiscountTotal(
                line,
            ),

        tax_total:
            line.taxSnapshot
                ?.taxAmount ??
            0,

        total:
            line.netAmount,

        metadata: {
            product_name:
                line.productName,

            description_override:
                line.descriptionOverride,

            barcode:
                line.barcode,

            variant:
                line.variant,

            seller:
                line.seller,

            note:
                line.note,

            print_note_on_document:
                line.printNoteOnDocument,

            applied_promotions:
                line.appliedPromotions,

            tax_class:
                line.taxClass,

            tax_snapshot:
                line.taxSnapshot,

            return_source:
                line.returnSource,

            return_reason:
                line.returnReason,

            original_sale_id:
                line.originalSaleId,

            original_sale_number:
                line.originalSaleNumber,

            original_sale_line_id:
                line.originalSaleLineId,

            original_document_id:
                line.originalDocumentId,

            original_document_number:
                line.originalDocumentNumber,
        },
    };
}

function mapPaymentStatus(
    payment: Payment,
): string {
    switch (
        payment.status
    ) {
        case "approved":
            return "paid";

        case "refunded":
            return "refunded";

        case "declined":
            return "failed";

        case "cancelled":
            return "cancelled";

        default:
            return payment.status;
    }
}

function mapPayment(
    payment: Payment,
) {
    return {
        external_id:
            payment.id,

        payment_kind:
            payment.amount < 0
                ? "refund"
                : "payment",

        payment_method:
            payment.method,

        provider:
            payment.method ===
                "echo"
                ? "echo"
                : payment.method ===
                    "card_terminal"
                  ? "terminal"
                  : undefined,

        provider_reference:
            payment.providerReference ??
            payment.externalReference,

        status:
            mapPaymentStatus(
                payment,
            ),

        currency:
            "ILS",

        amount:
            payment.amount,

        tendered_amount:
            payment.tenderedAmount,

        change_amount:
            payment.changeAmount,

        paid_at:
            payment.createdAt,

        source_created_at:
            payment.createdAt,

        source_updated_at:
            payment.createdAt,

        /*
         * Card brand/last4 deliberately stay out of the replication
         * payload. V1 sends no cardholder/card-number data.
         */
        metadata: {
            lumora_payment_status:
                payment.status,
        },
    };
}

function mapDocumentStatus(
    document: SaleDocument,
): string {
    switch (
        document.status
    ) {
        case "issued_original":
        case "reissued_copy":
            return "issued";

        case "voided":
            return "voided";

        default:
            return document.status;
    }
}

function mapDocument(
    document: SaleDocument,
    sale: Sale,
    paymentExternalIds: string[],
) {
    return {
        external_id:
            document.id,

        external_number:
            document.number,

        document_type:
            document.type,

        status:
            mapDocumentStatus(
                document,
            ),

        currency:
            "ILS",

        subtotal:
            sale.subtotal,

        discount_total:
            sale.discount,

        tax_total:
            sale.tax,

        total:
            sale.total,

        issued_at:
            document.originalIssueAt ??
            document.createdAt,

        source_created_at:
            document.createdAt,

        source_updated_at:
            document.createdAt,

        customer_snapshot: {
            ...sale.customer,
        },

        items:
            sale.lines.map(
                mapLine,
            ),

        payment_external_ids:
            paymentExternalIds,

        metadata: {
            type_code:
                document.typeCode,

            store_code:
                document.storeCode,

            register_code:
                document.registerCode,

            running_number:
                document.runningNumber,

            original_document_id:
                document.originalDocumentId,

            original_document_number:
                document.originalDocumentNumber,

            original_issue_at:
                document.originalIssueAt,

            output_count:
                document.outputCount,
        },
    };
}

function buildPayload(
    sale: Sale,
    documents: SaleDocument[],
) {
    const replicatedPayments =
        sale.payments.filter(
            (payment) =>
                payment.status ===
                    "approved" ||
                payment.status ===
                    "refunded",
        );

    const paymentExternalIds =
        replicatedPayments.map(
            (payment) =>
                payment.id,
        );

    return {
        schema_version:
            "lumora.transaction.v1",

        transaction: {
            external_id:
                sale.id,

            external_number:
                sale.number,

            transaction_type:
                sale.transactionType,

            status:
                sale.status,

            currency:
                "ILS",

            subtotal:
                sale.subtotal,

            discount_total:
                sale.discount,

            tax_total:
                sale.tax,

            total:
                sale.total,

            customer_snapshot: {
                ...sale.customer,
            },

            source_created_at:
                sale.createdAt,

            source_updated_at:
                sale.completedAt ??
                sale.createdAt,

            metadata: {
                shift_id:
                    sale.shiftId,

                coupon:
                    sale.coupon,

                document_note:
                    sale.documentNote,

                print_document_note:
                    sale.printDocumentNote,

                cancellation_fee_amount:
                    sale.cancellationFeeAmount,

                store_credit_obligo:
                    sale.storeCreditObligo,

                inventory_mutation:
                    false,
            },
        },

        items:
            sale.lines.map(
                mapLine,
            ),

        payments:
            replicatedPayments.map(
                mapPayment,
            ),

        documents:
            documents.map(
                (document) =>
                    mapDocument(
                        document,
                        sale,
                        paymentExternalIds,
                    ),
            ),
    };
}

function scheduleRetry(): void {
    if (
        typeof window ===
        "undefined"
    ) {
        return;
    }

    if (
        retryTimer !== null
    ) {
        return;
    }

    retryTimer =
        window.setTimeout(
            () => {
                retryTimer =
                    null;

                void flushLumoraNexteraOutboxToNextera();
            },
            RETRY_DELAY_MS,
        );
}

async function deliverEvent(
    event:
        Awaited<
            ReturnType<
                typeof getPendingLumoraNexteraOutbox
            >
        >[number],
): Promise<void> {
    await markLumoraNexteraOutboxSending(
        event.id,
    );

    const controller =
        new AbortController();

    const timeout =
        window.setTimeout(
            () =>
                controller.abort(),
            REQUEST_TIMEOUT_MS,
        );

    try {
        const apiUrl =
            envValue(
                "VITE_NEXTERA_API_URL",
            ).replace(
                /\/+$/,
                "",
            );

        const anonKey =
            envValue(
                "VITE_NEXTERA_ANON_KEY",
            );

        const connectionId =
            envValue(
                "VITE_NEXTERA_CONNECTION_ID",
            );

        const connectionSecret =
            envValue(
                "VITE_NEXTERA_CONNECTION_SECRET",
            );

        const response =
            await fetch(
                `${apiUrl}/rest/v1/rpc/receive_lumora_ingress_v1`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        apikey:
                            anonKey,

                        Authorization:
                            `Bearer ${anonKey}`,
                    },

                    body:
                        JSON.stringify({
                            requested_connection_id:
                                connectionId,

                            requested_secret:
                                connectionSecret,

                            requested_idempotency_key:
                                event.idempotencyKey,

                            requested_payload:
                                buildPayload(
                                    event.saleSnapshot,
                                    event.documentSnapshots ??
                                        [],
                                ),
                        }),

                    signal:
                        controller.signal,
                },
            );

        const responseText =
            await response.text();

        if (!response.ok) {
            throw new Error(
                `Nextera HTTP ${response.status}: ${responseText.slice(0, 300)}`,
            );
        }

        const result =
            JSON.parse(
                responseText,
            ) as NexteraReceiverResult;

        if (
            result.status ===
                "processed" ||
            result.status ===
                "duplicate"
        ) {
            await markLumoraNexteraOutboxDelivered(
                event.id,
            );

            console.info(
                "LUMORA_NEXTERA_DELIVERED",
                {
                    saleId:
                        event.saleId,

                    status:
                        result.status,
                },
            );

            return;
        }

        if (
            result.status ===
            "in_progress"
        ) {
            throw new Error(
                "Nextera receiver reports event in progress.",
            );
        }

        throw new Error(
            result.error ??
                `Nextera receiver status: ${result.status}`,
        );
    }
    finally {
        window.clearTimeout(
            timeout,
        );
    }
}

async function drainOnce():
Promise<void> {
    if (!isConfigured()) {
        return;
    }

    const events =
        await getPendingLumoraNexteraOutbox();

    let hadFailure =
        false;

    for (const event of events) {
        try {
            await deliverEvent(
                event,
            );
        }
        catch (error) {
            hadFailure =
                true;

            const message =
                error instanceof Error
                    ? error.message
                    : String(
                          error,
                      );

            await markLumoraNexteraOutboxFailed(
                event.id,
                message,
            );

            console.warn(
                "LUMORA_NEXTERA_DELIVERY_FAILED",
                {
                    saleId:
                        event.saleId,

                    error:
                        message,
                },
            );
        }
    }

    if (hadFailure) {
        scheduleRetry();
    }
}

export function flushLumoraNexteraOutboxToNextera():
Promise<void> {
    if (drainPromise) {
        return drainPromise;
    }

    drainPromise =
        drainOnce()
            .catch(
                (error) => {
                    console.warn(
                        "LUMORA_NEXTERA_DRAIN_FAILED",
                        error,
                    );

                    scheduleRetry();
                },
            )
            .finally(
                () => {
                    drainPromise =
                        null;
                },
            );

    return drainPromise;
}

if (
    typeof window !==
    "undefined"
) {
    window.addEventListener(
        "online",
        () => {
            void flushLumoraNexteraOutboxToNextera();
        },
    );

    window.setTimeout(
        () => {
            void flushLumoraNexteraOutboxToNextera();
        },
        1_000,
    );
}