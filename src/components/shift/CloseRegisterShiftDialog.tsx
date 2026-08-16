import {
    useState,
} from "react";

import CashDeclarationTable from "../cash/CashDeclarationTable";
import type {
    CashDeclaration,
} from "../../models/cash/CashDeclaration";

import {
    getPresentAttendance,
} from "../../models/attendance/AttendanceRepository";

import type {
    RegisterShift,
} from "../../models/shift/RegisterShift";

type CloseRegisterShiftDialogProps = {
    shift: RegisterShift;

    onConfirm: (
        declaration:
            CashDeclaration,
    ) => void;

    onClose: () => void;
};

function CloseRegisterShiftDialog({
    shift,
    onConfirm,
    onClose,
}: CloseRegisterShiftDialogProps) {
    const present =
        getPresentAttendance();
    const [
        closingCashDeclaration,
        setClosingCashDeclaration,
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

    const submit = () => {
        if (!closingCashDeclaration) {
            setError(
                "יש לבצע הצהרת מזומן.",
            );

            return;
        }

        onConfirm(
            closingCashDeclaration,
        );
    };

    return (
        <div
            dir="rtl"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 15000,
                display: "grid",
                placeItems: "center",
                padding: "24px",
                background:
                    "rgba(15,23,42,.44)",
            }}
        >
            <section
                style={{
                    width:
                        "min(500px, 94vw)",
                    padding: "26px",
                    borderRadius: "18px",
                    background: "#fff",
                }}
            >
                <h2>
                    סגירת קופה
                </h2>

                <div>
                    קופה{" "}
                    {
                        shift.registerCode
                    }
                </div>

                <div
                    style={{
                        marginTop:
                            "18px",
                    }}
                >
                    <strong>
                        הצהרת מזומן סוף יום
                    </strong>

                    <CashDeclarationTable
                        onChange={(declaration) => {
                            setClosingCashDeclaration(
                                declaration,
                            );

                            setError(
                                null,
                            );
                        }}
                    />
                </div>

                {present.length > 0 && (
                    <div
                        style={{
                            marginTop: "18px",
                            padding: "12px",
                            border:
                                "1px solid #f59e0b",
                            borderRadius: "10px",
                        }}
                    >
                        <strong>
                            קיימים עובדים בנוכחות
                        </strong>

                        <div
                            style={{
                                marginTop: "6px",
                            }}
                        >
                            סגירת הקופה תוציא אותם מנוכחות:
                        </div>

                        <ul>
                            {present.map(
                                (entry) => (
                                    <li
                                        key={
                                            entry.id
                                        }
                                    >
                                        {
                                            entry.employeeName
                                        }
                                    </li>
                                ),
                            )}
                        </ul>
                    </div>
                )}

                {error && (
                    <div
                        style={{
                            marginTop: "12px",
                        }}
                    >
                        {error}
                    </div>
                )}

                <div
                    style={{
                        display: "flex",
                        gap: "8px",
                        marginTop: "20px",
                    }}
                >
                    <button
                        type="button"
                        onClick={
                            submit
                        }
                    >
                        אישור וסגירת קופה
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

export default CloseRegisterShiftDialog;