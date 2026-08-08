import type {
    PricingRule,
} from "../pricing/PricingRule";
import type {
    CartLine,
} from "../sale/CartLine";
import type {
    Promotion,
} from "./Promotion";
import {
    buildMixAndMatchGroups,
} from "./MixAndMatchPromotion";

type Unit = {
    id: string;
    lineId: string;
    unitPrice: number;
};

type DiscountAllocation = {
    lineId: string;
    amount: number;
};

type PromotionApplication = {
    id: string;
    promotion: Promotion;

    /**
     * Units whose participation is consumed by this promotion application.
     * If allowStacking=false, another non-stackable application may not use
     * the same unit. Units not consumed remain free for other promotions.
     */
    unitIds: Set<string>;

    allocations: DiscountAllocation[];

    totalDiscount: number;
};

function roundMoney(value: number) {
    return (
        Math.round(
            (value + Number.EPSILON) * 100,
        ) / 100
    );
}

function parseTimeToMinutes(
    value: string | undefined,
) {
    if (!value) {
        return null;
    }

    const match =
        /^([01]\d|2[0-3]):([0-5]\d)$/.exec(
            value,
        );

    if (!match) {
        return null;
    }

    return (
        Number(match[1]) * 60 +
        Number(match[2])
    );
}

function normalizeDaysOfWeek(
    daysOfWeek:
        | number[]
        | undefined,
) {
    if (
        !daysOfWeek ||
        daysOfWeek.length === 0
    ) {
        return null;
    }

    return new Set(
        daysOfWeek.filter(
            (day) =>
                Number.isInteger(day) &&
                day >= 0 &&
                day <= 6,
        ),
    );
}

function isInsideRecurringSchedule(
    promotion: Promotion,
    now: Date,
) {
    const schedule =
        promotion.schedule;

    if (!schedule) {
        return true;
    }

    const activeDays =
        normalizeDaysOfWeek(
            schedule.daysOfWeek,
        );

    const startMinutes =
        parseTimeToMinutes(
            schedule.startTime,
        );

    const endMinutes =
        parseTimeToMinutes(
            schedule.endTime,
        );

    const currentDay =
        now.getDay();

    const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes();

    /*
     * No hourly restriction:
     * only the selected days matter.
     */
    if (
        startMinutes === null ||
        endMinutes === null
    ) {
        return (
            activeDays === null ||
            activeDays.has(
                currentDay,
            )
        );
    }

    /*
     * Same start/end means a full-day window
     * on the selected active day(s).
     */
    if (
        startMinutes === endMinutes
    ) {
        return (
            activeDays === null ||
            activeDays.has(
                currentDay,
            )
        );
    }

    /*
     * Normal window, e.g. 10:00-12:00.
     */
    if (
        startMinutes < endMinutes
    ) {
        const dayAllowed =
            activeDays === null ||
            activeDays.has(
                currentDay,
            );

        return (
            dayAllowed &&
            currentMinutes >=
            startMinutes &&
            currentMinutes <
            endMinutes
        );
    }

    /*
     * Overnight window, e.g. 22:00-02:00.
     *
     * 23:00 belongs to today's selected day.
     * 01:00 belongs to the previous selected day.
     */
    if (
        currentMinutes >=
        startMinutes
    ) {
        return (
            activeDays === null ||
            activeDays.has(
                currentDay,
            )
        );
    }

    if (
        currentMinutes <
        endMinutes
    ) {
        const previousDay =
            (
                currentDay +
                6
            ) % 7;

        return (
            activeDays === null ||
            activeDays.has(
                previousDay,
            )
        );
    }

    return false;
}

function isPromotionActive(
    promotion: Promotion,
) {
    if (!promotion.isActive) {
        return false;
    }

    const now =
        new Date();

    const nowTimestamp =
        now.getTime();

    if (
        promotion.startsAt &&
        new Date(
            promotion.startsAt,
        ).getTime() >
        nowTimestamp
    ) {
        return false;
    }

    if (
        promotion.endsAt &&
        new Date(
            promotion.endsAt,
        ).getTime() <
        nowTimestamp
    ) {
        return false;
    }

    return isInsideRecurringSchedule(
        promotion,
        now,
    );
}

function isPromotionExcluded(
    line: CartLine,
    promotion: Promotion,
) {
    if (
        promotion.excludedProductIds?.includes(
            line.product.id,
        )
    ) {
        return true;
    }

    if (
        promotion.excludedCategoryIds?.includes(
            line.product.category,
        )
    ) {
        return true;
    }

    return false;
}

function matchesPromotionTarget(
    line: CartLine,
    promotion: Promotion,
) {
    if (
        isPromotionExcluded(
            line,
            promotion,
        )
    ) {
        return false;
    }

    if (
        promotion.target.type ===
        "product"
    ) {
        return promotion.target.productIds.includes(
            line.product.id,
        );
    }

    return promotion.target.categoryIds.includes(
        line.product.category,
    );
}

function createUnits(
    promotion: Promotion,
    lines: CartLine[],
): Unit[] {
    return lines
        .filter(
            (line) =>
                line.kind === "sale" &&
                matchesPromotionTarget(
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
                        id:
                            `${line.id}::${index}`,

                        lineId:
                            line.id,

                        unitPrice:
                            line.unitPrice,
                    }),
                ),
        );
}

function createApplication(
    id: string,
    promotion: Promotion,
    units: Unit[],
    allocations: DiscountAllocation[],
): PromotionApplication | null {
    const totalDiscount =
        roundMoney(
            allocations.reduce(
                (sum, allocation) =>
                    sum +
                    allocation.amount,
                0,
            ),
        );

    if (totalDiscount <= 0) {
        return null;
    }

    return {
        id,
        promotion,

        unitIds:
            new Set(
                units.map(
                    (unit) =>
                        unit.id,
                ),
            ),

        allocations:
            allocations.map(
                (allocation) => ({
                    ...allocation,

                    amount:
                        roundMoney(
                            allocation.amount,
                        ),
                }),
            ),

        totalDiscount,
    };
}

function groupAllocationsByLine(
    allocations: DiscountAllocation[],
) {
    const totals =
        new Map<
            string,
            number
        >();

    for (
        const allocation of
        allocations
    ) {
        totals.set(
            allocation.lineId,
            roundMoney(
                (
                    totals.get(
                        allocation.lineId,
                    ) ?? 0
                ) +
                allocation.amount,
            ),
        );
    }

    return Array.from(
        totals.entries(),
    ).map(
        ([
            lineId,
            amount,
        ]) => ({
            lineId,
            amount,
        }),
    );
}


function allocateProportionallyExact(
    units: Unit[],
    totalAmount: number,
): DiscountAllocation[] {
    const roundedTotal =
        roundMoney(totalAmount);

    if (
        roundedTotal <= 0 ||
        units.length === 0
    ) {
        return [];
    }

    const valueByLine =
        new Map<string, number>();

    for (const unit of units) {
        valueByLine.set(
            unit.lineId,
            roundMoney(
                (valueByLine.get(unit.lineId) ?? 0) +
                unit.unitPrice,
            ),
        );
    }

    const entries =
        Array.from(
            valueByLine.entries(),
        );

    const totalValue =
        entries.reduce(
            (sum, [, value]) =>
                sum + value,
            0,
        );

    if (totalValue <= 0) {
        return [];
    }

    let allocated = 0;

    return entries.map(
        ([lineId, value], index) => {
            const isLast =
                index ===
                entries.length - 1;

            const amount =
                isLast
                    ? roundMoney(
                        roundedTotal -
                        allocated,
                    )
                    : roundMoney(
                        roundedTotal *
                        (value /
                            totalValue),
                    );

            if (!isLast) {
                allocated =
                    roundMoney(
                        allocated +
                        amount,
                    );
            }

            return {
                lineId,
                amount,
            };
        },
    );
}

/**
 * Buy X Get Y
 *
 * Lumora rule:
 * - Eligible units are sorted expensive -> cheap.
 * - They are divided into groups of X+Y.
 * - In every complete group, the Y cheapest units receive the benefit.
 * - Incomplete remainder units are NOT consumed and remain available for
 *   another promotion.
 *
 * Example:
 * 18, 6, 6 with 1+1:
 * group = 18+6 -> 6 free
 * remainder = 6 -> may still receive another eligible promotion.
 */
function buildBuyXGetYApplications(
    promotion: Promotion,
    lines: CartLine[],
) {
    const buyQuantity =
        promotion.buyQuantity ?? 0;

    const getQuantity =
        promotion.getQuantity ?? 0;

    const rewardPercentage =
        promotion.rewardDiscountPercentage ??
        100;

    if (
        buyQuantity <= 0 ||
        getQuantity <= 0 ||
        rewardPercentage <= 0 ||
        rewardPercentage > 100
    ) {
        return [];
    }

    const groupSize =
        buyQuantity +
        getQuantity;

    const units =
        createUnits(
            promotion,
            lines,
        ).sort(
            (a, b) =>
                b.unitPrice -
                a.unitPrice,
        );

    const applications:
        PromotionApplication[] =
        [];

    const completeGroups =
        Math.floor(
            units.length /
            groupSize,
        );

    for (
        let groupIndex = 0;
        groupIndex <
        completeGroups;
        groupIndex += 1
    ) {
        const start =
            groupIndex *
            groupSize;

        const group =
            units.slice(
                start,
                start +
                groupSize,
            );

        const freeUnits =
            group.slice(
                buyQuantity,
            );

        const application =
            createApplication(
                `${promotion.id}::group-${groupIndex}`,
                promotion,
                group,
                groupAllocationsByLine(
                    freeUnits.map(
                        (unit) => ({
                            lineId:
                                unit.lineId,

                            amount:
                                unit.unitPrice *
                                (
                                    rewardPercentage /
                                    100
                                ),
                        }),
                    ),
                ),
            );

        if (application) {
            applications.push(
                application,
            );
        }
    }

    return applications;
}

function buildCategoryDiscountApplications(
    promotion: Promotion,
    lines: CartLine[],
) {
    const percentage =
        promotion.discountPercentage ??
        0;

    if (
        percentage <= 0 ||
        percentage > 100
    ) {
        return [];
    }

    return createUnits(
        promotion,
        lines,
    ).flatMap(
        (unit) => {
            const application =
                createApplication(
                    `${promotion.id}::${unit.id}`,
                    promotion,
                    [unit],
                    [
                        {
                            lineId:
                                unit.lineId,

                            amount:
                                unit.unitPrice *
                                (
                                    percentage /
                                    100
                                ),
                        },
                    ],
                );

            return application
                ? [application]
                : [];
        },
    );
}

function buildQuantityDiscountApplications(
    promotion: Promotion,
    lines: CartLine[],
) {
    const minimumQuantity =
        promotion.minimumQuantity ??
        0;

    const percentage =
        promotion.discountPercentage ??
        0;

    if (
        minimumQuantity <= 0 ||
        percentage <= 0 ||
        percentage > 100
    ) {
        return [];
    }

    const applications:
        PromotionApplication[] =
        [];

    for (const line of lines) {
        if (
            line.kind !== "sale" ||
            line.quantity <
            minimumQuantity ||
            !matchesPromotionTarget(
                line,
                promotion,
            )
        ) {
            continue;
        }

        const units =
            Array.from(
                {
                    length:
                        line.quantity,
                },
                (_, index) => ({
                    id:
                        `${line.id}::${index}`,

                    lineId:
                        line.id,

                    unitPrice:
                        line.unitPrice,
                }),
            );

        const application =
            createApplication(
                `${promotion.id}::${line.id}`,
                promotion,
                units,
                [
                    {
                        lineId:
                            line.id,

                        amount:
                            line.unitPrice *
                            line.quantity *
                            (
                                percentage /
                                100
                            ),
                    },
                ],
            );

        if (application) {
            applications.push(
                application,
            );
        }
    }

    return applications;
}

function buildBundlePriceApplications(
    promotion: Promotion,
    lines: CartLine[],
) {
    const bundleQuantity =
        promotion.bundleQuantity ??
        0;

    const bundlePrice =
        promotion.bundlePrice ??
        0;

    if (
        bundleQuantity <= 0 ||
        bundlePrice < 0
    ) {
        return [];
    }

    const units =
        createUnits(
            promotion,
            lines,
        ).sort(
            (a, b) =>
                b.unitPrice -
                a.unitPrice,
        );

    const completeBundles =
        Math.floor(
            units.length /
            bundleQuantity,
        );

    const applications:
        PromotionApplication[] =
        [];

    for (
        let bundleIndex = 0;
        bundleIndex <
        completeBundles;
        bundleIndex += 1
    ) {
        const start =
            bundleIndex *
            bundleQuantity;

        const bundle =
            units.slice(
                start,
                start +
                bundleQuantity,
            );

        const normalValue =
            bundle.reduce(
                (sum, unit) =>
                    sum +
                    unit.unitPrice,
                0,
            );

        const discount =
            roundMoney(
                normalValue -
                bundlePrice,
            );

        if (discount <= 0) {
            continue;
        }

        /*
         * Allocate the bundle discount proportionally to the participating
         * units so the line display and later accounting remain traceable.
         */
        const rawAllocations =
            bundle.map(
                (unit) => ({
                    lineId:
                        unit.lineId,

                    amount:
                        normalValue > 0
                            ? discount *
                            (
                                unit.unitPrice /
                                normalValue
                            )
                            : 0,
                }),
            );

        const application =
            createApplication(
                `${promotion.id}::bundle-${bundleIndex}`,
                promotion,
                bundle,
                groupAllocationsByLine(
                    rawAllocations,
                ),
            );

        if (application) {
            applications.push(
                application,
            );
        }
    }

    return applications;
}


function matchesRewardTarget(
    line: CartLine,
    promotion: Promotion,
) {
    if (
        isPromotionExcluded(
            line,
            promotion,
        )
    ) {
        return false;
    }

    const rewardTarget =
        promotion.rewardTarget;

    if (!rewardTarget) {
        return false;
    }

    if (
        rewardTarget.type ===
        "product"
    ) {
        return rewardTarget.productIds.includes(
            line.product.id,
        );
    }

    return rewardTarget.categoryIds.includes(
        line.product.category,
    );
}

function buildBuyAGetBApplications(
    promotion: Promotion,
    lines: CartLine[],
) {
    const buyQuantity =
        promotion.buyQuantity ?? 0;

    const getQuantity =
        promotion.getQuantity ?? 0;

    const rewardPercentage =
        promotion.rewardDiscountPercentage ??
        100;

    if (
        buyQuantity <= 0 ||
        getQuantity <= 0 ||
        rewardPercentage <= 0 ||
        rewardPercentage > 100 ||
        !promotion.rewardTarget
    ) {
        return [];
    }

    const triggerUnits =
        createUnits(
            promotion,
            lines,
        ).sort(
            (a, b) =>
                b.unitPrice -
                a.unitPrice,
        );

    const rewardUnits =
        lines
            .filter(
                (line) =>
                    line.kind === "sale" &&
                    matchesRewardTarget(
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
                            id:
                                `${line.id}::${index}`,

                            lineId:
                                line.id,

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
        Math.min(
            Math.floor(
                triggerUnits.length /
                buyQuantity,
            ),
            Math.floor(
                rewardUnits.length /
                getQuantity,
            ),
        );

    const applications:
        PromotionApplication[] =
        [];

    for (
        let groupIndex = 0;
        groupIndex <
        completeGroups;
        groupIndex += 1
    ) {
        const triggerStart =
            groupIndex *
            buyQuantity;

        const rewardStart =
            groupIndex *
            getQuantity;

        const consumedTriggerUnits =
            triggerUnits.slice(
                triggerStart,
                triggerStart +
                buyQuantity,
            );

        const consumedRewardUnits =
            rewardUnits.slice(
                rewardStart,
                rewardStart +
                getQuantity,
            );

        const consumedUnits =
            [
                ...consumedTriggerUnits,
                ...consumedRewardUnits,
            ];

        const allocations =
            groupAllocationsByLine(
                consumedRewardUnits.map(
                    (unit) => ({
                        lineId:
                            unit.lineId,

                        amount:
                            unit.unitPrice *
                            (
                                rewardPercentage /
                                100
                            ),
                    }),
                ),
            );

        const application =
            createApplication(
                `${promotion.id}::group-${groupIndex}`,
                promotion,
                consumedUnits,
                allocations,
            );

        if (application) {
            applications.push(
                application,
            );
        }
    }

    return applications;
}

function buildBasketDiscountApplications(
    promotion: Promotion,
    lines: CartLine[],
) {
    const minimumAmount =
        promotion.basketMinimumAmount ??
        0;

    if (minimumAmount <= 0) {
        return [];
    }

    const saleUnits =
        createUnits(
            {
                ...promotion,
                target: {
                    type: "category",
                    categoryIds:
                        Array.from(
                            new Set(
                                lines
                                    .filter(
                                        (line) =>
                                            line.kind === "sale",
                                    )
                                    .map(
                                        (line) =>
                                            line.product.category,
                                    ),
                            ),
                        ),
                },
            },
            lines,
        );

    const basketValue =
        roundMoney(
            saleUnits.reduce(
                (sum, unit) =>
                    sum +
                    unit.unitPrice,
                0,
            ),
        );

    if (
        basketValue <
        minimumAmount
    ) {
        return [];
    }

    let discount = 0;

    if (
        (promotion.discountPercentage ??
            0) > 0
    ) {
        discount =
            basketValue *
            (
                (
                    promotion.discountPercentage ??
                    0
                ) /
                100
            );
    } else {
        discount =
            promotion.discountAmount ??
            0;
    }

    discount =
        roundMoney(
            Math.min(
                basketValue,
                Math.max(
                    0,
                    discount,
                ),
            ),
        );

    if (discount <= 0) {
        return [];
    }

    const allocations =
        groupAllocationsByLine(
            saleUnits.map(
                (unit) => ({
                    lineId:
                        unit.lineId,

                    amount:
                        basketValue > 0
                            ? discount *
                            (
                                unit.unitPrice /
                                basketValue
                            )
                            : 0,
                }),
            ),
        );

    const application =
        createApplication(
            `${promotion.id}::basket`,
            promotion,
            saleUnits,
            allocations,
        );

    return application
        ? [application]
        : [];
}

function buildBasketTierDiscountApplications(
    promotion: Promotion,
    lines: CartLine[],
) {
    const tiers =
        [...(promotion.tiers ?? [])]
            .filter(
                (tier) =>
                    tier.minimumAmount >
                    0 &&
                    tier.value > 0,
            )
            .sort(
                (a, b) =>
                    a.minimumAmount -
                    b.minimumAmount,
            );

    if (tiers.length === 0) {
        return [];
    }

    const saleUnits =
        lines
            .filter(
                (line) =>
                    line.kind === "sale",
            )
            .flatMap(
                (line) =>
                    Array.from(
                        {
                            length:
                                line.quantity,
                        },
                        (_, index) => ({
                            id:
                                `${line.id}::${index}`,

                            lineId:
                                line.id,

                            unitPrice:
                                line.unitPrice,
                        }),
                    ),
            );

    const basketValue =
        roundMoney(
            saleUnits.reduce(
                (sum, unit) =>
                    sum +
                    unit.unitPrice,
                0,
            ),
        );

    const activeTier =
        tiers
            .filter(
                (tier) =>
                    basketValue >=
                    tier.minimumAmount,
            )
            .at(-1);

    if (!activeTier) {
        return [];
    }

    const discount =
        roundMoney(
            Math.min(
                basketValue,
                activeTier.discountType ===
                    "percentage"
                    ? basketValue *
                    (
                        activeTier.value /
                        100
                    )
                    : activeTier.value,
            ),
        );

    if (discount <= 0) {
        return [];
    }

    const allocations =
        groupAllocationsByLine(
            saleUnits.map(
                (unit) => ({
                    lineId:
                        unit.lineId,

                    amount:
                        basketValue > 0
                            ? discount *
                            (
                                unit.unitPrice /
                                basketValue
                            )
                            : 0,
                }),
            ),
        );

    const application =
        createApplication(
            `${promotion.id}::tier`,
            promotion,
            saleUnits,
            allocations,
        );

    return application
        ? [application]
        : [];
}

function buildMixAndMatchApplications(
    promotion: Promotion,
    lines: CartLine[],
) {
    const groups =
        buildMixAndMatchGroups(
            promotion,
            lines,
        );

    const applications:
        PromotionApplication[] =
        [];

    for (
        let groupIndex = 0;
        groupIndex <
        groups.length;
        groupIndex += 1
    ) {
        const group =
            groups[groupIndex];

        const units: Unit[] =
            group.units.map(
                (unit) => ({
                    id: unit.id,
                    lineId:
                        unit.lineId,
                    unitPrice:
                        unit.unitPrice,
                }),
            );

        const application =
            createApplication(
                `${promotion.id}::mix-${groupIndex}`,
                promotion,
                units,
                allocateProportionallyExact(
                    units,
                    group.discountAmount,
                ),
            );

        if (application) {
            applications.push(
                application,
            );
        }
    }

    return applications;
}

function buildFixedAmountDiscountApplications(
    promotion: Promotion,
    lines: CartLine[],
) {
    const amount =
        promotion.discountAmount ?? 0;

    if (amount <= 0) {
        return [];
    }

    return createUnits(
        promotion,
        lines,
    ).flatMap(
        (unit) => {
            const discount =
                roundMoney(
                    Math.min(
                        unit.unitPrice,
                        amount,
                    ),
                );

            const application =
                createApplication(
                    `${promotion.id}::${unit.id}`,
                    promotion,
                    [unit],
                    [
                        {
                            lineId:
                                unit.lineId,

                            amount:
                                discount,
                        },
                    ],
                );

            return application
                ? [application]
                : [];
        },
    );
}

function buildPromotionApplications(
    promotion: Promotion,
    lines: CartLine[],
): PromotionApplication[] {
    switch (
    promotion.type
    ) {
        case "buy_x_get_y":
            return buildBuyXGetYApplications(
                promotion,
                lines,
            );

        case "buy_a_get_b":
            return buildBuyAGetBApplications(
                promotion,
                lines,
            );

        case "bundle_price":
            return buildBundlePriceApplications(
                promotion,
                lines,
            );

        case "mix_and_match":
            return buildMixAndMatchApplications(
                promotion,
                lines,
            );

        case "quantity_discount":
            return buildQuantityDiscountApplications(
                promotion,
                lines,
            );

        case "category_discount":
            return buildCategoryDiscountApplications(
                promotion,
                lines,
            );

        case "fixed_amount_discount":
            return buildFixedAmountDiscountApplications(
                promotion,
                lines,
            );

        case "basket_discount":
            return buildBasketDiscountApplications(
                promotion,
                lines,
            );

        case "basket_tier_discount":
            return buildBasketTierDiscountApplications(
                promotion,
                lines,
            );
    }
}

function applicationsConflict(
    first: PromotionApplication,
    second: PromotionApplication,
) {
    /*
     * Same-promotion applications are generated from disjoint units.
     */
    if (
        first.promotion.id ===
        second.promotion.id
    ) {
        return false;
    }

    /*
     * Stacking is allowed on the SAME unit only when both promotions allow it.
     */
    if (
        first.promotion.allowStacking &&
        second.promotion.allowStacking
    ) {
        return false;
    }

    for (
        const unitId of
        first.unitIds
    ) {
        if (
            second.unitIds.has(
                unitId,
            )
        ) {
            return true;
        }
    }

    return false;
}

function buildConflictComponents(
    applications: PromotionApplication[],
) {
    const adjacency =
        applications.map(
            () =>
                new Set<number>(),
        );

    for (
        let first = 0;
        first <
        applications.length;
        first += 1
    ) {
        for (
            let second =
                first + 1;
            second <
            applications.length;
            second += 1
        ) {
            if (
                applicationsConflict(
                    applications[first],
                    applications[second],
                )
            ) {
                adjacency[first].add(
                    second,
                );

                adjacency[second].add(
                    first,
                );
            }
        }
    }

    const visited =
        new Set<number>();

    const components:
        number[][] =
        [];

    for (
        let index = 0;
        index <
        applications.length;
        index += 1
    ) {
        if (
            visited.has(index)
        ) {
            continue;
        }

        const stack = [index];

        const component:
            number[] = [];

        visited.add(index);

        while (
            stack.length > 0
        ) {
            const current =
                stack.pop();

            if (
                current === undefined
            ) {
                continue;
            }

            component.push(
                current,
            );

            for (
                const neighbor of
                adjacency[current]
            ) {
                if (
                    visited.has(
                        neighbor,
                    )
                ) {
                    continue;
                }

                visited.add(
                    neighbor,
                );

                stack.push(
                    neighbor,
                );
            }
        }

        components.push(
            component,
        );
    }

    return {
        adjacency,
        components,
    };
}

function chooseBestFromComponent(
    component: number[],
    adjacency: Set<number>[],
    applications: PromotionApplication[],
) {
    if (
        component.length === 1
    ) {
        return [
            applications[
            component[0]
            ],
        ];
    }

    let bestIndexes:
        number[] = [];

    let bestDiscount = -1;

    let bestPriority =
        Number.POSITIVE_INFINITY;

    function search(
        position: number,
        selected: number[],
        blocked: Set<number>,
        discount: number,
        priority: number,
    ) {
        if (
            position >=
            component.length
        ) {
            if (
                discount >
                bestDiscount +
                0.001
            ) {
                bestIndexes = [
                    ...selected,
                ];

                bestDiscount =
                    discount;

                bestPriority =
                    priority;

                return;
            }

            if (
                Math.abs(
                    discount -
                    bestDiscount,
                ) <
                0.001 &&
                priority <
                bestPriority
            ) {
                bestIndexes = [
                    ...selected,
                ];

                bestPriority =
                    priority;
            }

            return;
        }

        const index =
            component[position];

        /*
         * Option 1: skip.
         */
        search(
            position + 1,
            selected,
            blocked,
            discount,
            priority,
        );

        /*
         * Option 2: take if it does not conflict with anything already taken.
         */
        if (
            blocked.has(index)
        ) {
            return;
        }

        const nextBlocked =
            new Set(blocked);

        for (
            const conflict of
            adjacency[index]
        ) {
            nextBlocked.add(
                conflict,
            );
        }

        search(
            position + 1,
            [
                ...selected,
                index,
            ],
            nextBlocked,
            roundMoney(
                discount +
                applications[index]
                    .totalDiscount,
            ),
            priority +
            applications[index]
                .promotion.priority,
        );
    }

    search(
        0,
        [],
        new Set<number>(),
        0,
        0,
    );

    return bestIndexes.map(
        (index) =>
            applications[index],
    );
}

function selectBestApplications(
    applications: PromotionApplication[],
) {
    if (
        applications.length === 0
    ) {
        return [];
    }

    const {
        adjacency,
        components,
    } =
        buildConflictComponents(
            applications,
        );

    return components.flatMap(
        (component) =>
            chooseBestFromComponent(
                component,
                adjacency,
                applications,
            ),
    );
}

function applicationsToRules(
    applications: PromotionApplication[],
): PricingRule[] {
    const totals =
        new Map<
            string,
            {
                promotion: Promotion;
                lineId: string;
                amount: number;
                participantLineIds: Set<string>;
            }
        >();

    const participantsByPromotion =
        new Map<
            string,
            Set<string>
        >();

    for (
        const application of
        applications
    ) {
        const participantLineIds =
            participantsByPromotion.get(
                application.promotion.id,
            ) ??
            new Set<string>();

        for (
            const unitId of
            application.unitIds
        ) {
            const separatorIndex =
                unitId.lastIndexOf(
                    "::",
                );

            const lineId =
                separatorIndex >= 0
                    ? unitId.slice(
                        0,
                        separatorIndex,
                    )
                    : unitId;

            participantLineIds.add(
                lineId,
            );
        }

        participantsByPromotion.set(
            application.promotion.id,
            participantLineIds,
        );
    }

    for (
        const application of
        applications
    ) {
        for (
            const allocation of
            application.allocations
        ) {
            const key =
                `${application.promotion.id}::${allocation.lineId}`;

            const current =
                totals.get(key);

            totals.set(
                key,
                {
                    promotion:
                        application.promotion,

                    lineId:
                        allocation.lineId,

                    amount:
                        roundMoney(
                            (
                                current?.amount ??
                                0
                            ) +
                            allocation.amount,
                        ),

                    participantLineIds:
                        participantsByPromotion.get(
                            application.promotion.id,
                        ) ??
                        new Set<string>(),
                },
            );
        }
    }

    /*
     * A promotion may consume a line without allocating money to it
     * (for example the paid item in 1+1). Add a zero-value metadata rule
     * so PricingEngine can show participation without changing totals.
     */
    for (
        const [
            promotionId,
            participantLineIds,
        ] of
        participantsByPromotion.entries()
    ) {
        const promotion =
            applications.find(
                (application) =>
                    application.promotion.id ===
                    promotionId,
            )?.promotion;

        if (!promotion) {
            continue;
        }

        for (
            const lineId of
            participantLineIds
        ) {
            const key =
                `${promotionId}::${lineId}`;

            if (
                totals.has(key)
            ) {
                continue;
            }

            totals.set(
                key,
                {
                    promotion,
                    lineId,
                    amount: 0,
                    participantLineIds,
                },
            );
        }
    }

    return Array.from(
        totals.values(),
    ).map(
        ({
            promotion,
            lineId,
            amount,
            participantLineIds,
        }) => ({
            id:
                `promotion-${promotion.id}-${lineId}`,

            name:
                promotion.name,

            scope:
                "line",

            discountType:
                "fixed_amount",

            value:
                amount,

            saleLinesOnly:
                true,

            targetLineId:
                lineId,

            source:
                "promotion",

            promotionId:
                promotion.id,

            promotionParticipantLineIds:
                Array.from(
                    participantLineIds,
                ),
        }),
    );
}

export function evaluatePromotions(
    lines: CartLine[],
    promotions: Promotion[],
): PricingRule[] {
    const applications =
        promotions
            .filter(
                isPromotionActive,
            )
            .sort(
                (a, b) =>
                    a.priority -
                    b.priority,
            )
            .flatMap(
                (promotion) =>
                    buildPromotionApplications(
                        promotion,
                        lines,
                    ),
            );

    const selectedApplications =
        selectBestApplications(
            applications,
        );

    return applicationsToRules(
        selectedApplications,
    );
}