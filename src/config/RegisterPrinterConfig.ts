import {
    getActiveBusinessConfiguration,
    getActiveRegisterProfile,
} from "./ActiveBusinessConfiguration";

export type PrinterPaperFormat =
    | "thermal80"
    | "thermal57";

export type RegisterPrinterConfig = {
    storeCode: string;
    registerCode: string;
    paperFormat: PrinterPaperFormat;
};

/**
 * Compatibility adapter.
 *
 * Register/printer configuration no longer owns
 * hard-coded register settings.
 *
 * Identity comes from ActiveBusinessConfiguration.
 * Hardware configuration comes from the active
 * Business Operating Profile register.
 */
export function getRegisterPrinterConfig(
    storeCode?: string,
    registerCode?: string,
): RegisterPrinterConfig {
    const activeConfiguration =
        getActiveBusinessConfiguration();

    const resolvedStoreCode =
        storeCode ?? activeConfiguration.storeCode;

    const resolvedRegisterCode =
        registerCode ?? activeConfiguration.registerCode;

    const activeRegister =
        resolvedStoreCode === activeConfiguration.storeCode &&
        resolvedRegisterCode === activeConfiguration.registerCode
            ? getActiveRegisterProfile()
            : undefined;

    return {
        storeCode: resolvedStoreCode,
        registerCode: resolvedRegisterCode,
        paperFormat:
            activeRegister?.printer.paperFormat ??
            "thermal80",
    };
}