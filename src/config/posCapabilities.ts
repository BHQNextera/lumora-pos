export type CatalogMode =
    | "catalog"
    | "mixed"
    | "calculator";

export type PosCapabilities = {
    catalogMode: CatalogMode;

    allowDescriptionOverride: boolean;
    allowPriceOverride: boolean;

    requireManagerForPriceOverride: boolean;
    requireManagerForDescriptionOverride: boolean;

    allowReturnWithoutDocument: boolean;
};

export const posCapabilities: PosCapabilities = {
    catalogMode: "mixed",

    allowDescriptionOverride: true,
    allowPriceOverride: true,

    requireManagerForPriceOverride: false,
    requireManagerForDescriptionOverride: false,

    allowReturnWithoutDocument: true,
};