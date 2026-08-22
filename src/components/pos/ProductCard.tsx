import {
    useState,
} from "react";

import {
    getActiveBusinessOperatingProfile,
} from "../../config/ActiveBusinessConfiguration";
import type {
    Product,
} from "../../types/product";
import ProductInfoDialog from "./ProductInfoDialog";

type ProductCardProps = {
    product: Product;

    onSelect: (
        product: Product,
    ) => void;
};

function ProductCard({
    product,
    onSelect,
}: ProductCardProps) {
    const posCapabilities =
        getActiveBusinessOperatingProfile()
            .pos;

    const [
        showInfo,
        setShowInfo,
    ] = useState(false);

    return (
        <>
            <div
                className="product-card"
                style={{
                    position: "relative",
                }}
            >
                <button
                    type="button"
                    onClick={() =>
                        onSelect(product)
                    }
                    aria-label={`הוסף ${product.name} לעגלה`}
                    style={{
                        all: "unset",
                        display: "block",
                        width: "100%",
                        cursor: "pointer",
                    }}
                >
                    <div className="product-card__image-wrapper">
                        <img
                            src={product.imageUrl}
                            alt=""
                            aria-hidden="true"
                            className="product-card__image-backdrop"
                            loading="lazy"
                        />

                        <img
                            src={product.imageUrl}
                            alt=""
                            className="product-card__image"
                            loading="lazy"
                        />
                    </div>

                    <div className="product-card__content">
                        <strong>
                            {product.name}
                        </strong>

                        <span>
                            ₪
                            {product.price.toFixed(
                                2,
                            )}
                        </span>
                    </div>
                </button>

                <button
                    type="button"
                    title="פרטי פריט"
                    aria-label={`פרטי ${product.name}`}
                    onClick={(event) => {
                        event.stopPropagation();
                        setShowInfo(true);
                    }}
                    style={{
                        position: "absolute",
                        top: "7px",
                        left: "7px",
                        zIndex: 3,
                        width: "28px",
                        height: "28px",
                        display: "grid",
                        placeItems: "center",
                        borderRadius: "50%",
                        border:
                            "1px solid rgba(15,23,42,.16)",
                        background:
                            "rgba(255,255,255,.94)",
                        fontWeight: 700,
                        fontSize: "13px",
                        cursor: "pointer",
                    }}
                >
                    i
                </button>
            </div>

            {showInfo && (
                <ProductInfoDialog
                    product={product}
                    canViewCostPrice={
                        posCapabilities.showProductCostPrice
                    }
                    canViewGrossMargin={
                        posCapabilities.showProductGrossMargin
                    }
                    onClose={() =>
                        setShowInfo(false)
                    }
                />
            )}
        </>
    );
}

export default ProductCard;