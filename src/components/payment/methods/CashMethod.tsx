import { useMemo, useState } from "react";

type CashMethodProps = {
    remainingAmount: number;
    onAddPayment: (payment: {
        amount: number;
        tenderedAmount: number;
        changeAmount: number;
    }) => void;
};

const cashQuickValues = [20, 50, 100, 200, 500];

function CashMethod({ remainingAmount, onAddPayment }: CashMethodProps) {
    const [cashReceived, setCashReceived] = useState<number | null>(null);
    const effectiveCashReceived = cashReceived ?? remainingAmount;

    const calculation = useMemo(() => {
        const paymentAmount = Math.min(effectiveCashReceived, remainingAmount);
        const changeAmount = Math.max(0, effectiveCashReceived - remainingAmount);

        return {
            paymentAmount,
            changeAmount,
            isPartial: effectiveCashReceived > 0 && effectiveCashReceived < remainingAmount,
            isExact:
                remainingAmount > 0 &&
                Math.abs(effectiveCashReceived - remainingAmount) < 0.001,
            isOver: effectiveCashReceived > remainingAmount,
        };
    }, [effectiveCashReceived, remainingAmount]);

    const canAddPayment = remainingAmount > 0 && effectiveCashReceived > 0;

    const getButtonLabel = () => {
        if (calculation.isPartial) {
            return `הוסף תשלום · ₪${calculation.paymentAmount.toFixed(2)}`;
        }
        if (calculation.isExact) {
            return `תשלום במזומן · ₪${remainingAmount.toFixed(2)}`;
        }
        if (calculation.isOver) return "אישור תשלום";
        return "הזן סכום";
    };

    const submitPayment = () => {
        if (!canAddPayment) return;

        onAddPayment({
            amount: calculation.paymentAmount,
            tenderedAmount: effectiveCashReceived,
            changeAmount: calculation.isOver ? calculation.changeAmount : 0,
        });

        setCashReceived(null);
    };

    return (
        <div className="cash-payment">
            <div className="cash-payment__quick">
                {cashQuickValues.map((value) => (
                    <button
                        key={value}
                        type="button"
                        onClick={() => setCashReceived((current) => (current ?? 0) + value)}
                    >
                        ₪{value}
                    </button>
                ))}
            </div>

            <label className="cash-payment__custom">
                <span>סכום שהתקבל</span>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={cashReceived === null ? "" : cashReceived}
                    placeholder={remainingAmount.toFixed(2)}
                    onChange={(event) => {
                        const rawValue = event.target.value;
                        if (rawValue === "") {
                            setCashReceived(null);
                            return;
                        }
                        const value = Number(rawValue);
                        setCashReceived(Number.isFinite(value) ? value : null);
                    }}
                />
            </label>

            <div className="cash-payment__calculation">
                <div><span>התקבל</span><strong>₪{effectiveCashReceived.toFixed(2)}</strong></div>
                <div><span>נותר לתשלום</span><strong>₪{remainingAmount.toFixed(2)}</strong></div>

                {calculation.isPartial && (
                    <div>
                        <span>יתרה לאחר התשלום</span>
                        <strong>₪{(remainingAmount - calculation.paymentAmount).toFixed(2)}</strong>
                    </div>
                )}

                {calculation.isOver && (
                    <div className="cash-payment__change">
                        <span>עודף</span>
                        <strong>₪{calculation.changeAmount.toFixed(2)}</strong>
                    </div>
                )}
            </div>

            <button
                type="button"
                className="payment-page__confirm"
                disabled={!canAddPayment}
                onClick={submitPayment}
            >
                {getButtonLabel()}
            </button>
        </div>
    );
}

export default CashMethod;