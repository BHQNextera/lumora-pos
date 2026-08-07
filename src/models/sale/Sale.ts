import type { Payment } from "../Payment";
import type { SaleLine } from "./SaleLine";

export type SaleStatus =
    | "draft"
    | "completed"
    | "cancelled";

export type TransactionType =
    | "sale"
    | "return"
    | "exchange";

export type SaleCustomer = {
    id?: string;
    name: string;
};

export type Sale = {
    id: string;
    number: string;

    status: SaleStatus;
    transactionType: TransactionType;

    customer: SaleCustomer;

    lines: SaleLine[];

    subtotal: number;
    discount: number;
    tax: number;
    total: number;

    payments: Payment[];

    createdAt: string;
    completedAt?: string;
};