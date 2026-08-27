import {
    isTauri,
} from "@tauri-apps/api/core";

import {
    BrowserLocalStorageAdapter,
} from "../runtime/storage/BrowserLocalStorageAdapter";

import type {
    RuntimeStorage,
} from "../runtime/storage/RuntimeStorage";

import {
    getActiveBusinessOperatingProfile,
} from "./ActiveBusinessConfiguration";

export type DocumentFooterSettings = {
    enabled: boolean;

    thankYouText: string;

    returnPolicyText: string;

    businessPhone: string;

    website: string;

    instagram: string;

    facebook: string;

    customText: string;
};

const STORAGE_KEY =
    "lumora.document-footer-settings";

let localSettings:
    DocumentFooterSettings | null =
        null;

type Listener =
    () => void;

const listeners =
    new Set<Listener>();

let storagePromise:
    Promise<RuntimeStorage> | null =
        null;

let persistenceQueue:
    Promise<void> =
        Promise.resolve();

function getStorage():
Promise<RuntimeStorage> {
    if (!storagePromise) {
        storagePromise =
            (
                async ():
                Promise<RuntimeStorage> => {
                    if (!isTauri()) {
                        return new BrowserLocalStorageAdapter();
                    }

                    const {
                        SQLiteRuntimeStorageAdapter,
                    } = await import(
                        "../runtime/storage/SQLiteRuntimeStorageAdapter"
                    );

                    return new SQLiteRuntimeStorageAdapter();
                }
            )();
    }

    return storagePromise;
}

function normalizeText(
    value: unknown,
    maxLength: number,
) {
    if (
        typeof value !==
            "string"
    ) {
        return "";
    }

    return value
        .trim()
        .slice(
            0,
            maxLength,
        );
}

function normalizeEditableText(
    value: unknown,
    maxLength: number,
) {
    if (
        typeof value !==
            "string"
    ) {
        return "";
    }

    return value.slice(
        0,
        maxLength,
    );
}

function getDefaults():
DocumentFooterSettings {
    const profile =
        getActiveBusinessOperatingProfile();

    const phone =
        profile.identity.phone?.trim() ??
        "";

    return {
        enabled:
            true,

        thankYouText:
            "תודה שקניתם אצלנו",

        returnPolicyText:
            "החזרות והחלפות בהתאם למדיניות העסק ולהוראות הדין.",

        businessPhone:
            phone,

        website:
            "",

        instagram:
            "",

        facebook:
            "",

        customText:
            "",
    };
}

function parseSettings(
    raw: string | null,
): DocumentFooterSettings | null {
    if (!raw) {
        return null;
    }

    try {
        const parsed =
            JSON.parse(
                raw,
            ) as
                Partial<DocumentFooterSettings>;

        const defaults =
            getDefaults();

        return {
            enabled:
                typeof parsed.enabled ===
                    "boolean"
                    ? parsed.enabled
                    : defaults.enabled,

            thankYouText:
                normalizeText(
                    parsed.thankYouText,
                    120,
                ) ||
                defaults.thankYouText,

            returnPolicyText:
                normalizeText(
                    parsed.returnPolicyText,
                    240,
                ),

            businessPhone:
                normalizeText(
                    parsed.businessPhone ??
                        (
                            parsed as Partial<
                                DocumentFooterSettings
                            > & {
                                contactText?: string;
                            }
                        ).contactText
                            ?.replace(
                                /^ליצירת קשר:\s*/u,
                                "",
                            ),
                    80,
                ) ||
                defaults.businessPhone,

            website:
                normalizeText(
                    parsed.website,
                    160,
                ),

            instagram:
                normalizeText(
                    parsed.instagram,
                    120,
                ),

            facebook:
                normalizeText(
                    parsed.facebook,
                    120,
                ),

            customText:
                normalizeText(
                    parsed.customText,
                    240,
                ),
        };
    }
    catch {
        return null;
    }
}

function notify() {
    for (
        const listener
        of listeners
    ) {
        listener();
    }
}

function persist() {
    const snapshot =
        JSON.stringify(
            getDocumentFooterSettings(),
        );

    persistenceQueue =
        persistenceQueue.then(
            async () => {
                const storage =
                    await getStorage();

                await storage.setItem(
                    STORAGE_KEY,
                    snapshot,
                );
            },
        );
}

async function readStored(
    storage: RuntimeStorage,
): Promise<string | null> {
    let raw =
        await storage.getItem(
            STORAGE_KEY,
        );

    if (
        raw === null &&
        isTauri()
    ) {
        const legacy =
            window.localStorage.getItem(
                STORAGE_KEY,
            );

        if (legacy !== null) {
            await storage.setItem(
                STORAGE_KEY,
                legacy,
            );

            window.localStorage.removeItem(
                STORAGE_KEY,
            );

            raw = legacy;
        }
    }

    return raw;
}

export async function hydrateDocumentFooterSettings():
Promise<void> {
    const storage =
        await getStorage();

    localSettings =
        parseSettings(
            await readStored(
                storage,
            ),
        );

    notify();
}

export function getDocumentFooterSettings():
DocumentFooterSettings {
    return {
        ...(localSettings ??
            getDefaults()),
    };
}

export function subscribeDocumentFooterSettings(
    listener:
        Listener,
): () => void {
    listeners.add(
        listener,
    );

    return () => {
        listeners.delete(
            listener,
        );
    };
}

export function saveDocumentFooterSettings(
    patch:
        Partial<DocumentFooterSettings>,
): DocumentFooterSettings {
    const current =
        getDocumentFooterSettings();

    const next:
        DocumentFooterSettings = {
        enabled:
            typeof patch.enabled ===
                "boolean"
                ? patch.enabled
                : current.enabled,

        thankYouText:
            patch.thankYouText !==
                undefined
                ? normalizeEditableText(
                    patch.thankYouText,
                    120,
                )
                : current
                      .thankYouText,

        returnPolicyText:
            patch.returnPolicyText !==
                undefined
                ? normalizeEditableText(
                    patch.returnPolicyText,
                    240,
                )
                : current
                      .returnPolicyText,

        businessPhone:
            patch.businessPhone !==
                undefined
                ? normalizeEditableText(
                    patch.businessPhone,
                    80,
                )
                : current
                      .businessPhone,

        website:
            patch.website !==
                undefined
                ? normalizeEditableText(
                    patch.website,
                    160,
                )
                : current
                      .website,

        instagram:
            patch.instagram !==
                undefined
                ? normalizeEditableText(
                    patch.instagram,
                    120,
                )
                : current
                      .instagram,

        facebook:
            patch.facebook !==
                undefined
                ? normalizeEditableText(
                    patch.facebook,
                    120,
                )
                : current
                      .facebook,

        customText:
            patch.customText !==
                undefined
                ? normalizeEditableText(
                    patch.customText,
                    240,
                )
                : current
                      .customText,
    };

    localSettings =
        next;

    notify();
    persist();

    return {
        ...next,
    };
}

export function flushDocumentFooterSettingsPersistence():
Promise<void> {
    return persistenceQueue;
}
