import {
    useEffect,
    useRef,
} from "react";

import "./system-message-dialog.css";

type SystemMessageDialogProps = {
    title: string;
    message: string | null;
    onClose: () => void;
};

function SystemMessageDialog({
    title,
    message,
    onClose,
}: SystemMessageDialogProps) {
    const confirmButtonRef =
        useRef<HTMLButtonElement>(
            null,
        );

    useEffect(() => {
        if (message === null) {
            return;
        }

        const handleKeyDown = (
            event: KeyboardEvent,
        ) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener(
            "keydown",
            handleKeyDown,
        );

        confirmButtonRef.current?.focus();

        return () => {
            window.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, [
        message,
        onClose,
    ]);

    if (message === null) {
        return null;
    }

    return (
        <div className="system-message-dialog__backdrop">
            <section
                className="system-message-dialog"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="system-message-dialog-title"
                aria-describedby="system-message-dialog-message"
                dir="rtl"
            >
                <span
                    className="system-message-dialog__icon"
                    aria-hidden="true"
                >
                    !
                </span>

                <div className="system-message-dialog__content">
                    <h2 id="system-message-dialog-title">
                        {title}
                    </h2>

                    <p id="system-message-dialog-message">
                        {message}
                    </p>
                </div>

                <button
                    ref={confirmButtonRef}
                    type="button"
                    onClick={onClose}
                >
                    אישור
                </button>
            </section>
        </div>
    );
}

export default SystemMessageDialog;
