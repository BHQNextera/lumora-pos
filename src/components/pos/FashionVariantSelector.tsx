import {
    useMemo,
    useState,
} from "react";

import type {
    FashionProduct,
} from "../../models/catalog/FashionProduct";
import type {
    ProductVariant,
} from "../../models/catalog/ProductVariantIdentity";

type FashionVariantSelectorProps = {
    product:
        FashionProduct;

    onSelect: (
        variant: ProductVariant,
    ) => void;

    onClose: () => void;
};

function FashionVariantSelector({
    product,
    onSelect,
    onClose,
}: FashionVariantSelectorProps) {
    const [
        selectedColor,
        setSelectedColor,
    ] =
        useState<string | null>(
            null,
        );

    const [
        selectedSize,
        setSelectedSize,
    ] =
        useState<string | null>(
            null,
        );

    const colors =
        useMemo(
            () =>
                Array.from(
                    new Map(
                        product.variants
                            .filter(
                                (variant) =>
                                    variant.isActive,
                            )
                            .map(
                                (variant) => [
                                    variant.color.code,
                                    variant.color,
                                ],
                            ),
                    ).values(),
                ),
            [product],
        );

    const sizes =
        useMemo(
            () =>
                Array.from(
                    new Map(
                        product.variants
                            .filter(
                                (variant) =>
                                    variant.isActive &&
                                    variant.color.code ===
                                        selectedColor,
                            )
                            .map(
                                (variant) => [
                                    variant.size.code,
                                    variant.size,
                                ],
                            ),
                    ).values(),
                ),
            [
                product,
                selectedColor,
            ],
        );

    const selectedVariant =
        product.variants.find(
            (variant) =>
                variant.isActive &&
                variant.color.code ===
                    selectedColor &&
                variant.size.code ===
                    selectedSize,
        );

    return (
        <div
            role="presentation"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 7000,
                display: "grid",
                placeItems: "center",
                padding: "24px",
                background:
                    "rgba(15,23,42,.35)",
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                dir="rtl"
                style={{
                    width:
                        "min(520px, 100%)",
                    padding: "22px",
                    borderRadius: "16px",
                    background: "#fff",
                }}
            >
                <h2>
                    {product.name}
                </h2>

                <div dir="ltr">
                    {product.styleCode}
                </div>

                <h3>
                    צבע
                </h3>

                <div
                    style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                    }}
                >
                    {colors.map(
                        (color) => {
                            const selected =
                                selectedColor ===
                                color.code;

                            return (
                                <button
                                    key={
                                        color.code
                                    }
                                    type="button"
                                    aria-pressed={
                                        selected
                                    }
                                    onClick={() => {
                                        setSelectedColor(
                                            color.code,
                                        );

                                        setSelectedSize(
                                            null,
                                        );
                                    }}
                                    style={{
                                        minWidth:
                                            "88px",
                                        minHeight:
                                            "42px",
                                        border:
                                            selected
                                                ? "2px solid #111827"
                                                : "1px solid #cfd6d3",
                                        background:
                                            selected
                                                ? "#e8f5ee"
                                                : "#fff",
                                        fontWeight:
                                            selected
                                                ? 800
                                                : 600,
                                        cursor:
                                            "pointer",
                                    }}
                                >
                                    {selected
                                        ? "✓ "
                                        : ""}
                                    {
                                        color.name
                                    }
                                </button>
                            );
                        },
                    )}
                </div>

                <h3>
                    מידה
                </h3>

                {!selectedColor && (
                    <p>
                        יש לבחור צבע תחילה
                    </p>
                )}

                <div
                    style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                    }}
                >
                    {sizes.map(
                        (size) => {
                            const selected =
                                selectedSize ===
                                size.code;

                            return (
                                <button
                                    key={
                                        size.code
                                    }
                                    type="button"
                                    aria-pressed={
                                        selected
                                    }
                                    onClick={() =>
                                        setSelectedSize(
                                            size.code,
                                        )
                                    }
                                    style={{
                                        minWidth:
                                            "64px",
                                        minHeight:
                                            "42px",
                                        border:
                                            selected
                                                ? "2px solid #111827"
                                                : "1px solid #cfd6d3",
                                        background:
                                            selected
                                                ? "#e8f5ee"
                                                : "#fff",
                                        fontWeight:
                                            selected
                                                ? 800
                                                : 600,
                                        cursor:
                                            "pointer",
                                    }}
                                >
                                    {selected
                                        ? "✓ "
                                        : ""}
                                    {
                                        size.name
                                    }
                                </button>
                            );
                        },
                    )}
                </div>

                {selectedVariant && (
                    <div
                        style={{
                            marginTop:
                                "18px",
                            padding:
                                "12px",
                            border:
                                "1px solid #d8dfdc",
                            borderRadius:
                                "10px",
                        }}
                    >
                        <strong>
                            {
                                selectedVariant
                                    .color
                                    .name
                            }
                            {" / "}
                            {
                                selectedVariant
                                    .size
                                    .name
                            }
                        </strong>

                        <div>
                            SKU:{" "}
                            {
                                selectedVariant
                                    .sku
                            }
                        </div>

                        <div>
                            מלאי:{" "}
                            {
                                selectedVariant
                                    .stockOnHand ??
                                0
                            }
                        </div>
                    </div>
                )}

                <div
                    style={{
                        display: "flex",
                        gap: "10px",
                        marginTop: "20px",
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
                        disabled={
                            !selectedVariant
                        }
                        onClick={() => {
                            if (
                                selectedVariant
                            ) {
                                onSelect(
                                    selectedVariant,
                                );
                            }
                        }}
                    >
                        {selectedVariant
                            ? `הוסף ${selectedVariant.color.name} / ${selectedVariant.size.name}`
                            : "בחר צבע ומידה"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default FashionVariantSelector;