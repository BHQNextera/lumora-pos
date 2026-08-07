export type PaymentMethodCode =
    | "cash"
    | "card_terminal"
    | "echo"
    | "bit"
    | "paybox"
    | "bank_transfer"
    | "cheque"
    | "external_credit"
    | "credit_voucher"
    | "gift_card"
    | "custom";

export type PaymentMethodKind =
    | "cash"
    | "integrated"
    | "recorded"
    | "stored_value";

export type PaymentMethod = {
    code: PaymentMethodCode;
    name: string;
    kind: PaymentMethodKind;

    isActive: boolean;
    sortOrder: number;

    requiresExternalReference: boolean;
    allowsPartialPayment: boolean;
    allowsOverpayment: boolean;
    returnsChange: boolean;
};

export const defaultPaymentMethods: PaymentMethod[] = [
    {
        code: "cash",
        name: "מזומן",
        kind: "cash",
        isActive: true,
        sortOrder: 10,
        requiresExternalReference: false,
        allowsPartialPayment: true,
        allowsOverpayment: true,
        returnsChange: true,
    },
    {
        code: "card_terminal",
        name: "אשראי",
        kind: "integrated",
        isActive: true,
        sortOrder: 20,
        requiresExternalReference: true,
        allowsPartialPayment: true,
        allowsOverpayment: false,
        returnsChange: false,
    },
    {
        code: "echo",
        name: "Echo",
        kind: "integrated",
        isActive: true,
        sortOrder: 30,
        requiresExternalReference: true,
        allowsPartialPayment: true,
        allowsOverpayment: false,
        returnsChange: false,
    },
    {
        code: "bit",
        name: "Bit",
        kind: "recorded",
        isActive: false,
        sortOrder: 40,
        requiresExternalReference: false,
        allowsPartialPayment: true,
        allowsOverpayment: false,
        returnsChange: false,
    },
    {
        code: "paybox",
        name: "PayBox",
        kind: "recorded",
        isActive: false,
        sortOrder: 50,
        requiresExternalReference: false,
        allowsPartialPayment: true,
        allowsOverpayment: false,
        returnsChange: false,
    },
    {
        code: "bank_transfer",
        name: "העברה בנקאית",
        kind: "recorded",
        isActive: false,
        sortOrder: 60,
        requiresExternalReference: false,
        allowsPartialPayment: true,
        allowsOverpayment: false,
        returnsChange: false,
    },
    {
        code: "cheque",
        name: "המחאה",
        kind: "recorded",
        isActive: false,
        sortOrder: 70,
        requiresExternalReference: false,
        allowsPartialPayment: true,
        allowsOverpayment: false,
        returnsChange: false,
    },
    {
        code: "external_credit",
        name: "אשראי חיצוני",
        kind: "recorded",
        isActive: false,
        sortOrder: 80,
        requiresExternalReference: false,
        allowsPartialPayment: true,
        allowsOverpayment: false,
        returnsChange: false,
    },
];