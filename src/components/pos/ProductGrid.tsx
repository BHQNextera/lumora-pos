import type { Product } from "../../types/product";
import ProductCard from "./ProductCard";

export type ProductGridViewMode =
    | "cards"
    | "list";

type ProductGridProps = {
    products: Product[];
    onSelectProduct: (
        product: Product,
    ) => void;
    viewMode?: ProductGridViewMode;
};

function ProductGrid({
    products,
    onSelectProduct,
    viewMode = "cards",
}: ProductGridProps) {
    if (products.length === 0) {
        return (
            <div className="product-grid__empty">
                לא נמצאו מוצרים מתאימים
            </div>
        );
    }

    return (
        <div
            className={`product-grid ${
                viewMode === "list"
                    ? "product-grid--list"
                    : "product-grid--cards"
            }`}
        >
            {products.map((product) => (
                <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={
                        onSelectProduct
                    }
                />
            ))}
        </div>
    );
}

export default ProductGrid;