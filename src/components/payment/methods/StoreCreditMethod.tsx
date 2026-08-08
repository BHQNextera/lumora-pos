type StoreCreditMethodProps = {
    remainingAmount: number;
};

function StoreCreditMethod({
    remainingAmount,
}: StoreCreditMethodProps) {
    return (
        <div className="payment-page__method-state">
            <span className="payment-page__method-state-icon">
                ₪
            </span>

            <strong>
                יתרת לקוח
            </strong>

            <p>
                יתרת לקוח תופעל לאחר חיבור הלקוח לעסקה.
                יתרה לתשלום: ₪{remainingAmount.toFixed(2)}
            </p>

            <button
                type="button"
                disabled
            >
                נדרש לקוח
            </button>
        </div>
    );
}

export default StoreCreditMethod;