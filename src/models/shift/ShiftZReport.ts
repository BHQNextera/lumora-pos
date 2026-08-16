import type {
    CashDeclaration,
} from "../cash/CashDeclaration";

import type {
    ShiftPaymentTotal,
} from "./ShiftReportService";

export type ShiftZReport = {
    id: string;
    number: string;

    shiftId: string;

    tenantId: string;
    storeCode: string;
    registerCode: string;

    openedAt: string;
    closedAt: string;
    generatedAt: string;

    openedBy: {
        employeeId: string;
        employeeName: string;
    };

    closedBy: {
        employeeId: string;
        employeeName: string;
    };

    openingCash: number;
    openingCashDeclaration?: CashDeclaration;

    closingCash: number;
    closingCashDeclaration?: CashDeclaration;

    transactionCount: number;
    saleCount: number;
    returnCount: number;
    exchangeCount: number;

    grossSales: number;
    returnsTotal: number;
    netSales: number;

    discountTotal: number;

    paymentTotals:
        ShiftPaymentTotal[];

    cashPayments: number;

    expectedCash: number;
    cashVariance: number;
};