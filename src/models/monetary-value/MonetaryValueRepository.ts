import type {
    MonetaryValue,
    MonetaryValueMovement,
} from "./MonetaryValue";

const VALUES_KEY =
    "lumora.monetary-values";

const MOVEMENTS_KEY =
    "lumora.monetary-value-movements";

function readArray<T>(
    key: string,
): T[] {
    try {
        const raw =
            localStorage.getItem(key);

        if (!raw) {
            return [];
        }

        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? (parsed as T[])
            : [];
    } catch {
        return [];
    }
}

function writeArray<T>(
    key: string,
    value: T[],
) {
    localStorage.setItem(
        key,
        JSON.stringify(value),
    );
}

export function getMonetaryValues() {
    return readArray<MonetaryValue>(
        VALUES_KEY,
    );
}

export function getMonetaryValue(
    id: string,
) {
    return getMonetaryValues().find(
        (item) =>
            item.id === id,
    );
}

export function getMonetaryValueByNumber(
    number: string,
) {
    const normalized =
        number.trim().toLowerCase();

    return getMonetaryValues().find(
        (item) =>
            item.number
                .trim()
                .toLowerCase() ===
            normalized,
    );
}

export function saveMonetaryValue(
    value: MonetaryValue,
) {
    const current =
        getMonetaryValues();

    const exists =
        current.some(
            (item) =>
                item.id === value.id,
        );

    const next = exists
        ? current.map(
            (item) =>
                item.id === value.id
                    ? value
                    : item,
        )
        : [
            value,
            ...current,
        ];

    writeArray(
        VALUES_KEY,
        next,
    );

    return value;
}

export function getMonetaryValueMovements() {
    return readArray<MonetaryValueMovement>(
        MOVEMENTS_KEY,
    );
}

export function getMovementsForMonetaryValue(
    monetaryValueId: string,
) {
    return getMonetaryValueMovements()
        .filter(
            (movement) =>
                movement.monetaryValueId ===
                monetaryValueId,
        )
        .sort(
            (a, b) =>
                new Date(
                    b.createdAt,
                ).getTime() -
                new Date(
                    a.createdAt,
                ).getTime(),
        );
}

export function saveMonetaryValueMovement(
    movement: MonetaryValueMovement,
) {
    const current =
        getMonetaryValueMovements();

    writeArray(
        MOVEMENTS_KEY,
        [
            movement,
            ...current,
        ],
    );

    return movement;
}