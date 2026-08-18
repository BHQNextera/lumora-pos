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
    ) => void | Promise<void>;

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

    const [
        isSubmitting,
        setIsSubmitting,
    ] =
        useState(
            false,
        );

    const submit =
        async () => {
            if (
                !closingCashDeclaration ||
                isSubmitting
            ) {
                if (
                    !closingCashDeclaration
                ) {
                    setError(
                        "יש לבצע הצהרת מזומן.",
                    );
                }

                return;
            }

            setError(
                null,
            );

            setIsSubmitting(
                true,
            );

            try {
                await onConfirm(
                    closingCashDeclaration,
                );
            }
            catch (submitError) {
                console.error(
                    "LUMORA_REGISTER_CLOSE_FAILED",
                    submitError,
                );

                setError(
                    "סגירת הקופה נכשלה. הקופה לא סומנה כסגורה.",
                );

                setIsSubmitting(
                    false,
                );
            }
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
                padding: "16px",
                background:
                    "rgba(15,23,42,.44)",
            }}
        >
            <section
                style={{
                    width:
                        "min(500px, 94vw)",
                    maxHeight:
                        "calc(100dvh - 32px)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    borderRadius: "18px",
                    background: "#fff",
                }}
            >
                <div
                    style={{
                        padding:
                            "26px 26px 14px",
                        flex: "0 0 auto",
                    }}
                >
                    <h2
                        style={{
                            marginTop: 0,
                        }}
                    >
                        סגירת קופה
                    </h2>

                    <div>
                        קופה{" "}
                        {
                            shift.registerCode
                        }
                    </div>
                </div>

                <div
                    style={{
                        minHeight: 0,
                        overflowY: "auto",
                        padding:
                            "0 26px 20px",
                    }}
                >
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
                                if (
                                    isSubmitting
                                ) {
                                    return;
                                }

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
                                marginTop:
                                    "18px",
                                padding:
                                    "12px",
                                border:
                                    "1px solid #f59e0b",
                                borderRadius:
                                    "10px",
                            }}
                        >
                            <strong>
                                קיימים עובדים בנוכחות
                            </strong>

                            <div
                                style={{
                                    marginTop:
                                        "6px",
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
                                marginTop:
                                    "12px",
                            }}
                        >
                            {error}
                        </div>
                    )}
                </div>

                <div
                    style={{
                        display: "flex",
                        gap: "8px",
                        padding:
                            "16px 26px 20px",
                        borderTop:
                            "1px solid #e5e7eb",
                        background:
                            "#fff",
                        flex: "0 0 auto",
                    }}
                >
                    <button
                        type="button"
                        onClick={
                            submit
                        }
                        disabled={
                            isSubmitting
                        }
                    >
                        {
                            isSubmitting
                                ? "שומר וסוגר..."
                                : "אישור וסגירת קופה"
                        }
                    </button>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        disabled={
                            isSubmitting
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
