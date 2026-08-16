export type ThermalPaperProfileId =
    | "thermal-58"
    | "thermal-80";

export type ThermalPrintProfile = {
    id: ThermalPaperProfileId;

    label: string;

    /*
     * Logical paper width.
     * 57/58 mm printers use the 58 profile.
     * 80/88 mm printers use the 80 profile.
     */
    paperWidthMm: number;

    contentWidthMm: number;

    charactersPerLine: number;

    fontSizePx: number;
    lineHeight: number;
};

export const thermalPrintProfiles:
    Record<
        ThermalPaperProfileId,
        ThermalPrintProfile
    > = {
        "thermal-58": {
            id: "thermal-58",
            label: "57 / 58 מ״מ",
            paperWidthMm: 58,
            contentWidthMm: 52,
            charactersPerLine: 32,
            fontSizePx: 11,
            lineHeight: 1.3,
        },

        "thermal-80": {
            id: "thermal-80",
            label: "80 / 88 מ״מ",
            paperWidthMm: 80,
            contentWidthMm: 72,
            charactersPerLine: 42,
            fontSizePx: 12,
            lineHeight: 1.35,
        },
    };

export const defaultThermalPrintProfile =
    thermalPrintProfiles[
        "thermal-80"
    ];