export type TaxMode =
    | "included"
    | "excluded";

export type TaxPolicy = {
    countryCode: string;
    rate: number;
    mode: TaxMode;
};

export const currentTaxPolicy: TaxPolicy = {
    countryCode: "IL",
    rate: 0.18,
    mode: "included",
};

function roundMoney(
    value: number,
) {
    return (
        Math.round(
            (value + Number.EPSILON) *
            100,
        ) / 100
    );
}

export function calculateIncludedTax(
    totalIncludingTax: number,
    rate: number =
        currentTaxPolicy.rate,
) {
    if (
        !Number.isFinite(
            totalIncludingTax,
        ) ||
        !Number.isFinite(rate) ||
        rate <= 0
    ) {
        return 0;
    }

    return roundMoney(
        totalIncludingTax *
        (
            rate /
            (1 + rate)
        ),
    );
}
