import {
    useMemo,
    useState,
} from "react";

import { products } from "../../data/products";
import type { CartLine } from "../../models/sale/CartLine";
import type { Sale } from "../../models/sale/Sale";
import {
    getReturnsForSale,
} from "../../models/transaction/ReturnRepository";

import "./returns-page.css";

type ReturnsPageProps = {
    sale: Sale;
    onBack: () => void;
    onContinue: (
        lines: CartLine[],
    ) => void;
};

function ReturnsPage({
    sale,
    onBack,
    onContinue,
}: ReturnsPageProps) {
    const [
        quantities,
        setQuantities,
    ] =
        useState<
            Record<string, number>
        >({});

    const priorReturns =
        getReturnsForSale(
            sale.id,
        );

    const returnedQuantityByLine =
        useMemo(() => {
            const result: Record<
                string,
                number
            > = {};

            for (
                const document of priorReturns
            ) {
                for (
                    const line of document.lines
                ) {
                    result[
                        line.saleLineId
                    ] =
                        (result[
                            line.saleLineId
                        ] ?? 0) +
                        line.quantity;
                }
            }

            return result;
        }, [priorReturns]);

    const selectAll = () => {
        const next: Record<
            string,
            number
        > = {};

        for (
            const line of sale.lines
        ) {
            if (
                line.kind ===
                "return"
            ) {
                continue;
            }

            const alreadyReturned =
                returnedQuantityByLine[
                line.id
                ] ?? 0;

            next[line.id] =
                Math.max(
                    0,
                    line.quantity -
                    alreadyReturned,
                );
        }

        setQuantities(next);
    };

    const continueToCart =
        () => {
            const returnLines: CartLine[] =
                sale.lines
                    .filter(
                        (line) =>
                            line.kind !==
                            "return" &&
                            (quantities[
                                line.id
                            ] ?? 0) >
                            0,
                    )
                    .map((line) => {
                        const quantity =
                            quantities[
                            line.id
                            ] ?? 0;

                        const product =
                            products.find(
                                (item) =>
                                    item.id ===
                                    line.productId,
                            );

                        if (!product) {
                            throw new Error(
                                `Product ${line.productId} not found`,
                            );
                        }

                        const actualPaidUnitPrice =
                            line.quantity > 0
                                ? Math.abs(
                                    line.netAmount,
                                ) /
                                line.quantity
                                : 0;

                        return {
                            id:
                                crypto.randomUUID(),

                            kind: "return",
                            source: "catalog",

                            product,

                            quantity,

                            unitPrice:
                                actualPaidUnitPrice,

                            originalUnitPrice:
                                line.unitPrice,

                            lineDiscountAmount:
                                0,

                            allocatedSaleDiscountAmount:
                                0,

                            returnSource:
                                "linked_document",

                            returnReason:
                                "החזרה לפי מסמך מקור",

                            origin: {
                                saleId:
                                    sale.id,

                                saleNumber:
                                    sale.number,

                                saleLineId:
                                    line.id,
                            },
                        };
                    });

            if (
                returnLines.length ===
                0
            ) {
                return;
            }

            onContinue(
                returnLines,
            );
        };

    const selectedCount =
        Object.values(
            quantities,
        ).reduce(
            (
                sum,
                quantity,
            ) =>
                sum + quantity,
            0,
        );

    return (
        <section className="returns-page">
            <header className="returns-page__header">
                <button
                    type="button"
                    onClick={onBack}
                >
                    חזרה לעסקה
                </button>

                <div>
                    <p>
                        בחירת פריטים להחזרה
                    </p>

                    <h1>
                        {sale.number}
                    </h1>
                </div>

                <button
                    type="button"
                    onClick={selectAll}
                >
                    החזר הכול
                </button>
            </header>

            <div className="returns-page__lines">
                {sale.lines
                    .filter(
                        (line) =>
                            line.kind !==
                            "return",
                    )
                    .map((line) => {
                        const alreadyReturned =
                            returnedQuantityByLine[
                            line.id
                            ] ?? 0;

                        const available =
                            Math.max(
                                0,
                                line.quantity -
                                alreadyReturned,
                            );

                        const quantity =
                            quantities[
                            line.id
                            ] ?? 0;

                        const unitRefund =
                            line.quantity > 0
                                ? Math.abs(
                                    line.netAmount,
                                ) /
                                line.quantity
                                : 0;

                        return (
                            <article
                                className="return-line"
                                key={line.id}
                            >
                                <div>
                                    <strong>
                                        {
                                            line.productName
                                        }
                                    </strong>

                                    <span>
                                        נרכשו{" "}
                                        {line.quantity}
                                        {" · "}
                                        כבר זוכו{" "}
                                        {
                                            alreadyReturned
                                        }
                                        {" · "}
                                        זמינים{" "}
                                        {available}
                                    </span>

                                    <span>
                                        ערך החזר
                                        ליחידה: ₪
                                        {unitRefund.toFixed(
                                            2,
                                        )}
                                    </span>
                                </div>

                                <div className="return-line__actions">
                                    <button
                                        type="button"
                                        disabled={
                                            quantity <= 0
                                        }
                                        onClick={() =>
                                            setQuantities(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,

                                                    [line.id]:
                                                        Math.max(
                                                            0,
                                                            quantity -
                                                            1,
                                                        ),
                                                }),
                                            )
                                        }
                                    >
                                        −
                                    </button>

                                    <strong>
                                        {quantity}
                                    </strong>

                                    <button
                                        type="button"
                                        disabled={
                                            quantity >=
                                            available
                                        }
                                        onClick={() =>
                                            setQuantities(
                                                (
                                                    current,
                                                ) => ({
                                                    ...current,

                                                    [line.id]:
                                                        Math.min(
                                                            available,
                                                            quantity +
                                                            1,
                                                        ),
                                                }),
                                            )
                                        }
                                    >
                                        +
                                    </button>
                                </div>
                            </article>
                        );
                    })}
            </div>

            <footer className="returns-page__footer">
                <div>
                    <span>
                        נבחרו להחזרה
                    </span>

                    <strong>
                        {selectedCount}
                    </strong>
                </div>

                <button
                    type="button"
                    disabled={
                        selectedCount === 0
                    }
                    onClick={
                        continueToCart
                    }
                >
                    המשך לעגלה
                </button>
            </footer>
        </section>
    );
}

export default ReturnsPage;