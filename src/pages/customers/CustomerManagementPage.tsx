import {
    useMemo,
    useState,
} from "react";

import type {
    Customer,
} from "../../models/customer/Customer";
import CustomerEditorFields from "../../components/customer/CustomerEditorFields";
import {
    buildCustomerFromEditorDraft,
    createCustomerEditorDraft,
    createEmptyCustomerEditorDraft,
    type CustomerEditorDraft,
} from "../../models/customer/CustomerEditorDraft";
import {
    getCustomerValidationMessage,
} from "../../models/customer/CustomerValidation";
import {
    getCustomers,
    saveCustomer,
} from "../../models/customer/CustomerRepository";
import {
    getTransactions,
} from "../../models/transaction/TransactionRepository";

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

const emptyDraft =
    createEmptyCustomerEditorDraft();

type CustomerManagementPageProps = {
    onOpenTransactions: (
        customerId: string,
        customerName: string,
    ) => void;
};

function CustomerManagementPage({
    onOpenTransactions,
}: CustomerManagementPageProps) {
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
        useState<CustomerEditorDraft>(
            emptyDraft,
        );

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null,
        );

    const netPurchasesByCustomer =
        useMemo(
            () => {
                const totals =
                    new Map<
                        string,
                        number
                    >();

                for (
                    const sale of getTransactions()
                ) {
                    const customerId =
                        sale.customer?.id;

                    if (
                        sale.status !==
                            "completed" ||
                        !customerId
                    ) {
                        continue;
                    }

                    totals.set(
                        customerId,
                        Math.round(
                            (
                                (
                                    totals.get(
                                        customerId,
                                    ) ??
                                    0
                                ) +
                                sale.total +
                                Number.EPSILON
                            ) *
                                100,
                        ) / 100,
                    );
                }

                return totals;
            },
            [customers],
        );

    const getCustomerNetPurchases = (
        customerId: string,
    ) =>
        netPurchasesByCustomer.get(
            customerId,
        ) ?? 0;

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
            createEmptyCustomerEditorDraft(),
        );
        setError(null);
    };

    const startEdit = (
        customer: ManagedCustomer,
    ) => {
        setEditingId(
            customer.id,
        );

        setDraft(
            createCustomerEditorDraft(
                customer,
            ),
        );

        setError(null);
    };

    const cancel = () => {
        setEditingId(
            null,
        );
        setDraft(
            createEmptyCustomerEditorDraft(),
        );
        setError(null);
    };

    const save = () => {
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

        const customer =
            buildCustomerFromEditorDraft(
                draft,
                current,
            ) as ManagedCustomer;

        try {
            saveCustomer(
                customer,
            );
        }
        catch (error) {
            setError(
                getCustomerValidationMessage(
                    error,
                ),
            );

            return;
        }

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
                        לקוחות, קבוצות תמחור, רכישות ופרטי קשר.
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

            {/* LUMORA CUSTOMER NET PURCHASES V1.2 */}
            <div className="customer-management__table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>
                  לקוח
              </th>

              <th className="customer-management__identity-heading">
                  ת״ז / ח.פ / ע.מ
              </th>
                            <th className="customer-management__contact-heading">
                  טלפון
              </th>
                            <th className="customer-management__contact-heading">
                  אימייל
              </th>
                            <th>
                                קבוצות
                            </th>
                            <th className="customer-management__net-purchases-heading">
                  רכישות נטו
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
                                    </td>

                      <td className="customer-management__identity">
                          {customer.externalId ?? "—"}
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

                                    <td className="customer-management__net-purchases-cell">
                          <button
                              type="button"
                              className="customer-management__net-purchases"
                              title="מכירות בקיזוז החזרות — לחץ להצגת עסקאות הלקוח"

                              onClick={() =>
                                  onOpenTransactions(
                                      customer.id,
                                      customer.name,
                                  )
                              }
                          >
                              <span dir="ltr">
                                  ₪
                                  {getCustomerNetPurchases(
                                      customer.id,
                                  ).toLocaleString(
                                      "he-IL",
                                      {
                                          minimumFractionDigits:
                                              2,
                                          maximumFractionDigits:
                                              2,
                                      },
                                  )}
                              </span>

                              <span aria-hidden="true">
                                  ←
                              </span>
                          </button>
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

                        <CustomerEditorFields
                            draft={
                                draft
                            }
                            onChange={
                                setDraft
                            }
                            error={
                                error
                            }
                            onClearError={() =>
                                setError(
                                    null,
                                )
                            }
                            autoFocusName
                        />

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
