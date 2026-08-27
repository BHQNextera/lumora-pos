import {
    useContext,
} from "react";

import {
    LocaleContext,
} from "./LocaleContext";

export function useLocale() {
    const context =
        useContext(
            LocaleContext,
        );

    if (!context) {
        throw new Error(
            "LOCALE_CONTEXT_MISSING",
        );
    }

    return context;
}
