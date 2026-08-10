import {
    DEFAULT_LOCALE,
    translate,
} from "../../i18n";

export type CategoryLevel =
    | "department"
    | "category"
    | "subcategory";

export type Category = {
    id: string;

    nameKey: string;

    /*
     * Transitional compatibility field.
     *
     * Existing POS screens still read category.name.
     * The value is generated from the translation layer
     * and is no longer hard-coded in master data.
     *
     * When the SalePage becomes locale-aware,
     * it will use nameKey directly and this field
     * can be removed.
     */
    name: string;

    parentId?: string;

    level: CategoryLevel;

    isActive: boolean;

    sortOrder: number;
};

type CategorySeedInput = Omit<
    Category,
    "name"
>;

function createCategory(
    input: CategorySeedInput,
): Category {
    return {
        ...input,

        name: translate(
            input.nameKey,
            DEFAULT_LOCALE,
        ),
    };
}

export const categorySeed: Category[] = [
    createCategory({
        id: "beverages",
        nameKey:
            "catalog.department.beverages",
        level: "department",
        isActive: true,
        sortOrder: 10,
    }),

    createCategory({
        id: "food",
        nameKey:
            "catalog.department.food",
        level: "department",
        isActive: true,
        sortOrder: 20,
    }),

    createCategory({
        id: "hot-drinks",
        nameKey:
            "catalog.category.hot-drinks",
        parentId: "beverages",
        level: "category",
        isActive: true,
        sortOrder: 10,
    }),

    createCategory({
        id: "cold-drinks",
        nameKey:
            "catalog.category.cold-drinks",
        parentId: "beverages",
        level: "category",
        isActive: true,
        sortOrder: 20,
    }),

    createCategory({
        id: "pastries",
        nameKey:
            "catalog.category.pastries",
        parentId: "food",
        level: "category",
        isActive: true,
        sortOrder: 10,
    }),

    createCategory({
        id: "sandwiches",
        nameKey:
            "catalog.category.sandwiches",
        parentId: "food",
        level: "category",
        isActive: true,
        sortOrder: 20,
    }),

    createCategory({
        id: "desserts",
        nameKey:
            "catalog.category.desserts",
        parentId: "food",
        level: "category",
        isActive: true,
        sortOrder: 30,
    }),

    createCategory({
        id: "coffee",
        nameKey:
            "catalog.subcategory.coffee",
        parentId: "hot-drinks",
        level: "subcategory",
        isActive: true,
        sortOrder: 10,
    }),

    createCategory({
        id: "juices",
        nameKey:
            "catalog.subcategory.juices",
        parentId: "cold-drinks",
        level: "subcategory",
        isActive: true,
        sortOrder: 10,
    }),

    createCategory({
        id: "water",
        nameKey:
            "catalog.subcategory.water",
        parentId: "cold-drinks",
        level: "subcategory",
        isActive: true,
        sortOrder: 20,
    }),

    createCategory({
        id: "sweet-pastries",
        nameKey:
            "catalog.subcategory.sweet-pastries",
        parentId: "pastries",
        level: "subcategory",
        isActive: true,
        sortOrder: 10,
    }),

    createCategory({
        id: "cold-sandwiches",
        nameKey:
            "catalog.subcategory.cold-sandwiches",
        parentId: "sandwiches",
        level: "subcategory",
        isActive: true,
        sortOrder: 10,
    }),

    createCategory({
        id: "hot-sandwiches",
        nameKey:
            "catalog.subcategory.hot-sandwiches",
        parentId: "sandwiches",
        level: "subcategory",
        isActive: true,
        sortOrder: 20,
    }),

    createCategory({
        id: "cakes",
        nameKey:
            "catalog.subcategory.cakes",
        parentId: "desserts",
        level: "subcategory",
        isActive: true,
        sortOrder: 10,
    }),

    createCategory({
        id: "cookies",
        nameKey:
            "catalog.subcategory.cookies",
        parentId: "desserts",
        level: "subcategory",
        isActive: true,
        sortOrder: 20,
    }),
];