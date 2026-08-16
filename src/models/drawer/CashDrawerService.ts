import type {
    CashDrawerCommand,
    CashDrawerOpenReason,
} from "./CashDrawer";

import type {
    CashDrawerAdapter,
} from "./CashDrawerAdapter";

import {
    SimulatedCashDrawerAdapter,
} from "./SimulatedCashDrawerAdapter";

const STORAGE_KEY =
    "lumora.cash-drawer.commands";

let adapter:
    CashDrawerAdapter =
        new SimulatedCashDrawerAdapter();

function loadCommands():
CashDrawerCommand[] {
    try {
        const raw =
            localStorage.getItem(
                STORAGE_KEY,
            );

        if (!raw) {
            return [];
        }

        const parsed =
            JSON.parse(
                raw,
            );

        return Array.isArray(
            parsed,
        )
            ? parsed
            : [];
    }
    catch {
        return [];
    }
}

function persist(
    commands:
        CashDrawerCommand[],
) {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
            commands,
        ),
    );
}

export function setCashDrawerAdapter(
    nextAdapter:
        CashDrawerAdapter,
) {
    adapter =
        nextAdapter;
}

export function requestCashDrawerOpen(
    reason:
        CashDrawerOpenReason,
): CashDrawerCommand {
    const result =
        adapter.open(
            reason,
        );

    const command:
        CashDrawerCommand = {
        id:
            crypto.randomUUID(),

        reason,

        createdAt:
            new Date()
                .toISOString(),

        status:
            result.status,

        adapter:
            result.adapter,

        errorCode:
            result.errorCode,
    };

    persist([
        command,
        ...loadCommands(),
    ]);

    return command;
}

export function getCashDrawerCommands() {
    return loadCommands();
}