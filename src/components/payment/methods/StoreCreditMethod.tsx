import {
    useEffect,
    useMemo,
    useState,
} from "react";

import { usePricing } from "../../../context/usePricing";
import {
    getActiveBusinessOperatingProfile,
} from "../../../config/ActiveBusinessConfiguration";
import {
    createStoreCreditManagerApproval,
    getStoreCreditManagerApprovalAvailability,
} from "../../../models/store-credit/StoreCreditManagerApprovalService";
import {
    evaluateStoreCreditPayment,
    getCustomerCreditSnapshot,
    type StoreCreditManagerApproval,
} from "../../../models/store-credit/StoreCreditService";
import {
    getCustomers,
} from "../../../models/customer/CustomerRepository";
import {
    formatMoney,
} from "../../../utils/MoneyFormatter";

type StoreCreditMethodProps = {
    remainingAmount: number;
    pendingStoreCreditAmount: number;

    onAddPayment: (
        amount: number,
        customerId: string,
        managerApproval?:
            StoreCreditManagerApproval,
    ) => void;
};

function StoreCreditMethod({
    remainingAmount,
    pendingStoreCreditAmount,
    onAddPayment,
}: StoreCreditMethodProps) {
    const {
        selectedCustomer,
    } = usePricing();

    /*
     * Customer master is the source of truth.
     * Pricing context can legitimately hold an older snapshot when a
     * customer was edited from the Customer Management screen.
     */
    const activeCustomer =
        getCustomers().find(
            (customer) =>
                customer.id ===
                selectedCustomer.id,
        ) ??
        selectedCustomer;

    const activeBusinessProfile =
        getActiveBusinessOperatingProfile();

    const requireManagerApprovalReason =
        activeBusinessProfile
            .storeCreditPolicy
            ?.requireManagerApprovalReason ??
        false;

    const [amountInput, setAmountInput] =
        useState(
            remainingAmount.toFixed(2),
        );

    const [
        approvalReason,
        setApprovalReason,
    ] =
        useState("");

    useEffect(() => {
        setAmountInput(
            remainingAmount.toFixed(2),
        );

        setApprovalReason("");
    }, [
        remainingAmount,
        activeCustomer.id,
    ]);

    const parsedAmount =
        Number(
            amountInput.replace(
                ",",
                ".",
            ),
        );

    const normalizedAmount =
        Number.isFinite(
            parsedAmount,
        )
            ? Math.max(
                  0,
                  Math.round(
                      (
                          parsedAmount +
                          Number.EPSILON
                      ) * 100,
                  ) / 100,
              )
            : 0;

    const snapshot =
        useMemo(
            () =>
                getCustomerCreditSnapshot(
                    activeCustomer,
                    pendingStoreCreditAmount,
                ),
            [
                activeCustomer,
                pendingStoreCreditAmount,
            ],
        );

    const decision =
        useMemo(
            () =>
                evaluateStoreCreditPayment(
                    activeCustomer,
                    normalizedAmount,
                    pendingStoreCreditAmount,
                ),
            [
                activeCustomer,
                normalizedAmount,
                pendingStoreCreditAmount,
            ],
        );

    const managerAvailability =
        useMemo(
            () =>
                getStoreCreditManagerApprovalAvailability(),
            [
                activeCustomer.id,
                normalizedAmount,
            ],
        );

    const isWalkIn =
        activeCustomer.id ===
        "walk-in";

    const exceedsSaleRemainder =
        normalizedAmount >
        remainingAmount + 0.001;

    const isOverLimit =
        decision.status ===
        "manager_approval_required";

    const canAddNormally =
        decision.status ===
            "allowed" &&
        !exceedsSaleRemainder;

    const canApproveOverLimit =
        isOverLimit &&
        !exceedsSaleRemainder &&
        managerAvailability.canApprove &&
        (
            !requireManagerApprovalReason ||
            approvalReason.trim().length >
                0
        );

    const primaryMessage = (() => {
        if (isWalkIn) {
            return "יש לבחור לקוח לפני תשלום בהקפה";
        }

        if (
            decision.status ===
            "customer_not_enabled"
        ) {
            return "הקפה אינה מאושרת ללקוח זה";
        }

        if (
            isOverLimit
        ) {
            return `חריגה של ${formatMoney(
                decision.overLimitAmount,
            )} דורשת אישור מנהל`;
        }

        if (exceedsSaleRemainder) {
            return "הסכום גבוה מיתרת העסקה";
        }

        if (
            decision.status ===
            "invalid_amount"
        ) {
            return "יש להזין סכום תקין";
        }

        return null;
    })();

    const managerBlockedMessage = (() => {
        if (
            !isOverLimit ||
            managerAvailability.canApprove
        ) {
            return null;
        }

        switch (
            managerAvailability.reason
        ) {
            case "no_active_shift":
                return "אין משמרת קופה פעילה לאישור החריגה";

            case "employee_not_found":
                return "עובד פתיחת המשמרת לא נמצא במאגר העובדים";

            case "employee_inactive":
                return "עובד פתיחת המשמרת אינו פעיל";

            case "manager_role_required":
                return "נדרש מנהל מורשה לאישור החריגה";
        }
    })();

    const handleSubmit = () => {
        if (canAddNormally) {
            onAddPayment(
                normalizedAmount,
                activeCustomer.id,
            );

            return;
        }

        if (
            !canApproveOverLimit ||
            decision.status !==
                "manager_approval_required"
        ) {
            return;
        }

        const managerApproval =
            createStoreCreditManagerApproval(
                {
                    customerId:
                        activeCustomer.id,

                    approvedAmount:
                        normalizedAmount,

                    overLimitAmount:
                        decision.overLimitAmount,

                    reason:
                        approvalReason,
                },
            );

        onAddPayment(
            normalizedAmount,
            activeCustomer.id,
            managerApproval,
        );
    };

    return (
        <div className="store-credit-method">
            <div className="store-credit-method__header">
                <div>
                    <span className="store-credit-method__eyebrow">
                        הקפה
                    </span>

                    <strong>
                        {isWalkIn
                            ? "נדרש לקוח מזוהה"
                            : activeCustomer.name}
                    </strong>
                </div>

                <span className="store-credit-method__badge">
                    חשבון לקוח
                </span>
            </div>

            {!isWalkIn && (
                <div className="store-credit-method__metrics">
                    <div>
                        <span>
                            מסגרת
                        </span>

                        <strong className="lumora-money-value">
                            {formatMoney(snapshot.creditLimit)}
                        </strong>
                    </div>

                    <div>
                        <span>
                            חוב
                        </span>

                        <strong className="lumora-money-value">
                            {formatMoney(snapshot.accountBalance)}
                        </strong>
                    </div>

                    <div>
                        <span>
                            פנוי
                        </span>

                        <strong className="lumora-money-value">
                            {formatMoney(snapshot.availableCredit)}
                        </strong>
                    </div>
                </div>
            )}

            {pendingStoreCreditAmount >
                0 && (
                <p className="store-credit-method__pending">
                    כבר נרשם בעסקה זו:{" "}
                    <bdi className="lumora-money-value">
                        {formatMoney(pendingStoreCreditAmount)}
                    </bdi>
                </p>
            )}

            <label className="store-credit-method__amount">
                <span>
                    סכום בהקפה
                </span>

                <div>
                    <span>
                        ₪
                    </span>

                    <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={
                            amountInput
                        }
                        onChange={(
                            event,
                        ) =>
                            setAmountInput(
                                event.target
                                    .value,
                            )
                        }
                        disabled={
                            isWalkIn ||
                            !snapshot.storeCreditEnabled
                        }
                    />
                </div>
            </label>

            {primaryMessage && (
                <p className="store-credit-method__notice">
                    {primaryMessage}
                </p>
            )}

            {managerBlockedMessage && (
                <p className="store-credit-method__notice">
                    {managerBlockedMessage}
                </p>
            )}
            {isOverLimit &&
                managerAvailability.canApprove &&
                requireManagerApprovalReason &&
                approvalReason.trim().length === 0 && (
                <p className="store-credit-method__notice">
                    יש להזין סיבת חריגה לצורך אישור מנהל
                </p>
            )}

            {canApproveOverLimit &&
                managerAvailability.canApprove && (
                <div className="store-credit-method__approval">
                    <div>
                        <span>
                            מנהל מאשר
                        </span>

                        <strong>
                            {managerAvailability.managerEmployeeName}
                        </strong>
                    </div>

                    <label>
                        <span>
                            {requireManagerApprovalReason
                                ? "סיבת חריגה · חובה"
                                : "סיבת חריגה · אופציונלי"}
                        </span>

                        <input
                            type="text"
                            value={
                                approvalReason
                            }
                            onChange={(
                                event,
                            ) =>
                                setApprovalReason(
                                    event.target
                                        .value,
                                )
                            }
                            placeholder={
                                requireManagerApprovalReason
                                    ? "חובה"
                                    : "אופציונלי"
                            }
                        />
                    </label>
                </div>
            )}

            <button
                type="button"
                className="store-credit-method__submit"
                disabled={
                    !canAddNormally &&
                    !canApproveOverLimit
                }
                onClick={
                    handleSubmit
                }
            >
                {canApproveOverLimit &&
                managerAvailability.canApprove
                    ? `אשר חריגה · ${managerAvailability.managerEmployeeName}`
                    : isOverLimit
                      ? "נדרש אישור מנהל"
                      : `הוסף הקפה · ${formatMoney(
                            normalizedAmount,
                        )}`}
            </button>
        </div>
    );
}

export default StoreCreditMethod;
