import {
    getActiveBusinessConfiguration,
} from "../../config/ActiveBusinessConfiguration";
import {
    getDocumentSettings,
} from "../../config/DocumentSettings";
import type {
    DocumentType,
} from "./Document";

export type DocumentTypeDefinition = {
    type: DocumentType;
    code: string;
};

export type DocumentRuleContext = {
    transactionType:
    | "sale"
    | "return"
    | "exchange";

    total: number;

    hasPositiveLines: boolean;
    hasNegativeLines: boolean;

    isStoreCreditOnly: boolean;
};

export type DocumentRule = {
    id: string;

    documentTypes:
    DocumentType[];

    matches: (
        context: DocumentRuleContext,
    ) => boolean;
};

export type DocumentPolicy = {
    rules:
    DocumentRule[];

    documentTypes:
    Record<
        DocumentType,
        DocumentTypeDefinition
    >;
};

const activeBusinessConfiguration =
    getActiveBusinessConfiguration();

export const currentRegister = {
    storeCode:
        activeBusinessConfiguration.storeCode,

    registerCode:
        activeBusinessConfiguration.registerCode,
};

const isPositive = (
    value: number,
) =>
    value > 0.001;

const isNegative = (
    value: number,
) =>
    value < -0.001;

const isZero = (
    value: number,
) =>
    Math.abs(value) <= 0.001;

/*
 * Current tenant profile.
 *
 * IMPORTANT:
 * These rules are business configuration,
 * not universal Lumora behavior.
 *
 * Current locked behavior:
 * - Sale -> Tax Invoice / Receipt
 * - Return -> Tax Credit Invoice
 * - Positive exchange -> current sales document
 * - Negative exchange -> current credit document
 *
 * Zero-balance exchange is intentionally
 * left without an accounting document type
 * until the tenant policy is explicitly
 * configured.
 *
 * The completed commercial transaction
 * itself is still persisted.
 */
export const documentPolicy:
    DocumentPolicy = {
    rules: [
        {
            id:
                "store-credit-sale",

            documentTypes: [
                "tax_invoice",
            ],

            matches: (
                context,
            ) =>
                context.transactionType ===
                "sale" &&
                context.isStoreCreditOnly &&
                isPositive(
                    context.total,
                ),
        },

        {
            id:
                "current-sale",

            documentTypes: [
                "tax_invoice_receipt",
            ],

            matches: (
                context,
            ) =>
                context.transactionType ===
                "sale" &&
                !context.isStoreCreditOnly &&
                isPositive(
                    context.total,
                ),
        },

        {
            id:
                "current-return",

            documentTypes: [
                "tax_credit_invoice",
            ],

            matches: (
                context,
            ) =>
                context.transactionType ===
                "return" &&
                isNegative(
                    context.total,
                ),
        },

        {
            id:
                "current-exchange-positive",

            documentTypes: [
                "tax_invoice_receipt",
            ],

            matches: (
                context,
            ) =>
                context.transactionType ===
                "exchange" &&
                context.hasPositiveLines &&
                context.hasNegativeLines &&
                isPositive(
                    context.total,
                ),
        },

        {
            id:
                "current-exchange-negative",

            documentTypes: [
                "tax_credit_invoice",
            ],

            matches: (
                context,
            ) =>
                context.transactionType ===
                "exchange" &&
                context.hasPositiveLines &&
                context.hasNegativeLines &&
                isNegative(
                    context.total,
                ),
        },

        {
            id:
                "current-exchange-zero",

            documentTypes: [],

            matches: (
                context,
            ) =>
                context.transactionType ===
                "exchange" &&
                context.hasPositiveLines &&
                context.hasNegativeLines &&
                isZero(
                    context.total,
                ),
        },
    ],

    documentTypes: {
        tax_invoice: {
            type:
                "tax_invoice",
            code:
                "08",
        },

        tax_invoice_receipt: {
            type:
                "tax_invoice_receipt",
            code:
                "01",
        },

        receipt: {
            type:
                "receipt",
            code:
                "02",
        },

        tax_credit_invoice: {
            type:
                "tax_credit_invoice",
            code:
                "03",
        },

        credit_receipt: {
            type:
                "credit_receipt",
            code:
                "04",
        },

        exchange_note: {
            type:
                "exchange_note",
            code:
                "05",
        },

        credit_voucher: {
            type:
                "credit_voucher",
            code:
                "06",
        },

        gift_card_receipt: {
            type:
                "gift_card_receipt",
            code:
                "07",
        },
    },
};

export function resolveDocumentTypes(
    context:
        DocumentRuleContext,

    policy?:
        DocumentPolicy,
): DocumentType[] {
    const activePolicy =
        policy ??
        documentPolicy;

    const resolved =
        activePolicy.rules.flatMap(
            (rule) =>
                rule.matches(
                    context,
                )
                    ? rule.documentTypes
                    : [],
        );

    if (
        !policy &&
        context.transactionType ===
            "exchange" &&
        context.hasPositiveLines &&
        context.hasNegativeLines &&
        isZero(
            context.total,
        )
    ) {
        resolved.push(
            getDocumentSettings()
                .zeroBalanceExchangeDocument,
        );
    }

    return Array.from(
        new Set(
            resolved,
        ),
    );
}
