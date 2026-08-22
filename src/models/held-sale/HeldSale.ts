import type {
    Customer,
} from "../customer/Customer";

import type {
    PricingRule,
} from "../pricing/PricingRule";

import type {
    CartLine,
} from "../sale/CartLine";

export type HeldSaleSellerSelectionMode =
    | "auto"
    | "explicit"
    | null;

export type HeldSale = {
    id: string;
    transactionNumber?: string;
    heldAt: string;

    cartLines: CartLine[];
    pricingRules: PricingRule[];

    customer: Customer;

    couponCode?: string;

    documentNote?: string;
    printDocumentNote?: boolean;

    currentSellerId: string;
    sellerSelectionMode:
        HeldSaleSellerSelectionMode;

    selectedCategory: string;

    total: number;
};
