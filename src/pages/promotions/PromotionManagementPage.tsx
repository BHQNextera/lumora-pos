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
    Promotion,
    PromotionType,
} from "../../models/promotion/Promotion";

import {
    getPromotions,
    savePromotion,
} from "../../models/promotion/PromotionRepository";

import {
    seedPromotionsIfEmpty,
} from "../../models/promotion/PromotionSeed";

import PromotionBuilderDialog from "./PromotionBuilderDialog";

import {
    createEmptyPromotionDraft,
    promotionDraftFromPromotion,
    promotionFromDraft,
    promotionTypeOptions,
    validatePromotionDraft,
    type PromotionDraft,
} from "./PromotionBuilderModel";

import "./promotion-management-page.css";

function getPromotionTypeLabel(
    type: PromotionType,
) {
    return (
        promotionTypeOptions.find(
            (option) =>
                option.value === type,
        )?.label ??
        type
    );
}

function PromotionManagementPage() {
    const {
        products,
    } = useCatalog();

    const [
        promotions,
        setPromotions,
    ] =
        useState<Promotion[]>(
            () =>
                seedPromotionsIfEmpty(),
        );

    const [
        query,
        setQuery,
    ] =
        useState("");

    const [
        editingId,
        setEditingId,
    ] =
        useState<string | null>(
            null,
        );

    const [
        draft,
        setDraft,
    ] =
        useState<PromotionDraft>(
            () =>
                createEmptyPromotionDraft(),
        );

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null,
        );

    const categories =
        useMemo(
            () =>
                categorySeed.filter(
                    (category) =>
                        category.level ===
                            "category" &&
                        category.isActive,
                ),
            [],
        );

    const activeProducts =
        useMemo(
            () =>
                products.filter(
                    (product) =>
                        product.isActive,
                ),
            [products],
        );

    const visible =
        promotions.filter(
            (promotion) =>
                !query.trim() ||
                promotion.name
                    .toLowerCase()
                    .includes(
                        query
                            .trim()
                            .toLowerCase(),
                    ),
        );

    const startCreate = () => {
        setEditingId(
            "new",
        );

        setDraft(
            createEmptyPromotionDraft(),
        );

        setError(
            null,
        );
    };

    const startEdit = (
        promotion: Promotion,
    ) => {
        setEditingId(
            promotion.id,
        );

        setDraft(
            promotionDraftFromPromotion(
                promotion,
            ),
        );

        setError(
            null,
        );
    };

    const cancel = () => {
        setEditingId(
            null,
        );

        setDraft(
            createEmptyPromotionDraft(),
        );

        setError(
            null,
        );
    };

    const save = () => {
        const validationError =
            validatePromotionDraft(
                draft,
            );

        if (
            validationError
        ) {
            setError(
                validationError,
            );

            return;
        }

        const current =
            editingId &&
            editingId !== "new"
                ? promotions.find(
                      (promotion) =>
                          promotion.id ===
                          editingId,
                  )
                : undefined;

        const promotion =
            promotionFromDraft(
                draft,
                current,
            );

        savePromotion(
            promotion,
        );

        setPromotions(
            getPromotions(),
        );

        cancel();
    };

    const toggleActive = (
        promotion: Promotion,
    ) => {
        savePromotion({
            ...promotion,
            isActive:
                !promotion.isActive,
        });

        setPromotions(
            getPromotions(),
        );
    };

    return (
        <section
            className="promotion-management"
            dir="rtl"
        >
            <header className="promotion-management__header">
                <div>
                    <p>
                        PRICING
                    </p>

                    <h1>
                        ניהול מבצעים
                    </h1>

                    <span>
                        הגדרת אוכלוסיות,
                        תנאים, הטבות,
                        קהלים ותזמון.
                    </span>
                </div>

                <button
                    type="button"
                    className="promotion-management__primary"
                    onClick={
                        startCreate
                    }
                >
                    + מבצע חדש
                </button>
            </header>

            <div className="promotion-management__toolbar">
                <input
                    type="search"
                    placeholder="חיפוש מבצע"
                    value={
                        query
                    }
                    onChange={
                        (event) =>
                            setQuery(
                                event.target.value,
                            )
                    }
                />

                <strong>
                    {
                        visible.length
                    }{" "}
                    מבצעים
                </strong>
            </div>

            <div className="promotion-management__grid">
                {visible.map(
                    (promotion) => (
                        <article
                            key={
                                promotion.id
                            }
                            className="promotion-management__card"
                        >
                            <div>
                                <span
                                    className={`promotion-management__status ${
                                        promotion.isActive
                                            ? "promotion-management__status--active"
                                            : ""
                                    }`}
                                >
                                    {
                                        promotion.isActive
                                            ? "פעיל"
                                            : "לא פעיל"
                                    }
                                </span>

                                <h3>
                                    {
                                        promotion.name
                                    }
                                </h3>

                                <p>
                                    {getPromotionTypeLabel(
                                        promotion.type,
                                    )}
                                </p>
                            </div>

                            <div className="promotion-management__actions">
                                <button
                                    type="button"
                                    onClick={() =>
                                        startEdit(
                                            promotion,
                                        )
                                    }
                                >
                                    עריכה
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        toggleActive(
                                            promotion,
                                        )
                                    }
                                >
                                    {
                                        promotion.isActive
                                            ? "השבתה"
                                            : "הפעלה"
                                    }
                                </button>
                            </div>
                        </article>
                    ),
                )}
            </div>

            {editingId && (
                <PromotionBuilderDialog
                    isNew={
                        editingId ===
                        "new"
                    }
                    draft={
                        draft
                    }
                    setDraft={
                        setDraft
                    }
                    products={
                        activeProducts
                    }
                    categories={
                        categories
                    }
                    error={
                        error
                    }
                    onCancel={
                        cancel
                    }
                    onSave={
                        save
                    }
                />
            )}
        </section>
    );
}

export default PromotionManagementPage;
