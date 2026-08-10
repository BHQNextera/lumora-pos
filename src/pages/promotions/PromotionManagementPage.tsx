import {
    useMemo,
    useState,
} from "react";

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

import "./promotion-management-page.css";

type PromotionDraft = {
    name: string;
    type: PromotionType;
    categoryId: string;
    value: string;
    quantity: string;
    bundlePrice: string;
    isActive: boolean;
    allowStacking: boolean;
};

const emptyDraft: PromotionDraft = {
    name: "",
    type: "category_discount",
    categoryId: "desserts",
    value: "10",
    quantity: "2",
    bundlePrice: "20",
    isActive: true,
    allowStacking: false,
};

const typeLabels:
    Record<PromotionType, string> = {
        buy_x_get_y:
            "קנה X קבל Y",
        buy_a_get_b:
            "קנה A קבל B",
        bundle_price:
            "מחיר חבילה",
        mix_and_match:
            "Mix & Match",
        quantity_discount:
            "הנחת כמות",
        category_discount:
            "אחוז הנחה על קטגוריה",
        fixed_amount_discount:
            "סכום הנחה קבוע",
        basket_discount:
            "הנחה על סל",
        basket_tier_discount:
            "מדרגות סל",
    };

function PromotionManagementPage() {
    const [promotions, setPromotions] =
        useState<Promotion[]>(
            () => seedPromotionsIfEmpty(),
        );

    const [query, setQuery] =
        useState("");
    const [editingId, setEditingId] =
        useState<string | null>(null);
    const [draft, setDraft] =
        useState<PromotionDraft>(
            emptyDraft,
        );
    const [error, setError] =
        useState<string | null>(null);

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
        setEditingId("new");
        setDraft(emptyDraft);
        setError(null);
    };

    const startEdit = (
        promotion: Promotion,
    ) => {
        setEditingId(promotion.id);

        setDraft({
            name: promotion.name,
            type: promotion.type,
            categoryId:
                promotion.target.type ===
                "category"
                    ? promotion.target
                          .categoryIds[0] ??
                      "desserts"
                    : "desserts",
            value: String(
                promotion.discountPercentage ??
                    promotion.discountAmount ??
                    10,
            ),
            quantity: String(
                promotion.bundleQuantity ??
                    promotion.minimumQuantity ??
                    promotion.buyQuantity ??
                    2,
            ),
            bundlePrice: String(
                promotion.bundlePrice ??
                    20,
            ),
            isActive:
                promotion.isActive,
            allowStacking:
                promotion.allowStacking,
        });

        setError(null);
    };

    const cancel = () => {
        setEditingId(null);
        setDraft(emptyDraft);
        setError(null);
    };

    const save = () => {
        const name =
            draft.name.trim();

        if (!name) {
            setError(
                "יש להזין שם מבצע.",
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

        const numericValue =
            Number(draft.value);
        const quantity =
            Number(draft.quantity);
        const bundlePrice =
            Number(
                draft.bundlePrice,
            );

        const base: Promotion = {
            id:
                current?.id ??
                crypto.randomUUID(),
            name,
            type: draft.type,
            isActive:
                draft.isActive,
            priority:
                current?.priority ??
                100,
            allowStacking:
                draft.allowStacking,
            target: {
                type: "category",
                categoryIds: [
                    draft.categoryId,
                ],
            },
        };

        switch (draft.type) {
            case "category_discount":
                base.discountPercentage =
                    numericValue;
                break;

            case "fixed_amount_discount":
                base.discountAmount =
                    numericValue;
                break;

            case "quantity_discount":
                base.minimumQuantity =
                    quantity;
                base.discountPercentage =
                    numericValue;
                break;

            case "bundle_price":
            case "mix_and_match":
                base.bundleQuantity =
                    quantity;
                base.bundlePrice =
                    bundlePrice;
                break;

            case "buy_x_get_y":
                base.buyQuantity =
                    quantity;
                base.getQuantity = 1;
                base.rewardDiscountPercentage =
                    100;
                break;

            case "basket_discount":
                base.basketMinimumAmount =
                    quantity;
                base.discountPercentage =
                    numericValue;
                break;

            default:
                setError(
                    "סוג מבצע זה מוצג כרגע לקריאה בלבד.",
                );
                return;
        }

        savePromotion(base);
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
                    <p>PRICING</p>
                    <h1>ניהול מבצעים</h1>
                    <span>
                        הגדרת מבצעים שמוזנים ישירות למנוע התמחור של Lumora.
                    </span>
                </div>

                <button
                    type="button"
                    className="promotion-management__primary"
                    onClick={startCreate}
                >
                    + מבצע חדש
                </button>
            </header>

            <div className="promotion-management__toolbar">
                <input
                    type="search"
                    placeholder="חיפוש מבצע"
                    value={query}
                    onChange={(event) =>
                        setQuery(
                            event.target.value,
                        )
                    }
                />

                <strong>
                    {visible.length} מבצעים
                </strong>
            </div>

            <div className="promotion-management__grid">
                {visible.map(
                    (promotion) => (
                        <article
                            key={promotion.id}
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
                                    {promotion.isActive
                                        ? "פעיל"
                                        : "לא פעיל"}
                                </span>

                                <h3>
                                    {promotion.name}
                                </h3>

                                <p>
                                    {
                                        typeLabels[
                                            promotion.type
                                        ]
                                    }
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
                                    {promotion.isActive
                                        ? "השבתה"
                                        : "הפעלה"}
                                </button>
                            </div>
                        </article>
                    ),
                )}
            </div>

            {editingId && (
                <div className="promotion-management__overlay">
                    <div className="promotion-management__dialog">
                        <header>
                            <h2>
                                {editingId === "new"
                                    ? "מבצע חדש"
                                    : "עריכת מבצע"}
                            </h2>

                            <button
                                type="button"
                                onClick={cancel}
                            >
                                ×
                            </button>
                        </header>

                        <div className="promotion-management__form">
                            <label>
                                שם המבצע
                                <input
                                    value={draft.name}
                                    onChange={(event) =>
                                        setDraft(
                                            (current) => ({
                                                ...current,
                                                name:
                                                    event
                                                        .target
                                                        .value,
                                            }),
                                        )
                                    }
                                />
                            </label>

                            <label>
                                סוג
                                <select
                                    value={draft.type}
                                    onChange={(event) =>
                                        setDraft(
                                            (current) => ({
                                                ...current,
                                                type:
                                                    event
                                                        .target
                                                        .value as PromotionType,
                                            }),
                                        )
                                    }
                                >
                                    {Object.entries(
                                        typeLabels,
                                    ).map(
                                        ([
                                            value,
                                            label,
                                        ]) => (
                                            <option
                                                key={
                                                    value
                                                }
                                                value={
                                                    value
                                                }
                                            >
                                                {
                                                    label
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>

                            <label>
                                קטגוריה
                                <select
                                    value={
                                        draft.categoryId
                                    }
                                    onChange={(event) =>
                                        setDraft(
                                            (current) => ({
                                                ...current,
                                                categoryId:
                                                    event
                                                        .target
                                                        .value,
                                            }),
                                        )
                                    }
                                >
                                    {categories.map(
                                        (category) => (
                                            <option
                                                key={
                                                    category.id
                                                }
                                                value={
                                                    category.id
                                                }
                                            >
                                                {
                                                    category.name
                                                }
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>

                            <label>
                                אחוז / סכום הנחה
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={draft.value}
                                    onChange={(event) =>
                                        setDraft(
                                            (current) => ({
                                                ...current,
                                                value:
                                                    event
                                                        .target
                                                        .value,
                                            }),
                                        )
                                    }
                                />
                            </label>

                            <label>
                                כמות / סף סל
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={
                                        draft.quantity
                                    }
                                    onChange={(event) =>
                                        setDraft(
                                            (current) => ({
                                                ...current,
                                                quantity:
                                                    event
                                                        .target
                                                        .value,
                                            }),
                                        )
                                    }
                                />
                            </label>

                            <label>
                                מחיר חבילה
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={
                                        draft.bundlePrice
                                    }
                                    onChange={(event) =>
                                        setDraft(
                                            (current) => ({
                                                ...current,
                                                bundlePrice:
                                                    event
                                                        .target
                                                        .value,
                                            }),
                                        )
                                    }
                                />
                            </label>

                            <label className="promotion-management__check">
                                <input
                                    type="checkbox"
                                    checked={
                                        draft.isActive
                                    }
                                    onChange={(event) =>
                                        setDraft(
                                            (current) => ({
                                                ...current,
                                                isActive:
                                                    event
                                                        .target
                                                        .checked,
                                            }),
                                        )
                                    }
                                />
                                פעיל
                            </label>

                            <label className="promotion-management__check">
                                <input
                                    type="checkbox"
                                    checked={
                                        draft.allowStacking
                                    }
                                    onChange={(event) =>
                                        setDraft(
                                            (current) => ({
                                                ...current,
                                                allowStacking:
                                                    event
                                                        .target
                                                        .checked,
                                            }),
                                        )
                                    }
                                />
                                ניתן לשילוב עם מבצעים אחרים
                            </label>

                            {error && (
                                <div className="promotion-management__error">
                                    {error}
                                </div>
                            )}
                        </div>

                        <footer>
                            <button
                                type="button"
                                onClick={cancel}
                            >
                                ביטול
                            </button>

                            <button
                                type="button"
                                className="promotion-management__primary"
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

export default PromotionManagementPage;
