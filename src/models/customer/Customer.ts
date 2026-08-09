export type CustomerGroupId =
    | "club"
    | "vip"
    | "employee"
    | string;

export type Customer = {
    id: string;

    name: string;

    phone?: string;

    groupIds: CustomerGroupId[];

    isClubMember: boolean;
};