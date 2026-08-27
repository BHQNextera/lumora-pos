import {
    useState,
    type Dispatch,
    type SetStateAction,
} from "react";

import type {
    PromotionType,
} from "../../models/promotion/Promotion";

import {
    createEmptyBundleComponentDraft,
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

function formatDiscountValue(
    draft: PromotionDraft,
) {
    return draft.valueType ===
        "percentage"
        ? `${draft.value}%`
        : `${draft.value} ₪`;
}

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

    const bundleSummary =
        draft.bundleComponents
            .map(
                (component) =>
                    `${component.quantity}× ${populationSummary(
                        component.population
                            .productIds,
                        component.population
                            .categoryIds,
                        component.population
                            .excludedProductIds,
                        component.population
                            .excludedCategoryIds,
                        products,
                        categories,
                    )}`,
            )
            .join(" + ");

    const discountValue =
        formatDiscountValue(
            draft,
        );

    switch (draft.type) {
        case "category_discount":
        case "fixed_amount_discount":
            return `${discountValue} הנחה על ${target}`;

        case "quantity_discount":
            return `בקניית ${draft.quantity} פריטים או יותר מתוך ${target} — ${discountValue} הנחה`;

        case "bundle_price":
            return `${bundleSummary} במחיר חבילה של ₪${draft.bundlePrice}`;

        case "mix_and_match":
            return `בחר ${draft.quantity} פריטים מתוך ${target} ושלם ₪${draft.bundlePrice}`;

        case "buy_x_get_y":
            return `קנה ${draft.quantity} מתוך ${target} וקבל ${draft.getQuantity} נוספים ב־${discountValue} הנחה`;

        case "buy_a_get_b":
            return `קנה ${draft.quantity} מתוך ${target} וקבל ${draft.getQuantity} מתוך ${reward} ב־${discountValue} הנחה`;

        case "basket_discount":
            return `בקנייה מעל ₪${draft.basketMinimumAmount} מתוך ${target} — ${discountValue} הנחה`;

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
    const [activeStep, setActiveStep] =
        useState(1);

    const steps = [
        { id: 1, label: "פרטים" },
        { id: 2, label: "מוצרים וקטגוריות" },
        { id: 3, label: "הטבה" },
        { id: 4, label: "קהל ותזמון" },
        { id: 5, label: "סיכום" },
    ];

    const isFirstStep =
        activeStep === 1;

    const isLastStep =
        activeStep === 5;

    const goPrevious = () => {
        setActiveStep((current) =>
            Math.max(1, current - 1),
        );
    };

    const goNext = () => {
        setActiveStep((current) =>
            Math.min(5, current + 1),
        );
    };
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

    const addBundleComponent =
        () => {
            setDraft(
                (current) => ({
                    ...current,
                    bundleComponents: [
                        ...current.bundleComponents,
                        createEmptyBundleComponentDraft(),
                    ],
                }),
            );
        };

    const updateBundleComponent =
        (
            componentId: string,
            patch: Partial<
                PromotionDraft[
                    "bundleComponents"
                ][number]
            >,
        ) => {
            setDraft(
                (current) => ({
                    ...current,
                    bundleComponents:
                        current.bundleComponents.map(
                            (component) =>
                                component.id ===
                                componentId
                                    ? {
                                          ...component,
                                          ...patch,
                                      }
                                    : component,
                        ),
                }),
            );
        };

    const removeBundleComponent =
        (componentId: string) => {
            setDraft(
                (current) => ({
                    ...current,
                    bundleComponents:
                        current.bundleComponents
                            .filter(
                                (component) =>
                                    component.id !==
                                    componentId,
                            ),
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
            "buy_x_get_y" ||
        draft.type ===
            "buy_a_get_b"
            ? "הנחה על פריט ההטבה"
            : "ערך ההנחה";

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
                            בנה את המבצע בחמישה שלבים פשוטים.
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

                <nav
                    className="promotion-builder__steps"
                    aria-label="שלבי בניית מבצע"
                >
                    {steps.map((step) => (
                        <button
                            key={step.id}
                            type="button"
                            className={
                                step.id === activeStep
                                    ? "promotion-builder__step promotion-builder__step--active"
                                    : step.id < activeStep
                                      ? "promotion-builder__step promotion-builder__step--done"
                                      : "promotion-builder__step"
                            }
                            onClick={() =>
                                setActiveStep(step.id)
                            }
                        >
                            <span>{step.id}</span>
                            <strong>{step.label}</strong>
                        </button>
                    ))}
                </nav>

                <div
                    className="promotion-builder__body"
                    data-step={activeStep}
                >
                    <section
                        className="promotion-builder__section"
                        hidden={activeStep !== 1}
                    >
                        <div className="promotion-builder__section-title">
                            <span>1</span>
                            <div>
                                <strong>
                                    פרטי המבצע
                                </strong>
                                <small>
                                    שם המבצע וסוג ההטבה
                                </small>
                            </div>
                        </div>

                        <div className="promotion-builder__fields">
                            <label className="promotion-builder__wide">
                                <span className="promotion-builder__label-text">
                                    שם המבצע
                                    <b aria-hidden="true">*</b>
                                </span>
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

                    <section
                        className="promotion-builder__section"
                        hidden={activeStep !== 2}
                    >
                        <div className="promotion-builder__section-title">
                            <span>2</span>
                            <div>
                                <strong>
                                    {draft.type ===
                                    "bundle_price"
                                        ? "מה מרכיבי החבילה?"
                                        : "מוצרים וקטגוריות"}
                                </strong>
                                <small>
                                    {draft.type ===
                                    "bundle_price"
                                        ? "כל רכיב מגדיר אוכלוסייה וכמות נדרשת"
                                        : "בחר מה משתתף במבצע ומה מוחרג"}
                                </small>
                            </div>
                        </div>

                        {draft.type ===
                            "bundle_price" ? (
                            <div className="promotion-builder__bundle-list">
                                {draft.bundleComponents.map(
                                    (
                                        component,
                                        index,
                                    ) => (
                                        <div
                                            key={
                                                component.id
                                            }
                                            className="promotion-builder__bundle-component"
                                        >
                                            <div className="promotion-builder__bundle-component-head">
                                                <strong>
                                                    רכיב{" "}
                                                    {index +
                                                        1}
                                                </strong>

                                                {draft
                                                    .bundleComponents
                                                    .length >
                                                    2 && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeBundleComponent(
                                                                component.id,
                                                            )
                                                        }
                                                    >
                                                        הסר
                                                    </button>
                                                )}
                                            </div>

                                            <label>
                                                כמות נדרשת
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={
                                                        component.quantity
                                                    }
                                                    onChange={(
                                                        event,
                                                    ) =>
                                                        updateBundleComponent(
                                                            component.id,
                                                            {
                                                                quantity:
                                                                    event
                                                                        .target
                                                                        .value,
                                                            },
                                                        )
                                                    }
                                                />
                                            </label>

                                            <PromotionPopulationEditor
                                                title={`אוכלוסיית רכיב ${index + 1}`}
                                                description="בחר פריטים ו/או קטגוריות שיכולים למלא את הרכיב. החרגה תמיד גוברת."
                                                value={
                                                    component.population
                                                }
                                                products={
                                                    products
                                                }
                                                categories={
                                                    categories
                                                }
                                                onChange={(
                                                    value,
                                                ) =>
                                                    updateBundleComponent(
                                                        component.id,
                                                        {
                                                            population:
                                                                value,
                                                        },
                                                    )
                                                }
                                            />
                                        </div>
                                    ),
                                )}

                                <button
                                    type="button"
                                    onClick={
                                        addBundleComponent
                                    }
                                >
                                    + הוסף רכיב לחבילה
                                </button>
                            </div>
                        ) : (
                            <PromotionPopulationEditor
                                title="מוצרים וקטגוריות במבצע"
                                description="בחר קטגוריות ו/או פריטים. החרגה תמיד גוברת על הכללה."
                                value={
                                    draft.targetPopulation
                                }
                                products={products}
                                categories={
                                    categories
                                }
                                onChange={(value) =>
                                    updateField(
                                        "targetPopulation",
                                        value,
                                    )
                                }
                            />
                        )}
                    </section>

                    <section
                        className="promotion-builder__section"
                        hidden={activeStep !== 3}
                    >
                        <div className="promotion-builder__section-title">
                            <span>3</span>
                            <div>
                                <strong>
                                    תנאי והטבה
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

                                    <div className="promotion-builder__value-control">
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

                                        <select
                                            value={
                                                draft.valueType
                                            }
                                            onChange={(event) =>
                                                updateField(
                                                    "valueType",
                                                    event.target.value as
                                                        | "percentage"
                                                        | "fixed_amount",
                                                )
                                            }
                                        >
                                            <option value="percentage">
                                                %
                                            </option>

                                            <option value="fixed_amount">
                                                ₪
                                            </option>
                                        </select>
                                    </div>
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

                    <section
                        className="promotion-builder__section"
                        hidden={activeStep !== 4}
                    >
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

                    <section
                        className="promotion-builder__section"
                        hidden={activeStep !== 5}
                    >
                        <div className="promotion-builder__section-title">
                            <span>5</span>
                            <div>
                                <strong>
                                    בדיקה ושמירה
                                </strong>
                                <small>
                                    בדיקה אחרונה לפני שמירה והפעלה
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

                    <section
                        className="promotion-builder__preview"
                        hidden={activeStep !== 5}
                    >
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

                <footer className="promotion-builder__footer">
                    <div className="promotion-builder__footer-primary">
                        {isLastStep ? (
                            <button
                                type="button"
                                className="promotion-management__primary"
                                onClick={onSave}
                            >
                                שמירת מבצע
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="promotion-management__primary"
                                onClick={goNext}
                            >
                                הבא
                            </button>
                        )}

                        {!isFirstStep && (
                            <button
                                type="button"
                                onClick={goPrevious}
                            >
                                הקודם
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={onCancel}
                    >
                        ביטול
                    </button>
                </footer>
            </div>
        </div>
    );
}

export default PromotionBuilderDialog;