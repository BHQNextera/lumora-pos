export type CustomerGroupId =
    | "club"
    | "vip"
    | "employee";

export type Customer = {
    id: string;

    name: string;

    phone?: string;
    email?: string;

    externalId?: string;

    address?: string;
    notes?: string;

    groupIds: CustomerGroupId[];

    isClubMember: boolean;

    isActive?: boolean;

    createdAt?: string;
    updatedAt?: string;
};
