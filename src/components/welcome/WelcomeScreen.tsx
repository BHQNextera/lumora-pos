import "./welcome-screen.css";

type WelcomeScreenProps = {
    mode?: "startup" | "idle";
    onContinue: () => void;
};

function WelcomeScreen({
    mode = "startup",
    onContinue,
}: WelcomeScreenProps) {
    const isIdle =
        mode === "idle";

    return (
        <button
            type="button"
            className="lumora-welcome"
            onClick={onContinue}
            aria-label={
                isIdle
                    ? "חזרה לקופה"
                    : "התחלת עבודה ב-Lumora"
            }
        >
            <div className="lumora-welcome__glow" />

            <div className="lumora-welcome__content">
                <div
                    className="lumora-welcome__mark"
                    aria-hidden="true"
                >
                    <span />
                    <span />
                    <span />
                    <span />
                </div>

                <div className="lumora-welcome__eyebrow">
                    WELCOME TO
                </div>

                <div className="lumora-welcome__brand">
                    LUMORA
                </div>

                <div className="lumora-welcome__message">
                    ברוכים הבאים
                </div>

                <div className="lumora-welcome__hint">
                    <span className="lumora-welcome__hint-dot" />
                    {isIdle
                        ? "געו במסך לחזרה לקופה"
                        : "געו במסך כדי להתחיל"}
                </div>
            </div>

            <div className="lumora-welcome__footer">
                Powered by Coeuria 🍀
            </div>
        </button>
    );
}

export default WelcomeScreen;