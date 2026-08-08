import type { CartLine } from "../sale/CartLine";
import type { Promotion } from "./Promotion";

export type MixAndMatchUnit = {
    id: string;
    lineId: string;
    unitPrice: number;
};

export type MixAndMatchGroup = {
    units: MixAndMatchUnit[];
    normalAmount: number;
    promotionAmount: number;
    discountAmount: number;
};

function roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function matchesTarget(
    line: CartLine,
    promotion: Promotion,
) {
    if (promotion.target.type === "product") {
        return promotion.target.productIds.includes(
            line.product.id,
        );
    }

    return promotion.target.categoryIds.includes(
        line.product.category,
    );
}

/**
 * Builds complete Mix & Match groups.
 *
 * Example:
 * bundleQuantity = 3
 * bundlePrice = 20
 *
 * Any 3 eligible units may form a group, even when they are
 * different products and have different regular prices.
 *
 * Units are sorted expensive -> cheap so complete groups are
 * formed first and the incomplete remainder stays outside.
 */
export function buildMixAndMatchGroups(
    promotion: Promotion,
    lines: CartLine[],
): MixAndMatchGroup[] {
    const quantity =
        promotion.bundleQuantity ?? 0;

    const promotionPrice =
        promotion.bundlePrice ?? 0;

    if (
        quantity <= 0 ||
        promotionPrice < 0
    ) {
        return [];
    }

    const units =
        lines
            .filter(
                (line) =>
                    line.kind === "sale" &&
                    matchesTarget(
                        line,
                        promotion,
                    ),
            )
            .flatMap(
                (line) =>
                    Array.from(
                        {
                            length:
                                line.quantity,
                        },
                        (_, index) => ({
                            id: `${line.id}::${index}`,
                            lineId: line.id,
                            unitPrice:
                                line.unitPrice,
                        }),
                    ),
            )
            .sort(
                (a, b) =>
                    b.unitPrice -
                    a.unitPrice,
            );

    const completeGroups =
        Math.floor(
            units.length /
            quantity,
        );

    const groups:
        MixAndMatchGroup[] = [];

    for (
        let groupIndex = 0;
        groupIndex <
        completeGroups;
        groupIndex += 1
    ) {
        const start =
            groupIndex *
            quantity;

        const groupUnits =
            units.slice(
                start,
                start + quantity,
            );

        const normalAmount =
            roundMoney(
                groupUnits.reduce(
                    (sum, unit) =>
                        sum +
                        unit.unitPrice,
                    0,
                ),
            );

        const discountAmount =
            roundMoney(
                Math.max(
                    0,
                    normalAmount -
                    promotionPrice,
                ),
            );

        if (discountAmount <= 0) {
            continue;
        }

        groups.push({
            units: groupUnits,
            normalAmount,
            promotionAmount:
                roundMoney(
                    promotionPrice,
                ),
            discountAmount,
        });
    }

    return groups;
}