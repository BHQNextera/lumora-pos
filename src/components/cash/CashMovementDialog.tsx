import {
    useMemo,
    useState,
} from "react";

import type {
    RegisterShift,
} from "../../models/shift/RegisterShift";

import {
    getPresentAttendance,
} from "../../models/attendance/AttendanceRepository";

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

type CashMovementDialogProps = {
    shift: RegisterShift;
    onClose: () => void;
    onCompleted: () => void;
};

const reasonOptions: Array<{
    value: CashMovementReason;
    label: string;
}> = [
    {
        value: "float_addition",
        label: "הוספת עודף / קופה",
    },
    {
        value: "safe_drop",
        label: "העברה לכספת",
    },
    {
        value: "petty_cash",
        label: "קופה קטנה",
    },
    {
        value: "change_fund",
        label: "קרן עודף",
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
    onClose,
    onCompleted,
}: CashMovementDialogProps) {
    const presentEmployees =
        useMemo(
            () =>
                getPresentAttendance(),
            [],
        );

    const [
        type,
        setType,
    ] =
        useState<CashMovementType>(
            "cash_in",
        );

    const [
        amount,
        setAmount,
    ] =
        useState("");

    const [
        reason,
        setReason,
    ] =
        useState<CashMovementReason>(
            "float_addition",
        );

    const [
        note,
        setNote,
    ] =
        useState("");

    const [
        employeeId,
        setEmployeeId,
    ] =
        useState(
            presentEmployees.length === 1
                ? presentEmployees[0].employeeId
                : "",
        );

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null,
        );

    const selectedEmployee =
        presentEmployees.find(
            (employee) =>
                employee.employeeId ===
                employeeId,
        );

    const confirm = () => {
        const numericAmount =
            Number(amount);

        if (
            !Number.isFinite(
                numericAmount,
            ) ||
            numericAmount <= 0
        ) {
            setError(
                "יש להזין סכום תקין.",
            );

            return;
        }

        if (!selectedEmployee) {
            setError(
                "יש לבחור עובד נוכח.",
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

                note,

                employee: {
                    employeeId:
                        selectedEmployee.employeeId,

                    employeeName:
                        selectedEmployee.employeeName,
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

    return (
        <div
            dir="rtl"
            style={{
                position:
                    "fixed",
                inset:
                    0,
                zIndex:
                    14500,
                display:
                    "grid",
                placeItems:
                    "center",
                padding:
                    "24px",
                background:
                    "rgba(15,23,42,.42)",
            }}
        >
            <section
                style={{
                    width:
                        "min(520px, 94vw)",
                    padding:
                        "26px",
                    borderRadius:
                        "18px",
                    background:
                        "#fff",
                }}
            >
                <header
                    style={{
                        display:
                            "flex",
                        justifyContent:
                            "space-between",
                        gap:
                            "16px",
                        marginBottom:
                            "22px",
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize:
                                    "12px",
                                fontWeight:
                                    800,
                            }}
                        >
                            CASH MOVEMENT
                        </div>

                        <h2
                            style={{
                                margin:
                                    "4px 0",
                            }}
                        >
                            תנועת מזומן
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                    >
                        ✕
                    </button>
                </header>

                {presentEmployees.length === 0 && (
                    <div
                        style={{
                            marginBottom:
                                "16px",
                            padding:
                                "12px",
                            border:
                                "1px solid #dc2626",
                            borderRadius:
                                "8px",
                        }}
                    >
                        אין עובד בנוכחות.
                        לא ניתן לבצע תנועת מזומן.
                    </div>
                )}

                <div
                    style={{
                        display:
                            "grid",
                        gap:
                            "14px",
                    }}
                >
                    <label>
                        סוג פעולה

                        <select
                            value={
                                type
                            }
                            onChange={(
                                event,
                            ) =>
                                setType(
                                    event.target
                                        .value as CashMovementType,
                                )
                            }
                            style={{
                                display:
                                    "block",
                                width:
                                    "100%",
                                marginTop:
                                    "6px",
                            }}
                        >
                            <option value="cash_in">
                                הפקדה לקופה
                            </option>

                            <option value="cash_out">
                                משיכה מהקופה
                            </option>
                        </select>
                    </label>

                    <label>
                        סכום

                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            value={
                                amount
                            }
                            onChange={(
                                event,
                            ) => {
                                setAmount(
                                    event.target.value,
                                );

                                setError(
                                    null,
                                );
                            }}
                            style={{
                                display:
                                    "block",
                                width:
                                    "100%",
                                marginTop:
                                    "6px",
                            }}
                        />
                    </label>

                    <label>
                        סיבה

                        <select
                            value={
                                reason
                            }
                            onChange={(
                                event,
                            ) =>
                                setReason(
                                    event.target
                                        .value as CashMovementReason,
                                )
                            }
                            style={{
                                display:
                                    "block",
                                width:
                                    "100%",
                                marginTop:
                                    "6px",
                            }}
                        >
                            {reasonOptions.map(
                                (option) => (
                                    <option
                                        key={
                                            option.value
                                        }
                                        value={
                                            option.value
                                        }
                                    >
                                        {
                                            option.label
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                    </label>

                    <label>
                        עובד

                        <select
                            value={
                                employeeId
                            }
                            onChange={(
                                event,
                            ) => {
                                setEmployeeId(
                                    event.target.value,
                                );

                                setError(
                                    null,
                                );
                            }}
                            style={{
                                display:
                                    "block",
                                width:
                                    "100%",
                                marginTop:
                                    "6px",
                            }}
                        >
                            <option value="">
                                בחר עובד
                            </option>

                            {presentEmployees.map(
                                (employee) => (
                                    <option
                                        key={
                                            employee.employeeId
                                        }
                                        value={
                                            employee.employeeId
                                        }
                                    >
                                        {
                                            employee.employeeName
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                    </label>

                    <label>
                        הערה

                        <textarea
                            value={
                                note
                            }
                            onChange={(
                                event,
                            ) =>
                                setNote(
                                    event.target.value,
                                )
                            }
                            rows={3}
                            style={{
                                display:
                                    "block",
                                width:
                                    "100%",
                                marginTop:
                                    "6px",
                            }}
                        />
                    </label>
                </div>

                {error && (
                    <div
                        style={{
                            marginTop:
                                "14px",
                            padding:
                                "10px",
                            border:
                                "1px solid #dc2626",
                            borderRadius:
                                "8px",
                        }}
                    >
                        {error}
                    </div>
                )}

                <div
                    style={{
                        display:
                            "flex",
                        gap:
                            "8px",
                        marginTop:
                            "22px",
                    }}
                >
                    <button
                        type="button"
                        onClick={
                            confirm
                        }
                        disabled={
                            presentEmployees.length === 0
                        }
                    >
                        אישור
                    </button>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                    >
                        ביטול
                    </button>
                </div>
            </section>
        </div>
    );
}

export default CashMovementDialog;