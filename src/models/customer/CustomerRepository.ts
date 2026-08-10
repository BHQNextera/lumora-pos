import type {
    Customer,
} from "./Customer";
import {
    testCustomers,
} from "./CustomerSeed";

const STORAGE_KEY =
    "lumora.customers.v1";

function readCustomers(): Customer[] {
    try {
        const raw =
            localStorage.getItem(
                STORAGE_KEY,
            );

        if (!raw) {
            return testCustomers;
        }

        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? (parsed as Customer[])
            : testCustomers;
    } catch {
        return testCustomers;
    }
}

function writeCustomers(
    customers: Customer[],
) {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(customers),
    );
}

export function getCustomers() {
    return readCustomers();
}

export function saveCustomer(
    customer: Customer,
) {
    const current =
        readCustomers();

    const exists =
        current.some(
            (item) =>
                item.id ===
                customer.id,
        );

    const next =
        exists
            ? current.map(
                  (item) =>
                      item.id ===
                      customer.id
                          ? customer
                          : item,
              )
            : [
                  ...current,
                  customer,
              ];

    writeCustomers(next);

    return customer;
}

export function removeCustomer(
    customerId: string,
) {
    const next =
        readCustomers().filter(
            (customer) =>
                customer.id !==
                customerId,
        );

    writeCustomers(next);
}