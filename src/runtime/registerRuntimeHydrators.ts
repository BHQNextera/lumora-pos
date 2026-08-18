import {
    hydrateSaleNumbering,
} from "../models/sale/SaleNumbering";

import {
    hydrateDocumentNumbering,
} from "../models/document/DocumentNumbering";

import {
    hydrateDocuments,
} from "../models/document/DocumentRepository";

import {
    hydrateTransactions,
} from "../models/transaction/TransactionRepository";

import {
    hydrateReturns,
} from "../models/transaction/ReturnRepository";

import {
    hydrateRegisterShifts,
} from "../models/shift/RegisterShiftRepository";

import {
    hydrateCustomers,
} from "../models/customer/CustomerRepository";

import {
    hydrateCashMovements,
} from "../models/cash-movement/CashMovementRepository";

import {
    hydrateShiftZReports,
} from "../models/shift/ShiftZReportRepository";

import {
    registerRuntimeHydrator,
} from "./RuntimeBootstrap";

let registered =
    false;

export function registerRuntimeHydrators():
void {
    if (registered) {
        return;
    }

    registered = true;

    registerRuntimeHydrator(
        "sale-numbering",
        hydrateSaleNumbering,
    );

    registerRuntimeHydrator(
        "document-numbering",
        hydrateDocumentNumbering,
    );

    registerRuntimeHydrator(
        "documents",
        hydrateDocuments,
    );

    registerRuntimeHydrator(
        "transactions",
        hydrateTransactions,
    );

    registerRuntimeHydrator(
        "returns",
        hydrateReturns,
    );

    registerRuntimeHydrator(
        "register-shifts",
        hydrateRegisterShifts,
    );

    registerRuntimeHydrator(
        "customers",
        hydrateCustomers,
    );

    registerRuntimeHydrator(
        "cash-movements",
        hydrateCashMovements,
    );

    registerRuntimeHydrator(
        "shift-z-reports",
        hydrateShiftZReports,
    );
}