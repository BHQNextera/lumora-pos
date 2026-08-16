import type {
    CatalogMode,
    PosCapabilities,
} from "./posCapabilities";
import type {
    PrinterPaperFormat,
} from "./RegisterPrinterConfig";

export type OperatingModel =
    | "calculator"
    | "retail"
    | "fashion";

export type DataOwner =
    | "local"
    | "nextera"
    | "hybrid";

export type ProductModel =
    | "simple"
    | "variant_matrix";

export type ProductVariantAxis =
    | "color"
    | "size";

export type BusinessDataOwnership = {
    products: DataOwner;
    customers: DataOwner;
    inventory: DataOwner;
    promotions: DataOwner;
    pricing: DataOwner;
};

export type BusinessFeatures = {
    catalog: boolean;
    promotions: boolean;
    coupons: boolean;
    customerClub: boolean;

    returns: boolean;
    exchanges: boolean;

    creditVouchers: boolean;
    giftCards: boolean;

    calculator: boolean;
};

export type ProductOperatingProfile = {
    model:
        ProductModel;

    variantAxes:
        ProductVariantAxis[];

    requireSkuPerVariant:
        boolean;

    requireBarcodePerVariant:
        boolean;
};

export type BusinessIdentityProfile = {
    tenantId: string;

    businessName: string;
    tradingName?: string;
    branchName?: string;

    businessNumber?: string;
    vatNumber?: string;

    phone?: string;
    address?: string;

    countryCode: string;
    currencyCode: string;
    timeZone: string;
};

export type RegisterOperatingProfile = {
    storeCode: string;
    registerCode: string;

    printer: {
        paperFormat:
            PrinterPaperFormat;
    };

    hardware: {
        scannerEnabled:
            boolean;

        paymentTerminalEnabled:
            boolean;
    };
};

export type DeliveryCapabilities = {
    print: boolean;
    sms: boolean;
    whatsapp: boolean;
    email: boolean;
};

export type BusinessOperatingProfile = {
    version: 1;

    identity:
        BusinessIdentityProfile;

    operatingModel:
        OperatingModel;

    catalogMode:
        CatalogMode;

    product:
        ProductOperatingProfile;

    dataOwnership:
        BusinessDataOwnership;

    features:
        BusinessFeatures;

    pos:
        PosCapabilities;

    delivery:
        DeliveryCapabilities;

    registers:
        RegisterOperatingProfile[];
};

/**
 * Development/default profile.
 *
 * This is intentionally explicit rather than inferred.
 * Later it will be loaded from installation/business
 * configuration and may be supplied by Nextera.
 */
export const defaultBusinessOperatingProfile:
    BusinessOperatingProfile = {
    version: 1,

    identity: {
        tenantId:
            "coffee-time-demo",

        businessName:
            "Coffee Time",

        tradingName:
            "Coffee Time",

        countryCode:
            "IL",

        currencyCode:
            "ILS",

        timeZone:
            "Asia/Jerusalem",
    },

    operatingModel:
        "retail",

    catalogMode:
        "mixed",

    product: {
        model:
            "simple",

        variantAxes:
            [],

        requireSkuPerVariant:
            false,

        requireBarcodePerVariant:
            false,
    },

    dataOwnership: {
        products:
            "local",

        customers:
            "local",

        inventory:
            "local",

        promotions:
            "local",

        pricing:
            "local",
    },

    features: {
        catalog:
            true,

        promotions:
            true,

        coupons:
            true,

        customerClub:
            true,

        returns:
            true,

        exchanges:
            true,

        creditVouchers:
            true,

        giftCards:
            true,

        calculator:
            true,
    },

    pos: {
        catalogMode:
            "mixed",

        allowDescriptionOverride:
            true,

        allowPriceOverride:
            true,

        requireManagerForPriceOverride:
            false,

        requireManagerForDescriptionOverride:
            false,

        allowReturnWithoutDocument:
            true,

        showProductCostPrice:
            true,

        showProductGrossMargin:
            true,

        showNetworkStock:
            false,
    },

    delivery: {
        print:
            true,

        sms:
            true,

        whatsapp:
            true,

        email:
            false,
    },

    registers: [
        {
            storeCode:
                "01",

            registerCode:
                "02",

            printer: {
                paperFormat:
                    "thermal80",
            },

            hardware: {
                scannerEnabled:
                    true,

                paymentTerminalEnabled:
                    true,
            },
        },
    ],
};

export function getRegisterProfile(
    profile:
        BusinessOperatingProfile,
    storeCode:
        string,
    registerCode:
        string,
) {
    return profile.registers.find(
        (register) =>
            register.storeCode ===
                storeCode &&
            register.registerCode ===
                registerCode,
    );
}