import type { ReturnDocument } from "../sale/Return";

const STORAGE_KEY = "lumora.returns";

function loadReturns(): ReturnDocument[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return [];
        }

        const parsed = JSON.parse(raw);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed as ReturnDocument[];
    } catch {
        return [];
    }
}

function persistReturns(
    returns: ReturnDocument[],
) {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(returns),
    );
}

let returns: ReturnDocument[] =
    loadReturns();

export function saveReturn(
    returnDocument: ReturnDocument,
) {
    const existingIndex =
        returns.findIndex(
            (item) =>
                item.id ===
                returnDocument.id,
        );

    if (existingIndex >= 0) {
        returns = returns.map(
            (item) =>
                item.id ===
                    returnDocument.id
                    ? returnDocument
                    : item,
        );
    } else {
        returns = [
            returnDocument,
            ...returns,
        ];
    }

    persistReturns(returns);
}

export function getReturns() {
    return [...returns];
}

export function getReturnsForSale(
    saleId: string,
) {
    return returns.filter(
        (item) =>
            item.originalSaleId ===
            saleId,
    );
}

export function clearReturns() {
    returns = [];
    localStorage.removeItem(
        STORAGE_KEY,
    );
}