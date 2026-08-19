import {
    useMemo,
    useState,
} from "react";

export type PromotionPopulationDraft = {
    productIds: string[];
    categoryIds: string[];
    excludedProductIds: string[];
    excludedCategoryIds: string[];
};

type SelectableItem = {
    id: string;
    name: string;
};

type PromotionPopulationEditorProps = {
    title: string;
    description?: string;

    value: PromotionPopulationDraft;

    products: SelectableItem[];
    categories: SelectableItem[];

    onChange: (
        value: PromotionPopulationDraft,
    ) => void;
};

type PopulationKey =
    keyof PromotionPopulationDraft;

function normalize(
    value: string,
) {
    return value
        .trim()
        .toLocaleLowerCase();
}

function PromotionPopulationEditor({
    title,
    description,
    value,
    products,
    categories,
    onChange,
}: PromotionPopulationEditorProps) {
    const [
        includeQuery,
        setIncludeQuery,
    ] = useState("");

    const [
        excludeQuery,
        setExcludeQuery,
    ] = useState("");

    const filteredIncludeCategories =
        useMemo(() => {
            const query =
                normalize(
                    includeQuery,
                );

            if (!query) {
                return categories;
            }

            return categories.filter(
                (category) =>
                    normalize(
                        category.name,
                    ).includes(
                        query,
                    ),
            );
        }, [
            categories,
            includeQuery,
        ]);

    const filteredIncludeProducts =
        useMemo(() => {
            const query =
                normalize(
                    includeQuery,
                );

            if (!query) {
                return products;
            }

            return products.filter(
                (product) =>
                    normalize(
                        product.name,
                    ).includes(
                        query,
                    ),
            );
        }, [
            products,
            includeQuery,
        ]);

    const filteredExcludeCategories =
        useMemo(() => {
            const query =
                normalize(
                    excludeQuery,
                );

            if (!query) {
                return categories;
            }

            return categories.filter(
                (category) =>
                    normalize(
                        category.name,
                    ).includes(
                        query,
                    ),
            );
        }, [
            categories,
            excludeQuery,
        ]);

    const filteredExcludeProducts =
        useMemo(() => {
            const query =
                normalize(
                    excludeQuery,
                );

            if (!query) {
                return products;
            }

            return products.filter(
                (product) =>
                    normalize(
                        product.name,
                    ).includes(
                        query,
                    ),
            );
        }, [
            products,
            excludeQuery,
        ]);

    const toggle = (
        key: PopulationKey,
        oppositeKey: PopulationKey,
        id: string,
    ) => {
        const isSelected =
            value[key].includes(
                id,
            );

        if (isSelected) {
            onChange({
                ...value,
                [key]:
                    value[key].filter(
                        (item) =>
                            item !== id,
                    ),
            });

            return;
        }

        onChange({
            ...value,

            [key]: [
                ...value[key],
                id,
            ],

            [oppositeKey]:
                value[
                    oppositeKey
                ].filter(
                    (item) =>
                        item !== id,
                ),
        });
    };

    const renderCategoryOptions = (
        items: SelectableItem[],
        key:
            | "categoryIds"
            | "excludedCategoryIds",
        oppositeKey:
            | "categoryIds"
            | "excludedCategoryIds",
    ) => (
        <div className="promotion-population__options">
            <strong>
                קטגוריות
            </strong>

            {items.length > 0 ? (
                items.map(
                    (category) => (
                        <label
                            key={
                                category.id
                            }
                            className="promotion-population__option"
                        >
                            <input
                                type="checkbox"
                                checked={
                                    value[
                                        key
                                    ].includes(
                                        category.id,
                                    )
                                }
                                onChange={() =>
                                    toggle(
                                        key,
                                        oppositeKey,
                                        category.id,
                                    )
                                }
                            />

                            <span>
                                {
                                    category.name
                                }
                            </span>
                        </label>
                    ),
                )
            ) : (
                <span className="promotion-population__empty">
                    לא נמצאו קטגוריות
                </span>
            )}
        </div>
    );

    const renderProductOptions = (
        items: SelectableItem[],
        key:
            | "productIds"
            | "excludedProductIds",
        oppositeKey:
            | "productIds"
            | "excludedProductIds",
    ) => (
        <div className="promotion-population__options">
            <strong>
                פריטים
            </strong>

            {items.length > 0 ? (
                items.map(
                    (product) => (
                        <label
                            key={
                                product.id
                            }
                            className="promotion-population__option"
                        >
                            <input
                                type="checkbox"
                                checked={
                                    value[
                                        key
                                    ].includes(
                                        product.id,
                                    )
                                }
                                onChange={() =>
                                    toggle(
                                        key,
                                        oppositeKey,
                                        product.id,
                                    )
                                }
                            />

                            <span>
                                {
                                    product.name
                                }
                            </span>
                        </label>
                    ),
                )
            ) : (
                <span className="promotion-population__empty">
                    לא נמצאו פריטים
                </span>
            )}
        </div>
    );

    const includedCount =
        value.categoryIds.length +
        value.productIds.length;

    const excludedCount =
        value.excludedCategoryIds
            .length +
        value.excludedProductIds
            .length;

    return (
        <section className="promotion-population">
            <header className="promotion-population__header">
                <div>
                    <strong>
                        {title}
                    </strong>

                    {description && (
                        <span>
                            {description}
                        </span>
                    )}
                </div>
            </header>

            <div className="promotion-population__group">
                <div className="promotion-population__group-title">
                    <h4>
                        כלול במבצע
                    </h4>

                    <span>
                        {includedCount} נבחרו
                    </span>
                </div>

                <input
                    type="search"
                    className="promotion-population__search"
                    placeholder="חיפוש קטגוריה או פריט..."
                    value={
                        includeQuery
                    }
                    onChange={
                        (event) =>
                            setIncludeQuery(
                                event.target.value,
                            )
                    }
                />

                <div className="promotion-population__checklist">
                    {renderCategoryOptions(
                        filteredIncludeCategories,
                        "categoryIds",
                        "excludedCategoryIds",
                    )}

                    {renderProductOptions(
                        filteredIncludeProducts,
                        "productIds",
                        "excludedProductIds",
                    )}
                </div>
            </div>

            <div className="promotion-population__group promotion-population__group--exclude">
                <div className="promotion-population__group-title">
                    <h4>
                        לא כולל
                    </h4>

                    <span>
                        {excludedCount} הוחרגו
                    </span>
                </div>

                <input
                    type="search"
                    className="promotion-population__search"
                    placeholder="חיפוש קטגוריה או פריט להחרגה..."
                    value={
                        excludeQuery
                    }
                    onChange={
                        (event) =>
                            setExcludeQuery(
                                event.target.value,
                            )
                    }
                />

                <div className="promotion-population__checklist">
                    {renderCategoryOptions(
                        filteredExcludeCategories,
                        "excludedCategoryIds",
                        "categoryIds",
                    )}

                    {renderProductOptions(
                        filteredExcludeProducts,
                        "excludedProductIds",
                        "productIds",
                    )}
                </div>
            </div>
        </section>
    );
}

export default PromotionPopulationEditor;
