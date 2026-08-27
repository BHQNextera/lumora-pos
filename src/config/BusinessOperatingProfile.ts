import type {
    CatalogMode,
    PosCapabilities,
} from "./posCapabilities";
import type {
    PrinterPaperFormat,
} from "./RegisterPrinterConfig";
import type {
    PaymentMethodConfiguration,
} from "../models/PaymentMethod";

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

export type CustomerPolicy = {
    /*
     * Israel-first default.
     * Can be disabled per business during provisioning/onboarding.
     */
    requireCustomerId: boolean;

    /*
     * Useful for customer clubs / birthday benefits.
     * Optional by default.
     */
    requireCustomerBirthDate: boolean;

    /*
     * Active customers may not share the same normalized phone.
     */
    uniqueActivePhone: boolean;

    /*
     * When an ID exists, active customers may not share it.
     */
    uniqueActiveCustomerId: boolean;
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


    logoUrl?: string;
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

export type StoreCreditPolicy = {
    /**
     * When true, a manager must enter a reason
     * before approving a credit-limit override.
     */
    requireManagerApprovalReason: boolean;

    /**
     * When true, customer account balance may cross below zero,
     * meaning the customer has credit with the business.
     *
     * Missing / undefined defaults to true.
     */
    allowCustomerCreditBalance?: boolean;
};
export type PostTransactionPolicy = {
    autoPrintAccountingDocument?: boolean;

    /**
     * 0 disables automatic return to the Sale workspace.
     * Missing defaults to 20 seconds.
     */
    timeoutSeconds?: number;

    exchangeSlipEnabled?: boolean;
    exchangeSlipDefaultCopies?: number;
    exchangeSlipMaxCopies?: number;

    sendDocumentEnabled?: boolean;
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

    customerPolicy:
        CustomerPolicy;

    pos:
        PosCapabilities;

    delivery:
        DeliveryCapabilities;


    /**
     * Per-business payment visibility/order overrides.
     * Core method behavior stays defined in PaymentMethod.ts.
     */
    paymentMethods?:
        PaymentMethodConfiguration[];

    storeCreditPolicy?:
        StoreCreditPolicy;

    postTransactionPolicy?:
        PostTransactionPolicy;
 registers:
        RegisterOperatingProfile[];
};

/**
 * Safe local/default profile.
 *
 * Fresh installations start unprovisioned. Business identity,
 * register hardware, and connected services are enabled only
 * through explicit local onboarding or Nextera provisioning.
 */
export const defaultBusinessOperatingProfile:
    BusinessOperatingProfile = {
    version: 1,

    identity: {
        tenantId:
            "lumora-unprovisioned",

        businessName:
            "Lumora - Unprovisioned",

        tradingName:
            "Lumora - Unprovisioned",

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
    customerPolicy: {
        requireCustomerId:
            true,

        requireCustomerBirthDate:
            false,

        uniqueActivePhone:
            true,

        uniqueActiveCustomerId:
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
                    false,

                paymentTerminalEnabled:
                    false,
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
