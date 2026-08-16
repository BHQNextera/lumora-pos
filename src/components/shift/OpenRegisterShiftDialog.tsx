import {
    useState,
} from "react";

import CashDeclarationTable from "../cash/CashDeclarationTable";
import type {
    CashDeclaration,
} from "../../models/cash/CashDeclaration";

import {
    employeeSeed,
} from "../../models/employee/EmployeeSeed";

import {
    getActiveRegisterShift,
    openRegisterShift,
} from "../../models/shift/RegisterShiftRepository";

import type {
    RegisterShift,
} from "../../models/shift/RegisterShift";

type OpenRegisterShiftDialogProps = {
    onEnter: (
        shift: RegisterShift,
    ) => void;
};

function OpenRegisterShiftDialog({
    onEnter,
}: OpenRegisterShiftDialogProps) {
    const existingShift =
        getActiveRegisterShift();

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
        openingCashDeclaration,
        setOpeningCashDeclaration,
    ] =
        useState<CashDeclaration | null>(
            null,
        );

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null,
        );

    const selectedEmployee =
        activeEmployees.find(
            (employee) =>
                employee.id ===
                employeeId,
        );

    const enterRegister = () => {
        if (!selectedEmployee) {
            setError(
                "יש לבחור עובד.",
            );

            return;
        }


        /*
         * An already-open register does not
         * require another opening declaration.
         */
        if (existingShift) {
            onEnter(
                existingShift,
            );

            return;
        }

        if (!openingCashDeclaration) {
            setError(
                "יש לבצע הצהרת מזומן.",
            );

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

            onEnter(
                shift,
            );
        }
        catch {
            setError(
                "לא ניתן לפתוח את הקופה.",
            );
        }
    };

    return (
        <div
            dir="rtl"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 10000,
                display: "grid",
                placeItems: "center",
                padding: "24px",
                background: "#f4f6f5",
                overflowY: "auto",
            }}
        >
            <div
                style={{
                    width:
                        "min(520px, 94vw)",
                    maxHeight:
                        "calc(100vh - 48px)",
                    overflowY: "auto",
                    padding: "30px",
                    border:
                        "1px solid #dfe4e2",
                    borderRadius: "18px",
                    background: "#fff",
                    boxShadow:
                        "0 20px 60px rgba(15,23,42,.12)",
                }}
            >
                <div
                    style={{
                        marginBottom: "24px",
                    }}
                >
                    <div
                        style={{
                            fontSize: "12px",
                            fontWeight: 800,
                            letterSpacing: ".08em",
                        }}
                    >
                        LUMORA
                    </div>

                    <h1
                        style={{
                            margin: "6px 0",
                        }}
                    >
                        {
                            existingShift
                                ? "כניסה לקופה"
                                : "פתיחת קופה"
                        }
                    </h1>

                    <div
                        style={{
                            opacity: .7,
                        }}
                    >
                        {
                            existingShift
                                ? "קיימת משמרת פתוחה. אין צורך בהצהרת מזומן נוספת."
                                : "זיהוי עובד, נוכחות והצהרת מזומן לפתיחת יום."
                        }
                    </div>
                </div>

                {existingShift && (
                    <div
                        style={{
                            marginBottom: "18px",
                            padding: "12px",
                            borderRadius: "10px",
                            background: "#f4f7f5",
                        }}
                    >
                        <strong>
                            משמרת קיימת
                        </strong>

                        <div>
                            קופה{" "}
                            {
                                existingShift.registerCode
                            }
                            {" · "}
                            נפתחה ב־
                            {
                                new Date(
                                    existingShift.openedAt,
                                ).toLocaleTimeString(
                                    "he-IL",
                                    {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    },
                                )
                            }
                        </div>
                    </div>
                )}

                <label
                    style={{
                        display: "block",
                        marginBottom: "18px",
                    }}
                >
                    <strong>
                        עובד
                    </strong>

                    <select
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
                        style={{
                            display: "block",
                            width: "100%",
                            minHeight: "42px",
                            marginTop: "7px",
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
                </label>

                {!existingShift && (
                    <div
                        style={{
                            marginTop: "16px",
                        }}
                    >
                        <strong>
                            הצהרת מזומן תחילת יום
                        </strong>

                        <CashDeclarationTable
                            onChange={(declaration) => {
                                setOpeningCashDeclaration(
                                    declaration,
                                );

                                setError(
                                    null,
                                );
                            }}
                        />
                    </div>
                )}

                {error && (
                    <div
                        style={{
                            marginTop: "14px",
                            padding: "10px",
                            border:
                                "1px solid #dc2626",
                            borderRadius: "8px",
                        }}
                    >
                        {error}
                    </div>
                )}

                <button
                    type="button"
                    onClick={
                        enterRegister
                    }
                    style={{
                        width: "100%",
                        minHeight: "44px",
                        marginTop: "22px",
                    }}
                >
                    {
                        existingShift
                            ? "כניסה לקופה"
                            : "פתיחת קופה וכניסה"
                    }
                </button>
            </div>
        </div>
    );
}

export default OpenRegisterShiftDialog;