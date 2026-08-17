import Database from "@tauri-apps/plugin-sql";

import type {
    RuntimeStorage,
} from "./RuntimeStorage";

type RuntimeStorageRow = {
    value: string;
};

const DATABASE_URL =
    "sqlite:lumora.db";

export class SQLiteRuntimeStorageAdapter
    implements RuntimeStorage {

    private databasePromise:
        Promise<Database> | null =
            null;

    private getDatabase():
    Promise<Database> {
        if (!this.databasePromise) {
            this.databasePromise =
                this.initializeDatabase();
        }

        return this.databasePromise;
    }

    private async initializeDatabase():
    Promise<Database> {
        const database =
            await Database.load(
                DATABASE_URL,
            );

        await database.execute(`
            CREATE TABLE IF NOT EXISTS runtime_storage (
                storage_key TEXT PRIMARY KEY NOT NULL,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        return database;
    }

    async getItem(
        key: string,
    ): Promise<string | null> {
        const database =
            await this.getDatabase();

        const rows =
            await database.select<
                RuntimeStorageRow[]
            >(
                `
                    SELECT value
                    FROM runtime_storage
                    WHERE storage_key = $1
                    LIMIT 1
                `,
                [
                    key,
                ],
            );

        return rows[0]?.value ?? null;
    }

    async setItem(
        key: string,
        value: string,
    ): Promise<void> {
        const database =
            await this.getDatabase();

        await database.execute(
            `
                INSERT INTO runtime_storage (
                    storage_key,
                    value,
                    updated_at
                )
                VALUES (
                    $1,
                    $2,
                    CURRENT_TIMESTAMP
                )
                ON CONFLICT(storage_key)
                DO UPDATE SET
                    value = excluded.value,
                    updated_at = CURRENT_TIMESTAMP
            `,
            [
                key,
                value,
            ],
        );
    }

    async removeItem(
        key: string,
    ): Promise<void> {
        const database =
            await this.getDatabase();

        await database.execute(
            `
                DELETE FROM runtime_storage
                WHERE storage_key = $1
            `,
            [
                key,
            ],
        );
    }

    async clear():
    Promise<void> {
        const database =
            await this.getDatabase();

        await database.execute(
            `
                DELETE FROM runtime_storage
            `,
        );
    }
}
