export type SaleLine = {
    id: string;

    productId: string;
    productName: string;
    sku: string;
    barcode: string;

    quantity: number;
    unitPrice: number;

    grossAmount: number;

    lineDiscountAmount: number;
    allocatedSaleDiscountAmount: number;

    netAmount: number;
};