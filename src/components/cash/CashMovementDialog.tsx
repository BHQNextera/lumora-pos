// LUMORA CASH MOVEMENT DIALOG V2

import {
    useEffect,
    useState,
} from "react";

import type {
    RegisterShift,
} from "../../models/shift/RegisterShift";

import type {
    Employee,
} from "../../models/employee/Employee";

import type {
    PosManagerApproval,
} from "../../models/employee/PosManagerApprovalService";

import {
    createCashMovement,
} from "../../models/cash-movement/CashMovementRepository";

import type {
    CashMovementReason,
    CashMovementType,
} from "../../models/cash-movement/CashMovement";

import {
    requestCashDrawerOpen,
} from "../../models/drawer/CashDrawerService";

import {
    useLocale,
} from "../../i18n/useLocale";

import "./cash-movement-dialog.css";

type CashMovementDialogProps = {
    shift: RegisterShift;
    currentOperator: Employee;
    approval?: PosManagerApproval | null;
    onClose: () => void;
    onCompleted: () => void;
};

type ReasonOption = {
    value: CashMovementReason;
    label: string;
};

const cashInReasons:
    ReasonOption[] = [
        {
            value: "float_addition",
            label: "הוספת מזומן לקופה",
        },
        {
            value: "change_fund",
            label: "קרן עודף",
        },
        {
            value: "other",
            label: "אחר",
        },
    ];

const cashOutReasons:
    ReasonOption[] = [
        {
            value: "safe_drop",
            label: "העברה לכספת",
        },
        {
            value: "petty_cash",
            label: "קופה קטנה",
        },
        {
            value: "bank_deposit",
            label: "הפקדה לבנק",
        },
        {
            value: "other",
            label: "אחר",
        },
    ];

function CashMovementDialog({
    shift,
    currentOperator,
    approval,
    onClose,
    onCompleted,
}: CashMovementDialogProps) {
    const {
        direction,
    } = useLocale();

    const [
        type,
        setType,
    ] = useState<CashMovementType>(
        "cash_in",
    );

    const [
        amount,
        setAmount,
    ] = useState("");

    const [
        reason,
        setReason,
    ] = useState<CashMovementReason>(
        "float_addition",
    );

    const [
        note,
        setNote,
    ] = useState("");

    const [
        error,
        setError,
    ] = useState<string | null>(
        null,
    );

    useEffect(
        () => {
            const handleKeyDown = (
                event: KeyboardEvent,
            ) => {
                if (
                    event.key ===
                    "Escape"
                ) {
                    onClose();
                }
            };

            document.addEventListener(
                "keydown",
                handleKeyDown,
            );

            return () => {
                document.removeEventListener(
                    "keydown",
                    handleKeyDown,
                );
            };
        },
        [onClose],
    );

    const activeReasonOptions =
        type === "cash_in"
            ? cashInReasons
            : cashOutReasons;

    const numericAmount =
        Number(
            amount.replace(
                ",",
                ".",
            ),
        );

    const isValidAmount =
        Number.isFinite(
            numericAmount,
        ) &&
        numericAmount > 0;

    const selectType = (
        nextType:
            CashMovementType,
    ) => {
        setType(
            nextType,
        );
        setReason(
            nextType === "cash_in"
                ? "float_addition"
                : "safe_drop",
        );
        setError(
            null,
        );
    };

    const confirm = () => {
        if (!isValidAmount) {
            setError(
                "יש להזין סכום תקין.",
            );

            return;
        }

        try {
            requestCashDrawerOpen(
                "manual",
            );

            createCashMovement({
                tenantId:
                    shift.tenantId,

                storeCode:
                    shift.storeCode,

                registerCode:
                    shift.registerCode,

                shiftId:
                    shift.id,

                type,

                amount:
                    numericAmount,

                reason,

                note:
                    note.trim(),

                authorization: {
                    actionPermissionKey:
                        "pos.cash_movement",

                    actor: {
                        employeeId:
                            currentOperator.id,

                        employeeName:
                            currentOperator.name,
                    },

                    approver:
                        approval
                            ? {
                                approvalId:
                                    approval.approvalId,

                                employeeId:
                                    approval.approver.employeeId,

                                employeeName:
                                    approval.approver.employeeName,

                                approvedAt:
                                    approval.approvedAt,
                            }
                            : undefined,

                    authorizedAt:
                        approval?.approvedAt ??
                        new Date().toISOString(),
                },

                employee: {
                    employeeId:
                        currentOperator.id,

                    employeeName:
                        currentOperator.name,
                },
            });

            onCompleted();
        }
        catch {
            setError(
                "לא ניתן לשמור את תנועת המזומן.",
            );
        }
    };

    const movementTitle =
        type === "cash_in"
            ? "הפקדה לקופה"
            : "משיכה מהקופה";

    return (
        <div
            className="cash-movement-dialog__backdrop"
            dir={direction}
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    onClose();
                }
            }}
        >
            <section
                aria-labelledby="cash-movement-dialog-title"
                aria-modal="true"
                className="cash-movement-dialog"
                role="dialog"
            >
                <header className="cash-movement-dialog__header">
                    <div>
                        <div className="cash-movement-dialog__eyebrow">
                            LUMORA CASH MOVEMENT
                        </div>

                        <h2 id="cash-movement-dialog-title">
                            תנועת מזומן
                        </h2>

                        <p>
                            הפקדה או משיכה מתועדת ממשמרת הקופה.
                        </p>
                    </div>

                    <button
                        aria-label="סגירת חלון תנועת מזומן"
                        className="cash-movement-dialog__close"
                        onClick={onClose}
                        type="button"
                    >
                        ×
                    </button>
                </header>

                <>
                        <div className="cash-movement-dialog__body">
                            <div
                                aria-label="סוג תנועת מזומן"
                                className="cash-movement-dialog__type-switch"
                                role="group"
                            >
                                <button
                                    aria-pressed={
                                        type === "cash_in"
                                    }
                                    className={
                                        type === "cash_in"
                                            ? "cash-movement-dialog__type-button cash-movement-dialog__type-button--active"
                                            : "cash-movement-dialog__type-button"
                                    }
                                    onClick={() =>
                                        selectType(
                                            "cash_in",
                                        )
                                    }
                                    type="button"
                                >
                                    הפקדה לקופה
                                </button>

                                <button
                                    aria-pressed={
                                        type === "cash_out"
                                    }
                                    className={
                                        type === "cash_out"
                                            ? "cash-movement-dialog__type-button cash-movement-dialog__type-button--active"
                                            : "cash-movement-dialog__type-button"
                                    }
                                    onClick={() =>
                                        selectType(
                                            "cash_out",
                                        )
                                    }
                                    type="button"
                                >
                                    משיכה מהקופה
                                </button>
                            </div>

                            <label className="cash-movement-dialog__field cash-movement-dialog__field--amount">
                                <span>
                                    סכום
                                </span>

                                <div className="cash-movement-dialog__amount-input">
                                    <input
                                        autoFocus
                                        inputMode="decimal"
                                        onChange={(event) => {
                                            setAmount(
                                                event.target.value,
                                            );
                                            setError(
                                                null,
                                            );
                                        }}
                                        placeholder="0.00"
                                        value={amount}
                                    />

                                    <span>
                                        ₪
                                    </span>
                                </div>
                            </label>

                            <label className="cash-movement-dialog__field">
                                <span>
                                    סיבה
                                </span>

                                <select
                                    onChange={(event) => {
                                        setReason(
                                            event.target.value as CashMovementReason,
                                        );
                                        setError(
                                            null,
                                        );
                                    }}
                                    value={reason}
                                >
                                    {activeReasonOptions.map(
                                        (option) => (
                                            <option
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>

                            <label className="cash-movement-dialog__field">
                                <span>
                                    עובד מבצע
                                </span>

                                <div className="cash-movement-dialog__employee-readonly">
                                    <span className="cash-movement-dialog__presence-dot" />

                                    <strong>
                                        {currentOperator.name}
                                    </strong>
                                </div>
                            </label>

                            <label className="cash-movement-dialog__field">
                                <span>
                                    הערה
                                    <small>
                                        רשות
                                    </small>
                                </span>

                                <textarea
                                    maxLength={240}
                                    onChange={(event) =>
                                        setNote(
                                            event.target.value,
                                        )
                                    }
                                    placeholder="פרטים נוספים לתיעוד התנועה"
                                    rows={3}
                                    value={note}
                                />
                            </label>

                            {error && (
                                <div
                                    aria-live="polite"
                                    className="cash-movement-dialog__error"
                                    role="status"
                                >
                                    {error}
                                </div>
                            )}
                        </div>

                        <footer className="cash-movement-dialog__footer">
                            <button
                                className="cash-movement-dialog__secondary-button"
                                onClick={onClose}
                                type="button"
                            >
                                ביטול
                            </button>

                            <button
                                className="cash-movement-dialog__confirm"
                                disabled={!isValidAmount}
                                onClick={confirm}
                                type="button"
                            >
                                {isValidAmount
                                    ? `${movementTitle} · ₪${numericAmount.toFixed(
                                          2,
                                      )}`
                                    : movementTitle}
                            </button>
                        </footer>
                    </>
            </section>
        </div>
    );
}

export default CashMovementDialog;
