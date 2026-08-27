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

const customerValidationMessages:
Record<string, string> = {
    CUSTOMER_NAME_REQUIRED:
        "יש להזין שם לקוח.",

    CUSTOMER_INVALID_PHONE:
        "יש להזין מספר טלפון נייד ישראלי תקין.",

    CUSTOMER_ACTIVE_DUPLICATE_PHONE:
        "כבר קיים לקוח פעיל עם מספר טלפון זה.",

    CUSTOMER_ID_REQUIRED:
        "יש להזין ת״ז.",

    CUSTOMER_INVALID_ISRAELI_ID:
        "יש להזין ת״ז ישראלית תקינה.",

    CUSTOMER_ACTIVE_DUPLICATE_ID:
        "כבר קיים לקוח פעיל עם ת״ז זו.",

    CUSTOMER_BIRTH_DATE_REQUIRED:
        "יש להזין תאריך לידה.",

    CUSTOMER_INVALID_BIRTH_DATE:
        "יש להזין תאריך לידה תקין.",

    CUSTOMER_CREDIT_LIMIT_REQUIRED:
        "יש להזין אובליגו מאושר גדול מאפס.",
};

export function getCustomerValidationMessage(
    error:
        unknown,
): string {
    const code =
        error instanceof Error
            ? error.message
            : "";

    if (
        customerValidationMessages[code]
    ) {
        return customerValidationMessages[code];
    }

    if (
        code.startsWith(
            "CUSTOMER_",
        )
    ) {
        return "לא ניתן לשמור את הלקוח. יש לבדוק את הפרטים ולנסות שוב.";
    }

    return (
        code ||
        "לא ניתן לשמור את הלקוח."
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

    if (
        !customer.name.trim()
    ) {
        throw new Error(
            "CUSTOMER_NAME_REQUIRED",
        );
    }

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

    if (
        customer.storeCreditEnabled &&
        (
            customer.creditLimit ===
                undefined ||
            !Number.isFinite(
                customer.creditLimit,
            ) ||
            customer.creditLimit <=
                0
        )
    ) {
        throw new Error(
            "CUSTOMER_CREDIT_LIMIT_REQUIRED",
        );
    }
}
