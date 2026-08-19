import type {
    Dispatch,
    SetStateAction,
} from "react";

import type {
    PromotionType,
} from "../../models/promotion/Promotion";

import {
    promotionTypeOptions,
    type PromotionDraft,
} from "./PromotionBuilderModel";

import PromotionPopulationEditor from "./PromotionPopulationEditor";

type SelectableItem = {
    id: string;
    name: string;
};

type PromotionBuilderDialogProps = {
    isNew: boolean;

    draft: PromotionDraft;

    setDraft:
        Dispatch<
            SetStateAction<PromotionDraft>
        >;

    products: SelectableItem[];
    categories: SelectableItem[];

    error: string | null;

    onCancel: () => void;
    onSave: () => void;
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

const groupOptions = [
    {
        id: "club",
        label: "מועדון",
    },
    {
        id: "vip",
        label: "VIP",
    },
    {
        id: "employee",
        label: "עובדים",
    },
];

function toggleArrayValue<T>(
    values: T[],
    value: T,
) {
    return values.includes(value)
        ? values.filter(
              (item) =>
                  item !== value,
          )
        : [
              ...values,
              value,
          ];
}

function findName(
    id: string,
    items: SelectableItem[],
) {
    return (
        items.find(
            (item) =>
                item.id === id,
        )?.name ??
        id
    );
}

function populationSummary(
    productIds: string[],
    categoryIds: string[],
    excludedProductIds: string[],
    excludedCategoryIds: string[],
    products: SelectableItem[],
    categories: SelectableItem[],
) {
    const included = [
        ...categoryIds.map(
            (id) =>
                `קטגוריה: ${findName(
                    id,
                    categories,
                )}`,
        ),

        ...productIds.map(
            (id) =>
                findName(
                    id,
                    products,
                ),
        ),
    ];

    const excluded = [
        ...excludedCategoryIds.map(
            (id) =>
                `קטגוריה: ${findName(
                    id,
                    categories,
                )}`,
        ),

        ...excludedProductIds.map(
            (id) =>
                findName(
                    id,
                    products,
                ),
        ),
    ];

    if (included.length === 0) {
        return "לא נבחרה אוכלוסייה";
    }

    const includedText =
        included.join(", ");

    if (excluded.length === 0) {
        return includedText;
    }

    return `${includedText} · למעט ${excluded.join(
        ", ",
    )}`;
}

function buildPreview(
    draft: PromotionDraft,
    products: SelectableItem[],
    categories: SelectableItem[],
) {
    const target =
        populationSummary(
            draft.targetPopulation
                .productIds,
            draft.targetPopulation
                .categoryIds,
            draft.targetPopulation
                .excludedProductIds,
            draft.targetPopulation
                .excludedCategoryIds,
            products,
            categories,
        );

    const reward =
        populationSummary(
            draft.rewardPopulation
                .productIds,
            draft.rewardPopulation
                .categoryIds,
            draft.rewardPopulation
                .excludedProductIds,
            draft.rewardPopulation
                .excludedCategoryIds,
            products,
            categories,
        );

    switch (draft.type) {
        case "category_discount":
            return `${draft.value}% הנחה על ${target}`;

        case "fixed_amount_discount":
            return `₪${draft.value} הנחה על ${target}`;

        case "quantity_discount":
            return `בקניית ${draft.quantity} פריטים או יותר מתוך ${target} — ${draft.value}% הנחה`;

        case "bundle_price":
            return `${draft.quantity} פריטים מתוך ${target} במחיר חבילה של ₪${draft.bundlePrice}`;

        case "mix_and_match":
            return `בחר ${draft.quantity} פריטים מתוך ${target} ושלם ₪${draft.bundlePrice}`;

        case "buy_x_get_y":
            return `קנה ${draft.quantity} מתוך ${target} וקבל ${draft.getQuantity} נוספים ב־${draft.value}% הנחה`;

        case "buy_a_get_b":
            return `קנה ${draft.quantity} מתוך ${target} וקבל ${draft.getQuantity} מתוך ${reward} ב־${draft.value}% הנחה`;

        case "basket_discount":
            return `בקנייה מעל ₪${draft.basketMinimumAmount} מתוך ${target} — ${draft.value}% הנחה`;

        case "basket_tier_discount":
            return "מדרגות סל עדיין אינן זמינות ב־Builder V1";
    }
}

function PromotionBuilderDialog({
    isNew,
    draft,
    setDraft,
    products,
    categories,
    error,
    onCancel,
    onSave,
}: PromotionBuilderDialogProps) {
    const updateField = <
        K extends keyof PromotionDraft,
    >(
        key: K,
        value: PromotionDraft[K],
    ) => {
        setDraft(
            (current) => ({
                ...current,
                [key]: value,
            }),
        );
    };

    const changeType = (
        type: PromotionType,
    ) => {
        setDraft(
            (current) => ({
                ...current,
                type,
            }),
        );
    };

    const preview =
        buildPreview(
            draft,
            products,
            categories,
        );

    const showsValue =
        [
            "category_discount",
            "fixed_amount_discount",
            "quantity_discount",
            "buy_x_get_y",
            "buy_a_get_b",
            "basket_discount",
        ].includes(
            draft.type,
        );

    const showsQuantity =
        [
            "quantity_discount",
            "bundle_price",
            "mix_and_match",
            "buy_x_get_y",
            "buy_a_get_b",
        ].includes(
            draft.type,
        );

    const showsGetQuantity =
        draft.type ===
            "buy_x_get_y" ||
        draft.type ===
            "buy_a_get_b";

    const showsBundlePrice =
        draft.type ===
            "bundle_price" ||
        draft.type ===
            "mix_and_match";

    const showsBasketMinimum =
        draft.type ===
        "basket_discount";

    const valueLabel =
        draft.type ===
        "fixed_amount_discount"
            ? "סכום ההנחה (₪)"
            : draft.type ===
                  "buy_x_get_y" ||
              draft.type ===
                  "buy_a_get_b"
              ? "הנחה על פריט ההטבה (%)"
              : "אחוז הנחה (%)";

    const quantityLabel =
        draft.type ===
        "quantity_discount"
            ? "מינימום פריטים"
            : draft.type ===
                  "bundle_price" ||
              draft.type ===
                  "mix_and_match"
              ? "מספר פריטים בחבילה"
              : "כמות לקנייה (X)";

    return (
        <div className="promotion-management__overlay">
            <div className="promotion-management__dialog promotion-builder">
                <header>
                    <div>
                        <h2>
                            {isNew
                                ? "מבצע חדש"
                                : "עריכת מבצע"}
                        </h2>

                        <span>
                            הגדר את המבצע לפי האוכלוסייה,
                            התנאי וההטבה.
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={onCancel}
                        aria-label="סגור"
                    >
                        ×
                    </button>
                </header>

                <div className="promotion-builder__body">
                    <section className="promotion-builder__section">
                        <div className="promotion-builder__section-title">
                            <span>1</span>
                            <div>
                                <strong>
                                    מה המבצע?
                                </strong>
                                <small>
                                    שם ותבנית המבצע
                                </small>
                            </div>
                        </div>

                        <div className="promotion-builder__fields">
                            <label className="promotion-builder__wide">
                                שם המבצע
                                <input
                                    value={draft.name}
                                    onChange={(event) =>
                                        updateField(
                                            "name",
                                            event.target.value,
                                        )
                                    }
                                    placeholder="לדוגמה: 10% על משקאות חמים"
                                />
                            </label>

                            <label className="promotion-builder__wide">
                                סוג מבצע
                                <select
                                    value={draft.type}
                                    onChange={(event) =>
                                        changeType(
                                            event.target.value as PromotionType,
                                        )
                                    }
                                >
                                    {promotionTypeOptions.map(
                                        (option) => (
                                            <option
                                                key={option.value}
                                                value={option.value}
                                                disabled={
                                                    option.disabled
                                                }
                                            >
                                                {option.label}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>
                        </div>
                    </section>

                    <section className="promotion-builder__section">
                        <div className="promotion-builder__section-title">
                            <span>2</span>
                            <div>
                                <strong>
                                    על מה המבצע חל?
                                </strong>
                                <small>
                                    אפשר לשלב כמה קטגוריות וכמה פריטים
                                </small>
                            </div>
                        </div>

                        <PromotionPopulationEditor
                            title="אוכלוסיית המבצע"
                            description="פריט ייכלל אם הוא נמצא באחת הבחירות. החרגה תמיד גוברת."
                            value={
                                draft.targetPopulation
                            }
                            products={products}
                            categories={categories}
                            onChange={(value) =>
                                updateField(
                                    "targetPopulation",
                                    value,
                                )
                            }
                        />
                    </section>

                    <section className="promotion-builder__section">
                        <div className="promotion-builder__section-title">
                            <span>3</span>
                            <div>
                                <strong>
                                    מה התנאי ומה מקבלים?
                                </strong>
                                <small>
                                    מוצגים רק השדות הרלוונטיים לסוג המבצע
                                </small>
                            </div>
                        </div>

                        <div className="promotion-builder__fields">
                            {showsQuantity && (
                                <label>
                                    {quantityLabel}
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={
                                            draft.quantity
                                        }
                                        onChange={(event) =>
                                            updateField(
                                                "quantity",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </label>
                            )}

                            {showsGetQuantity && (
                                <label>
                                    כמות הטבה (Y)
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={
                                            draft.getQuantity
                                        }
                                        onChange={(event) =>
                                            updateField(
                                                "getQuantity",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </label>
                            )}

                            {showsValue && (
                                <label>
                                    {valueLabel}
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            draft.value
                                        }
                                        onChange={(event) =>
                                            updateField(
                                                "value",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </label>
                            )}

                            {showsBundlePrice && (
                                <label>
                                    מחיר חבילה (₪)
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            draft.bundlePrice
                                        }
                                        onChange={(event) =>
                                            updateField(
                                                "bundlePrice",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </label>
                            )}

                            {showsBasketMinimum && (
                                <label>
                                    מינימום סל (₪)
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={
                                            draft.basketMinimumAmount
                                        }
                                        onChange={(event) =>
                                            updateField(
                                                "basketMinimumAmount",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </label>
                            )}
                        </div>

                        {draft.type ===
                            "buy_a_get_b" && (
                            <PromotionPopulationEditor
                                title="אוכלוסיית ההטבה (B)"
                                description="הפריטים שיכולים לקבל את ההטבה. אוכלוסייה זו נפרדת מאוכלוסיית הקנייה."
                                value={
                                    draft.rewardPopulation
                                }
                                products={products}
                                categories={categories}
                                onChange={(value) =>
                                    updateField(
                                        "rewardPopulation",
                                        value,
                                    )
                                }
                            />
                        )}
                    </section>

                    <section className="promotion-builder__section">
                        <div className="promotion-builder__section-title">
                            <span>4</span>
                            <div>
                                <strong>
                                    למי ומתי?
                                </strong>
                                <small>
                                    ללא בחירה — המבצע חל על כולם ובכל זמן
                                </small>
                            </div>
                        </div>

                        <div className="promotion-builder__subgroup">
                            <strong>
                                קבוצות לקוח
                            </strong>

                            <div className="promotion-builder__checks">
                                {groupOptions.map(
                                    (group) => (
                                        <label
                                            key={
                                                group.id
                                            }
                                            className="promotion-management__check"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={
                                                    draft.allowedCustomerGroupIds.includes(
                                                        group.id,
                                                    )
                                                }
                                                onChange={() =>
                                                    updateField(
                                                        "allowedCustomerGroupIds",
                                                        toggleArrayValue(
                                                            draft.allowedCustomerGroupIds,
                                                            group.id,
                                                        ),
                                                    )
                                                }
                                            />
                                            {
                                                group.label
                                            }
                                        </label>
                                    ),
                                )}
                            </div>
                        </div>

                        <div className="promotion-builder__fields">
                            <label>
                                התחלה
                                <input
                                    type="datetime-local"
                                    value={
                                        draft.startsAt
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "startsAt",
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>

                            <label>
                                סיום
                                <input
                                    type="datetime-local"
                                    value={
                                        draft.endsAt
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "endsAt",
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>

                            <label>
                                משעה
                                <input
                                    type="time"
                                    value={
                                        draft.startTime
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "startTime",
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>

                            <label>
                                עד שעה
                                <input
                                    type="time"
                                    value={
                                        draft.endTime
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "endTime",
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                        </div>

                        <div className="promotion-builder__subgroup">
                            <strong>
                                ימים
                            </strong>

                            <div className="promotion-builder__checks">
                                {dayOptions.map(
                                    (day) => (
                                        <label
                                            key={day.id}
                                            className="promotion-management__check"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={
                                                    draft.daysOfWeek.includes(
                                                        day.id,
                                                    )
                                                }
                                                onChange={() =>
                                                    updateField(
                                                        "daysOfWeek",
                                                        toggleArrayValue(
                                                            draft.daysOfWeek,
                                                            day.id,
                                                        ),
                                                    )
                                                }
                                            />
                                            {day.label}
                                        </label>
                                    ),
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="promotion-builder__section">
                        <div className="promotion-builder__section-title">
                            <span>5</span>
                            <div>
                                <strong>
                                    הגדרות מתקדמות
                                </strong>
                                <small>
                                    בדרך כלל אין צורך לשנות
                                </small>
                            </div>
                        </div>

                        <div className="promotion-builder__advanced">
                            <label className="promotion-management__check">
                                <input
                                    type="checkbox"
                                    checked={
                                        draft.isActive
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "isActive",
                                            event.target.checked,
                                        )
                                    }
                                />
                                המבצע פעיל
                            </label>

                            <label className="promotion-management__check">
                                <input
                                    type="checkbox"
                                    checked={
                                        draft.allowStacking
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "allowStacking",
                                            event.target.checked,
                                        )
                                    }
                                />
                                ניתן לשילוב עם מבצעים אחרים
                            </label>

                            <label>
                                עדיפות
                                <input
                                    type="number"
                                    step="1"
                                    value={
                                        draft.priority
                                    }
                                    onChange={(event) =>
                                        updateField(
                                            "priority",
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                        </div>
                    </section>

                    <section className="promotion-builder__preview">
                        <span>
                            כך המבצע יתנהג בקופה
                        </span>

                        <strong>
                            {preview}
                        </strong>
                    </section>

                    {error && (
                        <div className="promotion-management__error">
                            {error}
                        </div>
                    )}
                </div>

                <footer>
                    <button
                        type="button"
                        onClick={onCancel}
                    >
                        ביטול
                    </button>

                    <button
                        type="button"
                        className="promotion-management__primary"
                        onClick={onSave}
                    >
                        שמירת מבצע
                    </button>
                </footer>
            </div>
        </div>
    );
}

export default PromotionBuilderDialog;
