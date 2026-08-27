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
import {
    formatMoney,
} from "../../utils/MoneyFormatter";

import PromotionBuilderDialog from "./PromotionBuilderDialog";

import {
    createEmptyPromotionDraft,
    promotionDraftFromPromotion,
    promotionFromDraft,
    validatePromotionDraft,
    type PromotionDraft,
} from "./PromotionBuilderModel";

import "./promotion-management-page.css";

type PromotionStatusFilter =
    | "active"
    | "all"
    | "inactive";

type PromotionViewMode =
    | "list"
    | "cards";

const promotionTypeLabels:
    Record<PromotionType, string> = {
        buy_x_get_y: "קנה X קבל Y",
        buy_a_get_b: "קנה A קבל B",
        bundle_price: "מחיר חבילה",
        mix_and_match: "מיקס אנד מאץ׳",
        quantity_discount: "הנחת כמות",
        category_discount: "הנחה לפי קטגוריה",
        fixed_amount_discount: "הנחה בסכום קבוע",
        basket_discount: "הנחת סל",
        basket_tier_discount: "הנחת סל מדורגת",
    };

function getPromotionTypeLabel(
    type: PromotionType,
) {
    return promotionTypeLabels[type];
}

function money(
    value: number,
) {
    return formatMoney(
        value,
    );
}

function getPromotionBenefitLabel(
    promotion: Promotion,
) {
    switch (
        promotion.type
    ) {
        case "category_discount":
        case "quantity_discount":
        case "basket_discount":
            return promotion.discountPercentage !== undefined
                ? `${promotion.discountPercentage}% הנחה`
                : "הנחה באחוזים";

        case "fixed_amount_discount":
            return promotion.discountAmount !== undefined
                ? `${money(promotion.discountAmount)} הנחה`
                : "הנחה בסכום קבוע";

        case "bundle_price":
        case "mix_and_match":
            if (
                promotion.bundleQuantity !== undefined &&
                promotion.bundlePrice !== undefined
            ) {
                return `${promotion.bundleQuantity} פריטים ב־${money(promotion.bundlePrice)}`;
            }

            return "מחיר חבילה";

        case "buy_x_get_y":
            if (
                promotion.buyQuantity !== undefined &&
                promotion.getQuantity !== undefined
            ) {
                return `קנה ${promotion.buyQuantity} · קבל ${promotion.getQuantity}`;
            }

            return "קנה וקבל";

        case "buy_a_get_b":
            if (
                promotion.buyQuantity !== undefined &&
                promotion.getQuantity !== undefined
            ) {
                if (
                    promotion.rewardDiscountPercentage !== undefined
                ) {
                    return `קנה ${promotion.buyQuantity} · קבל ${promotion.getQuantity} ב־${promotion.rewardDiscountPercentage}% הנחה`;
                }

                return `קנה ${promotion.buyQuantity} · קבל ${promotion.getQuantity}`;
            }

            return "קנה מוצר וקבל מוצר";

        case "basket_tier_discount":
            return promotion.tiers?.length
                ? `${promotion.tiers.length} מדרגות הנחה`
                : "הנחה מדורגת לפי סל";
    }
}

function getTargetLabel(
    promotion: Promotion,
) {
    const target =
        promotion.target;

    const productCount =
        "productIds" in target
            ? target.productIds?.length ?? 0
            : 0;

    const categoryCount =
        "categoryIds" in target
            ? target.categoryIds?.length ?? 0
            : 0;

    if (
        productCount > 0 &&
        categoryCount > 0
    ) {
        return `${categoryCount} קטגוריות · ${productCount} פריטים`;
    }

    if (
        productCount > 0
    ) {
        return productCount === 1
            ? "פריט אחד"
            : `${productCount} פריטים`;
    }

    if (
        categoryCount > 0
    ) {
        return categoryCount === 1
            ? "קטגוריה אחת"
            : `${categoryCount} קטגוריות`;
    }

    return "כל הסל";
}

function getAudienceLabel(
    promotion: Promotion,
) {
    const groups =
        promotion.allowedCustomerGroupIds ?? [];

    if (
        groups.length === 0
    ) {
        return "כל הלקוחות";
    }

    const labels:
        Record<string, string> = {
            club: "חברי מועדון",
            vip: "VIP",
            employee: "עובדים",
        };

    return groups
        .map(
            (groupId) =>
                labels[groupId] ??
                groupId,
        )
        .join(" · ");
}

function formatDate(
    value: string,
) {
    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return value;
    }

    return date.toLocaleDateString(
        "he-IL",
        {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
        },
    );
}

function getTimingLabel(
    promotion: Promotion,
) {
    if (
        promotion.startsAt ||
        promotion.endsAt
    ) {
        if (
            promotion.startsAt &&
            promotion.endsAt
        ) {
            return `${formatDate(promotion.startsAt)}–${formatDate(promotion.endsAt)}`;
        }

        if (
            promotion.startsAt
        ) {
            return `מ־${formatDate(promotion.startsAt)}`;
        }

        return `עד ${formatDate(promotion.endsAt ?? "")}`;
    }

    if (
        promotion.schedule?.startTime ||
        promotion.schedule?.endTime
    ) {
        return [
            promotion.schedule.startTime,
            promotion.schedule.endTime,
        ]
            .filter(Boolean)
            .join("–");
    }

    return "ללא הגבלת זמן";
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
        statusFilter,
        setStatusFilter,
    ] =
        useState<PromotionStatusFilter>(
            "active",
        );

    const [
        viewMode,
        setViewMode,
    ] =
        useState<PromotionViewMode>(
            "list",
        );

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

    const normalizedQuery =
        query
            .trim()
            .toLowerCase();

    const visible =
        promotions.filter(
            (promotion) => {
                const matchesStatus =
                    statusFilter ===
                        "all" ||
                    (
                        statusFilter ===
                            "active" &&
                        promotion.isActive
                    ) ||
                    (
                        statusFilter ===
                            "inactive" &&
                        !promotion.isActive
                    );

                const matchesQuery =
                    !normalizedQuery ||
                    promotion.name
                        .toLowerCase()
                        .includes(
                            normalizedQuery,
                        ) ||
                    getPromotionTypeLabel(
                        promotion.type,
                    )
                        .toLowerCase()
                        .includes(
                            normalizedQuery,
                        );

                return (
                    matchesStatus &&
                    matchesQuery
                );
            },
        );

    const activeCount =
        promotions.filter(
            (promotion) =>
                promotion.isActive,
        ).length;

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
                        ניהול הטבות, קהלים,
                        תחולה ותוקף במקום אחד.
                    </span>
                </div>
            </header>

            <div className="promotion-management__toolbar">
                <button
                    type="button"
                    className="promotion-management__primary"
                    onClick={
                        startCreate
                    }
                >
                    <span aria-hidden="true">
                        +
                    </span>
                    מבצע חדש
                </button>

                <div
                    className="promotion-management__status-filter"
                    role="group"
                    aria-label="סינון מבצעים לפי סטטוס"
                >
                    <button
                        type="button"
                        className={
                            statusFilter === "active"
                                ? "promotion-management__segment promotion-management__segment--active"
                                : "promotion-management__segment"
                        }
                        onClick={() =>
                            setStatusFilter(
                                "active",
                            )
                        }
                    >
                        פעילים
                        <strong>
                            {activeCount}
                        </strong>
                    </button>

                    <button
                        type="button"
                        className={
                            statusFilter === "all"
                                ? "promotion-management__segment promotion-management__segment--active"
                                : "promotion-management__segment"
                        }
                        onClick={() =>
                            setStatusFilter(
                                "all",
                            )
                        }
                    >
                        הכל
                        <strong>
                            {promotions.length}
                        </strong>
                    </button>

                    <button
                        type="button"
                        className={
                            statusFilter === "inactive"
                                ? "promotion-management__segment promotion-management__segment--active"
                                : "promotion-management__segment"
                        }
                        onClick={() =>
                            setStatusFilter(
                                "inactive",
                            )
                        }
                    >
                        לא פעילים
                        <strong>
                            {
                                promotions.length -
                                activeCount
                            }
                        </strong>
                    </button>
                </div>

                <div className="promotion-management__search-wrap">
                    <span aria-hidden="true">
                        ⌕
                    </span>

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
                </div>

                <div
                    className="promotion-management__view-toggle"
                    role="group"
                    aria-label="שינוי תצוגת מבצעים"
                >
                    <button
                        type="button"
                        className={
                            viewMode === "list"
                                ? "promotion-management__view-button promotion-management__view-button--active"
                                : "promotion-management__view-button"
                        }
                        onClick={() =>
                            setViewMode(
                                "list",
                            )
                        }
                    >
                        רשימה
                    </button>

                    <button
                        type="button"
                        className={
                            viewMode === "cards"
                                ? "promotion-management__view-button promotion-management__view-button--active"
                                : "promotion-management__view-button"
                        }
                        onClick={() =>
                            setViewMode(
                                "cards",
                            )
                        }
                    >
                        כרטיסים
                    </button>
                </div>
            </div>

            {viewMode === "list" ? (
                <div className="promotion-management__list-shell">
                    <div className="promotion-management__list-head">
                        <span>
                            סטטוס
                        </span>
                        <span>
                            מבצע
                        </span>
                        <span>
                            הטבה
                        </span>
                        <span>
                            תחולה
                        </span>
                        <span>
                            קהל
                        </span>
                        <span>
                            תוקף
                        </span>
                        <span>
                            פעולות
                        </span>
                    </div>

                    <div className="promotion-management__list">
                        {visible.map(
                            (promotion) => (
                                <article
                                    key={
                                        promotion.id
                                    }
                                    className={`promotion-management__list-row ${
                                        promotion.isActive
                                            ? "promotion-management__list-row--active"
                                            : ""
                                    }`}
                                >
                                    <div>
                                        <span
                                            className={`promotion-management__status ${
                                                promotion.isActive
                                                    ? "promotion-management__status--active"
                                                    : ""
                                            }`}
                                        >
                                            <i aria-hidden="true" />
                                            {
                                                promotion.isActive
                                                    ? "פעיל"
                                                    : "לא פעיל"
                                            }
                                        </span>
                                    </div>

                                    <div className="promotion-management__list-name">
                                        <strong>
                                            {
                                                promotion.name
                                            }
                                        </strong>
                                        <small>
                                            {
                                                getPromotionTypeLabel(
                                                    promotion.type,
                                                )
                                            }
                                            {" · עדיפות "}
                                            {
                                                promotion.priority
                                            }
                                        </small>
                                    </div>

                                    <strong className="promotion-management__benefit promotion-management__benefit--list">
                                        {
                                            getPromotionBenefitLabel(
                                                promotion,
                                            )
                                        }
                                    </strong>

                                    <span>
                                        {
                                            getTargetLabel(
                                                promotion,
                                            )
                                        }
                                    </span>

                                    <span>
                                        {
                                            getAudienceLabel(
                                                promotion,
                                            )
                                        }
                                    </span>

                                    <span>
                                        {
                                            getTimingLabel(
                                                promotion,
                                            )
                                        }
                                    </span>

                                    <div className="promotion-management__actions promotion-management__actions--list">
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
                                            className="promotion-management__toggle"
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
                </div>
            ) : (
                <div className="promotion-management__grid">
                    {visible.map(
                        (promotion) => (
                            <article
                                key={
                                    promotion.id
                                }
                                className={`promotion-management__card ${
                                    promotion.isActive
                                        ? "promotion-management__card--active"
                                        : ""
                                }`}
                            >
                                <div className="promotion-management__card-topline">
                                    <span
                                        className={`promotion-management__status ${
                                            promotion.isActive
                                                ? "promotion-management__status--active"
                                                : ""
                                        }`}
                                    >
                                        <i aria-hidden="true" />
                                        {
                                            promotion.isActive
                                                ? "פעיל"
                                                : "לא פעיל"
                                        }
                                    </span>

                                    <span className="promotion-management__type">
                                        {
                                            getPromotionTypeLabel(
                                                promotion.type,
                                            )
                                        }
                                    </span>
                                </div>

                                <div className="promotion-management__card-main">
                                    <h3>
                                        {
                                            promotion.name
                                        }
                                    </h3>

                                    <strong className="promotion-management__benefit">
                                        {
                                            getPromotionBenefitLabel(
                                                promotion,
                                            )
                                        }
                                    </strong>
                                </div>

                                <dl className="promotion-management__meta">
                                    <div>
                                        <dt>
                                            תחולה
                                        </dt>
                                        <dd>
                                            {
                                                getTargetLabel(
                                                    promotion,
                                                )
                                            }
                                        </dd>
                                    </div>

                                    <div>
                                        <dt>
                                            קהל
                                        </dt>
                                        <dd>
                                            {
                                                getAudienceLabel(
                                                    promotion,
                                                )
                                            }
                                        </dd>
                                    </div>

                                    <div>
                                        <dt>
                                            תוקף
                                        </dt>
                                        <dd>
                                            {
                                                getTimingLabel(
                                                    promotion,
                                                )
                                            }
                                        </dd>
                                    </div>

                                    <div>
                                        <dt>
                                            עדיפות
                                        </dt>
                                        <dd>
                                            {
                                                promotion.priority
                                            }
                                        </dd>
                                    </div>
                                </dl>

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
                                        className="promotion-management__toggle"
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
            )}

            {visible.length === 0 && (
                <div className="promotion-management__empty promotion-management__empty--standalone">
                    <strong>
                        לא נמצאו מבצעים
                    </strong>
                    <span>
                        שנה סינון או חיפוש כדי להציג מבצעים נוספים.
                    </span>
                </div>
            )}

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
