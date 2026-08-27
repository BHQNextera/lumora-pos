import type {
    PaymentMethodCode,
} from "../PaymentMethod";

export type ReportTransactionType =
    | "sale"
    | "return"
    | "exchange";

export type ReportFilters = {
    fromDate: string;
    toDate: string;

    registerCode?: string;
    sellerId?: string;
    employeeId?: string;

    paymentMethod?:
        PaymentMethodCode;

    transactionType?:
        ReportTransactionType;
};

function localDateValue(
    date: Date,
): string {
    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1,
        ).padStart(
            2,
            "0",
        );

    const day =
        String(
            date.getDate(),
        ).padStart(
            2,
            "0",
        );

    return `${year}-${month}-${day}`;
}

export function createTodayReportFilters():
ReportFilters {
    const today =
        localDateValue(
            new Date(),
        );

    return {
        fromDate:
            today,

        toDate:
            today,
    };
}