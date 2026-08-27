import type {
    SupportedLocale,
} from "./types";

export type LanguagePackStatus =
    | "ready"
    | "preparing";

export type LanguagePackDefinition = {
    code: SupportedLocale;
    nativeName: string;
    status: LanguagePackStatus;
};

export const languagePacks:
    readonly LanguagePackDefinition[] = [
        {
            code: "he",
            nativeName: "עברית",
            status: "ready",
        },
        {
            code: "en",
            nativeName: "English",
            status: "preparing",
        },
        {
            code: "el",
            nativeName: "Ελληνικά",
            status: "preparing",
        },
        {
            code: "ru",
            nativeName: "Русский",
            status: "preparing",
        },
    ];

export function isLanguagePackReady(
    code: SupportedLocale,
): boolean {
    return languagePacks.some(
        (pack) =>
            pack.code === code &&
            pack.status === "ready",
    );
}
