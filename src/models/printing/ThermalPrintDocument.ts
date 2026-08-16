export type ThermalPrintAlignment =
    | "start"
    | "center"
    | "end";

export type ThermalPrintTextBlock = {
    type: "text";
    value: string;
    bold?: boolean;
    alignment?: ThermalPrintAlignment;
};

export type ThermalPrintRowBlock = {
    type: "row";
    label: string;
    value: string;
    bold?: boolean;
};

export type ThermalPrintSeparatorBlock = {
    type: "separator";
};

export type ThermalPrintSpacerBlock = {
    type: "spacer";
};

export type ThermalPrintBlock =
    | ThermalPrintTextBlock
    | ThermalPrintRowBlock
    | ThermalPrintSeparatorBlock
    | ThermalPrintSpacerBlock;

export type ThermalPrintDocument = {
    id: string;

    documentType:
        | "shift-x"
        | "shift-z"
        | "generic";

    title: string;

    direction:
        | "rtl"
        | "ltr";

    blocks: ThermalPrintBlock[];
};