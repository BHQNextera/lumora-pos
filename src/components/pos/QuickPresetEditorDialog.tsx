import {
    useMemo,
    useState,
} from "react";

import type {
    SalePreset,
    SalePresetKind,
} from "../../models/preset/SalePreset";

import type {
    SaleActionDefinition,
} from "../../models/preset/SaleActionRegistry";

import "./QuickPresetEditorDialog.css";

type QuickPresetOption = {
    id: string;
    label: string;
};

type QuickPresetEditorDialogProps = {
    open: boolean;
    maxPresets: number;
    presets: SalePreset[];

    productOptions:
        QuickPresetOption[];

    categoryOptions:
        QuickPresetOption[];

    actions:
        SaleActionDefinition[];

    onChange: (
        presets: SalePreset[],
    ) => void;

    onCancel: () => void;

    onSave: (
        presets: SalePreset[],
    ) => void;
};

type PickerState = {
    presetId: string | null;
    kind: SalePresetKind;
};

type PickerOption = {
    id: string;
    label: string;
    meta: string;
    icon: string;
};

const ACTION_CATEGORY_LABELS:
Record<
    SaleActionDefinition["category"],
    string
> = {
    customer:
        "לקוחות",

    pricing:
        "מחיר והנחות",

    transaction:
        "מכירה",

    stored_value:
        "Gift Card וזיכויים",

    register:
        "קופה",
};

const PRESET_KIND_LABELS:
Record<
    SalePresetKind,
    string
> = {
    action:
        "פעולה",

    product:
        "מוצר",

    category:
        "קטגוריה",
};

function normalizeSearch(
    value: string,
): string {
    return value
        .trim()
        .toLocaleLowerCase(
            "he",
        );
}

function QuickPresetEditorDialog({
    open,
    maxPresets,
    presets,
    productOptions,
    categoryOptions,
    actions,
    onChange,
    onCancel,
    onSave,
}: QuickPresetEditorDialogProps) {
    const [
        picker,
        setPicker,
    ] =
        useState<PickerState | null>(
            null,
        );

    const [
        searchTerm,
        setSearchTerm,
    ] =
        useState("");

    const openPicker = (
        preset?: SalePreset,
    ) => {
        setPicker({
            presetId:
                preset?.id ??
                null,

            kind:
                preset?.kind ??
                "action",
        });

        setSearchTerm("");
    };

    const closePicker = () => {
        setPicker(null);
        setSearchTerm("");
    };

    const pickerResults =
        useMemo(
            () => {
                if (!picker) {
                    return {
                        visible: [],
                        total: 0,
                    };
                }

                let options:
                    PickerOption[];

                if (
                    picker.kind ===
                    "action"
                ) {
                    options =
                        actions.map(
                            (
                                action,
                            ) => ({
                                id:
                                    action.id,

                                label:
                                    action.label,

                                meta:
                                    ACTION_CATEGORY_LABELS[
                                        action
                                            .category
                                    ],

                                icon:
                                    action.icon,
                            }),
                        );
                } else if (
                    picker.kind ===
                    "product"
                ) {
                    options =
                        productOptions.map(
                            (
                                product,
                            ) => ({
                                id:
                                    product.id,

                                label:
                                    product.label,

                                meta:
                                    "מוצר",

                                icon:
                                    "□",
                            }),
                        );
                } else {
                    options =
                        categoryOptions.map(
                            (
                                category,
                            ) => ({
                                id:
                                    category.id,

                                label:
                                    category.label,

                                meta:
                                    "קטגוריה",

                                icon:
                                    "▦",
                            }),
                        );
                }

                const normalized =
                    normalizeSearch(
                        searchTerm,
                    );

                const filtered =
                    normalized
                        ? options.filter(
                              (
                                  option,
                              ) =>
                                  normalizeSearch(
                                      `${
                                          option.label
                                      } ${
                                          option.meta
                                      }`,
                                  ).includes(
                                      normalized,
                                  ),
                          )
                        : options;

                return {
                    visible:
                        filtered.slice(
                            0,
                            12,
                        ),

                    total:
                        filtered.length,
                };
            },
            [
                picker,
                searchTerm,
                actions,
                productOptions,
                categoryOptions,
            ],
        );

    if (!open) {
        return null;
    }

    const chooseTarget = (
        targetId: string,
    ) => {
        if (!picker) {
            return;
        }

        if (
            picker.presetId
        ) {
            onChange(
                presets.map(
                    (
                        preset,
                    ) =>
                        preset.id ===
                        picker.presetId
                            ? {
                                  ...preset,

                                  kind:
                                      picker.kind,

                                  targetId,
                              }
                            : preset,
                ),
            );
        } else if (
            presets.length <
            maxPresets
        ) {
            onChange([
                ...presets,
                {
                    id:
                        crypto.randomUUID(),

                    kind:
                        picker.kind,

                    targetId,
                },
            ]);
        }

        closePicker();
    };

    return (
        <div
            className="quick-preset-editor__backdrop"
            onMouseDown={
                onCancel
            }
        >
            <section
                className="quick-preset-editor"
                dir="rtl"
                aria-label="הגדרת קיצורים מהירים"
                onMouseDown={(
                    event,
                ) =>
                    event.stopPropagation()
                }
            >
                <header className="quick-preset-editor__header">
                    <div className="quick-preset-editor__heading">
                        <strong>
                            קיצורים מהירים
                        </strong>

                        <span>
                            בחר עד{" "}
                            {
                                maxPresets
                            }{" "}
                            קיצורים למסך המכירה
                        </span>
                    </div>

                    <button
                        type="button"
                        className="quick-preset-editor__close"
                        aria-label="סגור"
                        onClick={
                            onCancel
                        }
                    >
                        ×
                    </button>
                </header>

                {picker ? (
                    <div className="quick-preset-editor__picker">
                        <div className="quick-preset-editor__picker-heading">
                            <button
                                type="button"
                                className="quick-preset-editor__back"
                                onClick={
                                    closePicker
                                }
                            >
                                חזרה
                            </button>

                            <div>
                                <strong>
                                    {picker.presetId
                                        ? "שינוי קיצור"
                                        : "בחירת קיצור חדש"}
                                </strong>

                                <span>
                                    בחר פעולה,
                                    מוצר או
                                    קטגוריה
                                </span>
                            </div>
                        </div>

                        <div
                            className="quick-preset-editor__tabs"
                            role="tablist"
                            aria-label="סוג קיצור"
                        >
                            {(
                                [
                                    [
                                        "action",
                                        "פעולות",
                                    ],
                                    [
                                        "product",
                                        "מוצרים",
                                    ],
                                    [
                                        "category",
                                        "קטגוריות",
                                    ],
                                ] as Array<
                                    [
                                        SalePresetKind,
                                        string,
                                    ]
                                >
                            ).map(
                                ([
                                    kind,
                                    label,
                                ]) => (
                                    <button
                                        key={
                                            kind
                                        }
                                        type="button"
                                        className={
                                            picker.kind ===
                                            kind
                                                ? "quick-preset-editor__tab quick-preset-editor__tab--active"
                                                : "quick-preset-editor__tab"
                                        }
                                        onClick={() => {
                                            setPicker(
                                                (
                                                    current,
                                                ) =>
                                                    current
                                                        ? {
                                                              ...current,
                                                              kind,
                                                          }
                                                        : null,
                                            );

                                            setSearchTerm(
                                                "",
                                            );
                                        }}
                                    >
                                        {
                                            label
                                        }
                                    </button>
                                ),
                            )}
                        </div>

                        <label className="quick-preset-editor__search">
                            <span>
                                חיפוש
                            </span>

                            <input
                                type="search"
                                value={
                                    searchTerm
                                }
                                placeholder={
                                    picker.kind ===
                                    "action"
                                        ? "חפש פעולה..."
                                        : picker.kind ===
                                          "product"
                                        ? "חפש מוצר..."
                                        : "חפש קטגוריה..."
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setSearchTerm(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                            />
                        </label>

                        {pickerResults
                            .visible
                            .length >
                        0 ? (
                            <div className="quick-preset-editor__options">
                                {pickerResults.visible.map(
                                    (
                                        option,
                                    ) => (
                                        <button
                                            key={
                                                option.id
                                            }
                                            type="button"
                                            className="quick-preset-editor__option"
                                            onClick={() =>
                                                chooseTarget(
                                                    option.id,
                                                )
                                            }
                                        >
                                            <span className="quick-preset-editor__option-icon">
                                                {
                                                    option.icon
                                                }
                                            </span>

                                            <span className="quick-preset-editor__option-copy">
                                                <strong>
                                                    {
                                                        option.label
                                                    }
                                                </strong>

                                                <small>
                                                    {
                                                        option.meta
                                                    }
                                                </small>
                                            </span>

                                            <span
                                                className="quick-preset-editor__option-arrow"
                                                aria-hidden="true"
                                            >
                                                ←
                                            </span>
                                        </button>
                                    ),
                                )}
                            </div>
                        ) : (
                            <div className="quick-preset-editor__empty">
                                לא נמצאו
                                אפשרויות
                            </div>
                        )}

                        {pickerResults.total >
                            pickerResults
                                .visible
                                .length && (
                            <div className="quick-preset-editor__result-hint">
                                מוצגות{" "}
                                {
                                    pickerResults
                                        .visible
                                        .length
                                }{" "}
                                מתוך{" "}
                                {
                                    pickerResults
                                        .total
                                }
                                . הקלד בחיפוש
                                כדי לצמצם.
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="quick-preset-editor__cards">
                            {presets.map(
                                (
                                    preset,
                                    index,
                                ) => {
                                    const product =
                                        preset.kind ===
                                        "product"
                                            ? productOptions.find(
                                                  (
                                                      option,
                                                  ) =>
                                                      option.id ===
                                                      preset.targetId,
                                              )
                                            : undefined;

                                    const category =
                                        preset.kind ===
                                        "category"
                                            ? categoryOptions.find(
                                                  (
                                                      option,
                                                  ) =>
                                                      option.id ===
                                                      preset.targetId,
                                              )
                                            : undefined;

                                    const action =
                                        preset.kind ===
                                        "action"
                                            ? actions.find(
                                                  (
                                                      option,
                                                  ) =>
                                                      option.id ===
                                                      preset.targetId,
                                              )
                                            : undefined;

                                    const label =
                                        product?.label ??
                                        category?.label ??
                                        action?.label ??
                                        "קיצור לא זמין";

                                    const meta =
                                        action
                                            ? `פעולה · ${
                                                  ACTION_CATEGORY_LABELS[
                                                      action
                                                          .category
                                                  ]
                                              }`
                                            : PRESET_KIND_LABELS[
                                                  preset
                                                      .kind
                                              ];

                                    const icon =
                                        action?.icon ??
                                        (preset.kind ===
                                        "product"
                                            ? "□"
                                            : "▦");

                                    return (
                                        <article
                                            key={
                                                preset.id
                                            }
                                            className="quick-preset-editor__card"
                                        >
                                            <span className="quick-preset-editor__slot">
                                                {index +
                                                    1}
                                            </span>

                                            <button
                                                type="button"
                                                className="quick-preset-editor__card-main"
                                                onClick={() =>
                                                    openPicker(
                                                        preset,
                                                    )
                                                }
                                            >
                                                <span className="quick-preset-editor__card-icon">
                                                    {
                                                        icon
                                                    }
                                                </span>

                                                <span className="quick-preset-editor__card-copy">
                                                    <strong>
                                                        {
                                                            label
                                                        }
                                                    </strong>

                                                    <small>
                                                        {
                                                            meta
                                                        }
                                                    </small>
                                                </span>

                                                <span className="quick-preset-editor__change">
                                                    שנה
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                className="quick-preset-editor__remove"
                                                onClick={() =>
                                                    onChange(
                                                        presets.filter(
                                                            (
                                                                item,
                                                            ) =>
                                                                item.id !==
                                                                preset.id,
                                                        ),
                                                    )
                                                }
                                            >
                                                הסר
                                            </button>
                                        </article>
                                    );
                                },
                            )}

                            {presets.length <
                                maxPresets && (
                                <button
                                    type="button"
                                    className="quick-preset-editor__add"
                                    onClick={() =>
                                        openPicker()
                                    }
                                >
                                    <span>
                                        +
                                    </span>

                                    <strong>
                                        הוסף
                                        קיצור
                                    </strong>

                                    <small>
                                        פעולה,
                                        מוצר או
                                        קטגוריה
                                    </small>
                                </button>
                            )}
                        </div>

                        {presets.length ===
                            0 && (
                            <div className="quick-preset-editor__empty-note">
                                עדיין לא
                                הוגדרו
                                קיצורים
                            </div>
                        )}

                        <footer className="quick-preset-editor__footer">
                            <button
                                type="button"
                                className="quick-preset-editor__cancel"
                                onClick={
                                    onCancel
                                }
                            >
                                ביטול
                            </button>

                            <button
                                type="button"
                                className="quick-preset-editor__save"
                                onClick={() =>
                                    onSave(
                                        presets,
                                    )
                                }
                            >
                                שמור קיצורים
                            </button>
                        </footer>
                    </>
                )}
            </section>
        </div>
    );
}

export default QuickPresetEditorDialog;