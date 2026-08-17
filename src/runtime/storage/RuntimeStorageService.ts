import {
    BrowserLocalStorageAdapter,
} from "./BrowserLocalStorageAdapter";

import type {
    RuntimeStorage,
} from "./RuntimeStorage";

/*
 * Runtime persistence boundary.
 *
 * Application/domain repositories must eventually
 * depend on this service rather than directly on
 * browser localStorage.
 *
 * BrowserLocalStorageAdapter is temporary and keeps
 * the current development runtime operational.
 *
 * Production runtimes will replace this adapter with
 * platform-backed persistence such as SQLite.
 */

let activeStorage:
    RuntimeStorage =
        new BrowserLocalStorageAdapter();

export function getRuntimeStorage():
    RuntimeStorage {
    return activeStorage;
}

export function setRuntimeStorage(
    storage: RuntimeStorage,
): void {
    activeStorage = storage;
}