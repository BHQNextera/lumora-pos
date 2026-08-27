import {
    useMemo,
    useState,
} from "react";

import {
    createCashDeclaration,
    ilsCashDenominations,
} from "../../models/cash/CashDeclaration";

import type {
    CashDeclaration,
} from "../../models/cash/CashDeclaration";

import {
    formatMoney,
} from "../../utils/MoneyFormatter";

type CashDeclarationTableProps = {
    onChange: (
        declaration:
            CashDeclaration,
    ) => void;
};

function CashDeclarationTable({
    onChange,
}: CashDeclarationTableProps) {
    const [
        quantities,
        setQuantities,
    ] =
        useState<
            Record<string, number>
        >({});

    const declaration =
        useMemo(
            () =>
                createCashDeclaration(
                    quantities,
                ),
            [
                quantities,
            ],
        );

    const updateQuantity = (
        denomination: number,
        value: string,
    ) => {
        const parsed =
            Number(
                value,
            );

        const quantity =
            Number.isFinite(
                parsed,
            )
                ? Math.max(
                      0,
                      Math.floor(
                          parsed,
                      ),
                  )
                : 0;

        const next = {
            ...quantities,

            [String(
                denomination,
            )]:
                quantity,
        };

        setQuantities(
            next,
        );

        onChange(
            createCashDeclaration(
                next,
            ),
        );
    };

    return (
        <div className="close-register-shift-dialog__cash-table-wrap">
            <table className="close-register-shift-dialog__cash-table">
                <thead>
                    <tr>
                        <th>
                            סוג
                        </th>

                        <th>
                            עריך
                        </th>

                        <th>
                            כמות
                        </th>

                        <th>
                            סה״כ
                        </th>
                    </tr>
                </thead>

                <tbody>
                    {ilsCashDenominations.map(
                        (
                            denomination,
                        ) => {
                            const key =
                                String(
                                    denomination.value,
                                );

                            const quantity =
                                quantities[
                                    key
                                ] ?? 0;

                            const amount =
                                denomination.value *
                                quantity;

                            return (
                                <tr
                                    key={
                                        key
                                    }
                                >
                                    <td>
                                        {
                                            denomination.type ===
                                            "banknote"
                                                ? "שטר"
                                                : "מטבע"
                                        }
                                    </td>

                                    <td className="close-register-shift-dialog__money-cell">
                                        <bdi>
                                            {formatMoney(
                                                denomination.value,
                                            )}
                                        </bdi>
                                    </td>

                                    <td>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            inputMode="numeric"
                                            value={
                                                quantity
                                            }
                                            aria-label={`כמות עבור ${formatMoney(
                                                denomination.value,
                                            )}`}
                                            onFocus={(
                                                event,
                                            ) =>
                                                event.currentTarget.select()
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                updateQuantity(
                                                    denomination.value,
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </td>

                                    <td className="close-register-shift-dialog__money-cell close-register-shift-dialog__money-cell--total">
                                        <bdi>
                                            {formatMoney(
                                                amount,
                                            )}
                                        </bdi>
                                    </td>
                                </tr>
                            );
                        },
                    )}
                </tbody>

                <tfoot>
                    <tr>
                        <td
                            colSpan={
                                3
                            }
                        >
                            <strong>
                                סה״כ הצהרה
                            </strong>
                        </td>

                        <td className="close-register-shift-dialog__money-cell close-register-shift-dialog__money-cell--grand-total">
                            <strong>
                                <bdi>
                                    {formatMoney(
                                        declaration.total,
                                    )}
                                </bdi>
                            </strong>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

export default CashDeclarationTable;
