/* LUMORA QUANTITY SAFETY V1.2 */

export type QuantitySafetyContext =
    | "cart"
    | "supplier_invoice"
    | "supplier_return"
    | "inventory_adjustment";

export const QUANTITY_BARCODE_MIN_DIGITS = 8;

export const QUANTITY_SOFT_LIMIT_BY_CONTEXT: Record<
    QuantitySafetyContext,
    number
> = {
    cart: 100,
    supplier_invoice: 250,
    supplier_return: 250,
    inventory_adjustment: 250,
};

export const QUANTITY_HARD_LIMIT = 9_999_999;

export type QuantitySafetyAssessment = {
    ok: boolean;
    quantity?: number;
    requiresConfirmation?: boolean;
    message?: string;
};

export function normalizedQuantityText(value: string) {
    return value.replaceAll(",", "").trim();
}

export function isBarcodeLikeQuantityText(value: string) {
    const normalized = normalizedQuantityText(value);
    return /^\d+$/.test(normalized) && normalized.length >= QUANTITY_BARCODE_MIN_DIGITS;
}

export function assessQuantityText({
    raw,
    context,
    min = 0,
    max,
    current,
}: {
    raw: string;
    context: QuantitySafetyContext;
    min?: number;
    max?: number;
    current?: number;
}): QuantitySafetyAssessment {
    const normalized = normalizedQuantityText(raw);

    if (!normalized) {
        return { ok: false, message: "יש להזין כמות." };
    }

    if (isBarcodeLikeQuantityText(normalized)) {
        return {
            ok: false,
            message: "זוהתה סריקת ברקוד בשדה הכמות. הכמות לא שונתה.",
        };
    }

    if (!/^\d+$/.test(normalized)) {
        return { ok: false, message: "הכמות חייבת להיות מספר שלם." };
    }

    const quantity = Number(normalized);

    if (!Number.isSafeInteger(quantity) || quantity < min) {
        return {
            ok: false,
            message: "הכמות חייבת להיות מספר שלם של " + min + " ומעלה.",
        };
    }

    if (quantity > QUANTITY_HARD_LIMIT) {
        return { ok: false, message: "הכמות חורגת מהטווח המותר." };
    }

    if (max !== undefined && quantity > max) {
        return {
            ok: false,
            message: "הכמות המקסימלית כרגע היא " + max.toLocaleString("he-IL") + ".",
        };
    }

    const softLimit = QUANTITY_SOFT_LIMIT_BY_CONTEXT[context];
    const changed = current === undefined || quantity !== current;

    return {
        ok: true,
        quantity,
        requiresConfirmation: changed && quantity >= softLimit,
        message:
            changed && quantity >= softLimit
                ? "הוזנה כמות חריגה: " + quantity.toLocaleString("he-IL") + ". לאשר את הכמות?"
                : undefined,
    };
}
