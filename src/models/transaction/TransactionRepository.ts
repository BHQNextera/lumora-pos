import type { Sale } from "../sale/Sale";

const transactions: Sale[] = [];

export function saveSale(
    sale: Sale,
) {
    transactions.unshift(sale);
}

export function getTransactions() {
    return [...transactions];
}

export function getTransaction(
    id: string,
) {
    return transactions.find(
        (sale) => sale.id === id,
    );
}