export type CustomerGroupId =
    | "club"
    | "vip"
    | "employee";

export type Customer = {
    id: string;

    name: string;

    phone?: string;
    email?: string;

    /*
     * Current Israel-first customer identifier.
     * Stored in externalId for compatibility with the
     * existing customer model/UI.
     */
    externalId?: string;

    /*
     * ISO local date:
     * YYYY-MM-DD
     */
    birthDate?: string;

    address?: string;
    notes?: string;

    groupIds: CustomerGroupId[];

    isClubMember: boolean;

    isActive?: boolean;

    createdAt?: string;
    updatedAt?: string;
};