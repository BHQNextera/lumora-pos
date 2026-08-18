export type ReturnReason =
    | "customer_regret"
    | "damaged"
    | "wrong_item"
    | "expired"
    | "service"
    | "other";

export type ReturnLine = {
    saleLineId: string;

    quantity: number;

    unitPrice: number;

    grossAmount: number;

    discountAmount: number;

    netAmount: number;

    reason: ReturnReason;

    note?: string;
};

export type ReturnDocument = {
    id: string;

    originalSaleId: string;

    lines: ReturnLine[];

    subtotal: number;

    discount: number;

    tax: number;

    total: number;

    createdAt: string;

    createdBy?: string;
};