import type {
    Customer,
    CustomerGroupId,
} from "./Customer";

export type CustomerEditorDraft = {
    name: string;
    phone: string;
    email: string;
    externalId: string;
    birthDate: string;
    address: string;
    notes: string;
    groupIds: CustomerGroupId[];
    storeCreditEnabled: boolean;
    creditLimit: string;
    accountBalance: number;
    isActive: boolean;
};

export function createEmptyCustomerEditorDraft():
CustomerEditorDraft {
    return {
        name: "",
        phone: "",
        email: "",
        externalId: "",
        birthDate: "",
        address: "",
        notes: "",
        groupIds: [],
        storeCreditEnabled: false,
        creditLimit: "",
        accountBalance: 0,
        isActive: true,
    };
}

export function createCustomerEditorDraft(
    customer:
        Customer,
): CustomerEditorDraft {
    const groupIds =
        [
            ...customer.groupIds,
        ];

    if (
        customer.isClubMember &&
        !groupIds.includes(
            "club",
        )
    ) {
        groupIds.push(
            "club",
        );
    }

    return {
        name:
            customer.name,

        phone:
            customer.phone ??
            "",

        email:
            customer.email ??
            "",

        externalId:
            customer.externalId ??
            "",

        birthDate:
            customer.birthDate ??
            "",

        address:
            customer.address ??
            "",

        notes:
            customer.notes ??
            "",

        groupIds,

        storeCreditEnabled:
            customer.storeCreditEnabled ===
            true,

        creditLimit:
            customer.creditLimit ===
            undefined
                ? ""
                : String(
                      customer.creditLimit,
                  ),

        accountBalance:
            customer.accountBalance ??
            0,

        isActive:
            customer.isActive !==
            false,
    };
}

export function buildCustomerFromEditorDraft(
    draft:
        CustomerEditorDraft,
    current?:
        Customer,
): Customer {
    const now =
        new Date()
            .toISOString();

    const creditLimit =
        draft.creditLimit.trim()
            ? Number(
                  draft.creditLimit,
              )
            : undefined;

    const groupIds =
        [
            ...draft.groupIds,
        ];

    return {
        id:
            current?.id ??
            crypto.randomUUID(),

        name:
            draft.name.trim(),

        phone:
            draft.phone.trim() ||
            undefined,

        email:
            draft.email.trim() ||
            undefined,

        externalId:
            draft.externalId.trim() ||
            undefined,

        birthDate:
            draft.birthDate.trim() ||
            undefined,

        address:
            draft.address.trim() ||
            undefined,

        notes:
            draft.notes.trim() ||
            undefined,

        groupIds,

        isClubMember:
            groupIds.includes(
                "club",
            ),

        storeCreditEnabled:
            draft.storeCreditEnabled,

        creditLimit:
            draft.storeCreditEnabled
                ? creditLimit
                : current?.creditLimit,

        accountBalance:
            current?.accountBalance ??
            draft.accountBalance,

        isActive:
            draft.isActive,

        createdAt:
            current?.createdAt ??
            now,

        updatedAt:
            now,
    };
}
