export type EmployeeRole =
    | "seller"
    | "cashier"
    | "manager";

export type Employee = {
    id: string;

    name: string;

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