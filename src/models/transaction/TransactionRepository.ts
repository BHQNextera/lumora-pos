import type { Sale } from "../sale/Sale";

const STORAGE_KEY = "lumora.transactions";

function loadTransactions(): Sale[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed as Sale[];
    } catch {
        return [];
    }
}

function persistTransactions(
    transactions: Sale[],
) {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(transactions),
    );
}

let transactions: Sale[] =
    loadTransactions();

export function saveSale(
    sale: Sale,
) {
    const existingIndex =
        transactions.findIndex(
            (item) => item.id === sale.id,
        );

    if (existingIndex >= 0) {
        transactions = transactions.map(
            (item) =>
                item.id === sale.id
                    ? sale
                    : item,
        );
    } else {
        transactions = [
            sale,
            ...transactions,
        ];
    }

    persistTransactions(
        transactions,
    );
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

export function clearTransactions() {
    transactions = [];
    localStorage.removeItem(
        STORAGE_KEY,
    );
}