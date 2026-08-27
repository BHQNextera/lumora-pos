import type {
    BusinessOperatingProfile,
    OperatingModel,
} from "./BusinessOperatingProfile";

export type BusinessOperatingProfileId =
    | "calculator"
    | "retail"
    | "fashion";

const baseIdentity = {
    tenantId:
        "lumora-unprovisioned",

    businessName:
        "Lumora - Unprovisioned",

    tradingName:
        "Lumora - Unprovisioned",

    branchName:
        "",

    countryCode:
        "IL",

    currencyCode:
        "ILS",

    timeZone:
        "Asia/Jerusalem",
};

const baseRegister = {
    storeCode:
        "01",

    registerCode:
        "02",

    printer: {
        paperFormat:
            "thermal80" as const,
    },

    hardware: {
        scannerEnabled:
            false,

        paymentTerminalEnabled:
            false,
    },
};

function createProfile(
    operatingModel:
        OperatingModel,
): BusinessOperatingProfile {
    switch (operatingModel) {
        case "calculator":
            return {
                version: 1,

                identity: {
                    ...baseIdentity,
                },

                operatingModel:
                    "calculator",

                catalogMode:
                    "calculator",

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
                        false,

                    promotions:
                        false,

                    coupons:
                        false,

                    customerClub:
                        false,

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
                        "calculator",

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
                        false,

                    showProductGrossMargin:
                        false,

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
                        ...baseRegister,
                    },
                ],
            };

        case "fashion":
            return {
                version: 1,

                identity: {
                    ...baseIdentity,
                },

                operatingModel:
                    "fashion",

                catalogMode:
                    "catalog",

                product: {
                    model:
                        "variant_matrix",

                    variantAxes: [
                        "color",
                        "size",
                    ],

                    requireSkuPerVariant:
                        true,

                    requireBarcodePerVariant:
                        true,
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
                        false,
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
                        "catalog",

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
                        true,
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
                        ...baseRegister,
                    },
                ],
            };

        case "retail":
        default:
            return {
                version: 1,

                identity: {
                    ...baseIdentity,
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
/**
                 * Safe local payment-method baseline.
                 * Integrated payment methods stay disabled until
                 * their provider connection is explicitly configured.
                 */

                paymentMethods: [

                    { code: "cash", isActive: true, sortOrder: 10 },

                    { code: "card_terminal", isActive: false, sortOrder: 20 },

                    { code: "echo", isActive: false, sortOrder: 30 },

                    { code: "credit_voucher", isActive: true, sortOrder: 40 },

                    { code: "gift_card", isActive: true, sortOrder: 50 },

                    { code: "store_credit", isActive: true, sortOrder: 60 },

                    { code: "bit", isActive: false, sortOrder: 70 },

                    { code: "paybox", isActive: false, sortOrder: 80 },

                    { code: "bank_transfer", isActive: false, sortOrder: 90 },

                    { code: "cheque", isActive: false, sortOrder: 100 },

                    { code: "external_credit", isActive: false, sortOrder: 110 },

                    { code: "custom", isActive: false, sortOrder: 120 },

                ],

                registers: [
                    {
                        ...baseRegister,
                    },
                ],
            };
    }
}

export const businessOperatingProfiles:
    Record<
        BusinessOperatingProfileId,
        BusinessOperatingProfile
    > = {
    calculator:
        createProfile(
            "calculator",
        ),

    retail:
        createProfile(
            "retail",
        ),

    fashion:
        createProfile(
            "fashion",
        ),
};

export function getBusinessOperatingProfile(
    profileId:
        BusinessOperatingProfileId,
): BusinessOperatingProfile {
    return businessOperatingProfiles[
        profileId
    ];
}


