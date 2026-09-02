export type EmployeeRole = string;

export type EmployeeSellerScope = {
    branchId: string;
    registerId?: string;
};

export type Employee = {
    id: string;

    name: string;

    /**
     * Stable, auto-assigned Lumora employee number.
     * Kept optional at type level for backward compatibility with
     * older persisted/directly-constructed employee records.
     */
    employeeNumber?: number;

    code?: string;

    /**
     * Canonical Nextera staff identity when this local employee is linked.
     * Legacy/local Lumora employee IDs remain stable and are never rewritten.
     */
    nexteraStaffMemberId?: string;

    roles:
        EmployeeRole[];

    /**
     * Empty/undefined means all active branch/register locations.
     * When populated, at least one scope must match the active register.
     */
    sellerScopes?:
        EmployeeSellerScope[];

    isActive: boolean;
};

export function canEmployeeSell(
    employee: Employee,
) {
    return (
        employee.isActive &&
        employee.roles.includes(
            "seller",
        )
    );
}