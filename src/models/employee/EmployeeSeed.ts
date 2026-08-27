import type {
    Employee,
} from "./Employee";

export const employeeSeed:
    Employee[] = [
    {
        id:
            "employee-shay",

        name:
            "שי",

        employeeNumber:
            1,

        code:
            "01",

        roles: [
            "seller",
            "cashier",
            "manager",
        ],

        isActive:
            true,
    },

    {
        id:
            "employee-kobi",

        name:
            "קובי",

        employeeNumber:
            2,

        code:
            "02",

        roles: [
            "seller",
            "cashier",
            "manager",
        ],

        isActive:
            true,
    },
];

export function getActiveSellers() {
    return employeeSeed.filter(
        (employee) =>
            employee.isActive &&
            employee.roles.includes(
                "seller",
            ),
    );
}