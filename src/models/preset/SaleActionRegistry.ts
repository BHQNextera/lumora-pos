import type {
    BusinessOperatingProfile,
} from "../../config/BusinessOperatingProfile";

export type SaleActionId =
    | "customer"
    | "coupon"
    | "line_discount"
    | "transaction_discount"
    | "price_override"
    | "hold_sale"
    | "held_sales"
    | "return_item"
    | "gift_card_balance"
    | "line_note"
    | "document_note"
    | "open_drawer";

export type SaleActionCategory =
    | "customer"
    | "pricing"
    | "transaction"
    | "stored_value"
    | "register";

export type SaleActionContext = {
    openCustomer: () => void;
    openCoupon: () => void;
    openLineDiscount: () => void;
    openTransactionDiscount:
        () => void;
    openPriceOverride: () => void;
    openLineNote: () => void;
    openDocumentNote: () => void;
    holdSale: () => void;
    openHeldSales: () => void;
    openReturnItem: () => void;
    openGiftCardBalance: () => void;
    openDrawer: () => void;
};

export type SaleActionAvailabilityContext = {
    profile:
        BusinessOperatingProfile;

    cartLineCount:
        number;

    heldSaleCount:
        number;

    selectedSaleLineId:
        string | null;
};

export type SaleActionDefinition = {
    id: SaleActionId;
    label: string;
    category:
        SaleActionCategory;
    icon: string;

    isEligible?: (
        context:
            SaleActionAvailabilityContext,
    ) => boolean;

    isEnabled?: (
        context:
            SaleActionAvailabilityContext,
    ) => boolean;

    execute: (
        context:
            SaleActionContext,
    ) => void;
};

export const saleActionRegistry:
SaleActionDefinition[] = [
    {
        id: "customer",
        label: "לקוח",
        category: "customer",
        icon: "👤",

        execute: (context) =>
            context.openCustomer(),
    },

    {
        id: "coupon",
        label: "קופון",
        category: "pricing",
        icon: "🎟",

        isEligible: (context) =>
            context.profile
                .features
                .coupons,

        isEnabled: (context) =>
            context.cartLineCount >
            0,

        execute: (context) =>
            context.openCoupon(),
    },

    {
        id: "line_discount",
        label: "הנחת פריט",
        category: "pricing",
        icon: "%",

        isEnabled: (context) =>
            Boolean(
                context
                    .selectedSaleLineId,
            ),

        execute: (context) =>
            context
                .openLineDiscount(),
    },

    {
        id:
            "transaction_discount",

        label:
            "הנחת עסקה",

        category:
            "pricing",

        icon: "%",

        isEnabled: (context) =>
            context.cartLineCount >
            0,

        execute: (context) =>
            context
                .openTransactionDiscount(),
    },

    {
        id: "price_override",
        label: "שינוי מחיר",
        category: "pricing",
        icon: "₪",

        isEligible: (context) =>
            context.profile
                .pos
                .allowPriceOverride,

        isEnabled: (context) =>
            Boolean(
                context
                    .selectedSaleLineId,
            ),

        execute: (context) =>
            context
                .openPriceOverride(),
    },

    {
        id: "line_note",
        label: "הערת פריט",
        category: "transaction",
        icon: "✎",

        isEnabled: (context) =>
            Boolean(
                context
                    .selectedSaleLineId,
            ),

        execute: (context) =>
            context.openLineNote(),
    },

    {
        id: "document_note",
        label: "הערת מסמך",
        category: "transaction",
        icon: "✎",

        isEnabled: (context) =>
            context.cartLineCount >
            0,

        execute: (context) =>
            context.openDocumentNote(),
    },
    {
        id: "hold_sale",
        label: "השהה עסקה",
        category: "transaction",
        icon: "Ⅱ",

        isEnabled: (context) =>
            context.cartLineCount >
            0,

        execute: (context) =>
            context.holdSale(),
    },

    {
        id: "held_sales",
        label: "עסקאות מושהות",
        category: "transaction",
        icon: "▤",

        isEnabled: (context) =>
            context.heldSaleCount >
            0,

        execute: (context) =>
            context.openHeldSales(),
    },

    {
        id: "return_item",
        label: "החזרת פריט",
        category: "transaction",
        icon: "↩",

        isEligible: (context) =>
            context.profile
                .features
                .returns,

        execute: (context) =>
            context.openReturnItem(),
    },

    {
        id:
            "gift_card_balance",

        label:
            "בדיקת יתרת Gift Card",

        category:
            "stored_value",

        icon: "🎁",

        isEligible: (context) =>
            context.profile
                .features
                .giftCards,

        execute: (context) =>
            context
                .openGiftCardBalance(),
    },

    {
        id: "open_drawer",
        label: "פתיחת מגירה",
        category: "register",
        icon: "▣",

        execute: (context) =>
            context.openDrawer(),
    },
];

export function getSaleActionDefinition(
    id: string,
):
SaleActionDefinition | undefined {
    return saleActionRegistry.find(
        (action) =>
            action.id === id,
    );
}

export function isSaleActionId(
    id: string,
): id is SaleActionId {
    return Boolean(
        getSaleActionDefinition(
            id,
        ),
    );
}

export function isSaleActionEligible(
    id: string,
    context:
        SaleActionAvailabilityContext,
): boolean {
    const action =
        getSaleActionDefinition(
            id,
        );

    if (!action) {
        return false;
    }

    return (
        action.isEligible?.(
            context,
        ) ??
        true
    );
}

export function isSaleActionEnabled(
    id: string,
    context:
        SaleActionAvailabilityContext,
): boolean {
    const action =
        getSaleActionDefinition(
            id,
        );

    if (!action) {
        return false;
    }

    if (
        !isSaleActionEligible(
            id,
            context,
        )
    ) {
        return false;
    }

    return (
        action.isEnabled?.(
            context,
        ) ??
        true
    );
}

export function getEligibleSaleActions(
    context:
        SaleActionAvailabilityContext,
):
SaleActionDefinition[] {
    return saleActionRegistry.filter(
        (action) =>
            isSaleActionEligible(
                action.id,
                context,
            ),
    );
}

export function executeSaleAction(
    id: string,
    availabilityContext:
        SaleActionAvailabilityContext,
    executionContext:
        SaleActionContext,
): boolean {
    const action =
        getSaleActionDefinition(
            id,
        );

    if (
        !action ||
        !isSaleActionEnabled(
            id,
            availabilityContext,
        )
    ) {
        return false;
    }

    action.execute(
        executionContext,
    );

    return true;
}