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

import "./close-register-shift-dialog.css";

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
            className="close-register-shift-dialog__backdrop"
            dir="rtl"
        >
            <section
                className="close-register-shift-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="close-register-shift-dialog-title"
            >
                <header className="close-register-shift-dialog__header">
                    <div>
                        <div className="close-register-shift-dialog__eyebrow">
                            LUMORA Z REPORT
                        </div>

                        <h2 id="close-register-shift-dialog-title">
                            סגירת קופה
                        </h2>

                        <p>
                            ספירת מזומן וסגירת משמרת קופה {shift.registerCode}.
                        </p>
                    </div>

                    <button
                        className="close-register-shift-dialog__close"
                        type="button"
                        onClick={
                            onClose
                        }
                        disabled={
                            isSubmitting
                        }
                        aria-label="סגירת החלון"
                    >
                        ×
                    </button>
                </header>

                <div className="close-register-shift-dialog__body">
                    <section className="close-register-shift-dialog__declaration-card">
                        <div className="close-register-shift-dialog__section-heading">
                            <div>
                                <h3>
                                    הצהרת מזומן סוף יום
                                </h3>

                                <p>
                                    יש להזין את הכמות שנספרה מכל עריך.
                                </p>
                            </div>

                            <span>
                                קופה {shift.registerCode}
                            </span>
                        </div>

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
                    </section>

                    {present.length > 0 && (
                        <aside
                            className="close-register-shift-dialog__attendance-warning"
                            role="status"
                        >
                            <span
                                className="close-register-shift-dialog__warning-icon"
                                aria-hidden="true"
                            >
                                !
                            </span>

                            <div>
                                <strong>
                                    קיימים עובדים בנוכחות
                                </strong>

                                <p>
                                    סגירת הקופה תוציא אותם מנוכחות:
                                </p>

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
                        </aside>
                    )}

                    {error && (
                        <div
                            className="close-register-shift-dialog__error"
                            role="alert"
                        >
                            {error}
                        </div>
                    )}
                </div>

                <footer className="close-register-shift-dialog__footer">
                    <button
                        className="close-register-shift-dialog__confirm"
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
                        className="close-register-shift-dialog__cancel"
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
                </footer>
            </section>
        </div>
    );
}

export default CloseRegisterShiftDialog;
