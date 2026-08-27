export type EmployeeRole =
    | "seller"
    | "cashier"
    | "manager";

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

    roles:
        EmployeeRole[];

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