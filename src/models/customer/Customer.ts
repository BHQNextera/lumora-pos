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

    /**
     * Customer may buy on account ("הקפה").
     * Business-level visibility is controlled separately
     * by the active payment-method configuration.
     */
    storeCreditEnabled?: boolean;

    /**
     * Approved customer credit ceiling.
     */
    creditLimit?: number;

    /**
     * Current outstanding customer debt.
     */
    accountBalance?: number;

    isActive?: boolean;

    createdAt?: string;
    updatedAt?: string;
};