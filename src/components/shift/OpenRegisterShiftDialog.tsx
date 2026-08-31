import {
    getRegisterLocalSettings,
} from "../../config/RegisterLocalSettings";

import {
    getActiveRegisterProfile,
} from "../../config/ActiveBusinessConfiguration";

import {
    useMemo,
    useState,
} from "react";

import {
    createCashDeclaration,
    ilsCashDenominations,
} from "../../models/cash/CashDeclaration";

import {
    employeeSeed,
} from "../../models/employee/EmployeeSeed";

import {
    getActiveBusinessConfiguration,
    getActiveBusinessOperatingProfile,
} from "../../config/ActiveBusinessConfiguration";

import {
    getActiveRegisterShift,
    openRegisterShift,
} from "../../models/shift/RegisterShiftRepository";

import type {
    RegisterShift,
} from "../../models/shift/RegisterShift";

import "./open-register-shift-dialog.css";

type OpenRegisterShiftDialogProps = {
    onEnter: (
        shift: RegisterShift,
    ) => void;
};

const MAX_QUANTITY_PER_DENOMINATION =
    9999;

function formatIls(
    value: number,
) {
    const safeValue =
        Number.isFinite(value)
            ? value
            : 0;

    return `₪${safeValue.toLocaleString(
        "he-IL",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
    )}`;
}

function getInitials(
    value: string,
) {
    return value
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(
            (part) =>
                part.charAt(0),
        )
        .join("")
        .toUpperCase();
}

function OpenRegisterShiftDialog({
    onEnter,
}: OpenRegisterShiftDialogProps) {
    const existingShift =
        getActiveRegisterShift();

    const businessConfiguration =
        getActiveBusinessConfiguration();

    const businessProfile =
        getActiveBusinessOperatingProfile();

    const identity =
        businessProfile.identity;

    const activeEmployees =
        employeeSeed.filter(
            (employee) =>
                employee.isActive,
        );

    const [
        employeeId,
        setEmployeeId,
    ] =
        useState("");

    const [
        quantities,
        setQuantities,
    ] =
        useState<
            Record<string, number>
        >({});

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null,
        );

    const [
        showConfirmation,
        setShowConfirmation,
    ] =
        useState(false);

    const [
        logoFailed,
        setLogoFailed,
    ] =
        useState(false);

    const selectedEmployee =
        activeEmployees.find(
            (employee) =>
                employee.id ===
                employeeId,
        );

    const openingCashDeclaration =
        useMemo(
            () =>
                createCashDeclaration(
                    quantities,
                ),
            [
                quantities,
            ],
        );

    const banknotes =
        ilsCashDenominations.filter(
            (denomination) =>
                denomination.type ===
                "banknote",
        );

    const coins =
        ilsCashDenominations.filter(
            (denomination) =>
                denomination.type ===
                "coin",
        );

    // NEXTERA_MANAGED_REGISTER_IDENTITY_V1
    const canonicalRegisterIdentity =
        getRegisterLocalSettings(
            getActiveRegisterProfile(),
        );

    const storeCode =
        canonicalRegisterIdentity
            .branchCode ||
        businessConfiguration
            .storeCode;

    const registerCode =
        canonicalRegisterIdentity
            .registerCode ||
        existingShift
            ?.registerCode ||
        getActiveRegisterProfile()
            ?.registerCode ||
        "";

    const businessName =
        identity.tradingName ??
        identity.businessName;

    const branchName =
        identity.branchName ??
        `סניף ${storeCode}`;

    const openedTime =
        existingShift
            ? new Date(
                  existingShift.openedAt,
              ).toLocaleTimeString(
                  "he-IL",
                  {
                      hour:
                          "2-digit",
                      minute:
                          "2-digit",
                  },
              )
            : null;

    const updateQuantity = (
        value: number,
        rawValue: string,
    ) => {
        const parsed =
            Number(
                rawValue,
            );

        const safeQuantity =
            rawValue === ""
                ? 0
                : Number.isFinite(
                      parsed,
                  )
                  ? Math.min(
                        MAX_QUANTITY_PER_DENOMINATION,
                        Math.max(
                            0,
                            Math.trunc(
                                parsed,
                            ),
                        ),
                    )
                  : 0;

        setQuantities(
            (current) => ({
                ...current,
                [String(value)]:
                    safeQuantity,
            }),
        );

        setError(
            null,
        );
    };

    const requestEntry = () => {
        if (!selectedEmployee) {
            setError(
                "יש לבחור עובד.",
            );

            return;
        }

        if (existingShift) {
            onEnter(
                existingShift,
            );

            return;
        }

        setError(
            null,
        );

        setShowConfirmation(
            true,
        );
    };

    const confirmOpening = () => {
        if (
            existingShift ||
            !selectedEmployee
        ) {
            return;
        }

        try {
            const shift =
                openRegisterShift({
                    employeeId:
                        selectedEmployee.id,

                    employeeName:
                        selectedEmployee.name,

                    openingCash:
                        openingCashDeclaration.total,

                    openingCashDeclaration,
                });

            setShowConfirmation(
                false,
            );

            onEnter(
                shift,
            );
        }
        catch {
            setShowConfirmation(
                false,
            );

            setError(
                "לא ניתן לפתוח את הקופה.",
            );
        }
    };

    const renderDenominationGroup = (
        title: string,
        denominations:
            typeof ilsCashDenominations,
    ) => (
        <section className="register-v3__money-group">
            <div className="register-v3__money-group-title">
                {title}
            </div>

            <div className="register-v3__money-head">
                <span>
                    ערך
                </span>

                <span>
                    כמות
                </span>

                <span>
                    סה״כ
                </span>
            </div>

            <div className="register-v3__money-rows">
                {denominations.map(
                    (denomination) => {
                        const key =
                            String(
                                denomination.value,
                            );

                        const quantity =
                            quantities[
                                key
                            ] ??
                            0;

                        const lineTotal =
                            denomination.value *
                            quantity;

                        return (
                            <div
                                key={
                                    key
                                }
                                className="register-v3__money-row"
                            >
                                <strong dir="ltr">
                                    ₪
                                    {
                                        denomination.value
                                    }
                                </strong>

                                <input
                                    type="number"
                                    min="0"
                                    max={
                                        MAX_QUANTITY_PER_DENOMINATION
                                    }
                                    step="1"
                                    inputMode="numeric"
                                    value={
                                        quantity ===
                                        0
                                            ? ""
                                            : quantity
                                    }
                                    placeholder="0"
                                    onChange={(event) =>
                                        updateQuantity(
                                            denomination.value,
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    aria-label={`כמות לערך ${denomination.value}`}
                                />

                                <span dir="ltr">
                                    {formatIls(
                                        lineTotal,
                                    )}
                                </span>
                            </div>
                        );
                    },
                )}
            </div>
        </section>
    );

    return (
        <div
            className="register-v3"
            dir="rtl"
        >
            <aside
                className="register-v3__rail register-v3__rail--right"
                aria-hidden="true"
            >
                <div className="register-v3__rail-mark">
                    <span />
                    <span />
                    <span />
                    <span />
                </div>
            </aside>

            <main className="register-v3__stage">
                <header className="register-v3__merchant-header">
                    <div className="register-v3__merchant">
                        <div className="register-v3__merchant-logo">
                            {identity.logoUrl &&
                            !logoFailed ? (
                                <img
                                    src={
                                        identity.logoUrl
                                    }
                                    alt=""
                                    onError={() =>
                                        setLogoFailed(
                                            true,
                                        )
                                    }
                                />
                            ) : (
                                <span>
                                    {getInitials(
                                        businessName,
                                    )}
                                </span>
                            )}
                        </div>

                        <div>
                            <div className="register-v3__merchant-name">
                                {businessName}
                            </div>

                            <div className="register-v3__merchant-branch">
                                {branchName}
                                {" · "}
                                מספר סניף{" "}
                                <span dir="ltr">
                                    {storeCode}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="register-v3__register-pill">
                        <span>
                            קופה
                        </span>

                        <strong dir="ltr">
                            {registerCode}
                        </strong>
                    </div>
                </header>

                <section
                    className={`register-v3__content ${
                        existingShift
                            ? "register-v3__content--existing"
                            : ""
                    }`}
                >
                    <div className="register-v3__title-row">
                        <div>
                            <div className="register-v3__eyebrow">
                                {existingShift
                                    ? "ACTIVE REGISTER"
                                    : "OPEN REGISTER"}
                            </div>

                            <h1>
                                {existingShift
                                    ? "כניסה לקופה"
                                    : "פתיחת קופה"}
                            </h1>

                            <p>
                                {existingShift
                                    ? `משמרת פעילה · נפתחה ב־${openedTime}`
                                    : "בחירת עובד והצהרת מזומן לתחילת יום."}
                            </p>
                        </div>

                        {existingShift && (
                            <div className="register-v3__active-badge">
                                <span />
                                משמרת פעילה
                            </div>
                        )}
                    </div>

                    <div className="register-v3__employee-row">
                        <label htmlFor="register-v3-employee">
                            עובד
                        </label>

                        <select
                            id="register-v3-employee"
                            value={
                                employeeId
                            }
                            onChange={(event) => {
                                setEmployeeId(
                                    event.target.value,
                                );

                                setError(
                                    null,
                                );
                            }}
                        >
                            <option value="">
                                יש לבחור עובד
                            </option>

                            {activeEmployees.map(
                                (employee) => (
                                    <option
                                        key={
                                            employee.id
                                        }
                                        value={
                                            employee.id
                                        }
                                    >
                                        {
                                            employee.name
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                    </div>

                    {!existingShift && (
                        <section className="register-v3__declaration">
                            <div className="register-v3__declaration-head">
                                <div>
                                    <span>
                                        OPENING CASH
                                    </span>

                                    <h2>
                                        הצהרת מזומן
                                    </h2>
                                </div>

                                <div className="register-v3__grand-total">
                                    <small>
                                        סכום ההצהרה
                                    </small>

                                    <strong dir="ltr">
                                        {formatIls(
                                            openingCashDeclaration.total,
                                        )}
                                    </strong>
                                </div>
                            </div>

                            <div className="register-v3__money-grid">
                                {renderDenominationGroup(
                                    "שטרות",
                                    banknotes,
                                )}

                                {renderDenominationGroup(
                                    "מטבעות",
                                    coins,
                                )}
                            </div>

                            <div className="register-v3__quantity-note">
                                ניתן להזין עד{" "}
                                {MAX_QUANTITY_PER_DENOMINATION.toLocaleString(
                                    "he-IL",
                                )}{" "}
                                יחידות מכל ערך.
                            </div>
                        </section>
                    )}

                    <div className="register-v3__action-dock">
                        {error && (
                            <div
                                className="register-v3__error"
                                role="alert"
                            >
                                {error}
                            </div>
                        )}

                        <button
                            type="button"
                            className="register-v3__primary"
                            onClick={
                                requestEntry
                            }
                        >
                            {existingShift
                                ? "כניסה לקופה"
                                : "המשך לאישור ההצהרה"}

                            <span aria-hidden="true">
                                ←
                            </span>
                        </button>
                    </div>
                </section>

                <div className="register-v3__powered">
                    Powered by Coeuria
                    <span aria-hidden="true">
                        {" "}🍀
                    </span>
                </div>
            </main>

            <aside
                className="register-v3__rail register-v3__rail--left"
                aria-hidden="true"
            >
                <div className="register-v3__rail-word">
                    LUMORA
                </div>

                <div className="register-v3__rail-powered">
                    COEURIA
                </div>
            </aside>

            {showConfirmation &&
                !existingShift &&
                selectedEmployee && (
                    <div
                        className="register-v3__confirm-overlay"
                        role="presentation"
                    >
                        <section
                            className="register-v3__confirm"
                            role="alertdialog"
                            aria-modal="true"
                            aria-labelledby="register-v3-confirm-title"
                        >
                            <div className="register-v3__confirm-icon">
                                ₪
                            </div>

                            <div className="register-v3__confirm-kicker">
                                אישור הצהרת פתיחה
                            </div>

                            <h2 id="register-v3-confirm-title">
                                סכום ההצהרה עומד על
                            </h2>

                            <div
                                className="register-v3__confirm-total"
                                dir="ltr"
                            >
                                {formatIls(
                                    openingCashDeclaration.total,
                                )}
                            </div>

                            <p>
                                האם לאשר את פתיחת קופה{" "}
                                <strong dir="ltr">
                                    {registerCode}
                                </strong>
                                {" "}בסכום זה?
                            </p>

                            <div className="register-v3__confirm-meta">
                                <span>
                                    {businessName}
                                </span>

                                <span>
                                    {branchName}
                                </span>

                                <span>
                                    {
                                        selectedEmployee.name
                                    }
                                </span>
                            </div>

                            <div className="register-v3__confirm-actions">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowConfirmation(
                                            false,
                                        )
                                    }
                                >
                                    חזרה לתיקון
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        confirmOpening
                                    }
                                >
                                    אישור ופתיחת קופה
                                </button>
                            </div>
                        </section>
                    </div>
                )}
        </div>
    );
}

export default OpenRegisterShiftDialog;