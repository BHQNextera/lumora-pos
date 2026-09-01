
import type { EmployeeRole } from "./Employee";

export type EmployeeRoleDefinition = {
    id: string;
    roleKey: EmployeeRole;
    nameHe: string;
    nameEn: string;
    nameEl: string;
    isActive: boolean;
    sortOrder: number;
};

const STORAGE_KEY = "lumora.employee-role-catalog.v1";

const fallback: EmployeeRoleDefinition[] = [
    { id:"seller", roleKey:"seller", nameHe:"מוכרן", nameEn:"Seller", nameEl:"Πωλητής", isActive:true, sortOrder:10 },
    { id:"cashier", roleKey:"cashier", nameHe:"קופאי", nameEn:"Cashier", nameEl:"Ταμίας", isActive:true, sortOrder:20 },
    { id:"manager", roleKey:"manager", nameHe:"מנהל", nameEn:"Manager", nameEl:"Διευθυντής", isActive:true, sortOrder:30 },
];

let roles = fallback;
let allowEmployeeCreateFromPos = true;

try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.roles) && parsed.roles.length) roles = parsed.roles;
        if (typeof parsed.allowEmployeeCreateFromPos === "boolean")
            allowEmployeeCreateFromPos = parsed.allowEmployeeCreateFromPos;
    }
} catch {}

function persist() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            roles,
            allowEmployeeCreateFromPos,
        }));
    } catch {}
}

export function applyNexteraEmployeeRoleCatalog(
    incomingRoles: EmployeeRoleDefinition[],
    allowCreate: boolean,
) {
    if (incomingRoles.length) {
        roles = incomingRoles
            .slice()
            .sort((a,b) => a.sortOrder-b.sortOrder);
    }

    allowEmployeeCreateFromPos = allowCreate;
    persist();
}

export function getEmployeeRoleCatalog() {
    return roles.filter((role) => role.isActive);
}

export function getEmployeeRoleLabel(roleKey: EmployeeRole) {
    return roles.find((role) => role.roleKey === roleKey)?.nameHe
        ?? roleKey;
}

export function isEmployeeCreateFromPosAllowed() {
    return allowEmployeeCreateFromPos;
}
