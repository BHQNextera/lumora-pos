import {
    getActiveBusinessOperatingProfile,
} from "../../config/ActiveBusinessConfiguration";

import type {
    Customer,
} from "./Customer";

export function normalizeIsraeliPhone(
    value: string,
): string {
    let normalized =
        value
            .trim()
            .replace(
                /[\s\-().]/g,
                "",
            );

    if (
        normalized.startsWith(
            "+972",
        )
    ) {
        normalized =
            "0" +
            normalized.slice(
                4,
            );
    }
    else if (
        normalized.startsWith(
            "972",
        )
    ) {
        normalized =
            "0" +
            normalized.slice(
                3,
            );
    }

    return normalized;
}

export function isValidIsraeliPhone(
    value: string,
): boolean {
    const phone =
        normalizeIsraeliPhone(
            value,
        );

    /*
     * Israel-first validation:
     *
     * Mobile:
     * 05X-XXXXXXX
     *
     * 07 services / VoIP:
     * 07X-XXXXXXX
     *
     * Geographic:
     * 02 / 03 / 04 / 08 / 09
     */
    return /^0(?:5\d{8}|7\d{8}|[23489]\d{7})$/.test(
        phone,
    );
}

export function normalizeIsraeliId(
    value: string,
): string {
    return value
        .trim()
        .replace(
            /\D/g,
            "",
        )
        .padStart(
            9,
            "0",
        );
}

export function isValidIsraeliId(
    value: string,
): boolean {
    const id =
        normalizeIsraeliId(
            value,
        );

    if (
        !/^\d{9}$/.test(
            id,
        )
    ) {
        return false;
    }

    const total =
        id
            .split("")
            .reduce(
                (
                    sum,
                    digit,
                    index,
                ) => {
                    let weighted =
                        Number(
                            digit,
                        ) *
                        (
                            index % 2 === 0
                                ? 1
                                : 2
                        );

                    if (
                        weighted >
                        9
                    ) {
                        weighted -= 9;
                    }

                    return (
                        sum +
                        weighted
                    );
                },
                0,
            );

    return (
        total % 10 ===
        0
    );
}

export function isValidBirthDate(
    value: string,
): boolean {
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            value,
        )
    ) {
        return false;
    }

    const [
        year,
        month,
        day,
    ] =
        value
            .split("-")
            .map(Number);

    const date =
        new Date(
            year,
            month - 1,
            day,
        );

    if (
        date.getFullYear() !==
            year ||
        date.getMonth() !==
            month - 1 ||
        date.getDate() !==
            day
    ) {
        return false;
    }

    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0,
    );

    return (
        date.getTime() <=
        today.getTime()
    );
}

export function validateCustomerForSave(
    customer: Customer,
    existingCustomers:
        Customer[],
): void {
    /*
     * System walk-in customer is not a real
     * customer master record.
     */
    if (
        customer.id ===
        "walk-in"
    ) {
        return;
    }

    const policy =
        getActiveBusinessOperatingProfile()
            .customerPolicy;

    // PHONE
    if (
        !customer.phone ||
        !isValidIsraeliPhone(
            customer.phone,
        )
    ) {
        throw new Error(
            "CUSTOMER_INVALID_PHONE",
        );
    }

    const normalizedPhone =
        normalizeIsraeliPhone(
            customer.phone,
        );

    if (
        policy.uniqueActivePhone
    ) {
        const duplicatePhone =
            existingCustomers.find(
                (existing) =>
                    existing.id !==
                        customer.id &&
                    existing.isActive !==
                        false &&
                    existing.phone &&
                    normalizeIsraeliPhone(
                        existing.phone,
                    ) ===
                        normalizedPhone,
            );

        if (duplicatePhone) {
            throw new Error(
                "CUSTOMER_ACTIVE_DUPLICATE_PHONE",
            );
        }
    }

    // CUSTOMER ID
    const customerId =
        customer.externalId
            ?.trim() ?? "";

    if (
        policy.requireCustomerId &&
        !customerId
    ) {
        throw new Error(
            "CUSTOMER_ID_REQUIRED",
        );
    }

    if (
        customerId &&
        !isValidIsraeliId(
            customerId,
        )
    ) {
        throw new Error(
            "CUSTOMER_INVALID_ISRAELI_ID",
        );
    }

    if (
        customerId &&
        policy.uniqueActiveCustomerId
    ) {
        const normalizedId =
            normalizeIsraeliId(
                customerId,
            );

        const duplicateId =
            existingCustomers.find(
                (existing) =>
                    existing.id !==
                        customer.id &&
                    existing.isActive !==
                        false &&
                    existing.externalId &&
                    normalizeIsraeliId(
                        existing.externalId,
                    ) ===
                        normalizedId,
            );

        if (duplicateId) {
            throw new Error(
                "CUSTOMER_ACTIVE_DUPLICATE_ID",
            );
        }
    }

    // BIRTH DATE
    const birthDate =
        customer.birthDate
            ?.trim() ?? "";

    if (
        policy.requireCustomerBirthDate &&
        !birthDate
    ) {
        throw new Error(
            "CUSTOMER_BIRTH_DATE_REQUIRED",
        );
    }

    if (
        birthDate &&
        !isValidBirthDate(
            birthDate,
        )
    ) {
        throw new Error(
            "CUSTOMER_INVALID_BIRTH_DATE",
        );
    }
}