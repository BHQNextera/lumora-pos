import {
    useEffect,
    useState,
} from "react";

import CustomerEditorFields from "../customer/CustomerEditorFields";

import type {
    Customer,
} from "../../models/customer/Customer";

import {
    buildCustomerFromEditorDraft,
    createEmptyCustomerEditorDraft,
} from "../../models/customer/CustomerEditorDraft";

import {
    saveCustomer,
} from "../../models/customer/CustomerRepository";

import {
    getCustomerValidationMessage,
} from "../../models/customer/CustomerValidation";

import "../../pages/customers/customer-management-page.css";
import "./SaleCustomerQuickCreateDialog.css";
import "./SaleCustomerQuickCreateDialogUnified.css";

type Props = {
    onClose: () => void;

    onCreated: (
        customer: Customer,
    ) => void;
};

export default function SaleCustomerQuickCreateDialog({
    onClose,
    onCreated,
}: Props) {
    const [
        draft,
        setDraft,
    ] =
        useState(
            () =>
                createEmptyCustomerEditorDraft(),
        );

    const [
        error,
        setError,
    ] = useState<string | null>(
        null,
    );

    useEffect(() => {
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

    const save = () => {
        const customer =
            buildCustomerFromEditorDraft(
                draft,
            );

        let savedCustomer:
            Customer;

        try {
            savedCustomer =
                saveCustomer(
                    customer,
                );
        }
        catch (caught) {
            setError(
                getCustomerValidationMessage(
                    caught,
                ),
            );

            return;
        }

        onCreated(
            savedCustomer,
        );
    };

    return (
        <div
            className="sale-customer-create__overlay"
            role="presentation"
            onMouseDown={
                onClose
            }
        >
            <section
                className="sale-customer-create sale-customer-create--unified"
                dir="rtl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="sale-customer-create-title"
                onMouseDown={(
                    event,
                ) =>
                    event.stopPropagation()
                }
            >
                <header className="sale-customer-create__header">
                    <div>
                        <h2
                            id="sale-customer-create-title"
                        >
                            לקוח חדש
                        </h2>

                        <p>
                            אותם פרטי לקוח כמו במסך ניהול הלקוחות
                        </p>
                    </div>

                    <button
                        type="button"
                        className="sale-customer-create__close"
                        aria-label="סגור"
                        onClick={
                            onClose
                        }
                    >
                        ×
                    </button>
                </header>

                <div className="sale-customer-create__body sale-customer-create__body--unified">
                    <CustomerEditorFields
                        draft={
                            draft
                        }
                        onChange={
                            setDraft
                        }
                        error={
                            error
                        }
                        onClearError={() =>
                            setError(
                                null,
                            )
                        }
                        autoFocusName
                    />
                </div>

                <footer className="sale-customer-create__footer">
                    <button
                        type="button"
                        className="sale-customer-create__cancel"
                        onClick={
                            onClose
                        }
                    >
                        ביטול
                    </button>

                    <button
                        type="button"
                        className="sale-customer-create__save"
                        onClick={
                            save
                        }
                    >
                        שמור ובחר
                    </button>
                </footer>
            </section>
        </div>
    );
}
