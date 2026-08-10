import {
    useMemo,
    useState,
} from "react";

import {
    useCatalog,
} from "../../context/useCatalog";
import {
    categorySeed,
} from "../../models/catalog/Category";
import type {
    Product,
    ProductLocalizedNames,
} from "../../types/product";

import "./product-management-page.css";

type ProductDraft = {
    names: ProductLocalizedNames;
    price: string;
    costPrice: string;
    category: string;
    department: string;
    subcategory: string;
    supplierName: string;
    supplierSku: string;
    sku: string;
    barcode: string;
    imageUrl: string;
    stockOnHand: string;
};

const emptyDraft: ProductDraft = {
    names: {
        he: "",
        en: "",
        el: "",
    },
    price: "",
    costPrice: "",
    category: "hot-drinks",
    department: "",
    subcategory: "",
    supplierName: "",
    supplierSku: "",
    sku: "",
    barcode: "",
    imageUrl: "",
    stockOnHand: "",
};

function productToDraft(
    product: Product,
): ProductDraft {
    return {
        names: {
            he:
                product.names?.he ??
                product.name,
            en:
                product.names?.en ??
                "",
            el:
                product.names?.el ??
                "",
        },
        price:
            String(
                product.price,
            ),
        costPrice:
            product.costPrice ===
            undefined
                ? ""
                : String(
                      product.costPrice,
                  ),
        category:
            product.category,
        department:
            product.hierarchy?.department ??
            "",
        subcategory:
            product.hierarchy?.subcategory ??
            "",
        supplierName:
            product.supplier?.name ??
            "",
        supplierSku:
            product.supplier?.supplierSku ??
            "",
        sku:
            product.sku,
        barcode:
            product.barcode,
        imageUrl:
            product.imageUrl,
        stockOnHand:
            product.stockOnHand ===
            undefined
                ? ""
                : String(
                      product.stockOnHand,
                  ),
    };
}

function displayName(
    product: Product,
) {
    return (
        product.names?.he ??
        product.name
    );
}

function ProductManagementPage() {
    const {
        products,
        addProduct,
        updateProduct,
        setProductActive,
    } = useCatalog();

    const [query, setQuery] = useState("");
    const [showInactive, setShowInactive] = useState(false);
    const [editingId, setEditingId] =
        useState<string | null>(null);
    const [draft, setDraft] =
        useState<ProductDraft>(emptyDraft);
    const [error, setError] =
        useState<string | null>(null);

    const categories =
        useMemo(
            () =>
                categorySeed
                    .filter(
                        (category) =>
                            category.level ===
                                "category" &&
                            category.isActive,
                    )
                    .sort(
                        (a, b) =>
                            a.sortOrder -
                            b.sortOrder,
                    ),
            [],
        );

    const visibleProducts =
        useMemo(() => {
            const value =
                query
                    .trim()
                    .toLowerCase();

            return products
                .filter(
                    (product) =>
                        showInactive ||
                        product.isActive,
                )
                .filter(
                    (product) =>
                        !value ||
                        displayName(product)
                            .toLowerCase()
                            .includes(value) ||
                        product.sku
                            .toLowerCase()
                            .includes(value) ||
                        product.barcode.includes(value),
                )
                .sort(
                    (a, b) =>
                        displayName(a).localeCompare(
                            displayName(b),
                            "he",
                        ),
                );
        }, [
            products,
            query,
            showInactive,
        ]);

    const startCreate = () => {
        setEditingId("new");
        setDraft(emptyDraft);
        setError(null);
    };

    const startEdit = (product: Product) => {
        setEditingId(product.id);
        setDraft(productToDraft(product));
        setError(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setDraft(emptyDraft);
        setError(null);
    };

    const updateName = (
        locale:
            | "he"
            | "en"
            | "el",
        value: string,
    ) => {
        setDraft((current) => ({
            ...current,
            names: {
                ...current.names,
                [locale]: value,
            },
        }));
    };

    const save = () => {
        const heName = draft.names.he?.trim() ?? "";
        const enName = draft.names.en?.trim() ?? "";
        const elName = draft.names.el?.trim() ?? "";

        const fallbackName =
            heName || enName || elName;

        const price = Number(draft.price);

        if (!fallbackName) {
            setError("יש להזין שם פריט לפחות בשפה אחת.");
            return;
        }

        if (!Number.isFinite(price) || price < 0) {
            setError("מחיר המכירה אינו תקין.");
            return;
        }

        const sku = draft.sku.trim();
        const barcode = draft.barcode.trim();

        if (!sku) {
            setError("יש להזין SKU.");
            return;
        }

        if (!barcode) {
            setError("יש להזין ברקוד.");
            return;
        }

        const duplicate =
            products.find(
                (product) =>
                    product.id !== editingId &&
                    (product.sku.toLowerCase() ===
                        sku.toLowerCase() ||
                        product.barcode === barcode),
            );

        if (duplicate) {
            setError("SKU או ברקוד כבר קיימים בפריט אחר.");
            return;
        }

        const current =
            editingId && editingId !== "new"
                ? products.find(
                      (product) =>
                          product.id === editingId,
                  )
                : undefined;

        const costPrice =
            draft.costPrice.trim()
                ? Number(draft.costPrice)
                : undefined;

        const stockOnHand =
            draft.stockOnHand.trim()
                ? Number(draft.stockOnHand)
                : undefined;

        const category =
            categories.find(
                (item) =>
                    item.id === draft.category,
            );

        const parent =
            category?.parentId
                ? categorySeed.find(
                      (item) =>
                          item.id === category.parentId,
                  )
                : undefined;

        const product: Product = {
            id:
                current?.id ??
                crypto.randomUUID(),
            name:
                fallbackName,
            names: {
                he: heName || undefined,
                en: enName || undefined,
                el: elName || undefined,
            },
            price,
            costPrice:
                costPrice !== undefined &&
                Number.isFinite(costPrice)
                    ? costPrice
                    : undefined,
            category:
                draft.category as Product["category"],
            hierarchy: {
                department:
                    draft.department.trim() ||
                    parent?.name ||
                    current?.hierarchy?.department,
                category:
                    category?.name ??
                    current?.hierarchy?.category,
                subcategory:
                    draft.subcategory.trim() ||
                    current?.hierarchy?.subcategory,
            },
            supplier:
                draft.supplierName.trim() ||
                draft.supplierSku.trim()
                    ? {
                          id:
                              current?.supplier?.id,
                          name:
                              draft.supplierName.trim() ||
                              "ספק",
                          supplierSku:
                              draft.supplierSku.trim() ||
                              undefined,
                      }
                    : undefined,
            stockOnHand:
                stockOnHand !== undefined &&
                Number.isFinite(stockOnHand)
                    ? stockOnHand
                    : undefined,
            imageUrl:
                draft.imageUrl.trim(),
            barcode,
            sku,
            isActive:
                current?.isActive ??
                true,
        };

        if (current) {
            updateProduct(product);
        } else {
            addProduct(product);
        }

        cancelEdit();
    };

    return (
        <section className="product-management" dir="rtl">
            <header className="product-management__header">
                <div>
                    <p className="product-management__eyebrow">
                        MASTER DATA
                    </p>
                    <h1>ניהול פריטים</h1>
                    <p className="product-management__subtitle">
                        קטלוג, מחירים, ספקים, היררכיה ומלאי בקופה.
                    </p>
                </div>

                <button
                    type="button"
                    className="product-management__primary"
                    onClick={startCreate}
                >
                    + פריט חדש
                </button>
            </header>

            <div className="product-management__toolbar">
                <input
                    type="search"
                    placeholder="חיפוש לפי שם, SKU או ברקוד"
                    value={query}
                    onChange={(event) =>
                        setQuery(event.target.value)
                    }
                />

                <label className="product-management__toggle">
                    <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(event) =>
                            setShowInactive(
                                event.target.checked,
                            )
                        }
                    />
                    הצג גם פריטים לא פעילים
                </label>

                <span className="product-management__count">
                    {visibleProducts.length} פריטים
                </span>
            </div>

            <div className="product-management__table-wrap">
                <table className="product-management__table">
                    <thead>
                        <tr>
                            <th>פריט</th>
                            <th>SKU</th>
                            <th>ברקוד</th>
                            <th>קטגוריה</th>
                            <th>ספק</th>
                            <th>מחיר</th>
                            <th>מלאי</th>
                            <th>סטטוס</th>
                            <th>פעולות</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleProducts.map((product) => (
                            <tr key={product.id}>
                                <td>
                                    <strong>
                                        {displayName(product)}
                                    </strong>
                                    {(product.names?.en ||
                                        product.names?.el) && (
                                        <small>
                                            {product.names?.en ?? ""}
                                            {product.names?.en &&
                                            product.names?.el
                                                ? " · "
                                                : ""}
                                            {product.names?.el ?? ""}
                                        </small>
                                    )}
                                </td>
                                <td>{product.sku}</td>
                                <td>{product.barcode}</td>
                                <td>
                                    {categorySeed.find(
                                        (category) =>
                                            category.id ===
                                            product.category,
                                    )?.name ??
                                        product.category}
                                </td>
                                <td>
                                    {product.supplier?.name ?? "—"}
                                </td>
                                <td>
                                    ₪{product.price.toFixed(2)}
                                </td>
                                <td>
                                    {product.stockOnHand ?? "—"}
                                </td>
                                <td>
                                    <span
                                        className={`product-management__status ${
                                            product.isActive
                                                ? "product-management__status--active"
                                                : "product-management__status--inactive"
                                        }`}
                                    >
                                        {product.isActive
                                            ? "פעיל"
                                            : "לא פעיל"}
                                    </span>
                                </td>
                                <td>
                                    <div className="product-management__actions">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                startEdit(product)
                                            }
                                        >
                                            עריכה
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setProductActive(
                                                    product.id,
                                                    !product.isActive,
                                                )
                                            }
                                        >
                                            {product.isActive
                                                ? "השבתה"
                                                : "הפעלה"}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editingId && (
                <div
                    className="product-management__overlay"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            cancelEdit();
                        }
                    }}
                >
                    <div
                        className="product-management__dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="product-editor-title"
                    >
                        <header>
                            <div>
                                <p>PRODUCT</p>
                                <h2 id="product-editor-title">
                                    {editingId === "new"
                                        ? "פריט חדש"
                                        : "עריכת פריט"}
                                </h2>
                            </div>

                            <button
                                type="button"
                                className="product-management__close"
                                onClick={cancelEdit}
                                aria-label="סגירה"
                            >
                                ×
                            </button>
                        </header>

                        <div className="product-management__form">
                            <div className="product-management__languages">
                                <label>
                                    שם בעברית
                                    <input
                                        value={draft.names.he ?? ""}
                                        onChange={(event) =>
                                            updateName(
                                                "he",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </label>

                                <label dir="ltr">
                                    Name in English
                                    <input
                                        value={draft.names.en ?? ""}
                                        onChange={(event) =>
                                            updateName(
                                                "en",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </label>

                                <label dir="ltr">
                                    Όνομα στα Ελληνικά
                                    <input
                                        value={draft.names.el ?? ""}
                                        onChange={(event) =>
                                            updateName(
                                                "el",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </label>
                            </div>

                            <div className="product-management__form-grid">
                                <label>
                                    מחיר מכירה
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={draft.price}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                price:
                                                    event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label>
                                    מחיר עלות
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={draft.costPrice}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                costPrice:
                                                    event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label>
                                    קטגוריה
                                    <select
                                        value={draft.category}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                category:
                                                    event.target.value,
                                            }))
                                        }
                                    >
                                        {categories.map((category) => (
                                            <option
                                                key={category.id}
                                                value={category.id}
                                            >
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    מחלקה
                                    <input
                                        value={draft.department}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                department:
                                                    event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label>
                                    תת־קטגוריה
                                    <input
                                        value={draft.subcategory}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                subcategory:
                                                    event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label>
                                    מלאי נוכחי
                                    <input
                                        type="number"
                                        step="1"
                                        value={draft.stockOnHand}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                stockOnHand:
                                                    event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label>
                                    ספק
                                    <input
                                        value={draft.supplierName}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                supplierName:
                                                    event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label>
                                    SKU ספק
                                    <input
                                        dir="ltr"
                                        value={draft.supplierSku}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                supplierSku:
                                                    event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label>
                                    SKU
                                    <input
                                        dir="ltr"
                                        value={draft.sku}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                sku:
                                                    event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label>
                                    ברקוד
                                    <input
                                        dir="ltr"
                                        value={draft.barcode}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                barcode:
                                                    event.target.value,
                                            }))
                                        }
                                    />
                                </label>

                                <label className="product-management__wide">
                                    כתובת תמונה
                                    <input
                                        dir="ltr"
                                        value={draft.imageUrl}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                imageUrl:
                                                    event.target.value,
                                            }))
                                        }
                                    />
                                </label>
                            </div>

                            {error && (
                                <div className="product-management__error">
                                    {error}
                                </div>
                            )}
                        </div>

                        <footer>
                            <button
                                type="button"
                                className="product-management__secondary"
                                onClick={cancelEdit}
                            >
                                ביטול
                            </button>
                            <button
                                type="button"
                                className="product-management__primary"
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

export default ProductManagementPage;
