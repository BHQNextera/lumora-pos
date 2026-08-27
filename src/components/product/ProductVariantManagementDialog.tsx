import {
    useMemo,
    useState,
} from "react";

import type {
    ProductVariant,
} from "../../models/catalog/ProductVariantIdentity";
import type {
    Product,
} from "../../types/product";

type ProductVariantManagementDialogProps = {
    product: Product;

    products: Product[];

    onSave: (
        product: Product,
    ) => void;

    onClose: () => void;
};

type VariantDraft = {
    variantId: string;

    colorCode: string;
    colorName: string;

    sizeCode: string;
    sizeName: string;

    sku: string;
    barcode: string;

    price: string;
    stockOnHand: string;

    isActive: boolean;
};

function variantToDraft(
    variant: ProductVariant,
): VariantDraft {
    return {
        variantId:
            variant.variantId,

        colorCode:
            variant.color.code,

        colorName:
            variant.color.name,

        sizeCode:
            variant.size.code,

        sizeName:
            variant.size.name,

        sku:
            variant.sku,

        barcode:
            variant.barcode,

        price:
            variant.price ===
            undefined
                ? ""
                : String(
                      variant.price,
                  ),

        stockOnHand:
            variant.stockOnHand ===
            undefined
                ? ""
                : String(
                      variant.stockOnHand,
                  ),

        isActive:
            variant.isActive,
    };
}

function createEmptyVariant():
VariantDraft {
    return {
        variantId:
            crypto.randomUUID(),

        colorCode:
            "",
        colorName:
            "",

        sizeCode:
            "",
        sizeName:
            "",

        sku:
            "",
        barcode:
            "",

        price:
            "",
        stockOnHand:
            "",

        isActive:
            true,
    };
}

function ProductVariantManagementDialog({
    product,
    products,
    onSave,
    onClose,
}: ProductVariantManagementDialogProps) {
    const [
        styleCode,
        setStyleCode,
    ] =
        useState(
            product.styleCode ??
            product.sku,
        );

    const [
        variants,
        setVariants,
    ] =
        useState<VariantDraft[]>(
            () =>
                product.variants?.map(
                    variantToDraft,
                ) ?? [],
        );

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null,
        );

    const activeCount =
        useMemo(
            () =>
                variants.filter(
                    (variant) =>
                        variant.isActive,
                ).length,
            [variants],
        );

    const updateVariant = (
        variantId: string,
        patch:
            Partial<VariantDraft>,
    ) => {
        setVariants(
            (current) =>
                current.map(
                    (variant) =>
                        variant.variantId ===
                        variantId
                            ? {
                                  ...variant,
                                  ...patch,
                              }
                            : variant,
                ),
        );
    };

    const addVariant = () => {
        setVariants(
            (current) => [
                ...current,
                createEmptyVariant(),
            ],
        );

        setError(null);
    };

    const removeVariant = (
        variantId: string,
    ) => {
        setVariants(
            (current) =>
                current.filter(
                    (variant) =>
                        variant.variantId !==
                        variantId,
                ),
        );

        setError(null);
    };

    const save = () => {
        const normalizedStyleCode =
            styleCode.trim();

        if (!normalizedStyleCode) {
            setError(
                "יש להזין קוד דגם / Style.",
            );

            return;
        }

        if (variants.length === 0) {
            setError(
                "יש להוסיף לפחות וריאנט אחד.",
            );

            return;
        }

        const normalizedVariants:
            ProductVariant[] = [];

        const localSkus =
            new Set<string>();

        const localBarcodes =
            new Set<string>();

        for (
            const draft of variants
        ) {
            const colorCode =
                draft.colorCode
                    .trim();

            const colorName =
                draft.colorName
                    .trim();

            const sizeCode =
                draft.sizeCode
                    .trim();

            const sizeName =
                draft.sizeName
                    .trim();

            const sku =
                draft.sku.trim();

            const barcode =
                draft.barcode.trim();

            if (
                !colorCode ||
                !colorName
            ) {
                setError(
                    "לכל וריאנט חייבים להיות קוד ושם צבע.",
                );

                return;
            }

            if (
                !sizeCode ||
                !sizeName
            ) {
                setError(
                    "לכל וריאנט חייבים להיות קוד ושם מידה.",
                );

                return;
            }

            if (!sku) {
                setError(
                    "לכל וריאנט חייב להיות SKU.",
                );

                return;
            }

            if (!barcode) {
                setError(
                    "לכל וריאנט חייב להיות ברקוד.",
                );

                return;
            }

            const normalizedSku =
                sku.toLowerCase();

            if (
                localSkus.has(
                    normalizedSku,
                )
            ) {
                setError(
                    `SKU כפול בתוך המוצר: ${sku}`,
                );

                return;
            }

            if (
                localBarcodes.has(
                    barcode,
                )
            ) {
                setError(
                    `ברקוד כפול בתוך המוצר: ${barcode}`,
                );

                return;
            }

            localSkus.add(
                normalizedSku,
            );

            localBarcodes.add(
                barcode,
            );

            const duplicate =
                products.some(
                    (otherProduct) => {
                        if (
                            otherProduct.id ===
                            product.id
                        ) {
                            return false;
                        }

                        if (
                            otherProduct.sku
                                .toLowerCase() ===
                                normalizedSku ||
                            otherProduct.barcode ===
                                barcode
                        ) {
                            return true;
                        }

                        return (
                            otherProduct.variants
                                ?.some(
                                    (
                                        otherVariant,
                                    ) =>
                                        otherVariant.sku
                                            .toLowerCase() ===
                                            normalizedSku ||
                                        otherVariant.barcode ===
                                            barcode,
                                ) ??
                            false
                        );
                    },
                );

            if (duplicate) {
                setError(
                    `SKU או ברקוד כבר קיימים בפריט אחר: ${sku}`,
                );

                return;
            }

            const price =
                draft.price.trim()
                    ? Number(
                          draft.price,
                      )
                    : undefined;

            const stockOnHand =
                draft.stockOnHand.trim()
                    ? Number(
                          draft.stockOnHand,
                      )
                    : undefined;

            if (
                price !== undefined &&
                (
                    !Number.isFinite(
                        price,
                    ) ||
                    price < 0
                )
            ) {
                setError(
                    `מחיר וריאנט אינו תקין: ${sku}`,
                );

                return;
            }

            if (
                stockOnHand !==
                    undefined &&
                (
                    !Number.isFinite(
                        stockOnHand,
                    ) ||
                    stockOnHand < 0
                )
            ) {
                setError(
                    `מלאי וריאנט אינו תקין: ${sku}`,
                );

                return;
            }

            normalizedVariants.push(
                {
                    variantId:
                        draft.variantId,

                    styleCode:
                        normalizedStyleCode,

                    color: {
                        code:
                            colorCode,
                        name:
                            colorName,
                    },

                    size: {
                        code:
                            sizeCode,
                        name:
                            sizeName,
                    },

                    sku,
                    barcode,

                    price,

                    stockOnHand,

                    isActive:
                        draft.isActive,
                },
            );
        }

        const duplicateStyle =
            products.some(
                (otherProduct) =>
                    otherProduct.id !==
                        product.id &&
                    otherProduct.styleCode
                        ?.toLowerCase() ===
                        normalizedStyleCode
                            .toLowerCase(),
            );

        if (duplicateStyle) {
            setError(
                "קוד ה־Style כבר קיים במוצר אחר.",
            );

            return;
        }

        const aggregateStock =
            normalizedVariants.reduce(
                (
                    total,
                    variant,
                ) =>
                    total +
                    (
                        variant.stockOnHand ??
                        0
                    ),
                0,
            );

        onSave({
            ...product,

            styleCode:
                normalizedStyleCode,

            variants:
                normalizedVariants,

            stockOnHand:
                aggregateStock,
        });
    };

    return (
        <div
            role="presentation"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    onClose();
                }
            }}
            style={{
                position:
                    "fixed",
                inset:
                    0,
                zIndex:
                    8000,
                display:
                    "grid",
                placeItems:
                    "center",
                padding:
                    "24px",
                background:
                    "rgba(15,23,42,.38)",
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                dir="rtl"
                style={{
                    width:
                        "min(1100px, 96vw)",
                    maxHeight:
                        "90vh",
                    overflow:
                        "auto",
                    padding:
                        "22px",
                    borderRadius:
                        "16px",
                    background:
                        "#fff",
                }}
            >
                <header
                    style={{
                        display:
                            "flex",
                        alignItems:
                            "center",
                        justifyContent:
                            "space-between",
                        gap:
                            "16px",
                    }}
                >
                    <div>
                        <h2
                            style={{
                                margin:
                                    0,
                            }}
                        >
                            וריאנטים —{" "}
                            {
                                product.name
                            }
                        </h2>

                        <div>
                            {
                                activeCount
                            }{" "}
                            וריאנטים פעילים
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                    >
                        ×
                    </button>
                </header>

                <div
                    style={{
                        marginTop:
                            "20px",
                    }}
                >
                    <label>
                        קוד דגם / Style
                        <input
                            dir="ltr"
                            value={
                                styleCode
                            }
                            onChange={(
                                event,
                            ) =>
                                setStyleCode(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            style={{
                                display:
                                    "block",
                                width:
                                    "280px",
                                marginTop:
                                    "6px",
                            }}
                        />
                    </label>
                </div>

                <div
                    style={{
                        marginTop:
                            "20px",
                        overflowX:
                            "auto",
                    }}
                >
                    <table
                        style={{
                            width:
                                "100%",
                            borderCollapse:
                                "collapse",
                        }}
                    >
                        <thead>
                            <tr>
                                <th>
                                    צבע
                                </th>
                                <th>
                                    מידה
                                </th>
                                <th>
                                    SKU
                                </th>
                                <th>
                                    ברקוד
                                </th>
                                <th>
                                    מחיר
                                </th>
                                <th>
                                    מלאי נוכחי
                                </th>
                                <th>
                                    פעיל
                                </th>
                                <th>
                                    פעולה
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {variants.map(
                                (
                                    variant,
                                ) => (
                                    <tr
                                        key={
                                            variant.variantId
                                        }
                                    >
                                        <td>
                                            <input
                                                placeholder="קוד"
                                                value={
                                                    variant.colorCode
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateVariant(
                                                        variant.variantId,
                                                        {
                                                            colorCode:
                                                                event
                                                                    .target
                                                                    .value,
                                                        },
                                                    )
                                                }
                                                style={{
                                                    width:
                                                        "70px",
                                                }}
                                            />

                                            <input
                                                placeholder="שם צבע"
                                                value={
                                                    variant.colorName
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateVariant(
                                                        variant.variantId,
                                                        {
                                                            colorName:
                                                                event
                                                                    .target
                                                                    .value,
                                                        },
                                                    )
                                                }
                                                style={{
                                                    width:
                                                        "90px",
                                                }}
                                            />
                                        </td>

                                        <td>
                                            <input
                                                placeholder="קוד"
                                                value={
                                                    variant.sizeCode
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateVariant(
                                                        variant.variantId,
                                                        {
                                                            sizeCode:
                                                                event
                                                                    .target
                                                                    .value,
                                                        },
                                                    )
                                                }
                                                style={{
                                                    width:
                                                        "60px",
                                                }}
                                            />

                                            <input
                                                placeholder="שם"
                                                value={
                                                    variant.sizeName
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateVariant(
                                                        variant.variantId,
                                                        {
                                                            sizeName:
                                                                event
                                                                    .target
                                                                    .value,
                                                        },
                                                    )
                                                }
                                                style={{
                                                    width:
                                                        "60px",
                                                }}
                                            />
                                        </td>

                                        <td>
                                            <input
                                                dir="ltr"
                                                value={
                                                    variant.sku
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateVariant(
                                                        variant.variantId,
                                                        {
                                                            sku:
                                                                event
                                                                    .target
                                                                    .value,
                                                        },
                                                    )
                                                }
                                            />
                                        </td>

                                        <td>
                                            <input
                                                dir="ltr"
                                                value={
                                                    variant.barcode
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateVariant(
                                                        variant.variantId,
                                                        {
                                                            barcode:
                                                                event
                                                                    .target
                                                                    .value,
                                                        },
                                                    )
                                                }
                                            />
                                        </td>

                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={
                                                    variant.price
                                                }
                                                placeholder={`ברירת מחדל ${product.price}`}
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateVariant(
                                                        variant.variantId,
                                                        {
                                                            price:
                                                                event
                                                                    .target
                                                                    .value,
                                                        },
                                                    )
                                                }
                                                style={{
                                                    width:
                                                        "100px",
                                                }}
                                            />
                                        </td>

                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={
                                                    variant.stockOnHand
                                                }
                                                readOnly
                                                title="שינוי מלאי מתבצע במסך התאמות מלאי"
                                                style={{
                                                    width:
                                                        "80px",
                                                    background:
                                                        "#f3f4f6",
                                                    color:
                                                        "#6b7280",
                                                }}
                                            />
                                        </td>

                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={
                                                    variant.isActive
                                                }
                                                onChange={(
                                                    event,
                                                ) =>
                                                    updateVariant(
                                                        variant.variantId,
                                                        {
                                                            isActive:
                                                                event
                                                                    .target
                                                                    .checked,
                                                        },
                                                    )
                                                }
                                            />
                                        </td>

                                        <td>
                                            <button
                                                type="button"
                                                disabled={
                                                    Number(
                                                        variant.stockOnHand ||
                                                        0,
                                                    ) !== 0
                                                }
                                                title={
                                                    Number(
                                                        variant.stockOnHand ||
                                                        0,
                                                    ) !== 0
                                                        ? "יש לאפס את המלאי דרך התאמות מלאי לפני מחיקת הווריאנט"
                                                        : undefined
                                                }
                                                onClick={() =>
                                                    removeVariant(
                                                        variant.variantId,
                                                    )
                                                }
                                            >
                                                מחיקה
                                            </button>
                                        </td>
                                    </tr>
                                ),
                            )}
                        </tbody>
                    </table>
                </div>

                <div
                    style={{
                        marginTop:
                            "10px",
                        color:
                            "#6b7280",
                        fontSize:
                            "13px",
                    }}
                >
                    שינוי מלאי מתבצע בלשונית התאמות מלאי.
                </div>

                <button
                    type="button"
                    onClick={
                        addVariant
                    }
                    style={{
                        marginTop:
                            "14px",
                    }}
                >
                    + וריאנט
                </button>

                {error && (
                    <div
                        style={{
                            marginTop:
                                "16px",
                            padding:
                                "10px",
                            border:
                                "1px solid #dc2626",
                        }}
                    >
                        {error}
                    </div>
                )}

                <footer
                    style={{
                        display:
                            "flex",
                        justifyContent:
                            "flex-end",
                        gap:
                            "10px",
                        marginTop:
                            "20px",
                    }}
                >
                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                    >
                        ביטול
                    </button>

                    <button
                        type="button"
                        onClick={
                            save
                        }
                    >
                        שמירת וריאנטים
                    </button>
                </footer>
            </div>
        </div>
    );
}

export default ProductVariantManagementDialog;
