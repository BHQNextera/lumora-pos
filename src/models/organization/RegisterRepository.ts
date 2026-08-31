export type LumoraRegister = {
    id: string;
    tenantId: string;
    branchId: string;
    branchCode: string;
    code: string;
    name: string;
    isActive: boolean;
    updatedAt: string;
};

const STORAGE_KEY = "lumora.organization.registers.v1";

function readRegisters(): LumoraRegister[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((value): value is LumoraRegister =>
            Boolean(
                value &&
                typeof value === "object" &&
                typeof value.id === "string" &&
                typeof value.tenantId === "string" &&
                typeof value.branchId === "string" &&
                typeof value.code === "string" &&
                typeof value.name === "string" &&
                typeof value.isActive === "boolean" &&
                typeof value.updatedAt === "string"
            )
        );
    } catch {
        return [];
    }
}

function writeRegisters(registers: LumoraRegister[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registers));
}

export function getNexteraRegisters(
    tenantId?: string,
    branchId?: string,
): LumoraRegister[] {
    return readRegisters().filter((item) =>
        (!tenantId || item.tenantId === tenantId) &&
        (!branchId || item.branchId === branchId)
    );
}

export function replaceNexteraRegisters(registers: LumoraRegister[]): void {
    if (registers.length === 0) return;
    const tenantIds = new Set(registers.map((item) => item.tenantId));
    const preserved = readRegisters().filter((item) => !tenantIds.has(item.tenantId));
    writeRegisters([...preserved, ...registers]);
}

export function findNexteraRegisterByCode(
    tenantId: string,
    registerCode: string,
): LumoraRegister | undefined {
    const normalized = registerCode.trim().toLowerCase();
    return readRegisters().find((item) =>
        item.tenantId === tenantId &&
        item.code.trim().toLowerCase() === normalized
    );
}

export function resolveCanonicalRegisterId(
    tenantId: string,
    registerCode: string,
): string | undefined {
    return findNexteraRegisterByCode(tenantId, registerCode)?.id;
}
