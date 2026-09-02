import type { EmployeeRole } from "./Employee";

export type EmployeeRoleDefinition = {
    id: string;
    roleKey: EmployeeRole;
    nameHe: string;
    nameEn: string;
    nameEl: string;
    isActive: boolean;
    sortOrder: number;
    permissionKeys: string[];
};

const STORAGE_KEY =
    "lumora.employee-role-catalog.v1";

const fallback: EmployeeRoleDefinition[] = [
    {
        id: "seller",
        roleKey: "seller",
        nameHe: "מוכרן",
        nameEn: "Seller",
        nameEl: "Πωλητής",
        isActive: true,
        sortOrder: 10,
        permissionKeys: [],
    },
    {
        id: "cashier",
        roleKey: "cashier",
        nameHe: "קופאי",
        nameEn: "Cashier",
        nameEl: "Ταμίας",
        isActive: true,
        sortOrder: 20,
        permissionKeys: [],
    },
    {
        id: "manager",
        roleKey: "manager",
        nameHe: "מנהל",
        nameEn: "Manager",
        nameEl: "Διευθυντής",
        isActive: true,
        sortOrder: 30,
        permissionKeys: [],
    },
];

function normalizePermissionKeys(
    value: unknown,
): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return Array.from(
        new Set(
            value.filter(
                (item): item is string =>
                    typeof item === "string" &&
                    item.trim().length > 0,
            ),
        ),
    );
}

function normalizeRole(
    role: EmployeeRoleDefinition,
): EmployeeRoleDefinition {
    return {
        ...role,
        permissionKeys:
            normalizePermissionKeys(
                role.permissionKeys,
            ),
    };
}

let roles =
    fallback.map(normalizeRole);

let allowEmployeeCreateFromPos = true;

try {
    const raw =
        localStorage.getItem(
            STORAGE_KEY,
        );

    if (raw) {
        const parsed =
            JSON.parse(raw);

        if (
            Array.isArray(parsed.roles) &&
            parsed.roles.length
        ) {
            roles =
                parsed.roles.map(
                    normalizeRole,
                );
        }

        if (
            typeof parsed.allowEmployeeCreateFromPos ===
            "boolean"
        ) {
            allowEmployeeCreateFromPos =
                parsed.allowEmployeeCreateFromPos;
        }
    }
}
catch {}

function persist() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                roles,
                allowEmployeeCreateFromPos,
            }),
        );
    }
    catch {}
}

export function applyNexteraEmployeeRoleCatalog(
    incomingRoles:
        EmployeeRoleDefinition[],
    allowCreate: boolean,
) {
    if (incomingRoles.length) {
        roles =
            incomingRoles
                .map(normalizeRole)
                .sort(
                    (a, b) =>
                        a.sortOrder -
                        b.sortOrder,
                );
    }

    allowEmployeeCreateFromPos =
        allowCreate;

    persist();
}

export function getEmployeeRoleCatalog() {
    return roles.filter(
        (role) =>
            role.isActive,
    );
}

export function getEmployeeRoleLabel(
    roleKey: EmployeeRole,
) {
    return (
        roles.find(
            (role) =>
                role.roleKey ===
                roleKey,
        )?.nameHe ??
        roleKey
    );
}

export function getEmployeePermissionsForRoles(
    roleKeys: EmployeeRole[],
): string[] {
    const requestedRoles =
        new Set(roleKeys);

    return Array.from(
        new Set(
            roles
                .filter(
                    (role) =>
                        role.isActive &&
                        requestedRoles.has(
                            role.roleKey,
                        ),
                )
                .flatMap(
                    (role) =>
                        role.permissionKeys,
                ),
        ),
    );
}

export function employeeRolesHavePermission(
    roleKeys: EmployeeRole[],
    permissionKey: string,
): boolean {
    return getEmployeePermissionsForRoles(
        roleKeys,
    ).includes(
        permissionKey,
    );
}

export function isEmployeeCreateFromPosAllowed() {
    return allowEmployeeCreateFromPos;
}