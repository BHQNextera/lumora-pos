import {
    getPromotions,
} from "../../models/promotion/PromotionRepository";
import type {
    Promotion,
} from "../../models/promotion/Promotion";
import type {
    Product,
} from "../../types/product";

type ProductInfoDialogProps = {
    product: Product;
    canViewCostPrice: boolean;
    canViewGrossMargin: boolean;
    onClose: () => void;
};

function productParticipates(
    product: Product,
    promotion: Promotion,
) {
    if (!promotion.isActive) {
        return false;
    }

    if (
        promotion.excludedProductIds?.includes(
            product.id,
        )
    ) {
        return false;
    }

    if (
        promotion.excludedCategoryIds?.includes(
            product.category,
        )
    ) {
        return false;
    }

    if (
        promotion.target.type ===
        "product"
    ) {
        return promotion.target.productIds.includes(
            product.id,
        );
    }

    return promotion.target.categoryIds.includes(
        product.category,
    );
}

function ProductInfoDialog({
    product,
    canViewCostPrice,
    canViewGrossMargin,
    onClose,
}: ProductInfoDialogProps) {
    const promotions =
        getPromotions().filter(
            (promotion) =>
                productParticipates(
                    product,
                    promotion,
                ),
        );

    const grossProfit =
        product.costPrice !== undefined
            ? product.price -
            product.costPrice
            : null;

    const grossMargin =
        product.costPrice !== undefined &&
            product.price > 0
            ? (
                (
                    product.price -
                    product.costPrice
                ) /
                product.price
            ) * 100
            : null;

    const hierarchy =
        [
            product.hierarchy
                ?.department,
            product.hierarchy
                ?.category,
            product.hierarchy
                ?.subcategory,
        ]
            .filter(Boolean)
            .join(" ← ");

    return (
        <div
            role="presentation"
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 5000,
                display: "grid",
                placeItems: "center",
                padding: "24px",
                background:
                    "rgba(15, 23, 42, 0.42)",
                direction: "rtl",
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                onClick={(event) =>
                    event.stopPropagation()
                }
                style={{
                    width:
                        "min(620px, 100%)",
                    maxHeight: "86vh",
                    overflow: "auto",
                    background: "#fff",
                    borderRadius: "18px",
                    boxShadow:
                        "0 24px 70px rgba(0,0,0,.22)",
                }}
            >
                <header
                    style={{
                        display: "flex",
                        justifyContent:
                            "space-between",
                        alignItems: "center",
                        padding: "18px 20px",
                        borderBottom:
                            "1px solid #e5e7eb",
                    }}
                >
                    <div>
                        <span
                            style={{
                                fontSize: "11px",
                                opacity: 0.6,
                            }}
                        >
                            פרטי פריט
                        </span>

                        <h2
                            style={{
                                margin: "2px 0 0",
                                fontSize: "20px",
                            }}
                        >
                            {product.name}
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="סגור"
                        style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "50%",
                            border:
                                "1px solid #d1d5db",
                            background: "#fff",
                            cursor: "pointer",
                            fontSize: "20px",
                        }}
                    >
                        ×
                    </button>
                </header>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "120px 1fr",
                        gap: "20px",
                        padding: "20px",
                    }}
                >
                    <img
                        src={product.imageUrl}
                        alt=""
                        style={{
                            width: "120px",
                            height: "120px",
                            borderRadius: "14px",
                            objectFit: "cover",
                        }}
                    />

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(2, minmax(0, 1fr))",
                            gap: "14px",
                        }}
                    >
                        <Info
                            label="מחיר מכירה"
                            value={`₪${product.price.toFixed(
                                2,
                            )}`}
                        />

                        {canViewCostPrice &&
                            product.costPrice !==
                            undefined && (
                                <Info
                                    label="מחיר עלות"
                                    value={`₪${product.costPrice.toFixed(
                                        2,
                                    )}`}
                                />
                            )}

                        {canViewGrossMargin &&
                            grossProfit !==
                            null && (
                                <Info
                                    label="רווח גולמי"
                                    value={`₪${grossProfit.toFixed(
                                        2,
                                    )}`}
                                />
                            )}

                        {canViewGrossMargin &&
                            grossMargin !==
                            null && (
                                <Info
                                    label="מרווח גולמי"
                                    value={`${grossMargin.toFixed(
                                        1,
                                    )}%`}
                                />
                            )}

                        <Info
                            label="מק״ט"
                            value={product.sku}
                        />

                        <Info
                            label="ברקוד"
                            value={
                                product.barcode
                            }
                        />

                        <Info
                            label="מלאי בסניף"
                            value={
                                product.stockOnHand !==
                                    undefined
                                    ? String(
                                        product.stockOnHand,
                                    )
                                    : "לא זמין"
                            }
                        />
                    </div>
                </div>

                <Section
                    title="ספק"
                    value={
                        product.supplier
                            ? `${product.supplier.name}${product.supplier
                                .supplierSku
                                ? ` · מק״ט ספק: ${product.supplier.supplierSku}`
                                : ""
                            }`
                            : "לא הוגדר"
                    }
                />

                <Section
                    title="היררכיית פריט"
                    value={
                        hierarchy ||
                        product.category
                    }
                />

                <div
                    style={{
                        padding:
                            "0 20px 22px",
                    }}
                >
                    <h3
                        style={{
                            margin: "0 0 9px",
                            fontSize: "14px",
                        }}
                    >
                        מבצעים
                    </h3>

                    {promotions.length ===
                        0 ? (
                        <span
                            style={{
                                fontSize: "12px",
                                opacity: 0.6,
                            }}
                        >
                            אין כרגע מבצעים פעילים לפריט
                        </span>
                    ) : (
                        <div
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "7px",
                            }}
                        >
                            {promotions.map(
                                (
                                    promotion,
                                ) => (
                                    <span
                                        key={
                                            promotion.id
                                        }
                                        style={{
                                            padding:
                                                "6px 10px",
                                            borderRadius:
                                                "999px",
                                            background:
                                                "#f3f4f6",
                                            fontSize:
                                                "11px",
                                        }}
                                    >
                                        {
                                            promotion.name
                                        }
                                    </span>
                                ),
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

function Info({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div>
            <span
                style={{
                    display: "block",
                    fontSize: "10px",
                    opacity: 0.58,
                }}
            >
                {label}
            </span>

            <strong
                style={{
                    display: "block",
                    marginTop: "3px",
                    fontSize: "13px",
                }}
            >
                {value}
            </strong>
        </div>
    );
}

function Section({
    title,
    value,
}: {
    title: string;
    value: string;
}) {
    return (
        <div
            style={{
                padding:
                    "0 20px 18px",
            }}
        >
            <h3
                style={{
                    margin: "0 0 5px",
                    fontSize: "14px",
                }}
            >
                {title}
            </h3>

            <span
                style={{
                    fontSize: "12px",
                    opacity: 0.75,
                }}
            >
                {value}
            </span>
        </div>
    );
}

export default ProductInfoDialog;