function CardMethod() {
    return (
        <div className="card-payment-v2">
            <div className="card-payment-v2__header">
                <div>
                    <span>
                        אשראי משולב
                    </span>

                    <strong>
                        חיבור ישיר למסופון
                    </strong>
                </div>

                <span className="card-payment-v2__status">
                    לא מחובר
                </span>
            </div>

            <div className="card-payment-v2__hint">
                <span
                    aria-hidden="true"
                    className="card-payment-v2__terminal-icon"
                >
                    ▤
                </span>

                <p>
                    לא הוגדר Adapter של ספק סליקה לעמדה זו.
                    לפיילוט יש להשתמש ב״אשראי חיצוני״ ולתעד
                    את האסמכתה שהתקבלה מהמסוף.
                </p>
            </div>

            <button
                type="button"
                disabled
                className="payment-page__confirm card-payment-v2__confirm"
            >
                חיבור למסופון אינו זמין
            </button>
        </div>
    );
}

export default CardMethod;
