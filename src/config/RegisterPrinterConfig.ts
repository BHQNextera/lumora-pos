export type PrinterPaperFormat =
    | "thermal80"
    | "thermal57";

export type RegisterPrinterConfig = {
    storeCode: string;
    registerCode: string;

    paperFormat:
        PrinterPaperFormat;
};

/*
 * Installation-level printer configuration.
 *
 * This is REGISTER-specific, not tenant-wide.
 *
 * A single business may operate:
 * - Register 01 with an 80mm printer
 * - Register 02 with an 80mm printer
 * - Register 03 with a 57mm printer
 *
 * The cashier never chooses the paper width
 * during the transaction.
 */
const registerPrinterConfigs:
    RegisterPrinterConfig[] = [
    {
        storeCode: "01",
        registerCode: "02",
        paperFormat: "thermal80",
    },
];

const defaultPrinterConfig:
    RegisterPrinterConfig = {
    storeCode: "01",
    registerCode: "02",
    paperFormat: "thermal80",
};

export function getRegisterPrinterConfig(
    storeCode?: string,
    registerCode?: string,
): RegisterPrinterConfig {
    if (
        !storeCode ||
        !registerCode
    ) {
        return defaultPrinterConfig;
    }

    return (
        registerPrinterConfigs.find(
            (config) =>
                config.storeCode ===
                    storeCode &&
                config.registerCode ===
                    registerCode,
        ) ??
        {
            ...defaultPrinterConfig,
            storeCode,
            registerCode,
        }
    );
}

