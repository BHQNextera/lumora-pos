import {
    hydrateTransactions,
} from "../models/transaction/TransactionRepository";

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
        "transactions",
        hydrateTransactions,
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
