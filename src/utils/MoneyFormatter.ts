/* LUMORA MONEY FORMATTER V1 */

const moneyNumberFormatter =
    new Intl.NumberFormat(
        "en-US",
        {
            useGrouping: true,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
    );

export function formatMoney(
    value: number,
): string {
    const normalized =
        Number.isFinite(
            value,
        ) &&
        !Object.is(
            value,
            -0,
        )
            ? value
            : 0;

    const sign =
        normalized < 0
            ? "-"
            : "";

    return `\u200e${sign}₪${moneyNumberFormatter.format(
        Math.abs(
            normalized,
        ),
    )}`;
}
