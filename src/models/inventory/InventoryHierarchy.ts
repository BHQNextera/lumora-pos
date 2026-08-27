export type InventoryHierarchyLevel =
    | "department"
    | "category"
    | "subcategory";

export type InventoryHierarchyNode = {
    id: string;
    tenantId: string;
    level: InventoryHierarchyLevel;
    name: string;
    parentId?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

export type InventoryHierarchyNodeInput = {
    level: InventoryHierarchyLevel;
    name: string;
    parentId?: string;
};
