import { flushLumoraNexteraOutboxToNextera } from "../../integrations/nextera/LumoraNexteraSender";
import { getDocumentsForTransaction } from "../document/DocumentRepository";
import {
    getReturnPolicy,
    isWithinReturnWindow,
} from "../../config/ReturnPolicy";
import {
    deriveTaxSnapshotFromOriginal,
    resolveSaleLineTax,
} from "../tax/TaxPolicy";
import type {
    ProductTaxClass,
} from "../../types/product";
import {
    getCatalogProducts,
} from "../catalog/CatalogRepository";
import {
    createAccountingDocuments,
} from "../document/DocumentFactory";

import {
    flushDocumentPersistence,
} from "../document/DocumentRepository";

import {
    flushDocumentNumberPersistence,
} from "../document/DocumentNumbering";
import type {
    Payment,
} from "../Payment";
import {
    flushReturnPersistence,
    saveReturn,
} from "../transaction/ReturnRepository";
import {
    flushTransactionPersistence,
    getTransaction,
    saveSale,
    enqueueLumoraNexteraSale,
    flushLumoraNexteraOutboxPersistence,
} from "../transaction/TransactionRepository";
import type {
    ReturnLine,
} from "./Return";
import {
    createReturn,
} from "./ReturnEngine";

import type {
    AppliedSaleCoupon,
    Sale,
    TransactionType,
} from "./Sale";
import type {
    SaleLine,
} from "./SaleLine";

import {
    allocateSaleNumber,
    flushSaleNumberPersistence,
    peekNextSaleNumber,
} from "./SaleNumbering";


function roundMoney(
    value: number,
) {
    return (
        Math.round(
            (value + Number.EPSILON) *
            100,
        ) / 100
    );
}

function getCatalogTaxClass(
    productId: string,
):
ProductTaxClass {
    const product =
        getCatalogProducts().find(
            (item) =>
                item.id ===
                productId,
        );

    return (
        product?.taxClass ??
        "standard"
    );
}

function getOriginalSaleLine(
    line:
        SaleLine,
) {
    if (
        !line.originalSaleId ||
        !line.originalSaleLineId
    ) {
        return undefined;
    }

    return getTransaction(
        line.originalSaleId,
    )?.lines.find(
        (item) =>
            item.id ===
            line.originalSaleLineId,
    );
}

function allocateCouponByLine(
    lines:
        SaleLine[],
    couponDiscount:
        number,
) {
    const allocations =
        new Map<
            string,
            number
        >();

    if (
        couponDiscount <= 0
    ) {
        return allocations;
    }

    const eligible =
        lines.filter(
            (line) =>
                line.kind ===
                    "sale" &&
                line.netAmount >
                    0.001,
        );

    const base =
        eligible.reduce(
            (sum, line) =>
                sum +
                line.netAmount,
            0,
        );

    if (
        base <= 0.001
    ) {
        return allocations;
    }

    let remaining =
        roundMoney(
            couponDiscount,
        );

    eligible.forEach(
        (
            line,
            index,
        ) => {
            const isLast =
                index ===
                eligible.length -
                    1;

            const allocation =
                isLast
                    ? remaining
                    : roundMoney(
                          Math.min(
                              remaining,
                              couponDiscount *
                                  (
                                      line.netAmount /
                                      base
                                  ),
                          ),
                      );

            allocations.set(
                line.id,
                allocation,
            );

            remaining =
                roundMoney(
                    remaining -
                    allocation,
                );
        },
    );

    return allocations;
}

function captureTaxSnapshots(
    lines:
        SaleLine[],
    couponDiscount:
        number,
) {
    const couponAllocations =
        allocateCouponByLine(
            lines,
            couponDiscount,
        );

    return lines.map(
        (line) => {
            const couponAllocation =
                couponAllocations.get(
                    line.id,
                ) ??
                0;

            const taxableAmount =
                roundMoney(
                    line.netAmount -
                    (
                        line.kind ===
                            "sale"
                            ? couponAllocation
                            : 0
                    ),
                );

            const originalLine =
                line.kind ===
                    "return"
                    ? getOriginalSaleLine(
                          line,
                      )
                    : undefined;

            const taxSnapshot =
                originalLine
                    ?.taxSnapshot
                    ? deriveTaxSnapshotFromOriginal(
                          taxableAmount,
                          originalLine
                              .taxSnapshot,
                      )
                    : resolveSaleLineTax(
                          taxableAmount,
                          line.taxClass ??
                              originalLine
                                  ?.taxClass ??
                              getCatalogTaxClass(
                                  line.productId,
                              ),
                      );

            return {
                ...line,

                taxClass:
                    taxSnapshot
                        .taxClass,

                taxSnapshot,
            };
        },
    );
}

function determineTransactionType(
    lines: SaleLine[],
): TransactionType {
    const hasSales =
        lines.some(
            (line) =>
                line.kind === "sale",
        );

    const hasReturns =
        lines.some(
            (line) =>
                line.kind === "return",
        );

    if (
        hasSales &&
        hasReturns
    ) {
        return "exchange";
    }

    if (hasReturns) {
        return "return";
    }

    return "sale";
}

function validateReturnPolicyBeforeCompletion(
    lines:
        SaleLine[],
    payments:
        Payment[],
    transactionType:
        TransactionType,
) {
    const policy =
        getReturnPolicy();

    if (
        transactionType ===
            "return" &&
        !policy.returnsEnabled
    ) {
        throw new Error(
            "RETURN_DISABLED",
        );
    }

    if (
        transactionType ===
            "exchange" &&
        !policy.exchangesEnabled
    ) {
        throw new Error(
            "EXCHANGE_DISABLED",
        );
    }

    const returnLines =
        lines.filter(
            (line) =>
                line.kind ===
                "return",
        );

    const hasWithoutDocument =
        returnLines.some(
            (line) =>
                line.returnSource ===
                "without_document",
        );

    if (
        hasWithoutDocument &&
        !policy
            .allowReturnWithoutDocument
    ) {
        throw new Error(
            "RETURN_WITHOUT_DOCUMENT_DISABLED",
        );
    }

    for (
        const line
        of returnLines
    ) {
        if (
            !line.originalSaleId
        ) {
            continue;
        }

        const originalSale =
            getTransaction(
                line.originalSaleId,
            );

        if (
            originalSale &&
            !isWithinReturnWindow(
                originalSale.completedAt,
                originalSale.createdAt,
                policy,
            )
        ) {
            throw new Error(
                "RETURN_WINDOW_EXPIRED",
            );
        }
    }

    if (
        transactionType !==
            "return" ||
        !hasWithoutDocument ||
        policy
            .withoutDocumentRefundMode ===
            "any_available"
    ) {
        return;
    }

    const allowed =
        policy
            .withoutDocumentRefundMode ===
            "credit_voucher_only"
            ? new Set([
                  "credit_voucher",
              ])
            : new Set([
                  "cash",
                  "credit_voucher",
              ]);

    const hasBlockedMethod =
        payments.some(
            (payment) =>
                !allowed.has(
                    payment.method,
                ),
        );

    if (
        hasBlockedMethod
    ) {
        throw new Error(
            "RETURN_WITHOUT_DOCUMENT_REFUND_METHOD_NOT_ALLOWED",
        );
    }
}

function registerLinkedReturns(
    transaction: Sale,
) {
    const linkedReturnLines =
        transaction.lines.filter(
            (line) =>
                line.kind ===
                "return" &&
                Boolean(
                    line.originalSaleId,
                ) &&
                Boolean(
                    line.originalSaleLineId,
                ),
        );

    if (
        linkedReturnLines.length ===
        0
    ) {
        return;
    }

    const groupedByOriginalSale =
        new Map<
            string,
            SaleLine[]
        >();

    for (
        const line of
        linkedReturnLines
    ) {
        const originalSaleId =
            line.originalSaleId;

        if (!originalSaleId) {
            continue;
        }

        const current =
            groupedByOriginalSale.get(
                originalSaleId,
            ) ?? [];

        current.push(line);

        groupedByOriginalSale.set(
            originalSaleId,
            current,
        );
    }

    for (
        const [
            originalSaleId,
            lines,
        ] of
        groupedByOriginalSale
    ) {
        const originalSale =
            getTransaction(
                originalSaleId,
            );

        if (!originalSale) {
            continue;
        }

        const returnLines:
            ReturnLine[] =
            lines.flatMap(
                (line) => {
                    if (
                        !line.originalSaleLineId
                    ) {
                        return [];
                    }

                    const originalLine =
                        originalSale.lines.find(
                            (item) =>
                                item.id ===
                                line.originalSaleLineId,
                        );

                    if (!originalLine) {
                        return [];
                    }

                    const quantity =
                        line.quantity;

                    const grossAmount =
                        originalLine.unitPrice *
                        quantity;

                    const netAmount =
                        Math.abs(
                            line.netAmount,
                        );

                    const discountAmount =
                        Math.max(
                            0,
                            grossAmount -
                            netAmount,
                        );

                    return [
                        {
                            saleLineId:
                                originalLine.id,

                            quantity,

                            unitPrice:
                                originalLine.unitPrice,

                            grossAmount,

                            discountAmount,

                            netAmount,

                            reason:
                                "other",
                        },
                    ];
                },
            );

        if (
            returnLines.length ===
            0
        ) {
            continue;
        }

        const returnDocument =
            createReturn(
                originalSale,
                returnLines,
            );

        saveReturn(
            returnDocument,
        );
    }
}

export type CompleteSaleOptions = {
    transactionId?: string;
    transactionNumber?: string;
    shiftId?: string;
    coupon?: AppliedSaleCoupon;
    documentNote?: string;
    printDocumentNote?: boolean;
    applyCancellationFee?: boolean;
    storeCreditObligo?: Sale["storeCreditObligo"];
    transactionDiscountAuthorization?: Sale["transactionDiscountAuthorization"];

    returnRefundAuthorization?: Sale["returnRefundAuthorization"];
};

export async function completeSale(
    lines: SaleLine[],
    payments: Payment[],
    customer: Sale["customer"] = {
        name: "לקוח מזדמן",
    },
    options: CompleteSaleOptions = {},
): Promise<Sale> {
    const now =
        new Date().toISOString();

    const transactionType =
        determineTransactionType(
            lines,
        );

    validateReturnPolicyBeforeCompletion(
        lines,
        payments,
        transactionType,
    );

    const returnPolicy =
        getReturnPolicy();

    const subtotal =
        roundMoney(
            lines.reduce(
                (sum, line) =>
                    sum +
                    line.grossAmount,
                0,
            ),
        );

    const lineDiscount =
        roundMoney(
            lines.reduce(
                (sum, line) =>
                    sum +
                    line.lineDiscountAmount +
                    line.allocatedSaleDiscountAmount,
                0,
            ),
        );

    const preCouponTotal =
        roundMoney(
            lines.reduce(
                (sum, line) =>
                    sum +
                    line.netAmount,
                0,
            ),
        );

    const couponDiscount =
        options.coupon
            ? roundMoney(
                Math.min(
                    Math.max(
                        0,
                        preCouponTotal,
                    ),
                    Math.max(
                        0,
                        options.coupon
                            .discountApplied,
                    ),
                ),
            )
            : 0;

    const cancellationFeeAmount =
        options.applyCancellationFee &&
        preCouponTotal < 0 &&
        returnPolicy
            .cancellationFeePercent >
            0 &&
        returnPolicy
            .cancellationFeeCap >
            0
            ? roundMoney(
                  Math.min(
                      Math.abs(
                          preCouponTotal,
                      ) *
                          (
                              returnPolicy
                                  .cancellationFeePercent /
                              100
                          ),
                      returnPolicy
                          .cancellationFeeCap,
                  ),
              )
            : 0;

    const total =
        roundMoney(
            preCouponTotal -
            couponDiscount +
            cancellationFeeAmount,
        );

    const completedLines =
        captureTaxSnapshots(
            lines,
            couponDiscount,
        );

    const cancellationFeeTax =
        cancellationFeeAmount > 0
            ? resolveSaleLineTax(
                  cancellationFeeAmount,
                  "standard",
              ).taxAmount
            : 0;

    const tax =
        roundMoney(
            completedLines.reduce(
                (sum, line) =>
                    sum +
                    (
                        line.taxSnapshot
                            ?.taxAmount ??
                        0
                    ),
                0,
            ) +
            cancellationFeeTax,
        );

    const sale: Sale = {
        id:
            options.transactionId ??
            crypto.randomUUID(),

        number:
            options.transactionNumber ??
            allocateSaleNumber(),

        status:
            "completed",

        transactionType,

        shiftId:
            options.shiftId,

        customer,

        lines:
            completedLines,

        subtotal,
        discount:
            roundMoney(
                lineDiscount +
                couponDiscount,
            ),

        transactionDiscountAuthorization:
            options.transactionDiscountAuthorization,


        returnRefundAuthorization:
            options.returnRefundAuthorization,
coupon:
            options.coupon
                ? {
                    ...options.coupon,
                    discountApplied:
                        couponDiscount,
                }
                : undefined,

        documentNote:
            options.documentNote?.trim() ||
            undefined,

        printDocumentNote:
            options.documentNote?.trim() &&
            options.printDocumentNote
                ? true
                : undefined,

        cancellationFeeAmount:
            cancellationFeeAmount > 0
                ? cancellationFeeAmount
                : undefined,

        tax,

        total,

        payments,

        storeCreditObligo:
            options.storeCreditObligo
                ? {
                      ...options.storeCreditObligo,
                  }
                : undefined,
        createdAt: now,
        completedAt: now,
    };

    saveSale(sale);

    registerLinkedReturns(
        sale,
    );

    createAccountingDocuments(
        sale,
    );

    // Persist allocated numbers first.
    // If the runtime is interrupted mid-save, a skipped
    // number is safer than reusing an already allocated one.
    await Promise.all([
        flushSaleNumberPersistence(),
        flushDocumentNumberPersistence(),
    ]);

    // The sale is not considered complete until its
    // transaction, linked returns and accounting documents
    // are durable.
    await Promise.all([
        flushTransactionPersistence(),
        flushReturnPersistence(),
        flushDocumentPersistence(),
    ]);

    /*
     * LUMORA_NEXTERA_OUTBOX_V1
     *
     * At this point the commercial transaction and its accounting
     * documents are already durable locally.
     *
     * Outbox persistence is best-effort from the sale completion
     * perspective: a Nextera replication problem must never roll back
     * or block a completed POS transaction.
     */
    try {
        enqueueLumoraNexteraSale(
            sale,
            getDocumentsForTransaction(
                sale.id,
            ),
        );

        await flushLumoraNexteraOutboxPersistence();

        /*
         * Network delivery is deliberately detached from sale
         * completion. A Nextera outage cannot make the POS fail.
         */
        void flushLumoraNexteraOutboxToNextera();
    }
    catch (error) {
        console.error(
            "LUMORA_NEXTERA_OUTBOX_PERSISTENCE_FAILED",
            {
                saleId:
                    sale.id,
                error,
            },
        );
    }

    return sale;
}

export function getNextSaleNumber() {
    return peekNextSaleNumber();
}
