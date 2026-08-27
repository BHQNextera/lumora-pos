import {
useMemo,
    useState,
    useEffect,
} from "react";

import {
    useCatalog,
} from "../../context/useCatalog";
import {
    getInventoryHierarchyNodes,
    hydrateInventoryHierarchy,
    seedInventoryHierarchyFromProducts,
    subscribeInventoryHierarchy,
} from "../../models/inventory/InventoryHierarchyRepository";
import {
    getSuppliers,
    hydrateSuppliers,
    subscribeSuppliers,
} from "../../models/inventory/SupplierRepository";
import ProductVariantManagementDialog from "../../components/product/ProductVariantManagementDialog";
import {
    categorySeed,
} from "../../models/catalog/Category";
import type {
    Product,
    ProductLocalizedNames,
    ProductTaxClass,
} from "../../types/product";

import "./product-management-page.css";

import {
    resolveProductTaxRate,
} from "../../models/tax/TaxPolicy";
import {
    formatMoney,
} from "../../utils/MoneyFormatter";
type ProductDraft = {
    names: ProductLocalizedNames;
    price: string;
    costPrice: string;
    taxClass: ProductTaxClass;
    category: string;
    hierarchyCategory: string;
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
    taxClass: "standard",
    category: "hot-drinks",
    hierarchyCategory: "",
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
        taxClass:
            product.taxClass ??
            "standard",
        category:
            product.category,
        hierarchyCategory:
            product.hierarchy?.category ??
            "",
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

function formatGrossProfitPercent(
    sellingPriceIncludingVat: number,
    costPriceBeforeVat?: number,
    taxClass:
        ProductTaxClass =
        "standard",
) {
    if (
        costPriceBeforeVat === undefined ||
        !Number.isFinite(
            costPriceBeforeVat,
        ) ||
        costPriceBeforeVat < 0 ||
        !Number.isFinite(
            sellingPriceIncludingVat,
        ) ||
        sellingPriceIncludingVat <= 0
    ) {
        return "—";
    }

    const effectiveTaxRate =
        resolveProductTaxRate(
            taxClass,
        );

    const costIncludingTax =
        costPriceBeforeVat *
        (
            1 +
            effectiveTaxRate
        );

    const grossProfitPercent =
        (
            (
                sellingPriceIncludingVat -
                costIncludingTax
            ) /
            sellingPriceIncludingVat
        ) *
        100;

    return `${grossProfitPercent.toFixed(
        1,
    )}%`;
}

function getTaxClassLabel(
    taxClass?:
        ProductTaxClass,
) {
    switch (
        taxClass ??
        "standard"
    ) {
        case "exempt":
            return "פטור";

        case "zero_rate":
            return "שיעור 0%";

        case "standard_rate_always":
            return "שיעור רגיל תמיד";

        case "standard":
        default:
            return "רגיל";
    }
}
/* LUMORA PRODUCT EDITOR CLARITY + GP V1 */
function ProductManagementPage() {
    const {
        products,
        addProduct,
        updateProduct,
        setProductActive,
    } = useCatalog();

    /* LUMORA INVENTORY MASTER + ITEM HISTORY V1 */
    const [masterDataRevision, setMasterDataRevision] =
        useState(0);

    useEffect(() => {
        let alive = true;

        const refresh = () => {
            if (alive) {
                setMasterDataRevision((current) => current + 1);
            }
        };

        const unsubscribeSuppliers =
            subscribeSuppliers(refresh);
        const unsubscribeHierarchy =
            subscribeInventoryHierarchy(refresh);

        Promise.all([
            hydrateSuppliers(),
            hydrateInventoryHierarchy(),
        ])
            .then(() => {
                seedInventoryHierarchyFromProducts(products);
                refresh();
            })
            .catch(() => refresh());

        return () => {
            alive = false;
            unsubscribeSuppliers();
            unsubscribeHierarchy();
        };
    }, [products]);

    const [query, setQuery] = useState("");
    const [showInactive, setShowInactive] = useState(false);
    const [editingId, setEditingId] =
        useState<string | null>(null);
    const [draft, setDraft] =
        useState<ProductDraft>(emptyDraft);
    const [error, setError] =
        useState<string | null>(null);

    const [
        variantEditingProduct,
        setVariantEditingProduct,
    ] =
        useState<Product | null>(
            null,
        );

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

    const productSuppliers =
        getSuppliers();

    const hierarchyNodes =
        getInventoryHierarchyNodes();

    void masterDataRevision;

    const departmentOptions =
        hierarchyNodes.filter(
            (node) =>
                node.level === "department" &&
                node.isActive,
        );

    const selectedDepartment =
        departmentOptions.find(
            (node) =>
                node.name === draft.department,
        );

    const hierarchyCategoryOptions =
        hierarchyNodes.filter(
            (node) =>
                node.level === "category" &&
                node.isActive &&
                (!selectedDepartment ||
                    node.parentId === selectedDepartment.id),
        );

    const selectedHierarchyCategory =
        hierarchyCategoryOptions.find(
            (node) =>
                node.name === draft.hierarchyCategory,
        );

    const subcategoryOptions =
        hierarchyNodes.filter(
            (node) =>
                node.level === "subcategory" &&
                node.isActive &&
                (!selectedHierarchyCategory ||
                    node.parentId === selectedHierarchyCategory.id),
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

        const priceValue =
            draft.price.trim();

        if (!priceValue) {
            setError("יש להזין מחיר מכירה.");
            return;
        }

        const price = Number(priceValue);

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

        const selectedSupplier =
            draft.supplierName.trim()
                ? productSuppliers.find(
                      (supplier) =>
                          supplier.name ===
                          draft.supplierName.trim(),
                  )
                : undefined;

        if (
            draft.supplierName.trim() &&
            !selectedSupplier
        ) {
            setError(
                "יש לבחור ספק מטבלת הספקים.",
            );
            return;
        }

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
            taxClass:
                draft.taxClass,
            category:
                draft.category as Product["category"],
            hierarchy: {
                department:
                    draft.department.trim() ||
                    parent?.name ||
                    current?.hierarchy?.department,
                category:
                    draft.hierarchyCategory.trim() ||
                    category?.name ||
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
                              selectedSupplier?.id ??
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

            styleCode:
                current?.styleCode,

            variants:
                current?.variants,

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
                            <th>עלות</th>
                            <th>GP%</th>
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
                                    <small className="product-management__tax-class">
                                        מס · {getTaxClassLabel(
                                            product.taxClass,
                                        )}
                                    </small>
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
                                    <span className="lumora-money-value">
                                        {formatMoney(
                                            product.price,
                                        )}
                                    </span>
                                </td>
                                <td>
                                    {product.costPrice ===
                                    undefined
                                        ? "—"
                                        : (
                                              <span className="lumora-money-value">
                                                  {formatMoney(
                                                      product.costPrice,
                                                  )}
                                              </span>
                                          )}
                                </td>
                                <td>
                                    {formatGrossProfitPercent(
                                        product.price,
                                        product.costPrice,
                                        product.taxClass,
                                    )}
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
                                                setVariantEditingProduct(
                                                    product,
                                                )
                                            }
                                        >
                                            וריאנטים
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

            {variantEditingProduct && (
                <ProductVariantManagementDialog
                    product={
                        variantEditingProduct
                    }
                    products={
                        products
                    }
                    onClose={() =>
                        setVariantEditingProduct(
                            null,
                        )
                    }
                    onSave={(product) => {
                        updateProduct(
                            product,
                        );

                        setVariantEditingProduct(
                            null,
                        );
                    }}
                />
            )}

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
                            <div className="product-management__required-note">
                                <span aria-hidden="true">*</span>
                                שדות חובה · יש להזין שם פריט לפחות בשפה אחת
                            </div>

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
                                    <span className="product-management__label-text">מחיר מכירה <span className="product-management__required-mark" aria-hidden="true">*</span></span>
                                    <input aria-required="true"
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

                                <label className="product-management__calculated-field">
                                    רווחיות GP%
                                    <input
                                        type="text"
                                        className="product-management__calculated-input"
                                        dir="ltr"
                                        readOnly
                                        tabIndex={-1}
                                        value={formatGrossProfitPercent(
                                            Number(draft.price),
                                            draft.costPrice.trim()
                                                ? Number(
                                                      draft.costPrice,
                                                  )
                                                : undefined,
                                            draft.taxClass,
                                        )}
                                        title="מחושב לפי סיווג המס של הפריט ופרופיל המס הפעיל בסניף"
                                    />
                                </label>

                                <label>
                                    סיווג מס
                                    <select
                                        value={draft.taxClass}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                taxClass:
                                                    event.target.value as ProductTaxClass,
                                            }))
                                        }
                                    >
                                        <option value="standard">
                                            רגיל — לפי פרופיל הסניף
                                        </option>
                                        <option value="exempt">
                                            פטור ממע״מ
                                        </option>
                                        <option value="zero_rate">
                                            שיעור 0%
                                        </option>
                                        <option value="standard_rate_always">
                                            חייב בשיעור רגיל גם בפרופיל אילת
                                        </option>
                                    </select>
                                </label>

                                <label>
                                    קטגוריית קופה
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
                                    <select
                                        value={draft.department}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                department:
                                                    event.target.value,
                                                hierarchyCategory: "",
                                                subcategory: "",
                                            }))
                                        }
                                    >
                                        <option value="">
                                            ללא שיוך
                                        </option>
                                        {draft.department &&
                                            !departmentOptions.some(
                                                (node) => node.name === draft.department,
                                            ) && (
                                            <option value={draft.department}>
                                                {draft.department}
                                            </option>
                                        )}
                                        {departmentOptions.map((node) => (
                                            <option
                                                key={node.id}
                                                value={node.name}
                                            >
                                                {node.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    קטגוריית היררכיה
                                    <select
                                        value={draft.hierarchyCategory}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                hierarchyCategory:
                                                    event.target.value,
                                                subcategory: "",
                                            }))
                                        }
                                    >
                                        <option value="">
                                            ללא שיוך
                                        </option>
                                        {draft.hierarchyCategory &&
                                            !hierarchyCategoryOptions.some(
                                                (node) => node.name === draft.hierarchyCategory,
                                            ) && (
                                            <option value={draft.hierarchyCategory}>
                                                {draft.hierarchyCategory}
                                            </option>
                                        )}
                                        {hierarchyCategoryOptions.map((node) => (
                                            <option
                                                key={node.id}
                                                value={node.name}
                                            >
                                                {node.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    תת־קטגוריה
                                    <select
                                        value={draft.subcategory}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                subcategory:
                                                    event.target.value,
                                            }))
                                        }
                                    >
                                        <option value="">
                                            ללא שיוך
                                        </option>
                                        {draft.subcategory &&
                                            !subcategoryOptions.some(
                                                (node) => node.name === draft.subcategory,
                                            ) && (
                                            <option value={draft.subcategory}>
                                                {draft.subcategory}
                                            </option>
                                        )}
                                        {subcategoryOptions.map((node) => (
                                            <option
                                                key={node.id}
                                                value={node.name}
                                            >
                                                {node.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    מלאי נוכחי
                                    <input
                                        type="number"
                                        step="1"
                                        value={draft.stockOnHand}
                                        readOnly
                                    />

                                    <small className="product-management__inventory-hint">
                                        שינוי מלאי מתבצע בלשונית התאמות מלאי.
                                    </small>
                                </label>

                                <label>
                                    ספק
                                    <select
                                        value={draft.supplierName}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                supplierName:
                                                    event.target.value,
                                            }))
                                        }
                                    >
                                        <option value="">
                                            ללא ספק
                                        </option>
                                        {draft.supplierName &&
                                            !productSuppliers.some(
                                                (supplier) =>
                                                    supplier.name === draft.supplierName,
                                            ) && (
                                            <option value={draft.supplierName}>
                                                {draft.supplierName} · ספק ישן
                                            </option>
                                        )}
                                        {productSuppliers
                                            .filter(
                                                (supplier) =>
                                                    supplier.isActive ||
                                                    supplier.name === draft.supplierName,
                                            )
                                            .map((supplier) => (
                                                <option
                                                    key={supplier.id}
                                                    value={supplier.name}
                                                >
                                                    {supplier.name}
                                                    {!supplier.isActive
                                                        ? " · לא פעיל"
                                                        : ""}
                                                </option>
                                            ))}
                                    </select>
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
                                    <span className="product-management__label-text">SKU <span className="product-management__required-mark" aria-hidden="true">*</span></span>
                                    <input aria-required="true"
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
                                    <span className="product-management__label-text">ברקוד <span className="product-management__required-mark" aria-hidden="true">*</span></span>
                                    <input aria-required="true"
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
