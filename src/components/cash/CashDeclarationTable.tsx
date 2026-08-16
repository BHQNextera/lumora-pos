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
        <div
            style={{
                marginTop:
                    "12px",
            }}
        >
            <table
                style={{
                    width:
                        "100%",
                    borderCollapse:
                        "collapse",
                }}
            >
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

                                    <td>
                                        ₪
                                        {
                                            denomination.value
                                        }
                                    </td>

                                    <td>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            value={
                                                quantity
                                            }
                                            onChange={(
                                                event,
                                            ) =>
                                                updateQuantity(
                                                    denomination.value,
                                                    event.target.value,
                                                )
                                            }
                                            style={{
                                                width:
                                                    "80px",
                                            }}
                                        />
                                    </td>

                                    <td>
                                        ₪
                                        {
                                            amount.toFixed(
                                                2,
                                            )
                                        }
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

                        <td>
                            <strong>
                                ₪
                                {
                                    declaration.total.toFixed(
                                        2,
                                    )
                                }
                            </strong>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

export default CashDeclarationTable;