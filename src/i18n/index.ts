import {
    translations,
} from "./translations";

import type {
    LocalizedText,
    SupportedLocale,
    TextDirection,
} from "./types";

export const DEFAULT_LOCALE: SupportedLocale =
    "he";

export const FALLBACK_LOCALE: SupportedLocale =
    "en";

export const supportedLocales:
    SupportedLocale[] = [
        "he",
        "en",
        "el",
        "ru",
    ];

export function getDirection(
    locale: SupportedLocale,
): TextDirection {
    return locale === "he"
        ? "rtl"
        : "ltr";
}

export function getLocalizedText(
    value: LocalizedText,
    locale: SupportedLocale,
): string {
    return (
        value[locale] ??
        value[FALLBACK_LOCALE] ??
        value[DEFAULT_LOCALE] ??
        ""
    );
}

export function translate(
    key: string,
    locale: SupportedLocale = DEFAULT_LOCALE,
): string {
    const value =
        translations[key];

    if (!value) {
        return key;
    }

    return getLocalizedText(
        value,
        locale,
    );
}

export type {
    LocalizedText,
    SupportedLocale,
    TextDirection,
    TranslationDictionary,
} from "./types";