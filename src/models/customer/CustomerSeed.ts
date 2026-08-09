import type {
    Customer,
} from "./Customer";

export const testCustomers: Customer[] = [
    {
        id: "walk-in",
        name: "לקוח מזדמן",
        groupIds: [],
        isClubMember: false,
    },
    {
        id: "club-test",
        name: "לקוח מועדון טסט",
        phone: "0500000001",
        groupIds: [
            "club",
        ],
        isClubMember: true,
    },
    {
        id: "vip-test",
        name: "לקוח VIP טסט",
        phone: "0500000002",
        groupIds: [
            "club",
            "vip",
        ],
        isClubMember: true,
    },
];