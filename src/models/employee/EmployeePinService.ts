import {
    BrowserLocalStorageAdapter,
} from "../../runtime/storage/BrowserLocalStorageAdapter";

import type {
    RuntimeStorage,
} from "../../runtime/storage/RuntimeStorage";

const STORAGE_KEY =
    "lumora.employee-pin-credentials.v1";

const ITERATIONS =
    150_000;

const MAX_FAILED_ATTEMPTS =
    5;

const LOCKOUT_MS =
    60_000;

type EmployeePinCredential = {
    employeeId: string;
    algorithm:
        "PBKDF2-SHA256";
    iterations: number;
    saltBase64: string;
    hashBase64: string;
    failedAttempts: number;
    lockedUntil?: string;
    updatedAt: string;
};

type CredentialMap =
    Record<
        string,
        EmployeePinCredential
    >;

export type EmployeePinVerification =
    | {
        ok: true;
        reason: "ok";
      }
    | {
        ok: false;
        reason:
            | "missing"
            | "invalid"
            | "locked";
        retryAfterSeconds?: number;
      };

let storagePromise:
    Promise<RuntimeStorage> | null =
    null;

let writeQueue:
    Promise<void> =
    Promise.resolve();

function isTauri() {
    return (
        typeof window !==
            "undefined" &&
        "__TAURI_INTERNALS__" in
            window
    );
}

async function getStorage():
Promise<RuntimeStorage> {
    if (!storagePromise) {
        storagePromise =
            (async () => {
                if (!isTauri()) {
                    return new BrowserLocalStorageAdapter();
                }

                const {
                    SQLiteRuntimeStorageAdapter,
                } =
                    await import(
                        "../../runtime/storage/SQLiteRuntimeStorageAdapter"
                    );

                return new SQLiteRuntimeStorageAdapter();
            })();
    }

    return storagePromise;
}

function toArrayBuffer(
    bytes: Uint8Array,
): ArrayBuffer {
    const copy =
        new Uint8Array(
            bytes.byteLength,
        );

    copy.set(
        bytes,
    );

    return copy.buffer;
}

function bytesToBase64(
    bytes: Uint8Array,
): string {
    let binary = "";

    for (
        const byte
        of bytes
    ) {
        binary +=
            String.fromCharCode(
                byte,
            );
    }

    return btoa(binary);
}

function base64ToBytes(
    value: string,
): Uint8Array {
    const binary =
        atob(value);

    return Uint8Array.from(
        binary,
        (char) =>
            char.charCodeAt(0),
    );
}

function constantTimeEqual(
    left: Uint8Array,
    right: Uint8Array,
): boolean {
    if (
        left.length !==
        right.length
    ) {
        return false;
    }

    let difference =
        0;

    for (
        let index = 0;
        index < left.length;
        index += 1
    ) {
        difference |=
            left[index] ^
            right[index];
    }

    return difference === 0;
}

async function deriveHash(
    pin: string,
    salt: Uint8Array,
    iterations: number,
): Promise<Uint8Array> {
    const material =
        await crypto.subtle.importKey(
            "raw",
            new TextEncoder()
                .encode(pin),
            "PBKDF2",
            false,
            [
                "deriveBits",
            ],
        );

    const bits =
        await crypto.subtle.deriveBits(
            {
                name:
                    "PBKDF2",
                hash:
                    "SHA-256",
                salt:
                    toArrayBuffer(
                        salt,
                    ),
                iterations,
            },
            material,
            256,
        );

    return new Uint8Array(
        bits,
    );
}

async function readCredentials():
Promise<CredentialMap> {
    const storage =
        await getStorage();

    const raw =
        await storage.getItem(
            STORAGE_KEY,
        );

    if (!raw) {
        return {};
    }

    try {
        const parsed =
            JSON.parse(raw);

        return (
            parsed &&
            typeof parsed ===
                "object"
        )
            ? parsed
            : {};
    }
    catch {
        return {};
    }
}

function writeCredentials(
    credentials:
        CredentialMap,
): Promise<void> {
    writeQueue =
        writeQueue
            .catch(
                () => undefined,
            )
            .then(
                async () => {
                    const storage =
                        await getStorage();

                    await storage.setItem(
                        STORAGE_KEY,
                        JSON.stringify(
                            credentials,
                        ),
                    );
                },
            );

    return writeQueue;
}

export function assertEmployeePinFormat(
    pin: string,
): void {
    if (
        !/^\d{4,6}$/.test(
            pin,
        )
    ) {
        throw new Error(
            "EMPLOYEE_PIN_FORMAT",
        );
    }
}

export async function hasEmployeePin(
    employeeId: string,
): Promise<boolean> {
    const credentials =
        await readCredentials();

    return Boolean(
        credentials[
            employeeId
        ],
    );
}

export async function setEmployeePin(
    employeeId: string,
    pin: string,
): Promise<void> {
    assertEmployeePinFormat(
        pin,
    );

    const salt =
        crypto.getRandomValues(
            new Uint8Array(16),
        );

    const hash =
        await deriveHash(
            pin,
            salt,
            ITERATIONS,
        );

    const credentials =
        await readCredentials();

    credentials[
        employeeId
    ] = {
        employeeId,
        algorithm:
            "PBKDF2-SHA256",
        iterations:
            ITERATIONS,
        saltBase64:
            bytesToBase64(
                salt,
            ),
        hashBase64:
            bytesToBase64(
                hash,
            ),
        failedAttempts:
            0,
        updatedAt:
            new Date()
                .toISOString(),
    };

    await writeCredentials(
        credentials,
    );
}

export async function verifyEmployeePin(
    employeeId: string,
    pin: string,
): Promise<EmployeePinVerification> {
    const credentials =
        await readCredentials();

    const credential =
        credentials[
            employeeId
        ];

    if (!credential) {
        return {
            ok: false,
            reason:
                "missing",
        };
    }

    const now =
        Date.now();

    const lockedUntil =
        credential.lockedUntil
            ? Date.parse(
                credential
                    .lockedUntil,
            )
            : 0;

    if (
        Number.isFinite(
            lockedUntil,
        ) &&
        lockedUntil > now
    ) {
        return {
            ok: false,
            reason:
                "locked",
            retryAfterSeconds:
                Math.max(
                    1,
                    Math.ceil(
                        (
                            lockedUntil -
                            now
                        ) /
                        1000,
                    ),
                ),
        };
    }

    const candidate =
        await deriveHash(
            pin,
            base64ToBytes(
                credential
                    .saltBase64,
            ),
            credential
                .iterations,
        );

    const expected =
        base64ToBytes(
            credential
                .hashBase64,
        );

    if (
        constantTimeEqual(
            candidate,
            expected,
        )
    ) {
        credential
            .failedAttempts =
            0;

        delete credential
            .lockedUntil;

        credential.updatedAt =
            new Date()
                .toISOString();

        await writeCredentials(
            credentials,
        );

        return {
            ok: true,
            reason:
                "ok",
        };
    }

    const failures =
        (
            credential
                .failedAttempts ??
            0
        ) + 1;

    credential
        .failedAttempts =
        failures;

    if (
        failures >=
        MAX_FAILED_ATTEMPTS
    ) {
        credential
            .failedAttempts =
            0;

        credential.lockedUntil =
            new Date(
                now +
                LOCKOUT_MS,
            )
                .toISOString();
    }

    credential.updatedAt =
        new Date()
            .toISOString();

    await writeCredentials(
        credentials,
    );

    if (
        credential
            .lockedUntil
    ) {
        return {
            ok: false,
            reason:
                "locked",
            retryAfterSeconds:
                Math.ceil(
                    LOCKOUT_MS /
                    1000,
                ),
        };
    }

    return {
        ok: false,
        reason:
            "invalid",
    };
}

// EMPLOYEE_CREDENTIAL_PROVISIONING_V1

const PROVISION_STATE_STORAGE_KEY =
    "lumora.employee-pin-provisioning.v1";

export type ProvisionedEmployeePinCredential = {
    employeeId: string;
    algorithm:
        "PBKDF2-SHA256";
    iterations: number;
    saltBase64: string;
    hashBase64: string;
    credentialVersion: number;
    revokedAt?: string | null;
    updatedAt: string;
};

type EmployeePinProvisionState = {
    credentialVersion: number;
    revoked: boolean;
    updatedAt: string;
};

type EmployeePinProvisionStateMap =
    Record<
        string,
        EmployeePinProvisionState
    >;

let provisionStateWriteQueue:
    Promise<void> =
        Promise.resolve();

async function readProvisionState():
Promise<EmployeePinProvisionStateMap> {
    const storage =
        await getStorage();

    const raw =
        await storage.getItem(
            PROVISION_STATE_STORAGE_KEY,
        );

    if (!raw) {
        return {};
    }

    try {
        const parsed =
            JSON.parse(raw);

        return (
            parsed &&
            typeof parsed ===
                "object"
        )
            ? parsed
            : {};
    }
    catch {
        return {};
    }
}

function writeProvisionState(
    state:
        EmployeePinProvisionStateMap,
): Promise<void> {
    provisionStateWriteQueue =
        provisionStateWriteQueue
            .catch(
                () => undefined,
            )
            .then(
                async () => {
                    const storage =
                        await getStorage();

                    await storage.setItem(
                        PROVISION_STATE_STORAGE_KEY,
                        JSON.stringify(
                            state,
                        ),
                    );
                },
            );

    return provisionStateWriteQueue;
}

export async function applyNexteraEmployeePinCredentialProvisioning(
    incoming:
        ProvisionedEmployeePinCredential[],
): Promise<void> {
    const credentials =
        await readCredentials();

    const provisionState =
        await readProvisionState();

    let credentialsChanged =
        false;

    let stateChanged =
        false;

    for (
        const credential of incoming
    ) {
        if (
            !credential.employeeId ||
            credential.algorithm !==
                "PBKDF2-SHA256" ||
            credential.iterations !==
                ITERATIONS ||
            !credential.saltBase64 ||
            !credential.hashBase64 ||
            !Number.isSafeInteger(
                credential.credentialVersion,
            ) ||
            credential.credentialVersion <
                1
        ) {
            throw new Error(
                "EMPLOYEE_PIN_PROVISIONING_CONTRACT_INVALID",
            );
        }

        const previousVersion =
            provisionState[
                credential.employeeId
            ]?.credentialVersion ??
            0;

        if (
            credential.credentialVersion <=
            previousVersion
        ) {
            continue;
        }

        if (credential.revokedAt) {
            if (
                credentials[
                    credential.employeeId
                ]
            ) {
                delete credentials[
                    credential.employeeId
                ];

                credentialsChanged =
                    true;
            }

            provisionState[
                credential.employeeId
            ] = {
                credentialVersion:
                    credential.credentialVersion,
                revoked:
                    true,
                updatedAt:
                    credential.updatedAt,
            };

            stateChanged =
                true;

            continue;
        }

        credentials[
            credential.employeeId
        ] = {
            employeeId:
                credential.employeeId,

            algorithm:
                credential.algorithm,

            iterations:
                credential.iterations,

            saltBase64:
                credential.saltBase64,

            hashBase64:
                credential.hashBase64,

            failedAttempts:
                0,

            updatedAt:
                credential.updatedAt,
        };

        provisionState[
            credential.employeeId
        ] = {
            credentialVersion:
                credential.credentialVersion,
            revoked:
                false,
            updatedAt:
                credential.updatedAt,
        };

        credentialsChanged =
            true;

        stateChanged =
            true;
    }

    if (credentialsChanged) {
        await writeCredentials(
            credentials,
        );
    }

    if (stateChanged) {
        await writeProvisionState(
            provisionState,
        );
    }
}