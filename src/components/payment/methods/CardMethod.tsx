import { useState } from "react";

type CardMethodProps = {
    remainingAmount: number;
    onApprove: (
        amount: number,
        providerReference: string,
    ) => void;
};

function CardMethod({
    remainingAmount,
    onApprove,
}: CardMethodProps) {
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
            `TERMINAL-${Date.now()}`;

        onApprove(
            remainingAmount,
            providerReference,
        );
    };

    return (
        <div className="payment-page__method-state">
            <span className="payment-page__method-state-icon">
                ▤
            </span>

            <strong>
                אשראי במסופון
            </strong>

            <p>
                סכום לחיוב: ₪
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
                    ? "מעבד..."
                    : "אשר תשלום"}
            </button>
        </div>
    );
}

export default CardMethod;