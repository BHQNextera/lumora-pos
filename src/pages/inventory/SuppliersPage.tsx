import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useCatalog,
} from "../../context/useCatalog";

import {
    createSupplier,
    ensureSuppliersFromProducts,
    getSuppliers,
    hydrateSuppliers,
    setSupplierActive,
    subscribeSuppliers,
    supplierIdentityExists,
    updateSupplier,
} from "../../models/inventory/SupplierRepository";

import type {
    Supplier,
} from "../../models/inventory/Supplier";

import "./suppliers-page.css";

type SupplierDraft = {
    name: string;
    businessNumber: string;
    contactName: string;
    phone: string;
    email: string;
    address: string;
    paymentTerms: string;
    note: string;
};

const emptyDraft: SupplierDraft = {
    name: "",
    businessNumber: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    paymentTerms: "",
    note: "",
};

const PAYMENT_TERMS_OPTIONS = [
    "מזומן",
    "30",
    "שוטף 30",
    "שוטף 90",
    "שוטף 120",
] as const;

function isPredefinedPaymentTerms(
    value: string,
): boolean {
    return PAYMENT_TERMS_OPTIONS.some(
        (option) => option === value,
    );
}

function supplierToDraft(
    supplier: Supplier,
): SupplierDraft {
    return {
        name: supplier.name,
        businessNumber:
            supplier.businessNumber,
        contactName:
            supplier.contactName,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        paymentTerms:
            supplier.paymentTerms,
        note: supplier.note,
    };
}

function normalize(value: string) {
    return value
        .trim()
        .toLocaleLowerCase();
}

function SuppliersPage() {
    const { products } = useCatalog();

    const [revision, setRevision] =
        useState(0);
    const [query, setQuery] =
        useState("");
    const [showInactive, setShowInactive] =
        useState(false);
    const [editingId, setEditingId] =
        useState<string | null>(null);
    const [draft, setDraft] =
        useState<SupplierDraft>(emptyDraft);
    const [error, setError] =
        useState<string | null>(null);
    const [customPaymentTerms, setCustomPaymentTerms] =
        useState(false);

    useEffect(() => {
        let active = true;

        const unsubscribe =
            subscribeSuppliers(() => {
                if (active) {
                    setRevision(
                        (value) =>
                            value + 1,
                    );
                }
            });

        hydrateSuppliers()
            .then(() => {
                if (!active) {
                    return;
                }

                ensureSuppliersFromProducts(
                    products,
                );
                setRevision(
                    (value) =>
                        value + 1,
                );
            })
            .catch(() => {
                if (active) {
                    setError(
                        "לא ניתן לטעון את טבלת הספקים.",
                    );
                }
            });

        return () => {
            active = false;
            unsubscribe();
        };
    }, [products]);

    void revision;

    const suppliers = getSuppliers();

    const visibleSuppliers =
        useMemo(() => {
            const value =
                normalize(query);

            return suppliers.filter(
                (supplier) =>
                    (
                        showInactive ||
                        supplier.isActive
                    ) &&
                    (
                        !value ||
                        [
                            supplier.name,
                            supplier.businessNumber,
                            supplier.contactName,
                            supplier.phone,
                            supplier.email,
                        ].some(
                            (field) =>
                                normalize(field)
                                    .includes(value),
                        )
                    ),
            );
        }, [
            suppliers,
            query,
            showInactive,
        ]);

    function startCreate() {
        setDraft(emptyDraft);
        setCustomPaymentTerms(false);
        setEditingId("new");
        setError(null);
    }

    function startEdit(
        supplier: Supplier,
    ) {
        setDraft(
            supplierToDraft(
                supplier,
            ),
        );
        setCustomPaymentTerms(
            Boolean(
                supplier.paymentTerms &&
                !isPredefinedPaymentTerms(
                    supplier.paymentTerms,
                )
            ),
        );
        setEditingId(
            supplier.id,
        );
        setError(null);
    }

    function cancelEdit() {
        setEditingId(null);
        setDraft(emptyDraft);
        setCustomPaymentTerms(false);
        setError(null);
    }

    function saveSupplier() {
        const name =
            draft.name.trim();

        if (!name) {
            setError(
                "יש להזין שם ספק.",
            );
            return;
        }

        if (!draft.businessNumber.trim()) {
            setError(
                "יש להזין ח.פ./ע.מ של הספק.",
            );
            return;
        }

        const currentId =
            editingId &&
            editingId !== "new"
                ? editingId
                : undefined;

        if (
            supplierIdentityExists(
                name,
                draft.businessNumber,
                currentId,
            )
        ) {
            setError(
                "כבר קיים ספק עם שם או מספר עסק זהה.",
            );
            return;
        }

        const input = {
            name,
            businessNumber:
                draft.businessNumber,
            contactName:
                draft.contactName,
            phone: draft.phone,
            email: draft.email,
            address: draft.address,
            paymentTerms:
                draft.paymentTerms,
            note: draft.note,
        };

        if (currentId) {
            updateSupplier(
                currentId,
                input,
            );
        }
        else {
            createSupplier(input);
        }

        cancelEdit();
    }

    return (
        <section
            className="suppliers-page"
            dir="rtl"
        >
            <header className="suppliers-page__header">
                <div>
                    <p className="suppliers-page__eyebrow">
                        MASTER DATA
                    </p>
                    <h1>
                        ספקים
                    </h1>
                    <p>
                        טבלת ספקים מרכזית לחשבוניות, החזרות ומסמכי מלאי.
                    </p>
                </div>

                <button
                    type="button"
                    className="suppliers-page__primary"
                    onClick={startCreate}
                >
                    + ספק חדש
                </button>
            </header>

            <div className="suppliers-page__toolbar">
                <input
                    type="search"
                    value={query}
                    onChange={(event) =>
                        setQuery(
                            event.target.value,
                        )
                    }
                    placeholder="חיפוש לפי שם, ח.פ./עוסק, איש קשר, טלפון או אימייל"
                />

                <label>
                    <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(event) =>
                            setShowInactive(
                                event.target.checked,
                            )
                        }
                    />
                    הצג גם לא פעילים
                </label>

                <span>
                    {visibleSuppliers.length} ספקים
                </span>
            </div>

            {error && (
                <div className="suppliers-page__error">
                    {error}
                </div>
            )}

            <div className="suppliers-page__table-wrap">
                <table className="suppliers-page__table">
                    <thead>
                        <tr>
                            <th>ספק</th>
                            <th>ח.פ./עוסק</th>
                            <th>איש קשר</th>
                            <th>טלפון</th>
                            <th>אימייל</th>
                            <th>תנאי תשלום</th>
                            <th>סטטוס</th>
                            <th>פעולות</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleSuppliers.map(
                            (supplier) => (
                                <tr key={supplier.id}>
                                    <td>
                                        <strong>
                                            {supplier.name}
                                        </strong>
                                        {supplier.address && (
                                            <small>
                                                {supplier.address}
                                            </small>
                                        )}
                                    </td>
                                    <td>
                                        {supplier.businessNumber || "—"}
                                    </td>
                                    <td>
                                        {supplier.contactName || "—"}
                                    </td>
                                    <td className="suppliers-page__ltr">
                                        {supplier.phone || "—"}
                                    </td>
                                    <td className="suppliers-page__ltr">
                                        {supplier.email || "—"}
                                    </td>
                                    <td>
                                        {supplier.paymentTerms || "—"}
                                    </td>
                                    <td>
                                        <span
                                            className={
                                                supplier.isActive
                                                    ? "suppliers-page__status suppliers-page__status--active"
                                                    : "suppliers-page__status suppliers-page__status--inactive"
                                            }
                                        >
                                            {supplier.isActive
                                                ? "פעיל"
                                                : "לא פעיל"}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="suppliers-page__actions">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    startEdit(
                                                        supplier,
                                                    )
                                                }
                                            >
                                                עריכה
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSupplierActive(
                                                        supplier.id,
                                                        !supplier.isActive,
                                                    )
                                                }
                                            >
                                                {supplier.isActive
                                                    ? "השבתה"
                                                    : "הפעלה"}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ),
                        )}

                        {visibleSuppliers.length === 0 && (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="suppliers-page__empty"
                                >
                                    לא נמצאו ספקים.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {editingId && (
                <div
                    className="suppliers-page__overlay"
                    role="presentation"
                    onMouseDown={cancelEdit}
                >
                    <section
                        className="suppliers-page__dialog"
                        role="dialog"
                        aria-modal="true"
                        onMouseDown={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <header>
                            <div>
                                <p>ספק</p>
                                <h2>
                                    {editingId === "new"
                                        ? "ספק חדש"
                                        : "עריכת ספק"}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={cancelEdit}
                                aria-label="סגור"
                            >
                                ×
                            </button>
                        </header>

                        <div className="suppliers-page__form">
                            <label>
                                שם ספק *
                                <input
                                    value={draft.name}
                                    onChange={(event) =>
                                        setDraft({
                                            ...draft,
                                            name:
                                                event.target.value,
                                        })
                                    }
                                />
                            </label>
                            <label>
                                ח.פ./ע.מ *
                                <input
                                    required
                                    value={draft.businessNumber}
                                    onChange={(event) =>
                                        setDraft({
                                            ...draft,
                                            businessNumber:
                                                event.target.value,
                                        })
                                    }
                                />
                            </label>
                            <label>
                                איש קשר
                                <input
                                    value={draft.contactName}
                                    onChange={(event) =>
                                        setDraft({
                                            ...draft,
                                            contactName:
                                                event.target.value,
                                        })
                                    }
                                />
                            </label>
                            <label>
                                טלפון
                                <input
                                    value={draft.phone}
                                    onChange={(event) =>
                                        setDraft({
                                            ...draft,
                                            phone:
                                                event.target.value,
                                        })
                                    }
                                />
                            </label>
                            <label>
                                אימייל
                                <input
                                    type="email"
                                    value={draft.email}
                                    onChange={(event) =>
                                        setDraft({
                                            ...draft,
                                            email:
                                                event.target.value,
                                        })
                                    }
                                />
                            </label>
                            <label>
                                תנאי תשלום
                                <select
                                    value={
                                        customPaymentTerms
                                            ? "__new__"
                                            : draft.paymentTerms
                                    }
                                    onChange={(event) => {
                                        const value =
                                            event.target.value;

                                        if (value === "__new__") {
                                            setCustomPaymentTerms(true);
                                            setDraft({
                                                ...draft,
                                                paymentTerms: "",
                                            });
                                            return;
                                        }

                                        setCustomPaymentTerms(false);
                                        setDraft({
                                            ...draft,
                                            paymentTerms: value,
                                        });
                                    }}
                                >
                                    <option value="">בחר תנאי תשלום</option>
                                    {PAYMENT_TERMS_OPTIONS.map(
                                        (option) => (
                                            <option
                                                key={option}
                                                value={option}
                                            >
                                                {option}
                                            </option>
                                        ),
                                    )}
                                    <option value="__new__">חדש...</option>
                                </select>
                                {customPaymentTerms && (
                                    <input
                                        autoFocus
                                        value={draft.paymentTerms}
                                        onChange={(event) =>
                                            setDraft({
                                                ...draft,
                                                paymentTerms:
                                                    event.target.value,
                                            })
                                        }
                                        placeholder="הזן תנאי תשלום חדש"
                                    />
                                )}
                            </label>
                            <label className="suppliers-page__wide">
                                כתובת
                                <input
                                    value={draft.address}
                                    onChange={(event) =>
                                        setDraft({
                                            ...draft,
                                            address:
                                                event.target.value,
                                        })
                                    }
                                />
                            </label>
                            <label className="suppliers-page__wide">
                                הערה
                                <input
                                    value={draft.note}
                                    onChange={(event) =>
                                        setDraft({
                                            ...draft,
                                            note:
                                                event.target.value,
                                        })
                                    }
                                />
                            </label>
                        </div>

                        {error && (
                            <div className="suppliers-page__dialog-error">
                                {error}
                            </div>
                        )}

                        <footer>
                            <button
                                type="button"
                                onClick={cancelEdit}
                            >
                                ביטול
                            </button>
                            <button
                                type="button"
                                className="suppliers-page__primary"
                                onClick={saveSupplier}
                            >
                                שמירה
                            </button>
                        </footer>
                    </section>
                </div>
            )}
        </section>
    );
}

export default SuppliersPage;
