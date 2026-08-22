import {
    useEffect,
    useState,
} from "react";

import type {
    Customer,
} from "../../models/customer/Customer";

import {
    saveCustomer,
} from "../../models/customer/CustomerRepository";

import "./SaleCustomerQuickCreateDialog.css";

type Props = {
    onClose: () => void;

    onCreated: (
        customer: Customer,
    ) => void;
};

/*
 * Israel-first quick customer creation.
 *
 * Accept:
 * 0501234567
 * 050-123-4567
 * +972501234567
 * 972501234567
 * 00972501234567
 *
 * Persist:
 * 0501234567
 */
function normalizeIsraeliMobilePhone(
    value: string,
): string | null {
    const digits =
        value.replace(
            /\D/g,
            "",
        );

    let local =
        digits;

    if (
        digits.startsWith(
            "00972",
        )
    ) {
        local =
            `0${digits.slice(5)}`;
    }
    else if (
        digits.startsWith(
            "972",
        )
    ) {
        local =
            `0${digits.slice(3)}`;
    }

    /*
     * Israeli mobile:
     * 05X + 7 subscriber digits
     * = 10 digits total.
     *
     * Do not hard-code carrier prefixes:
     * numbering allocations may change.
     */
    if (
        !/^05\d{8}$/.test(
            local,
        )
    ) {
        return null;
    }

    return local;
}

/*
 * Israeli ID checksum.
 *
 * Short IDs are conventionally padded
 * with leading zeroes to 9 digits.
 */
function normalizeIsraeliId(
    value: string,
): string | null {
    const digits =
        value.replace(
            /\D/g,
            "",
        );

    if (
        digits.length === 0 ||
        digits.length > 9
    ) {
        return null;
    }

    const normalized =
        digits.padStart(
            9,
            "0",
        );

    if (
        /^0{9}$/.test(
            normalized,
        )
    ) {
        return null;
    }

    const sum =
        normalized
            .split("")
            .reduce(
                (
                    total,
                    digit,
                    index,
                ) => {
                    let value =
                        Number(digit) *
                        (
                            index % 2 === 0
                                ? 1
                                : 2
                        );

                    if (
                        value > 9
                    ) {
                        value -= 9;
                    }

                    return (
                        total +
                        value
                    );
                },
                0,
            );

    if (
        sum % 10 !== 0
    ) {
        return null;
    }

    return normalized;
}

export default function SaleCustomerQuickCreateDialog({
    onClose,
    onCreated,
}: Props) {
    const [
        name,
        setName,
    ] = useState("");

    const [
        phone,
        setPhone,
    ] = useState("");

    const [
        email,
        setEmail,
    ] = useState("");

    const [
        externalId,
        setExternalId,
    ] = useState("");

    const [
        birthDate,
        setBirthDate,
    ] = useState("");

    const [
        error,
        setError,
    ] = useState<string | null>(
        null,
    );

    useEffect(() => {
        const handleKeyDown = (
            event: KeyboardEvent,
        ) => {
            if (
                event.key ===
                "Escape"
            ) {
                onClose();
            }
        };

        window.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            window.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, [onClose]);

    const save = () => {
        const normalizedName =
            name.trim();

        if (
            !normalizedName
        ) {
            setError(
                "יש להזין שם לקוח.",
            );

            return;
        }

        if (
            !phone.trim()
        ) {
            setError(
                "יש להזין מספר טלפון.",
            );

            return;
        }

        const normalizedPhone =
            normalizeIsraeliMobilePhone(
                phone,
            );

        if (
            !normalizedPhone
        ) {
            setError(
                "יש להזין מספר טלפון נייד ישראלי תקין.",
            );

            return;
        }

        if (
            !externalId.trim()
        ) {
            setError(
                "יש להזין מספר תעודת זהות.",
            );

            return;
        }

        const normalizedId =
            normalizeIsraeliId(
                externalId,
            );

        if (
            !normalizedId
        ) {
            setError(
                "יש להזין מספר תעודת זהות ישראלית תקין.",
            );

            return;
        }

        const now =
            new Date()
                .toISOString();

        const customer: Customer = {
            id:
                crypto.randomUUID(),

            name:
                normalizedName,

            phone:
                normalizedPhone,

            email:
                email.trim() ||
                undefined,

            externalId:
                normalizedId,

            birthDate:
                birthDate.trim() ||
                undefined,

            /*
             * Customer clubs are deliberately
             * NOT assigned here.
             *
             * Multiple clubs / memberships
             * will be implemented later against
             * a proper active Club Master.
             */
            groupIds: [],

            isClubMember:
                false,

            isActive:
                true,

            createdAt:
                now,

            updatedAt:
                now,
        };

        try {
            saveCustomer(
                customer,
            );
        }
        catch (caught) {
            const message =
                caught instanceof Error
                    ? caught.message
                    : "";

            const normalized =
                message.toLowerCase();

            if (
                normalized.includes(
                    "phone",
                ) ||
                message.includes(
                    "טלפון",
                )
            ) {
                setError(
                    "כבר קיים לקוח פעיל עם מספר טלפון זה.",
                );

                return;
            }

            if (
                normalized.includes(
                    "external",
                ) ||
                normalized.includes(
                    "identifier",
                ) ||
                message.includes(
                    "ת״ז",
                )
            ) {
                setError(
                    "כבר קיים לקוח פעיל עם תעודת זהות זו.",
                );

                return;
            }

            setError(
                message ||
                    "לא ניתן לשמור את הלקוח.",
            );

            return;
        }

        onCreated(
            customer,
        );
    };

    return (
        <div
            className="sale-customer-create__overlay"
            role="presentation"
            onMouseDown={
                onClose
            }
        >
            <section
                className="sale-customer-create"
                dir="rtl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="sale-customer-create-title"
                onMouseDown={(
                    event,
                ) =>
                    event.stopPropagation()
                }
            >
                <header className="sale-customer-create__header">
                    <div>
                        <h2
                            id="sale-customer-create-title"
                        >
                            לקוח חדש
                        </h2>

                        <p>
                            יצירה מהירה מתוך העסקה
                        </p>
                    </div>

                    <button
                        type="button"
                        className="sale-customer-create__close"
                        aria-label="סגור"
                        onClick={
                            onClose
                        }
                    >
                        ×
                    </button>
                </header>

                <div className="sale-customer-create__body">
                    <label className="sale-customer-create__field sale-customer-create__field--wide">
                        <span>
                            שם *
                        </span>

                        <input
                            autoFocus
                            value={
                                name
                            }
                            onChange={(
                                event,
                            ) => {
                                setName(
                                    event
                                        .target
                                        .value,
                                );

                                setError(
                                    null,
                                );
                            }}
                        />
                    </label>

                    <label className="sale-customer-create__field">
                        <span>
                            טלפון נייד *
                        </span>

                        <input
                            dir="ltr"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            value={
                                phone
                            }
                            placeholder="050-1234567"
                            onChange={(
                                event,
                            ) => {
                                setPhone(
                                    event
                                        .target
                                        .value,
                                );

                                setError(
                                    null,
                                );
                            }}
                        />
                    </label>

                    <label className="sale-customer-create__field">
                        <span>
                            ת״ז *
                        </span>

                        <input
                            dir="ltr"
                            inputMode="numeric"
                            autoComplete="off"
                            value={
                                externalId
                            }
                            placeholder="123456782"
                            onChange={(
                                event,
                            ) => {
                                setExternalId(
                                    event
                                        .target
                                        .value,
                                );

                                setError(
                                    null,
                                );
                            }}
                        />
                    </label>

                    <label className="sale-customer-create__field">
                        <span>
                            אימייל
                        </span>

                        <input
                            dir="ltr"
                            type="email"
                            autoComplete="email"
                            value={
                                email
                            }
                            onChange={(
                                event,
                            ) => {
                                setEmail(
                                    event
                                        .target
                                        .value,
                                );

                                setError(
                                    null,
                                );
                            }}
                        />
                    </label>

                    <label className="sale-customer-create__field">
                        <span>
                            תאריך לידה
                        </span>

                        <input
                            type="date"
                            value={
                                birthDate
                            }
                            onChange={(
                                event,
                            ) => {
                                setBirthDate(
                                    event
                                        .target
                                        .value,
                                );

                                setError(
                                    null,
                                );
                            }}
                        />
                    </label>

                    {error && (
                        <div
                            className="sale-customer-create__error"
                            role="alert"
                        >
                            {error}
                        </div>
                    )}
                </div>

                <footer className="sale-customer-create__footer">
                    <button
                        type="button"
                        className="sale-customer-create__cancel"
                        onClick={
                            onClose
                        }
                    >
                        ביטול
                    </button>

                    <button
                        type="button"
                        className="sale-customer-create__save"
                        onClick={
                            save
                        }
                    >
                        שמור ובחר
                    </button>
                </footer>
            </section>
        </div>
    );
}