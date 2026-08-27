export type Supplier = {
    id: string;
    tenantId: string;

    name: string;
    businessNumber: string;
    contactName: string;
    phone: string;
    email: string;
    address: string;
    paymentTerms: string;
    note: string;

    isActive: boolean;

    createdAt: string;
    updatedAt: string;
};

export type SupplierInput = {
    name: string;
    businessNumber: string;
    contactName?: string;
    phone?: string;
    email?: string;
    address?: string;
    paymentTerms?: string;
    note?: string;
};
