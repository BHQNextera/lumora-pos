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

import "./promotion-management-page.css";

type TargetMode =
    | "category"
    | "product";

type PromotionDraft = {
    name: string;
    type: PromotionType;
    targetMode: TargetMode;
    categoryId: string;
    productId: string;
    allowedCustomerGroupIds: string[];
    value: string;
    quantity: string;
    getQuantity: string;
    bundlePrice: string;
    basketMinimumAmount: string;
    priority: string;
    startsAt: string;
    endsAt: string;
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    isActive: boolean;
    allowStacking: boolean;
};

const emptyDraft: PromotionDraft = {
    name: "",
    type: "category_discount",
    targetMode: "category",
    categoryId: "desserts",
    productId: "",
    allowedCustomerGroupIds: [],
    value: "10",
    quantity: "2",
    getQuantity: "1",
    bundlePrice: "20",
    basketMinimumAmount: "100",
    priority: "100",
    startsAt: "",
    endsAt: "",
    daysOfWeek: [],
    startTime: "",
    endTime: "",
    isActive: true,
    allowStacking: false,
};

const typeLabels:
    Record<PromotionType, string> = {
        buy_x_get_y: "קנה X קבל Y",
        buy_a_get_b: "קנה A קבל B",
        bundle_price: "מחיר חבילה",
        mix_and_match: "Mix & Match",
        quantity_discount: "הנחת כמות",
        category_discount: "אחוז הנחה על קטגוריה",
        fixed_amount_discount: "סכום הנחה קבוע",
        basket_discount: "הנחה על סל",
        basket_tier_discount: "מדרגות סל",
    };

const dayOptions = [
    { id: 0, label: "א׳" },
    { id: 1, label: "ב׳" },
    { id: 2, label: "ג׳" },
    { id: 3, label: "ד׳" },
    { id: 4, label: "ה׳" },
    { id: 5, label: "ו׳" },
    { id: 6, label: "ש׳" },
];

const groupOptions = ["club", "vip", "employee"];

function toLocalInput(
    value:
        | string
        | undefined,
) {
    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return "";
    }

    const offset =
        date.getTimezoneOffset();

    const local =
        new Date(
            date.getTime() -
            offset * 60000,
        );

    return local
        .toISOString()
        .slice(0, 16);
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

    const [query, setQuery] = useState("");
    const [editingId, setEditingId] =
        useState<string | null>(null);
    const [draft, setDraft] =
        useState<PromotionDraft>(emptyDraft);
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
                        query.trim().toLowerCase(),
                    ),
        );

    const startCreate = () => {
        setEditingId("new");
        setDraft({
            ...emptyDraft,
            productId:
                activeProducts[0]?.id ??
                "",
        });
        setError(null);
    };

    const startEdit = (
        promotion: Promotion,
    ) => {
        setEditingId(promotion.id);

        setDraft({
            name: promotion.name,
            type: promotion.type,
            targetMode: promotion.target.type,
            categoryId:
                promotion.target.type === "category"
                    ? promotion.target.categoryIds[0] ?? "desserts"
                    : "desserts",
            productId:
                promotion.target.type === "product"
                    ? promotion.target.productIds[0] ?? ""
                    : "",
            allowedCustomerGroupIds:
                promotion.allowedCustomerGroupIds ?? [],
            value: String(
                promotion.discountPercentage ??
                    promotion.discountAmount ??
                    promotion.rewardDiscountPercentage ??
                    10,
            ),
            quantity: String(
                promotion.bundleQuantity ??
                    promotion.minimumQuantity ??
                    promotion.buyQuantity ??
                    2,
            ),
            getQuantity:
                String(
                    promotion.getQuantity ??
                        1,
                ),
            bundlePrice:
                String(
                    promotion.bundlePrice ??
                        20,
                ),
            basketMinimumAmount:
                String(
                    promotion.basketMinimumAmount ??
                        100,
                ),
            priority:
                String(
                    promotion.priority,
                ),
            startsAt:
                toLocalInput(
                    promotion.startsAt,
                ),
            endsAt:
                toLocalInput(
                    promotion.endsAt,
                ),
            daysOfWeek:
                promotion.schedule?.daysOfWeek ??
                [],
            startTime:
                promotion.schedule?.startTime ??
                "",
            endTime:
                promotion.schedule?.endTime ??
                "",
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

    const toggleArrayValue = <T,>(
        values: T[],
        value: T,
    ) =>
        values.includes(value)
            ? values.filter(
                  (item) =>
                      item !== value,
              )
            : [...values, value];

    const save = () => {
        const name = draft.name.trim();

        if (!name) {
            setError("יש להזין שם מבצע.");
            return;
        }

        const current =
            editingId && editingId !== "new"
                ? promotions.find(
                      (promotion) =>
                          promotion.id === editingId,
                  )
                : undefined;

        const numericValue = Number(draft.value);
        const quantity = Number(draft.quantity);
        const getQuantity = Number(draft.getQuantity);
        const bundlePrice = Number(draft.bundlePrice);
        const basketMinimumAmount =
            Number(draft.basketMinimumAmount);
        const priority = Number(draft.priority);

        const target =
            draft.targetMode === "product"
                ? {
                      type: "product" as const,
                      productIds: [
                          draft.productId,
                      ],
                  }
                : {
                      type: "category" as const,
                      categoryIds: [
                          draft.categoryId,
                      ],
                  };

        const base: Promotion = {
            id:
                current?.id ??
                crypto.randomUUID(),
            name,
            type: draft.type,
            isActive: draft.isActive,
            priority:
                Number.isFinite(priority)
                    ? priority
                    : 100,
            allowStacking:
                draft.allowStacking,
            target,
            allowedCustomerGroupIds:
                draft.allowedCustomerGroupIds.length > 0
                    ? draft.allowedCustomerGroupIds
                    : undefined,
            startsAt:
                draft.startsAt
                    ? new Date(draft.startsAt).toISOString()
                    : undefined,
            endsAt:
                draft.endsAt
                    ? new Date(draft.endsAt).toISOString()
                    : undefined,
            schedule:
                draft.daysOfWeek.length > 0 ||
                draft.startTime ||
                draft.endTime
                    ? {
                          daysOfWeek:
                              draft.daysOfWeek,
                          startTime:
                              draft.startTime ||
                              undefined,
                          endTime:
                              draft.endTime ||
                              undefined,
                      }
                    : undefined,
        };

        switch (draft.type) {
            case "category_discount":
                base.discountPercentage = numericValue;
                break;
            case "fixed_amount_discount":
                base.discountAmount = numericValue;
                break;
            case "quantity_discount":
                base.minimumQuantity = quantity;
                base.discountPercentage = numericValue;
                break;
            case "bundle_price":
            case "mix_and_match":
                base.bundleQuantity = quantity;
                base.bundlePrice = bundlePrice;
                break;
            case "buy_x_get_y":
                base.buyQuantity = quantity;
                base.getQuantity = getQuantity;
                base.rewardDiscountPercentage =
                    numericValue > 0
                        ? numericValue
                        : 100;
                break;
            case "basket_discount":
                base.basketMinimumAmount =
                    basketMinimumAmount;
                base.discountPercentage =
                    numericValue;
                break;
            default:
                setError(
                    "סוג מבצע זה עדיין דורש Builder מתקדם יותר.",
                );
                return;
        }

        savePromotion(base);
        setPromotions(getPromotions());
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

        setPromotions(getPromotions());
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
                        תנאים, קהלים, תזמון, יעדים וקדימויות למנוע התמחור.
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
                        setQuery(event.target.value)
                    }
                />
                <strong>{visible.length} מבצעים</strong>
            </div>

            <div className="promotion-management__grid">
                {visible.map((promotion) => (
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

                            <h3>{promotion.name}</h3>

                            <p>
                                {typeLabels[promotion.type]} · עדיפות{" "}
                                {promotion.priority}
                            </p>
                        </div>

                        <div className="promotion-management__actions">
                            <button
                                type="button"
                                onClick={() =>
                                    startEdit(promotion)
                                }
                            >
                                עריכה
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    toggleActive(promotion)
                                }
                            >
                                {promotion.isActive
                                    ? "השבתה"
                                    : "הפעלה"}
                            </button>
                        </div>
                    </article>
                ))}
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
                            <button type="button" onClick={cancel}>×</button>
                        </header>

                        <div className="promotion-management__form">
                            <label>
                                שם המבצע
                                <input
                                    value={draft.name}
                                    onChange={(event) =>
                                        setDraft((current) => ({
                                            ...current,
                                            name: event.target.value,
                                        }))
                                    }
                                />
                            </label>

                            <label>
                                סוג מבצע
                                <select
                                    value={draft.type}
                                    onChange={(event) =>
                                        setDraft((current) => ({
                                            ...current,
                                            type:
                                                event.target
                                                    .value as PromotionType,
                                        }))
                                    }
                                >
                                    {Object.entries(typeLabels).map(
                                        ([value, label]) => (
                                            <option
                                                key={value}
                                                value={value}
                                            >
                                                {label}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>

                            <label>
                                יעד
                                <select
                                    value={draft.targetMode}
                                    onChange={(event) =>
                                        setDraft((current) => ({
                                            ...current,
                                            targetMode:
                                                event.target
                                                    .value as TargetMode,
                                        }))
                                    }
                                >
                                    <option value="category">
                                        קטגוריה
                                    </option>
                                    <option value="product">
                                        פריט
                                    </option>
                                </select>
                            </label>

                            {draft.targetMode === "category" ? (
                                <label>
                                    קטגוריה
                                    <select
                                        value={draft.categoryId}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                categoryId:
                                                    event.target.value,
                                            }))
                                        }
                                    >
                                        {categories.map((category) => (
                                            <option
                                                key={category.id}
                                                value={category.id}
                                            >
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            ) : (
                                <label>
                                    פריט
                                    <select
                                        value={draft.productId}
                                        onChange={(event) =>
                                            setDraft((current) => ({
                                                ...current,
                                                productId:
                                                    event.target.value,
                                            }))
                                        }
                                    >
                                        {activeProducts.map((product) => (
                                            <option
                                                key={product.id}
                                                value={product.id}
                                            >
                                                {product.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}

                            <label>
                                אחוז / סכום
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={draft.value}
                                    onChange={(event) =>
                                        setDraft((current) => ({
                                            ...current,
                                            value: event.target.value,
                                        }))
                                    }
                                />
                            </label>

                            <label>
                                כמות X / מינימום
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={draft.quantity}
                                    onChange={(event) =>
                                        setDraft((current) => ({
                                            ...current,
                                            quantity: event.target.value,
                                        }))
                                    }
                                />
                            </label>

                            <label>
                                כמות Y
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={draft.getQuantity}
                                    onChange={(event) =>
                                        setDraft((current) => ({
                                            ...current,
                                            getQuantity: event.target.value,
                                        }))
                                    }
                                />
                            </label>

                            <label>
                                מחיר חבילה
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={draft.bundlePrice}
                                    onChange={(event) =>
                                        setDraft((current) => ({
                                            ...current,
                                            bundlePrice:
                                                event.target.value,
                                        }))
                                    }
                                />
                            </label>

                            <label>
                                מינימום סל
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={draft.basketMinimumAmount}
                                    onChange={(event) =>
                                        setDraft((current) => ({
                                            ...current,
                                            basketMinimumAmount:
                                                event.target.value,
                                        }))
                                    }
                                />
                            </label>

                            <label>
                                עדיפות
                                <input
                                    type="number"
                                    step="1"
                                    value={draft.priority}
                                    onChange={(event) =>
                                        setDraft((current) => ({
                                            ...current,
                                            priority:
                                                event.target.value,
                                        }))
                                    }
                                />
                            </label>

                            <label>
                                התחלה
                                <input
                                    type="datetime-local"
                                    value={draft.startsAt}
                                    onChange={(event) =>
                                        setDraft((current) => ({
                                            ...current,
                                            startsAt:
                                                event.target.value,
                                        }))
                                    }
                                />
                            </label>

                            <label>
                                סיום
                                <input
                                    type="datetime-local"
                                    value={draft.endsAt}
                                    onChange={(event) =>
                                        setDraft((current) => ({
                                            ...current,
                                            endsAt:
                                                event.target.value,
                                        }))
                                    }
                                />
                            </label>

                            <label>
                                משעה
                                <input
                                    type="time"
                                    value={draft.startTime}
                                    onChange={(event) =>
                                        setDraft((current) => ({
                                            ...current,
                                            startTime:
                                                event.target.value,
                                        }))
                                    }
                                />
                            </label>

                            <label>
                                עד שעה
                                <input
                                    type="time"
                                    value={draft.endTime}
                                    onChange={(event) =>
                                        setDraft((current) => ({
                                            ...current,
                                            endTime:
                                                event.target.value,
                                        }))
                                    }
                                />
                            </label>

                            <div style={{ gridColumn: "1 / -1" }}>
                                <strong style={{ fontSize: "10px" }}>
                                    ימים
                                </strong>
                                <div
                                    style={{
                                        display: "flex",
                                        gap: "8px",
                                        marginTop: "7px",
                                    }}
                                >
                                    {dayOptions.map((day) => (
                                        <label
                                            key={day.id}
                                            className="promotion-management__check"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={draft.daysOfWeek.includes(
                                                    day.id,
                                                )}
                                                onChange={() =>
                                                    setDraft((current) => ({
                                                        ...current,
                                                        daysOfWeek:
                                                            toggleArrayValue(
                                                                current.daysOfWeek,
                                                                day.id,
                                                            ),
                                                    }))
                                                }
                                            />
                                            {day.label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={{ gridColumn: "1 / -1" }}>
                                <strong style={{ fontSize: "10px" }}>
                                    קבוצות לקוח
                                </strong>
                                <div
                                    style={{
                                        display: "flex",
                                        gap: "10px",
                                        marginTop: "7px",
                                    }}
                                >
                                    {groupOptions.map((groupId) => (
                                        <label
                                            key={groupId}
                                            className="promotion-management__check"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={draft.allowedCustomerGroupIds.includes(
                                                    groupId,
                                                )}
                                                onChange={() =>
                                                    setDraft((current) => ({
                                                        ...current,
                                                        allowedCustomerGroupIds:
                                                            toggleArrayValue(
                                                                current.allowedCustomerGroupIds,
                                                                groupId,
                                                            ),
                                                    }))
                                                }
                                            />
                                            {groupId}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <label className="promotion-management__check">
                                <input
                                    type="checkbox"
                                    checked={draft.isActive}
                                    onChange={(event) =>
                                        setDraft((current) => ({
                                            ...current,
                                            isActive:
                                                event.target.checked,
                                        }))
                                    }
                                />
                                פעיל
                            </label>

                            <label className="promotion-management__check">
                                <input
                                    type="checkbox"
                                    checked={draft.allowStacking}
                                    onChange={(event) =>
                                        setDraft((current) => ({
                                            ...current,
                                            allowStacking:
                                                event.target.checked,
                                        }))
                                    }
                                />
                                ניתן לשילוב
                            </label>

                            {error && (
                                <div className="promotion-management__error">
                                    {error}
                                </div>
                            )}
                        </div>

                        <footer>
                            <button type="button" onClick={cancel}>ביטול</button>
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
