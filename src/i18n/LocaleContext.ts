import {
    createContext,
} from "react";

import type {
    SupportedLocale,
    TextDirection,
} from "./types";

export type LocaleContextValue = {
    locale: SupportedLocale;
    direction: TextDirection;
    setLocale: (
        locale: SupportedLocale,
    ) => void;
    t: (
        key: string,
    ) => string;
};

export const LocaleContext =
    createContext<LocaleContextValue | null>(
        null,
    );
