import type {
    Customer,
} from "./Customer";

export const testCustomers: Customer[] = [
    {
        id: "walk-in",
        name: "לקוח מזדמן",
        groupIds: [],
        isClubMember: false,
        isActive: true,
    },
    {
        id: "club-test",
        name: "לקוח מועדון טסט",
        phone: "0500000001",
        externalId: "100000009",
        groupIds: [
            "club",
        ],
        isClubMember: true,
        isActive: true,
    },
    {
        id: "vip-test",
        name: "לקוח VIP טסט",
        phone: "0500000002",
        externalId: "100000017",
        groupIds: [
            "club",
            "vip",
        ],
        isClubMember: true,
        storeCreditEnabled: true,
        creditLimit: 5000,
        accountBalance: 1200,
        isActive: true,
    },
];