export type SupportedLocale =
    | "he"
    | "en"
    | "el"
    | "ru";

export type TextDirection =
    | "rtl"
    | "ltr";

export type LocalizedText = Partial<
    Record<SupportedLocale, string>
>;

export type TranslationDictionary = Record<
    string,
    LocalizedText
>;