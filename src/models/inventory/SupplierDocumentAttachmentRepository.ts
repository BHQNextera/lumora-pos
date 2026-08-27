import {
    isTauri,
} from "@tauri-apps/api/core";

const DB_NAME =
    "lumora-supplier-attachments";
const STORE_NAME =
    "payloads";

let browserDbPromise:
    Promise<IDBDatabase> | null =
        null;

let tauriDbPromise:
    Promise<{
        execute: (
            query: string,
            bindValues?: unknown[],
        ) => Promise<unknown>;
        select: <T>(
            query: string,
            bindValues?: unknown[],
        ) => Promise<T>;
    }> | null = null;

function getBrowserDb():
Promise<IDBDatabase> {
    if (!browserDbPromise) {
        browserDbPromise =
            new Promise(
                (resolve, reject) => {
                    const request =
                        indexedDB.open(
                            DB_NAME,
                            1,
                        );

                    request.onupgradeneeded =
                        () => {
                            const db =
                                request.result;

                            if (
                                !db.objectStoreNames
                                    .contains(
                                        STORE_NAME,
                                    )
                            ) {
                                db.createObjectStore(
                                    STORE_NAME,
                                );
                            }
                        };

                    request.onsuccess =
                        () =>
                            resolve(
                                request.result,
                            );

                    request.onerror =
                        () =>
                            reject(
                                request.error ??
                                    new Error(
                                        "Unable to open attachment storage.",
                                    ),
                            );
                },
            );
    }

    return browserDbPromise;
}

async function getTauriDb() {
    if (!tauriDbPromise) {
        tauriDbPromise =
            (async () => {
                const module =
                    await import(
                        "@tauri-apps/plugin-sql"
                    );

                const db =
                    await module.default.load(
                        "sqlite:lumora.db",
                    );

                await db.execute(
                    `
                    CREATE TABLE IF NOT EXISTS supplier_document_attachment_payloads (
                        id TEXT PRIMARY KEY NOT NULL,
                        data_url TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )
                    `,
                );

                return db;
            })();
    }

    return tauriDbPromise;
}

async function browserPut(
    id: string,
    dataUrl: string,
): Promise<void> {
    const db =
        await getBrowserDb();

    await new Promise<void>(
        (resolve, reject) => {
            const tx =
                db.transaction(
                    STORE_NAME,
                    "readwrite",
                );

            tx.objectStore(
                STORE_NAME,
            ).put(
                dataUrl,
                id,
            );

            tx.oncomplete =
                () => resolve();
            tx.onerror =
                () => reject(tx.error);
            tx.onabort =
                () => reject(tx.error);
        },
    );
}

async function browserGet(
    id: string,
): Promise<string | null> {
    const db =
        await getBrowserDb();

    return new Promise<string | null>(
        (resolve, reject) => {
            const tx =
                db.transaction(
                    STORE_NAME,
                    "readonly",
                );

            const request =
                tx.objectStore(
                    STORE_NAME,
                ).get(id);

            request.onsuccess = () =>
                resolve(
                    typeof request.result ===
                        "string"
                        ? request.result
                        : null,
                );

            request.onerror = () =>
                reject(request.error);
        },
    );
}

async function browserDelete(
    id: string,
): Promise<void> {
    const db =
        await getBrowserDb();

    await new Promise<void>(
        (resolve, reject) => {
            const tx =
                db.transaction(
                    STORE_NAME,
                    "readwrite",
                );

            tx.objectStore(
                STORE_NAME,
            ).delete(id);

            tx.oncomplete =
                () => resolve();
            tx.onerror =
                () => reject(tx.error);
            tx.onabort =
                () => reject(tx.error);
        },
    );
}

export async function saveSupplierAttachmentPayload(
    attachmentId: string,
    dataUrl: string,
): Promise<void> {
    if (!isTauri()) {
        await browserPut(
            attachmentId,
            dataUrl,
        );
        return;
    }

    const db =
        await getTauriDb();

    await db.execute(
        `
        INSERT INTO supplier_document_attachment_payloads (
            id,
            data_url,
            updated_at
        )
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            data_url = excluded.data_url,
            updated_at = excluded.updated_at
        `,
        [
            attachmentId,
            dataUrl,
            new Date().toISOString(),
        ],
    );
}

export async function getSupplierAttachmentPayload(
    attachmentId: string,
): Promise<string | null> {
    if (!isTauri()) {
        return browserGet(
            attachmentId,
        );
    }

    const db =
        await getTauriDb();

    const rows = await db.select<
        Array<{ data_url: string }>
    >(
        `
        SELECT data_url
        FROM supplier_document_attachment_payloads
        WHERE id = ?
        LIMIT 1
        `,
        [attachmentId],
    );

    return rows[0]?.data_url ?? null;
}

export async function deleteSupplierAttachmentPayload(
    attachmentId: string,
): Promise<void> {
    if (!isTauri()) {
        await browserDelete(
            attachmentId,
        );
        return;
    }

    const db =
        await getTauriDb();

    await db.execute(
        `
        DELETE FROM supplier_document_attachment_payloads
        WHERE id = ?
        `,
        [attachmentId],
    );
}
