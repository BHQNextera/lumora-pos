import {
    useMemo,
    useState,
} from "react";

import type {
    Customer,
    CustomerGroupId,
} from "../../models/customer/Customer";
import {
    getCustomers,
    saveCustomer,
} from "../../models/customer/CustomerRepository";
import {
    getMonetaryValues,
} from "../../models/monetary-value/MonetaryValueRepository";

import "./customer-management-page.css";

type ManagedCustomer = Customer & {
    email?: string;
    externalId?: string;
    address?: string;
    notes?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
};

type CustomerDraft = {
    name: string;
    phone: string;
    email: string;
    externalId: string;
    address: string;
    notes: string;
    groupIds: CustomerGroupId[];
    isClubMember: boolean;
    isActive: boolean;
};

const emptyDraft: CustomerDraft = {
    name: "",
    phone: "",
    email: "",
    externalId: "",
    address: "",
    notes: "",
    groupIds: [],
    isClubMember: false,
    isActive: true,
};

const customerGroups: {
    id: CustomerGroupId;
    label: string;
}[] = [
    {
        id: "club",
        label: "Club",
    },
    {
        id: "vip",
        label: "VIP",
    },
    {
        id: "employee",
        label: "Employee",
    },
];

function CustomerManagementPage() {
    const [
        customers,
        setCustomers,
    ] =
        useState<ManagedCustomer[]>(
            () =>
                getCustomers() as ManagedCustomer[],
        );

    const [
        query,
        setQuery,
    ] = useState("");

    const [
        showInactive,
        setShowInactive,
    ] = useState(false);

    const [
        editingId,
        setEditingId,
    ] =
        useState<string | null>(
            null,
        );

    const [
        draft,
        setDraft,
    ] =
        useState<CustomerDraft>(
            emptyDraft,
        );

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null,
        );

    const monetaryValues =
        useMemo(
            () =>
                getMonetaryValues(),
            [customers],
        );

    const getCustomerBalance = (
        customerId: string,
    ) =>
        monetaryValues
            .filter(
                (value) =>
                    value.customerId ===
                    customerId &&
                    value.status ===
                    "active",
            )
            .reduce(
                (sum, value) =>
                    sum +
                    value.remainingAmount,
                0,
            );

    const visibleCustomers =
        useMemo(() => {
            const value =
                query
                    .trim()
                    .toLowerCase();

            return customers
                .filter(
                    (customer) =>
                        showInactive ||
                        customer.isActive !==
                            false,
                )
                .filter(
                    (customer) =>
                        !value ||
                        customer.name
                            .toLowerCase()
                            .includes(value) ||
                        (
                            customer.phone ??
                            ""
                        ).includes(value) ||
                        (
                            customer.email ??
                            ""
                        )
                            .toLowerCase()
                            .includes(value) ||
                        (
                            customer.externalId ??
                            ""
                        )
                            .toLowerCase()
                            .includes(value) ||
                        customer.groupIds.some(
                            (groupId) =>
                                groupId
                                    .toLowerCase()
                                    .includes(value),
                        ),
                );
        }, [
            customers,
            query,
            showInactive,
        ]);

    const startCreate = () => {
        setEditingId(
            "new",
        );
        setDraft(
            emptyDraft,
        );
        setError(null);
    };

    const startEdit = (
        customer: ManagedCustomer,
    ) => {
        setEditingId(
            customer.id,
        );

        setDraft({
            name:
                customer.name,
            phone:
                customer.phone ??
                "",
            email:
                customer.email ??
                "",
            externalId:
                customer.externalId ??
                "",
            address:
                customer.address ??
                "",
            notes:
                customer.notes ??
                "",
            groupIds:
                [
                    ...customer.groupIds,
                ],
            isClubMember:
                customer.isClubMember,
            isActive:
                customer.isActive !==
                false,
        });

        setError(null);
    };

    const cancel = () => {
        setEditingId(
            null,
        );
        setDraft(
            emptyDraft,
        );
        setError(null);
    };

    const toggleGroup = (
        groupId: CustomerGroupId,
    ) => {
        setDraft(
            (current) => ({
                ...current,

                groupIds:
                    current.groupIds.includes(
                        groupId,
                    )
                        ? current.groupIds.filter(
                              (id) =>
                                  id !==
                                  groupId,
                          )
                        : [
                              ...current.groupIds,
                              groupId,
                          ],
            }),
        );
    };

    const save = () => {
        const name =
            draft.name.trim();

        if (!name) {
            setError(
                "יש להזין שם לקוח.",
            );
            return;
        }

        const current =
            editingId &&
            editingId !==
                "new"
                ? customers.find(
                      (customer) =>
                          customer.id ===
                          editingId,
                  )
                : undefined;

        const now =
            new Date().toISOString();

        const customer: ManagedCustomer = {
            id:
                current?.id ??
                crypto.randomUUID(),

            name,

            phone:
                draft.phone.trim() ||
                undefined,

            email:
                draft.email.trim() ||
                undefined,

            externalId:
                draft.externalId.trim() ||
                undefined,

            address:
                draft.address.trim() ||
                undefined,

            notes:
                draft.notes.trim() ||
                undefined,

            groupIds:
                [
                    ...draft.groupIds,
                ],

            isClubMember:
                draft.isClubMember,

            isActive:
                draft.isActive,

            createdAt:
                current?.createdAt ??
                now,

            updatedAt:
                now,
        };

        saveCustomer(
            customer,
        );

        setCustomers(
            getCustomers() as ManagedCustomer[],
        );

        cancel();
    };

    const toggleActive = (
        customer: ManagedCustomer,
    ) => {
        const updated: ManagedCustomer = {
            ...customer,

            isActive:
                customer.isActive ===
                false,

            updatedAt:
                new Date().toISOString(),
        };

        saveCustomer(
            updated,
        );

        setCustomers(
            getCustomers() as ManagedCustomer[],
        );
    };

    return (
        <section
            className="customer-management"
            dir="rtl"
        >
            <header className="customer-management__header">
                <div>
                    <p>
                        MASTER DATA
                    </p>

                    <h1>
                        ניהול לקוחות
                    </h1>

                    <span>
                        לקוחות, קבוצות תמחור, יתרות זיכוי ופרטי קשר.
                    </span>
                </div>

                <button
                    type="button"
                    className="customer-management__primary"
                    onClick={
                        startCreate
                    }
                >
                    + לקוח חדש
                </button>
            </header>

            <div className="customer-management__toolbar">
                <input
                    type="search"
                    placeholder="חיפוש לפי שם, טלפון, אימייל, מזהה או קבוצה"
                    value={query}
                    onChange={(
                        event,
                    ) =>
                        setQuery(
                            event
                                .target
                                .value,
                        )
                    }
                />

                <label className="customer-management__check">
                    <input
                        type="checkbox"
                        checked={
                            showInactive
                        }
                        onChange={(
                            event,
                        ) =>
                            setShowInactive(
                                event
                                    .target
                                    .checked,
                            )
                        }
                    />
                    הצג גם לא פעילים
                </label>

                <strong>
                    {
                        visibleCustomers.length
                    }{" "}
                    לקוחות
                </strong>
            </div>

            <div className="customer-management__table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>
                                לקוח
                            </th>
                            <th>
                                טלפון
                            </th>
                            <th>
                                אימייל
                            </th>
                            <th>
                                קבוצות
                            </th>
                            <th>
                                יתרה
                            </th>
                            <th>
                                סטטוס
                            </th>
                            <th>
                                פעולות
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {visibleCustomers.map(
                            (
                                customer,
                            ) => (
                                <tr
                                    key={
                                        customer.id
                                    }
                                >
                                    <td>
                                        <strong>
                                            {
                                                customer.name
                                            }
                                        </strong>

                                        {customer.externalId && (
                                            <small>
                                                {
                                                    customer.externalId
                                                }
                                            </small>
                                        )}
                                    </td>

                                    <td>
                                        {customer.phone ??
                                            "—"}
                                    </td>

                                    <td>
                                        {customer.email ??
                                            "—"}
                                    </td>

                                    <td>
                                        {customer
                                            .groupIds
                                            .join(
                                                ", ",
                                            ) ||
                                            "—"}
                                    </td>

                                    <td>
                                        ₪
                                        {getCustomerBalance(
                                            customer.id,
                                        ).toFixed(
                                            2,
                                        )}
                                    </td>

                                    <td>
                                        {customer.isActive ===
                                        false
                                            ? "לא פעיל"
                                            : "פעיל"}
                                    </td>

                                    <td>
                                        <div
                                            style={{
                                                display:
                                                    "flex",
                                                gap:
                                                    "6px",
                                            }}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    startEdit(
                                                        customer,
                                                    )
                                                }
                                            >
                                                עריכה
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleActive(
                                                        customer,
                                                    )
                                                }
                                            >
                                                {customer.isActive ===
                                                false
                                                    ? "הפעלה"
                                                    : "השבתה"}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ),
                        )}
                    </tbody>
                </table>
            </div>

            {editingId && (
                <div className="customer-management__overlay">
                    <div className="customer-management__dialog">
                        <header>
                            <h2>
                                {editingId ===
                                "new"
                                    ? "לקוח חדש"
                                    : "עריכת לקוח"}
                            </h2>

                            <button
                                type="button"
                                onClick={
                                    cancel
                                }
                            >
                                ×
                            </button>
                        </header>

                        <div className="customer-management__form">
                            <label>
                                שם
                                <input
                                    value={
                                        draft.name
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setDraft(
                                            (
                                                current,
                                            ) => ({
                                                ...current,
                                                name:
                                                    event
                                                        .target
                                                        .value,
                                            }),
                                        )
                                    }
                                />
                            </label>

                            <label>
                                טלפון
                                <input
                                    dir="ltr"
                                    value={
                                        draft.phone
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setDraft(
                                            (
                                                current,
                                            ) => ({
                                                ...current,
                                                phone:
                                                    event
                                                        .target
                                                        .value,
                                            }),
                                        )
                                    }
                                />
                            </label>

                            <label>
                                אימייל
                                <input
                                    dir="ltr"
                                    type="email"
                                    value={
                                        draft.email
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setDraft(
                                            (
                                                current,
                                            ) => ({
                                                ...current,
                                                email:
                                                    event
                                                        .target
                                                        .value,
                                            }),
                                        )
                                    }
                                />
                            </label>

                            <label>
                                ת״ז / ח״פ / מזהה
                                <input
                                    value={
                                        draft.externalId
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setDraft(
                                            (
                                                current,
                                            ) => ({
                                                ...current,
                                                externalId:
                                                    event
                                                        .target
                                                        .value,
                                            }),
                                        )
                                    }
                                />
                            </label>

                            <label>
                                כתובת
                                <input
                                    value={
                                        draft.address
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setDraft(
                                            (
                                                current,
                                            ) => ({
                                                ...current,
                                                address:
                                                    event
                                                        .target
                                                        .value,
                                            }),
                                        )
                                    }
                                />
                            </label>

                            <label>
                                הערות
                                <input
                                    value={
                                        draft.notes
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setDraft(
                                            (
                                                current,
                                            ) => ({
                                                ...current,
                                                notes:
                                                    event
                                                        .target
                                                        .value,
                                            }),
                                        )
                                    }
                                />
                            </label>

                            <div>
                                <strong
                                    style={{
                                        fontSize:
                                            "10px",
                                    }}
                                >
                                    קבוצות לקוח
                                </strong>

                                <div
                                    style={{
                                        display:
                                            "flex",
                                        flexWrap:
                                            "wrap",
                                        gap:
                                            "10px",
                                        marginTop:
                                            "8px",
                                    }}
                                >
                                    {customerGroups.map(
                                        (
                                            group,
                                        ) => (
                                            <label
                                                key={
                                                    group.id
                                                }
                                                className="customer-management__check"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={draft.groupIds.includes(
                                                        group.id,
                                                    )}
                                                    onChange={() =>
                                                        toggleGroup(
                                                            group.id,
                                                        )
                                                    }
                                                />
                                                {
                                                    group.label
                                                }
                                            </label>
                                        ),
                                    )}
                                </div>
                            </div>

                            <label className="customer-management__check">
                                <input
                                    type="checkbox"
                                    checked={
                                        draft.isClubMember
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setDraft(
                                            (
                                                current,
                                            ) => ({
                                                ...current,
                                                isClubMember:
                                                    event
                                                        .target
                                                        .checked,
                                            }),
                                        )
                                    }
                                />
                                חבר מועדון
                            </label>

                            <label className="customer-management__check">
                                <input
                                    type="checkbox"
                                    checked={
                                        draft.isActive
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setDraft(
                                            (
                                                current,
                                            ) => ({
                                                ...current,
                                                isActive:
                                                    event
                                                        .target
                                                        .checked,
                                            }),
                                        )
                                    }
                                />
                                לקוח פעיל
                            </label>

                            {error && (
                                <div className="customer-management__error">
                                    {error}
                                </div>
                            )}
                        </div>

                        <footer>
                            <button
                                type="button"
                                onClick={
                                    cancel
                                }
                            >
                                ביטול
                            </button>

                            <button
                                type="button"
                                className="customer-management__primary"
                                onClick={
                                    save
                                }
                            >
                                שמירה
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </section>
    );
}

export default CustomerManagementPage;
