export type CashDenominationType =
    | "banknote"
    | "coin";

export type CashDenomination = {
    value: number;
    type: CashDenominationType;
};

export type CashDeclarationLine = {
    denomination: number;
    quantity: number;
    amount: number;
};

export type CashDeclaration = {
    currency: string;

    lines:
        CashDeclarationLine[];

    total: number;

    declaredAt: string;
};

export const ilsCashDenominations:
    CashDenomination[] = [
    {
        value: 200,
        type: "banknote",
    },
    {
        value: 100,
        type: "banknote",
    },
    {
        value: 50,
        type: "banknote",
    },
    {
        value: 20,
        type: "banknote",
    },
    {
        value: 10,
        type: "coin",
    },
    {
        value: 5,
        type: "coin",
    },
    {
        value: 2,
        type: "coin",
    },
    {
        value: 1,
        type: "coin",
    },
    {
        value: 0.5,
        type: "coin",
    },
    {
        value: 0.1,
        type: "coin",
    },
];

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

export function createCashDeclaration(
    quantities:
        Record<string, number>,
    currency = "ILS",
): CashDeclaration {
    const lines =
        ilsCashDenominations.map(
            (denomination) => {
                const rawQuantity =
                    quantities[
                        String(
                            denomination.value,
                        )
                    ] ?? 0;

                const quantity =
                    Math.max(
                        0,
                        Math.floor(
                            Number.isFinite(
                                rawQuantity,
                            )
                                ? rawQuantity
                                : 0,
                        ),
                    );

                return {
                    denomination:
                        denomination.value,

                    quantity,

                    amount:
                        roundMoney(
                            denomination.value *
                                quantity,
                        ),
                };
            },
        );

    return {
        currency,

        lines,

        total:
            roundMoney(
                lines.reduce(
                    (sum, line) =>
                        sum +
                        line.amount,
                    0,
                ),
            ),

        declaredAt:
            new Date()
                .toISOString(),
    };
}