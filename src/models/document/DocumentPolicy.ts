import type { DocumentType } from "./Document";

export type DocumentTypeDefinition = {
    type: DocumentType;
    code: string;
};

export type DocumentRuleContext = {
    transactionType: "sale" | "return" | "exchange";
    total: number;
    hasPositiveLines: boolean;
    hasNegativeLines: boolean;
};

export type DocumentRule = {
    id: string;
    documentTypes: DocumentType[];
    matches: (context: DocumentRuleContext) => boolean;
};

export type DocumentPolicy = {
    rules: DocumentRule[];
    documentTypes: Record<DocumentType, DocumentTypeDefinition>;
};

export const currentRegister = {
    storeCode: "01",
    registerCode: "02",
};

// Current tenant profile. Rules preserve today's behavior while the engine
// supports zero, one or multiple document types per transaction.
export const documentPolicy: DocumentPolicy = {
    rules: [
        {
            id: "current-positive-transaction",
            documentTypes: ["tax_invoice_receipt"],
            matches: (context) => context.total > 0,
        },
        {
            id: "current-negative-transaction",
            documentTypes: ["tax_credit_invoice"],
            matches: (context) => context.total < 0,
        },
    ],

    documentTypes: {
        tax_invoice_receipt: { type: "tax_invoice_receipt", code: "01" },
        receipt: { type: "receipt", code: "02" },
        tax_credit_invoice: { type: "tax_credit_invoice", code: "03" },
        credit_receipt: { type: "credit_receipt", code: "04" },
        exchange_note: { type: "exchange_note", code: "05" },
        credit_voucher: { type: "credit_voucher", code: "06" },
        gift_card_receipt: { type: "gift_card_receipt", code: "07" },
    },
};

export function resolveDocumentTypes(
    context: DocumentRuleContext,
    policy: DocumentPolicy = documentPolicy,
): DocumentType[] {
    const resolved = policy.rules.flatMap(
        (rule) => rule.matches(context) ? rule.documentTypes : [],
    );

    return Array.from(new Set(resolved));
}
