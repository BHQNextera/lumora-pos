import {
    hydrateActiveBusinessConfiguration,
} from "../config/ActiveBusinessConfiguration";

import {
    hydrateCatalog,
} from "../models/catalog/CatalogRepository";

import {
    hydratePromotions,
} from "../models/promotion/PromotionRepository";

import {
    hydrateMonetaryValues,
} from "../models/monetary-value/MonetaryValueRepository";

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
    hydrateHeldSales,
} from "../models/held-sale/HeldSaleRepository";

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
    hydrateAttendance,
} from "../models/attendance/AttendanceRepository";
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
        "active-business-configuration",
        hydrateActiveBusinessConfiguration,
    );

    registerRuntimeHydrator(
        "catalog",
        hydrateCatalog,
    );

    registerRuntimeHydrator(
        "promotions",
        hydratePromotions,
    );

    registerRuntimeHydrator(
        "monetary-values",
        hydrateMonetaryValues,
    );

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
        "held-sales",
        hydrateHeldSales,
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
        "attendance",
        hydrateAttendance,
    );
registerRuntimeHydrator(
        "shift-z-reports",
        hydrateShiftZReports,
    );
}
