import {
    useMemo,
    useState,
} from "react";

import type {
    Customer,
} from "../../models/customer/Customer";
import {
    getCustomers,
    saveCustomer,
} from "../../models/customer/CustomerRepository";

import "./customer-management-page.css";

type CustomerDraft = {
    name: string;
    phone: string;
    groupId: string;
    isClubMember: boolean;
};

const emptyDraft: CustomerDraft = {
    name: "",
    phone: "",
    groupId: "",
    isClubMember: false,
};

function CustomerManagementPage() {
    const [customers, setCustomers] =
        useState<Customer[]>(() => getCustomers());

    const [query, setQuery] = useState("");
    const [editingId, setEditingId] =
        useState<string | null>(null);
    const [draft, setDraft] =
        useState<CustomerDraft>(emptyDraft);
    const [error, setError] =
        useState<string | null>(null);

    const visibleCustomers =
        useMemo(() => {
            const value =
                query.trim().toLowerCase();

            return customers.filter(
                (customer) =>
                    !value ||
                    customer.name
                        .toLowerCase()
                        .includes(value) ||
                    (customer.phone ?? "")
                        .includes(value) ||
                    customer.groupIds.some(
                        (groupId) =>
                            groupId
                                .toLowerCase()
                                .includes(value),
                    ),
            );
        }, [customers, query]);

    const startCreate = () => {
        setEditingId("new");
        setDraft(emptyDraft);
        setError(null);
    };

    const startEdit = (
        customer: Customer,
    ) => {
        setEditingId(customer.id);
        setDraft({
            name: customer.name,
            phone: customer.phone ?? "",
            groupId:
                customer.groupIds[0] ?? "",
            isClubMember:
                customer.isClubMember,
        });
        setError(null);
    };

    const cancel = () => {
        setEditingId(null);
        setDraft(emptyDraft);
        setError(null);
    };

    const save = () => {
        const name =
            draft.name.trim();

        if (!name) {
            setError("יש להזין שם לקוח.");
            return;
        }

        const current =
            editingId &&
            editingId !== "new"
                ? customers.find(
                      (customer) =>
                          customer.id ===
                          editingId,
                  )
                : undefined;

        const customer: Customer = {
            id:
                current?.id ??
                crypto.randomUUID(),
            name,
            phone:
                draft.phone.trim() ||
                undefined,
            groupIds:
                draft.groupId.trim()
                    ? [draft.groupId.trim()]
                    : [],
            isClubMember:
                draft.isClubMember,
        };

        saveCustomer(customer);
        setCustomers(getCustomers());
        cancel();
    };

    return (
        <section
            className="customer-management"
            dir="rtl"
        >
            <header className="customer-management__header">
                <div>
                    <p>MASTER DATA</p>
                    <h1>ניהול לקוחות</h1>
                    <span>
                        יצירה ועריכה של לקוחות וקבוצות תמחור.
                    </span>
                </div>

                <button
                    type="button"
                    className="customer-management__primary"
                    onClick={startCreate}
                >
                    + לקוח חדש
                </button>
            </header>

            <div className="customer-management__toolbar">
                <input
                    type="search"
                    placeholder="חיפוש לפי שם, טלפון או קבוצה"
                    value={query}
                    onChange={(event) =>
                        setQuery(
                            event.target.value,
                        )
                    }
                />

                <strong>
                    {visibleCustomers.length} לקוחות
                </strong>
            </div>

            <div className="customer-management__table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>לקוח</th>
                            <th>טלפון</th>
                            <th>קבוצה</th>
                            <th>מועדון</th>
                            <th>פעולות</th>
                        </tr>
                    </thead>

                    <tbody>
                        {visibleCustomers.map(
                            (customer) => (
                                <tr key={customer.id}>
                                    <td>
                                        <strong>
                                            {customer.name}
                                        </strong>
                                    </td>
                                    <td>
                                        {customer.phone ??
                                            "—"}
                                    </td>
                                    <td>
                                        {customer.groupIds.join(
                                            ", ",
                                        ) || "—"}
                                    </td>
                                    <td>
                                        {customer.isClubMember
                                            ? "כן"
                                            : "לא"}
                                    </td>
                                    <td>
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
                                {editingId === "new"
                                    ? "לקוח חדש"
                                    : "עריכת לקוח"}
                            </h2>

                            <button
                                type="button"
                                onClick={cancel}
                            >
                                ×
                            </button>
                        </header>

                        <div className="customer-management__form">
                            <label>
                                שם
                                <input
                                    value={draft.name}
                                    onChange={(event) =>
                                        setDraft(
                                            (current) => ({
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
                                    value={draft.phone}
                                    onChange={(event) =>
                                        setDraft(
                                            (current) => ({
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
                                קבוצת לקוח
                                <select
                                    value={draft.groupId}
                                    onChange={(event) =>
                                        setDraft(
                                            (current) => ({
                                                ...current,
                                                groupId:
                                                    event
                                                        .target
                                                        .value,
                                            }),
                                        )
                                    }
                                >
                                    <option value="">
                                        ללא קבוצה
                                    </option>
                                    <option value="club">
                                        Club
                                    </option>
                                    <option value="vip">
                                        VIP
                                    </option>
                                    <option value="employee">
                                        Employee
                                    </option>
                                </select>
                            </label>

                            <label className="customer-management__check">
                                <input
                                    type="checkbox"
                                    checked={
                                        draft.isClubMember
                                    }
                                    onChange={(event) =>
                                        setDraft(
                                            (current) => ({
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

                            {error && (
                                <div className="customer-management__error">
                                    {error}
                                </div>
                            )}
                        </div>

                        <footer>
                            <button
                                type="button"
                                onClick={cancel}
                            >
                                ביטול
                            </button>

                            <button
                                type="button"
                                className="customer-management__primary"
                                onClick={save}
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
