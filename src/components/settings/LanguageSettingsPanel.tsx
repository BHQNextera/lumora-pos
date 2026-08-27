import {
    isLanguagePackReady,
    languagePacks,
} from "../../i18n/languagePacks";

import {
    useLocale,
} from "../../i18n/useLocale";

import type {
    SupportedLocale,
} from "../../i18n/types";

import "./language-settings-panel.css";

function LanguageSettingsPanel() {
    const {
        locale,
        direction,
        setLocale,
    } = useLocale();

    const changeLanguage = (
        value: string,
    ) => {
        const nextLanguage =
            value as SupportedLocale;

        if (
            !isLanguagePackReady(
                nextLanguage,
            )
        ) {
            return;
        }

        setLocale(
            nextLanguage,
        );
    };

    return (
        <>
            <div className="settings-page__panel language-settings-panel">
                <div className="settings-page__setting-row">
                    <div className="settings-page__setting-copy">
                        <strong>
                            שפת הממשק
                        </strong>

                        <span>
                            נשמרת מקומית בקופה ועובדת גם ללא אינטרנט.
                        </span>
                    </div>

                    <div className="settings-page__setting-value">
                        <select
                            className="settings-page__policy-select settings-page__policy-select--wide"
                            value={locale}
                            aria-label="שפת הממשק"
                            onChange={(event) =>
                                changeLanguage(
                                    event.target.value,
                                )
                            }
                        >
                            {languagePacks.map(
                                (pack) => (
                                    <option
                                        key={pack.code}
                                        value={pack.code}
                                        disabled={
                                            pack.status !==
                                            "ready"
                                        }
                                    >
                                        {pack.nativeName}
                                        {pack.status ===
                                        "ready"
                                            ? " — פעילה"
                                            : " — בהכנה"}
                                    </option>
                                ),
                            )}
                        </select>
                    </div>
                </div>

                <div className="settings-page__setting-row">
                    <div className="settings-page__setting-copy">
                        <strong>
                            כיוון הממשק
                        </strong>

                        <span>
                            נקבע אוטומטית לפי השפה הפעילה.
                        </span>
                    </div>

                    <div className="settings-page__setting-value language-settings-panel__value">
                        {direction === "rtl"
                            ? "ימין לשמאל (RTL)"
                            : "שמאל לימין (LTR)"}
                    </div>
                </div>

                <div className="settings-page__setting-row">
                    <div className="settings-page__setting-copy">
                        <strong>
                            אחסון ההעדפה
                        </strong>

                        <span>
                            ההגדרה שייכת לעמדה המקומית ואינה תלויה ב־Nextera.
                        </span>
                    </div>

                    <div className="settings-page__setting-value language-settings-panel__value">
                        מקומי · Offline
                    </div>
                </div>
            </div>

            <div className="language-settings-panel__note">
                <span
                    className="language-settings-panel__note-dot"
                    aria-hidden="true"
                />

                <div>
                    <strong>
                        חבילות שפה נוספות
                    </strong>

                    <p>
                        {"\u05d7\u05d1\u05d9\u05dc\u05d5\u05ea \u05d4\u05e9\u05e4\u05d4 \u05d9\u05d5\u05e4\u05e2\u05dc\u05d5 \u05e8\u05e7 \u05dc\u05d0\u05d7\u05e8 \u05d4\u05e9\u05dc\u05de\u05ea \u05ea\u05e8\u05d2\u05d5\u05dd \u05de\u05dc\u05d0 \u05e9\u05dc \u05de\u05de\u05e9\u05e7 Lumora. \u05dc\u05d0 \u05d9\u05d5\u05e6\u05d2 \u05de\u05de\u05e9\u05e7 \u05d7\u05dc\u05e7\u05d9 \u05d0\u05d5 \u05de\u05e2\u05d5\u05e8\u05d1."}
                    </p>
                </div>
            </div>
        </>
    );
}

export default LanguageSettingsPanel;
