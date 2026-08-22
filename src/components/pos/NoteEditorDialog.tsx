import {
    useEffect,
    useState,
} from "react";

import "./NoteEditorDialog.css";

export type NoteEditorKind =
    | "line"
    | "document";

type NoteEditorDialogProps = {
    kind: NoteEditorKind;

    initialNote?: string;
    initialPrintOnDocument?: boolean;

    contextLabel?: string;

    onClose: () => void;

    onSave: (
        note: string | undefined,
        printOnDocument: boolean,
    ) => void;
};

export default function NoteEditorDialog({
    kind,
    initialNote,
    initialPrintOnDocument = false,
    contextLabel,
    onClose,
    onSave,
}: NoteEditorDialogProps) {
    const [
        note,
        setNote,
    ] = useState(
        initialNote ?? "",
    );

    const [
        printOnDocument,
        setPrintOnDocument,
    ] = useState(
        Boolean(
            initialNote?.trim() &&
            initialPrintOnDocument,
        ),
    );

    useEffect(() => {
        setNote(
            initialNote ?? "",
        );

        setPrintOnDocument(
            Boolean(
                initialNote?.trim() &&
                initialPrintOnDocument,
            ),
        );
    }, [
        initialNote,
        initialPrintOnDocument,
        kind,
    ]);

    useEffect(() => {
        const handleKeyDown = (
            event: KeyboardEvent,
        ) => {
            if (
                event.key === "Escape"
            ) {
                onClose();
            }
        };

        window.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            window.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, [onClose]);

    const title =
        kind === "line"
            ? "הערת פריט"
            : "הערת מסמך";

    const subtitle =
        kind === "line"
            ? "הערה לשורת העסקה שנבחרה"
            : "הערה כללית לעסקה ולמסמך";

    const normalizedNote =
        note.trim();

    const handleSave = () => {
        onSave(
            normalizedNote ||
                undefined,
            Boolean(
                normalizedNote &&
                printOnDocument,
            ),
        );
    };

    const handleRemove = () => {
        onSave(
            undefined,
            false,
        );
    };

    return (
        <div
            className="lumora-note-dialog__overlay"
            role="presentation"
            onMouseDown={onClose}
        >
            <section
                className="lumora-note-dialog"
                dir="rtl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="lumora-note-dialog-title"
                onMouseDown={(
                    event,
                ) =>
                    event.stopPropagation()
                }
            >
                <header className="lumora-note-dialog__header">
                    <div className="lumora-note-dialog__heading">
                        <h2
                            id="lumora-note-dialog-title"
                        >
                            {title}
                        </h2>

                        <p>
                            {subtitle}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="lumora-note-dialog__close"
                        aria-label="סגור"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </header>

                <div className="lumora-note-dialog__body">
                    {contextLabel && (
                        <div className="lumora-note-dialog__context">
                            <span>
                                פריט
                            </span>

                            <strong>
                                {contextLabel}
                            </strong>
                        </div>
                    )}

                    <label className="lumora-note-dialog__field">
                        <span>
                            הערה
                        </span>

                        <textarea
                            autoFocus
                            value={note}
                            placeholder={
                                kind ===
                                "line"
                                    ? "לדוגמה: ללא בצל, אריזה נפרדת..."
                                    : "הקלד הערה לעסקה..."
                            }
                            onChange={(
                                event,
                            ) =>
                                setNote(
                                    event
                                        .target
                                        .value,
                                )
                            }
                        />
                    </label>

                    <label className="lumora-note-dialog__print-option">
                        <input
                            type="checkbox"
                            checked={
                                printOnDocument
                            }
                            disabled={
                                note.trim()
                                    .length ===
                                0
                            }
                            onChange={(
                                event,
                            ) =>
                                setPrintOnDocument(
                                    event
                                        .target
                                        .checked,
                                )
                            }
                        />

                        <span>
                            <strong>
                                הדפס הערה במסמך
                            </strong>

                            <small>
                                כבוי כברירת
                                מחדל. הערה שלא
                                סומנה נשארת
                                פנימית בלבד.
                            </small>
                        </span>
                    </label>
                </div>

                <footer className="lumora-note-dialog__footer">
                    <div>
                        {Boolean(
                            initialNote?.trim(),
                        ) && (
                            <button
                                type="button"
                                className="lumora-note-dialog__remove"
                                onClick={
                                    handleRemove
                                }
                            >
                                הסר הערה
                            </button>
                        )}
                    </div>

                    <div className="lumora-note-dialog__footer-actions">
                        <button
                            type="button"
                            className="lumora-note-dialog__cancel"
                            onClick={
                                onClose
                            }
                        >
                            ביטול
                        </button>

                        <button
                            type="button"
                            className="lumora-note-dialog__save"
                            onClick={
                                handleSave
                            }
                        >
                            שמור
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    );
}