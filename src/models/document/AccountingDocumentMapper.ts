import type {
    DocumentCopyType,
    SaleDocument,
} from "./Document";
import type {
    AccountingDocumentData,
} from "./AccountingDocumentData";
import type {
    Payment,
} from "../Payment";
import type {
    Sale,
} from "../sale/Sale";

function getDocumentTitle(
    document: SaleDocument | null,
): string {
    switch (document?.type) {
        case "tax_invoice_receipt":
            return "חשבונית מס / קבלה";

        case "receipt":
            return "קבלה";

        case "tax_credit_invoice":
            return "חשבונית מס זיכוי";

        case "credit_receipt":
            return "קבלת זיכוי";

        case "exchange_note":
            return "פתק החלפה";

        case "credit_voucher":
            return "שובר זיכוי";

        case "gift_card_receipt":
            return "קבלת Gift Card";

        default:
            return "מסמך עסקה";
    }
}

function getPaymentLabel(
    payment: Payment,
): string {
    switch (payment.method) {
        case "cash":
            return "מזומן";

        case "card_terminal":
            return "כרטיס אשראי";

        case "echo":
            return "Echo";

        case "credit_voucher":
            return "שובר זיכוי";

        case "gift_card":
            return "Gift Card";

        case "store_credit":
            return "זיכוי לקוח";

        case "bank_transfer":
            return "העברה בנקאית";

        case "bit":
            return "Bit";

        case "paybox":
            return "PayBox";

        case "cheque":
            return "המחאה";

        case "external_credit":
            return "אשראי חיצוני";

        default:
            return payment.method;
    }
}

function getWholeDocumentSource(
    sale: Sale,
) {
    if (
        sale.transactionType !==
        "return"
    ) {
        return undefined;
    }

    if (
        sale.lines.length === 0 ||
        !sale.lines.every(
            (line) =>
                line.kind === "return",
        )
    ) {
        return undefined;
    }

    const sourcedLines =
        sale.lines.filter(
            (line) =>
                Boolean(
                    line.originalDocumentNumber,
                ),
        );

    if (
        sourcedLines.length !==
        sale.lines.length
    ) {
        return undefined;
    }

    const sourceNumbers =
        Array.from(
            new Set(
                sourcedLines.map(
                    (line) =>
                        line.originalDocumentNumber!,
                ),
            ),
        );

    if (
        sourceNumbers.length !== 1
    ) {
        return undefined;
    }

    const sourceLine =
        sourcedLines[0];

    return {
        id:
            sourceLine.originalDocumentId,

        number:
            sourceNumbers[0],
    };
}

export function createAccountingDocumentData(
    sale: Sale,
    document: SaleDocument | null,
    copyType: DocumentCopyType,
): AccountingDocumentData {
    const issuedAt =
        document?.originalIssueAt ??
        sale.completedAt ??
        sale.createdAt;

    const beforeTax =
        sale.total - sale.tax;

    return {
        identity: {
            documentId:
                document?.id,

            type:
                document?.type,

            title:
                getDocumentTitle(
                    document,
                ),

            number:
                document?.number ??
                sale.number,

            copyType,

            transactionId:
                sale.id,

            transactionNumber:
                sale.number,

            storeCode:
                document?.storeCode,

            registerCode:
                document?.registerCode,

            issuedAt,

            originalDocument:
                getWholeDocumentSource(
                    sale,
                ),
        },

        business: {
            name:
                "Coffee Time",

            branchName:
                "סניף רחובות",
        },

        customer: {
            id:
                sale.customer.id,

            name:
                sale.customer.name,

            phone:
                sale.customer.phone,
        },

        lines:
            sale.lines.map(
                (line) => {
                    const lineDiscountAmount =
                        line.lineDiscountAmount;

                    const allocatedSaleDiscountAmount =
                        line.allocatedSaleDiscountAmount;

                    return {
                        id:
                            line.id,

                        kind:
                            line.kind,

                        productName:
                            line.productName,

                        description:
                            line.descriptionOverride,

                        sku:
                            line.sku,

                        barcode:
                            line.barcode,

                        quantity:
                            line.quantity,

                        unitPrice:
                            line.unitPrice,

                        grossAmount:
                            line.grossAmount,

                        lineDiscountAmount,

                        allocatedSaleDiscountAmount,

                        discountAmount:
                            lineDiscountAmount +
                            allocatedSaleDiscountAmount,

                        netAmount:
                            line.netAmount,

                        promotionNames:
                            line.appliedPromotions?.map(
                                (
                                    promotion,
                                ) =>
                                    promotion.name,
                            ) ?? [],

                        sourceDocument:
                            line.kind ===
                                "return" &&
                            line.originalDocumentNumber
                                ? {
                                    id:
                                        line.originalDocumentId,

                                    number:
                                        line.originalDocumentNumber,
                                }
                                : undefined,
                    };
                },
            ),

        totals: {
            subtotal:
                sale.subtotal,

            discount:
                sale.discount,

            beforeTax,

            tax:
                sale.tax,

            total:
                sale.total,
        },

        payments:
            sale.payments.map(
                (payment) => ({
                    id:
                        payment.id,

                    method:
                        payment.method,

                    label:
                        getPaymentLabel(
                            payment,
                        ),

                    amount:
                        payment.amount,

                    tenderedAmount:
                        payment.tenderedAmount,

                    changeAmount:
                        payment.changeAmount,

                    externalReference:
                        payment.externalReference,

                    providerReference:
                        payment.providerReference,
                }),
            ),

        barcode: {
            value:
                document?.id ??
                sale.id,

            displayValue:
                document?.number ??
                sale.number,
        },

        legalLines: [],
    };
}