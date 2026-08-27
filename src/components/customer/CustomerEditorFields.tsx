import {
    getActiveBusinessOperatingProfile,
} from "../../config/ActiveBusinessConfiguration";

import type {
    CustomerGroupId,
} from "../../models/customer/Customer";

import type {
    CustomerEditorDraft,
} from "../../models/customer/CustomerEditorDraft";

type CustomerEditorFieldsProps = {
    draft:
        CustomerEditorDraft;

    onChange: (
        next:
            CustomerEditorDraft,
    ) => void;

    error?:
        string | null;

    onClearError?:
        () => void;

    autoFocusName?:
        boolean;
};

const customerGroups: {
    id: CustomerGroupId;
    label: string;
}[] = [
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
        label: "עובד",
    },
];

function CustomerEditorFields({
    draft,
    onChange,
    error,
    onClearError,
    autoFocusName = false,
}: CustomerEditorFieldsProps) {
    const customerPolicy =
        getActiveBusinessOperatingProfile()
            .customerPolicy;

    const update = <
        K extends keyof CustomerEditorDraft,
    >(
        key: K,
        value:
            CustomerEditorDraft[K],
    ) => {
        onClearError?.();

        onChange({
            ...draft,
            [key]:
                value,
        });
    };

    const toggleGroup = (
        groupId:
            CustomerGroupId,
    ) => {
        const hasGroup =
            draft.groupIds.includes(
                groupId,
            );

        update(
            "groupIds",
            hasGroup
                ? draft.groupIds.filter(
                      (id) =>
                          id !==
                          groupId,
                  )
                : [
                      ...draft.groupIds,
                      groupId,
                  ],
        );
    };

    const idRequired =
        customerPolicy
            .requireCustomerId;

    const birthDateRequired =
        customerPolicy
            .requireCustomerBirthDate;

    return (
        <div className="customer-management__form customer-editor-fields">
            <div className="customer-management__required-note">
                <span aria-hidden="true">
                    *
                </span>
                שדות חובה לפי מדיניות העסק
            </div>

            <label className="customer-management__required-field">
                <span className="customer-management__label-text">
                    שם
                    <span
                        className="customer-management__required-mark"
                        aria-hidden="true"
                    >
                        *
                    </span>
                </span>

                <input
                    autoFocus={
                        autoFocusName
                    }
                    aria-required="true"
                    value={
                        draft.name
                    }
                    onChange={(
                        event,
                    ) =>
                        update(
                            "name",
                            event.target
                                .value,
                        )
                    }
                />
            </label>

            <label className="customer-management__required-field">
                <span className="customer-management__label-text">
                    טלפון
                    <span
                        className="customer-management__required-mark"
                        aria-hidden="true"
                    >
                        *
                    </span>
                </span>

                <input
                    dir="ltr"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                    minLength={10}
                    pattern="05[0-9]{8}"
                    placeholder="05XXXXXXXX"
                    aria-required="true"
                    value={
                        draft.phone
                    }
                    onChange={(
                        event,
                    ) =>
                        update(
                            "phone",
                            event.target.value
                                .replace(
                                    /\D/g,
                                    "",
                                )
                                .slice(
                                    0,
                                    10,
                                ),
                        )
                    }
                />

                <small className="customer-management__field-hint">
                    10 ספרות · מספר נייד ישראלי
                </small>
            </label>

            <label>
                אימייל

                <input
                    dir="ltr"
                    type="email"
                    autoComplete="email"
                    value={
                        draft.email
                    }
                    onChange={(
                        event,
                    ) =>
                        update(
                            "email",
                            event.target
                                .value,
                        )
                    }
                />
            </label>

            <label
                className={
                    idRequired
                        ? "customer-management__required-field"
                        : undefined
                }
            >
                <span className="customer-management__label-text">
                    ת״ז
                    {idRequired && (
                        <span
                            className="customer-management__required-mark"
                            aria-hidden="true"
                        >
                            *
                        </span>
                    )}
                </span>

                <input
                    dir="ltr"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={9}
                    minLength={
                        idRequired
                            ? 9
                            : undefined
                    }
                    pattern="[0-9]{9}"
                    placeholder="9 ספרות"
                    aria-required={
                        idRequired
                    }
                    value={
                        draft.externalId
                    }
                    onChange={(
                        event,
                    ) =>
                        update(
                            "externalId",
                            event.target.value
                                .replace(
                                    /\D/g,
                                    "",
                                )
                                .slice(
                                    0,
                                    9,
                                ),
                        )
                    }
                />

                <small className="customer-management__field-hint">
                    9 ספרות · ת״ז ישראלית
                </small>
            </label>

            <label
                className={
                    birthDateRequired
                        ? "customer-management__required-field"
                        : undefined
                }
            >
                <span className="customer-management__label-text">
                    תאריך לידה
                    {birthDateRequired && (
                        <span
                            className="customer-management__required-mark"
                            aria-hidden="true"
                        >
                            *
                        </span>
                    )}
                </span>

                <input
                    type="date"
                    dir="ltr"
                    aria-required={
                        birthDateRequired
                    }
                    value={
                        draft.birthDate
                    }
                    onChange={(
                        event,
                    ) =>
                        update(
                            "birthDate",
                            event.target
                                .value,
                        )
                    }
                />
            </label>

            <label>
                כתובת

                <input
                    value={
                        draft.address
                    }
                    onChange={(
                        event,
                    ) =>
                        update(
                            "address",
                            event.target
                                .value,
                        )
                    }
                />
            </label>

            <label className="customer-management__notes-field">
                הערות

                <input
                    value={
                        draft.notes
                    }
                    onChange={(
                        event,
                    ) =>
                        update(
                            "notes",
                            event.target
                                .value,
                        )
                    }
                />
            </label>

            <section className="customer-management__credit-section">
                <label className="customer-management__credit-toggle">
                    <span>
                        <strong>
                            לאפשר הקפה
                        </strong>

                        <small>
                            רכישה על חשבון אשראי הלקוח עד האובליגו המאושר
                        </small>
                    </span>

                    <input
                        type="checkbox"
                        checked={
                            draft.storeCreditEnabled
                        }
                        onChange={(
                            event,
                        ) =>
                            update(
                                "storeCreditEnabled",
                                event.target
                                    .checked,
                            )
                        }
                    />
                </label>

                {draft.storeCreditEnabled && (
                    <div className="customer-management__credit-grid">
                        <label className="customer-management__required-field">
                            <span className="customer-management__label-text">
                                אובליגו מאושר
                                <span
                                    className="customer-management__required-mark"
                                    aria-hidden="true"
                                >
                                    *
                                </span>
                            </span>

                            <input
                                dir="ltr"
                                type="number"
                                inputMode="decimal"
                                min="0.01"
                                step="0.01"
                                aria-required="true"
                                value={
                                    draft.creditLimit
                                }
                                onChange={(
                                    event,
                                ) =>
                                    update(
                                        "creditLimit",
                                        event.target
                                            .value,
                                    )
                                }
                            />
                        </label>

                        <label className="customer-management__readonly-field">
                            יתרה מנוצלת

                            <input
                                dir="ltr"
                                type="text"
                                readOnly
                                tabIndex={-1}
                                value={`₪${Math.max(
                                    0,
                                    draft.accountBalance,
                                ).toFixed(
                                    2,
                                )}`}
                            />
                        </label>

                        <label className="customer-management__readonly-field">
                            אשראי פנוי

                            <input
                                dir="ltr"
                                type="text"
                                readOnly
                                tabIndex={-1}
                                value={`₪${Math.max(
                                    0,
                                    (
                                        Number(
                                            draft.creditLimit,
                                        ) ||
                                        0
                                    ) -
                                        Math.max(
                                            0,
                                            draft.accountBalance,
                                        ),
                                ).toFixed(
                                    2,
                                )}`}
                            />
                        </label>
                    </div>
                )}
            </section>

            <div className="customer-management__groups">
                <strong>
                    קבוצות לקוח
                </strong>

                <div className="customer-management__groups-list">
                    {customerGroups.map(
                        (
                            group,
                        ) => (
                            <label
                                key={
                                    group.id
                                }
                                className="customer-management__check"
                            >
                                <input
                                    type="checkbox"
                                    checked={
                                        draft.groupIds.includes(
                                            group.id,
                                        )
                                    }
                                    onChange={() =>
                                        toggleGroup(
                                            group.id,
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

            <div className="customer-management__flags">
                <label className="customer-management__check">
                    <input
                        type="checkbox"
                        checked={
                            draft.isActive
                        }
                        onChange={(
                            event,
                        ) =>
                            update(
                                "isActive",
                                event.target
                                    .checked,
                            )
                        }
                    />

                    לקוח פעיל
                </label>
            </div>

            {error && (
                <div
                    className="customer-management__error"
                    role="alert"
                >
                    {error}
                </div>
            )}
        </div>
    );
}

export default CustomerEditorFields;
