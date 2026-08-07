import type { Payment } from "../Payment";
import type { SaleLine } from "./SaleLine";

export type SaleStatus =
    | "draft"
    | "completed"
    | "cancelled";

export type Sale = {
    id: string;
    number: string;
    status: SaleStatus;

    lines: SaleLine[];

    subtotal: number;
    discount: number;
    tax: number;
    total: number;

    payments: Payment[];

    createdAt: string;
    completedAt?: string;
};