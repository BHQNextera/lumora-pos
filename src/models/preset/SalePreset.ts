import type {
    SaleActionId,
} from "./SaleActionRegistry";

export type SalePresetKind =
    | "product"
    | "category"
    | "action";

export type SalePresetAction =
    SaleActionId;

export type SalePreset = {
    id: string;
    kind: SalePresetKind;
    targetId: string;
};

export const MAX_SALE_PRESETS = 8;
