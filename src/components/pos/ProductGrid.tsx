import type { Product } from "../../types/product";
import ProductCard from "./ProductCard";

type ProductGridProps = {
    products: Product[];
    onSelectProduct: (product: Product) => void;
};

function ProductGrid({
    products,
    onSelectProduct,
}: ProductGridProps) {
    if (products.length === 0) {
        return (
            <div className="product-grid__empty">
                לא נמצאו מוצרים מתאימים
            </div>
        );
    }

    return (
        <div className="product-grid">
            {products.map((product) => (
                <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={onSelectProduct}
                />
            ))}
        </div>
    );
}

export default ProductGrid;