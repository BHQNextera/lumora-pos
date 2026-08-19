import {
    isTauri,
} from "@tauri-apps/api/core";

import {
    BrowserLocalStorageAdapter,
} from "../../runtime/storage/BrowserLocalStorageAdapter";

import type {
    RuntimeStorage,
} from "../../runtime/storage/RuntimeStorage";

import type {
    Promotion,
} from "./Promotion";

const STORAGE_KEY =
    "lumora.promotions";

let promotions:
    Promotion[] = [];

type PromotionSubscriber = (
    promotions: Promotion[],
) => void;

const promotionSubscribers =
    new Set<PromotionSubscriber>();

function notifyPromotionSubscribers() {
    const snapshot = [
        ...promotions,
    ];

    promotionSubscribers.forEach(
        (subscriber) =>
            subscriber(
                snapshot,
            ),
    );
}

export function subscribePromotions(
    subscriber: PromotionSubscriber,
) {
    promotionSubscribers.add(
        subscriber,
    );

    return () => {
        promotionSubscribers.delete(
            subscriber,
        );
    };
}

let promotionStoragePromise:
    Promise<RuntimeStorage> | null =
        null;

function getPromotionStorage():
Promise<RuntimeStorage> {
    if (!promotionStoragePromise) {
        promotionStoragePromise =
            (async (): Promise<RuntimeStorage> => {
                if (!isTauri()) {
                    return new BrowserLocalStorageAdapter();
                }

                const {
                    SQLiteRuntimeStorageAdapter,
                } = await import(
                    "../../runtime/storage/SQLiteRuntimeStorageAdapter"
                );

                return new SQLiteRuntimeStorageAdapter();
            })();
    }

    return promotionStoragePromise;
}

let persistenceQueue:
    Promise<void> =
        Promise.resolve();

function parsePromotions(
    raw: string | null,
): Promotion[] {
    if (!raw) {
        return [];
    }

    try {
        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? parsed as Promotion[]
            : [];
    }
    catch {
        return [];
    }
}

export async function hydratePromotions():
Promise<void> {
    const storage =
        await getPromotionStorage();

    let raw =
        await storage.getItem(
            STORAGE_KEY,
        );

    if (
        raw === null &&
        isTauri()
    ) {
        const legacy =
            localStorage.getItem(
                STORAGE_KEY,
            );

        if (legacy !== null) {
            await storage.setItem(
                STORAGE_KEY,
                legacy,
            );

            localStorage.removeItem(
                STORAGE_KEY,
            );

            raw = legacy;
        }
    }

    promotions =
        parsePromotions(
            raw,
        );

    notifyPromotionSubscribers();
}

function persistPromotions() {
    const snapshot =
        JSON.stringify(
            promotions,
        );

    persistenceQueue =
        persistenceQueue.then(
            async () => {
                const storage =
                    await getPromotionStorage();

                await storage.setItem(
                    STORAGE_KEY,
                    snapshot,
                );
            },
        );
}

export function flushPromotionPersistence():
Promise<void> {
    return persistenceQueue;
}

export function getPromotions() {
    return [
        ...promotions,
    ];
}

export function getPromotion(
    promotionId: string,
) {
    return promotions.find(
        (promotion) =>
            promotion.id ===
            promotionId,
    );
}

export function savePromotion(
    promotion: Promotion,
) {
    const existingIndex =
        promotions.findIndex(
            (item) =>
                item.id ===
                promotion.id,
        );

    if (
        existingIndex >= 0
    ) {
        promotions =
            promotions.map(
                (item) =>
                    item.id ===
                    promotion.id
                        ? promotion
                        : item,
            );
    }
    else {
        promotions = [
            ...promotions,
            promotion,
        ];
    }

    notifyPromotionSubscribers();
    persistPromotions();
}

export function savePromotions(
    nextPromotions: Promotion[],
) {
    promotions = [
        ...nextPromotions,
    ];

    notifyPromotionSubscribers();
    persistPromotions();
}

export function removePromotion(
    promotionId: string,
) {
    promotions =
        promotions.filter(
            (promotion) =>
                promotion.id !==
                promotionId,
        );

    notifyPromotionSubscribers();
    persistPromotions();
}

export function clearPromotions() {
    promotions = [];

    notifyPromotionSubscribers();

    if (isTauri()) {
        localStorage.removeItem(
            STORAGE_KEY,
        );
    }

    persistenceQueue =
        persistenceQueue.then(
            async () => {
                const storage =
                    await getPromotionStorage();

                await storage.removeItem(
                    STORAGE_KEY,
                );
            },
        );
}