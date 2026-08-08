import { useState } from "react";

type EchoMethodProps = {
    remainingAmount: number;
    onApprove: (
        amount: number,
        providerReference: string,
    ) => void;
};

function EchoMethod({
    remainingAmount,
    onApprove,
}: EchoMethodProps) {
    const [isProcessing, setIsProcessing] =
        useState(false);

    const approve = () => {
        if (
            isProcessing ||
            remainingAmount <= 0
        ) {
            return;
        }

        setIsProcessing(true);

        const providerReference =
            `ECHO-${Date.now()}`;

        onApprove(
            remainingAmount,
            providerReference,
        );
    };

    return (
        <div className="payment-page__method-state">
            <span className="payment-page__method-state-icon">
                ◉
            </span>

            <strong>
                Echo
            </strong>

            <p>
                בקשת תשלום דיגיטלית בסך ₪
                {remainingAmount.toFixed(2)}
            </p>

            <button
                type="button"
                disabled={
                    isProcessing ||
                    remainingAmount <= 0
                }
                onClick={approve}
            >
                {isProcessing
                    ? "שולח..."
                    : "שלח בקשת תשלום"}
            </button>
        </div>
    );
}

export default EchoMethod;