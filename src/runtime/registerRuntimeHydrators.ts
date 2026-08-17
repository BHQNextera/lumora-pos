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
}