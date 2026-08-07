import type { Product } from "../../types/product";

type ProductCardProps = {
    product: Product;
    onSelect: (product: Product) => void;
};

function ProductCard({ product, onSelect }: ProductCardProps) {
    return (
        <button
            type="button"
            className="product-card"
            onClick={() => onSelect(product)}
            aria-label={`הוסף ${product.name} לעגלה`}
        >
            <div className="product-card__image-wrapper">
                <img
                    src={product.imageUrl}
                    alt=""
                    className="product-card__image"
                    loading="lazy"
                />
            </div>

            <div className="product-card__content">
                <strong>{product.name}</strong>
                <span>₪{product.price.toFixed(2)}</span>
            </div>
        </button>
    );
}

export default ProductCard;