import type {
    CashMovement,
    CashMovementReason,
    CashMovementType,
} from "./CashMovement";

const STORAGE_KEY =
    "lumora.cash-movements";

function readAll():
    CashMovement[] {
    try {
        const raw =
            localStorage.getItem(
                STORAGE_KEY,
            );

        if (!raw) {
            return [];
        }

        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? parsed
            : [];
    }
    catch {
        return [];
    }
}

function persist(
    movements:
        CashMovement[],
) {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
            movements,
        ),
    );
}

export function createCashMovement(
    input: {
        tenantId: string;
        storeCode: string;
        registerCode: string;
        shiftId: string;

        type:
            CashMovementType;

        amount: number;

        reason:
            CashMovementReason;

        note?: string;

        employee: {
            employeeId: string;
            employeeName: string;
        };
    },
): CashMovement {
    if (
        !Number.isFinite(
            input.amount,
        ) ||
        input.amount <= 0
    ) {
        throw new Error(
            "INVALID_CASH_MOVEMENT_AMOUNT",
        );
    }

    const movement:
        CashMovement = {
        id:
            crypto.randomUUID(),

        tenantId:
            input.tenantId,

        storeCode:
            input.storeCode,

        registerCode:
            input.registerCode,

        shiftId:
            input.shiftId,

        type:
            input.type,

        amount:
            Math.round(
                (
                    input.amount +
                    Number.EPSILON
                ) * 100,
            ) / 100,

        reason:
            input.reason,

        note:
            input.note?.trim() ||
            undefined,

        employee: {
            ...input.employee,
        },

        createdAt:
            new Date()
                .toISOString(),
    };

    persist([
        movement,
        ...readAll(),
    ]);

    return movement;
}

export function getCashMovementsForShift(
    shiftId: string,
) {
    return readAll()
        .filter(
            (movement) =>
                movement.shiftId ===
                shiftId,
        )
        .sort(
            (a, b) =>
                a.createdAt.localeCompare(
                    b.createdAt,
                ),
        );
}

export function getAllCashMovements() {
    return readAll();
}