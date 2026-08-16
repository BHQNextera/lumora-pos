import type {
    CashDeclaration,
} from "../cash/CashDeclaration";
import {
    getActiveBusinessConfiguration,
} from "../../config/ActiveBusinessConfiguration";
import type {
    RegisterShift,
} from "./RegisterShift";

const STORAGE_KEY =
    "lumora.register-shifts";

function loadShifts():
RegisterShift[] {
    try {
        const raw =
            window.localStorage.getItem(
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
    shifts: RegisterShift[],
) {
    window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
            shifts,
        ),
    );
}

export function getRegisterShifts() {
    return loadShifts();
}

export function getActiveRegisterShift() {
    const configuration =
        getActiveBusinessConfiguration();

    return loadShifts().find(
        (shift) =>
            shift.status ===
                "open" &&
            shift.tenantId ===
                configuration.tenantId &&
            shift.storeCode ===
                configuration.storeCode &&
            shift.registerCode ===
                configuration.registerCode,
    );
}

export type OpenRegisterShiftInput = {
    employeeId: string;
    employeeName: string;

    openingCash: number;
    openingCashDeclaration?: CashDeclaration;
};

export function openRegisterShift(
    input:
        OpenRegisterShiftInput,
) {
    const existing =
        getActiveRegisterShift();

    if (existing) {
        return existing;
    }

    if (
        !Number.isFinite(
            input.openingCash,
        ) ||
        input.openingCash < 0
    ) {
        throw new Error(
            "INVALID_OPENING_CASH",
        );
    }

    const configuration =
        getActiveBusinessConfiguration();

    const shift:
        RegisterShift = {
        id:
            crypto.randomUUID(),

        tenantId:
            configuration.tenantId,

        storeCode:
            configuration.storeCode,

        registerCode:
            configuration.registerCode,

        status:
            "open",

        openedAt:
            new Date()
                .toISOString(),

        openedBy: {
            employeeId:
                input.employeeId,

            employeeName:
                input.employeeName,
        },

        openingCash:
            input.openingCash,

        openingCashDeclaration:
            input.openingCashDeclaration,
    };

    persist([
        shift,
        ...loadShifts(),
    ]);

    return shift;
}
export type CloseRegisterShiftInput = {
    employeeId: string;
    employeeName: string;

    closingCash: number;
    closingCashDeclaration?: CashDeclaration;
};

export function closeRegisterShift(
    input:
        CloseRegisterShiftInput,
) {
    if (
        !Number.isFinite(
            input.closingCash,
        ) ||
        input.closingCash < 0
    ) {
        throw new Error(
            "INVALID_CLOSING_CASH",
        );
    }

    const activeShift =
        getActiveRegisterShift();

    if (!activeShift) {
        throw new Error(
            "NO_ACTIVE_REGISTER_SHIFT",
        );
    }

    const now =
        new Date()
            .toISOString();

    const closedShift = {
        ...activeShift,

        status:
            "closed" as const,

        closedAt:
            now,

        closedBy: {
            employeeId:
                input.employeeId,

            employeeName:
                input.employeeName,
        },

        closingCash:
            input.closingCash,

        closingCashDeclaration:
            input.closingCashDeclaration,
    };

    const nextShifts =
        loadShifts().map(
            (shift) =>
                shift.id ===
                    activeShift.id
                    ? closedShift
                    : shift,
        );

    persist(
        nextShifts,
    );

    return closedShift;
}