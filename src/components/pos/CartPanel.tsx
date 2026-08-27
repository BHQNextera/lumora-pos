import {
    useEffect,
    useRef,
    useState,
} from "react";

import { posCapabilities } from "../../config/posCapabilities";
import type {
    PricedCartLine,
} from "../../models/pricing/PricingEngine";
import type {
    Coupon,
} from "../../models/coupon/Coupon";
import {
    formatMoney,
} from "../../utils/MoneyFormatter";
import {
    assessQuantityText,
    isBarcodeLikeQuantityText,
} from "../../utils/quantitySafety";
import {
    useQuantityScannerGuard,
} from "../../utils/useQuantityScannerGuard";

import "./cart-panel.css";

/* LUMORA QUANTITY SAFETY V1.2 */

type CartSellerOption = {
    id: string;
    name: string;
};

type SellerAssignmentInput = {
    employeeId: string;
    employeeName: string;
};
type CartPanelProps = {
    lines: PricedCartLine[];

    appliedCoupon: Coupon | null;
    couponDiscountAmount: number;
    totalAfterCoupon: number;

    onApplyCoupon: (
        code: string,
    ) => {
        success: boolean;
        reason?: string;
    };

    onRemoveCoupon: () => void;

    couponDialogRequestId: number;

    selectedLineId?: string;

    onClear: () => void;
    onIncrease: (lineId: string) => void;
    onDecrease: (lineId: string) => void;
    onSetQuantity: (
        lineId: string,
        quantity: number,
    ) => void;
    onSelectLine: (lineId: string) => void;

    onEditDescription: (
        lineId: string,
        description: string | undefined,
    ) => void;

    activeSellers: CartSellerOption[];

    onChangeSellerForLine: (
        lineId: string,
        seller: SellerAssignmentInput,
    ) => void;

    onChangeSellerFromLineToEnd: (
        lineId: string,
        seller: SellerAssignmentInput,
    ) => void;

    onCheckout: (total: number) => void;
};

function CartPanel({
    lines,
    appliedCoupon,
    couponDiscountAmount,
    totalAfterCoupon,
    onApplyCoupon,
    onRemoveCoupon,
    couponDialogRequestId,
    selectedLineId,
    onClear,
    onIncrease,
    onDecrease,
    onSetQuantity,
    onSelectLine,
    onEditDescription,
    activeSellers,
    onChangeSellerForLine,
    onChangeSellerFromLineToEnd,
    onCheckout,
}: CartPanelProps) {
    const listRef =
        useRef<HTMLDivElement | null>(null);

    const [editingLine, setEditingLine] =
        useState<PricedCartLine | null>(null);

    const [descriptionValue, setDescriptionValue] =
        useState("");

    const [
        sellerEditorLine,
        setSellerEditorLine,
    ] =
        useState<PricedCartLine | null>(null);

    const [
        sellerEmployeeId,
        setSellerEmployeeId,
    ] =
        useState("");

    const [
        couponCode,
        setCouponCode,
    ] =
        useState("");

    const [
        couponError,
        setCouponError,
    ] =
        useState("");

    const [
        couponDialogOpen,
        setCouponDialogOpen,
    ] = useState(false);

    const [
        quantityDrafts,
        setQuantityDrafts,
    ] = useState<Record<string, string>>({});

    const [
        quantitySafetyNotice,
        setQuantitySafetyNotice,
    ] =
        useState<string | null>(null);

    const [
        pendingQuantityApproval,
        setPendingQuantityApproval,
    ] =
        useState<{
            lineId: string;
            quantity: number;
            message: string;
        } | null>(null);

    const quantityScannerGuard =
        useQuantityScannerGuard();

    const clearQuantityDraft = (
        lineId: string,
    ) => {
        setQuantityDrafts(
            (current) => {
                const next = {
                    ...current,
                };
                delete next[lineId];
                return next;
            },
        );
    };

    const rejectBarcodeQuantity = (
        line: PricedCartLine,
    ) => {
        clearQuantityDraft(
            line.id,
        );
        setPendingQuantityApproval(
            null,
        );
        setQuantitySafetyNotice(
            "זוהתה סריקת ברקוד בשדה הכמות. הכמות לא שונתה.",
        );
    };

    const commitQuantity = (
        line: PricedCartLine,
    ) => {
        const raw =
            quantityDrafts[line.id] ??
            String(line.quantity);

        if (
            raw !== "" &&
            isBarcodeLikeQuantityText(
                raw,
            )
        ) {
            rejectBarcodeQuantity(
                line,
            );
            return;
        }

        const assessment =
            assessQuantityText({
                raw,
                context: "cart",
                min: 1,
                current: line.quantity,
            });

        if (!assessment.ok) {
            setPendingQuantityApproval(
                null,
            );
            setQuantitySafetyNotice(
                assessment.message ??
                    "הכמות לא עודכנה.",
            );
            clearQuantityDraft(
                line.id,
            );
            return;
        }

        const nextQuantity =
            assessment.quantity ??
            line.quantity;

        if (
            assessment.requiresConfirmation
        ) {
            setPendingQuantityApproval({
                lineId: line.id,
                quantity:
                    nextQuantity,
                message:
                    assessment.message ??
                    "זוהתה כמות חריגה.",
            });
            setQuantitySafetyNotice(
                assessment.message ??
                    "זוהתה כמות חריגה.",
            );
            return;
        }

        onSetQuantity(
            line.id,
            nextQuantity,
        );

        clearQuantityDraft(
            line.id,
        );
        setPendingQuantityApproval(
            null,
        );
        setQuantitySafetyNotice(
            null,
        );
    };

    const totalQuantity = lines.reduce(
        (sum, line) => sum + line.quantity,
        0,
    );
    const totalDiscountAmount =
        lines.reduce(
            (sum, line) =>
                sum +
                line.calculatedLineDiscountAmount +
                line.calculatedTransactionDiscountAmount,
            0,
        ) + couponDiscountAmount;

    const totalBeforeDiscounts =
        totalAfterCoupon + totalDiscountAmount;

    useEffect(() => {
        if (
            !listRef.current ||
            lines.length === 0
        ) {
            return;
        }

        listRef.current.scrollTo({
            top: listRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [lines.length]);

    useEffect(() => {
        if (
            couponDialogRequestId <= 0 ||
            appliedCoupon
        ) {
            return;
        }

        setCouponError("");
        setCouponDialogOpen(true);
    }, [
        couponDialogRequestId,
        appliedCoupon,
    ]);

    const openDescriptionEditor = (
        line: PricedCartLine,
    ) => {
        if (
            !posCapabilities.allowDescriptionOverride ||
            line.kind !== "sale"
        ) {
            return;
        }

        setEditingLine(line);

        setDescriptionValue(
            line.descriptionOverride ?? "",
        );
    };

    const closeDescriptionEditor = () => {
        setEditingLine(null);
        setDescriptionValue("");
    };

    const saveDescription = () => {
        if (!editingLine) {
            return;
        }

        const value =
            descriptionValue.trim();

        onEditDescription(
            editingLine.id,
            value || undefined,
        );

        closeDescriptionEditor();
    };
    const openSellerEditor = (
        line: PricedCartLine,
    ) => {
        const replacementSeller =
            activeSellers.find(
                (employee) =>
                    employee.id !==
                    line.seller?.employeeId,
            );

        setSellerEditorLine(line);
        setSellerEmployeeId(
            replacementSeller?.id ?? "",
        );
    };

    const closeSellerEditor = () => {
        setSellerEditorLine(null);
        setSellerEmployeeId("");
    };

    const applySellerChange = (
        scope: "line" | "from-line",
    ) => {
        if (!sellerEditorLine) {
            return;
        }

        const seller =
            activeSellers.find(
                (employee) =>
                    employee.id ===
                    sellerEmployeeId,
            );

        if (!seller) {
            return;
        }

        const assignment = {
            employeeId: seller.id,
            employeeName: seller.name,
        };

        if (scope === "line") {
            onChangeSellerForLine(
                sellerEditorLine.id,
                assignment,
            );
        } else {
            onChangeSellerFromLineToEnd(
                sellerEditorLine.id,
                assignment,
            );
        }

        closeSellerEditor();
    };

    return (
        <>
            <aside
                className="lumora-cart"
                aria-label="עגלה"
            >
                <div className="lumora-cart__header">

                    <div>
                        <h2>עגלה</h2>

                        <span>
                            {totalQuantity === 0
                                ? "עסקה חדשה"
                                : `${totalQuantity} יחידות`}
                        </span>
                    </div>

                    <button
                        type="button"
                        className="lumora-cart__clear"
                        disabled={lines.length === 0}
                        onClick={onClear}
                        aria-label="נקה עגלה"
                        title="נקה עגלה"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            aria-hidden="true"
                            focusable="false"
                        >
                            <path
                                d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>
                </div>

                {lines.length === 0 ? (
                    <div className="lumora-cart__empty">
                        <div className="lumora-cart__empty-icon">
                            ▦
                        </div>

                        <strong>
                            העגלה עדיין ריקה
                        </strong>

                        <span>
                            סרוק ברקוד או בחר מוצר מהקטלוג
                        </span>
                    </div>
                ) : (
                    <div
                        ref={listRef}
                        className="lumora-cart__lines"
                    >
                        {lines.map((line) => {
                            const lineDiscount =
                                line.calculatedLineDiscountAmount;

                            const transactionDiscount =
                                line.calculatedTransactionDiscountAmount;

                            const totalLineDiscount =
                                lineDiscount +
                                transactionDiscount;

                            const priceOverridden =
                                line.originalUnitPrice !== undefined &&
                                Math.abs(
                                    line.originalUnitPrice -
                                    line.unitPrice,
                                ) > 0.001;

                            const selected =
                                selectedLineId === line.id;

                            return (
                                <article
                                    key={line.id}
                                    onClick={() =>
                                        onSelectLine(line.id)
                                    }
                                    className={`lumora-cart-line ${line.kind === "return"
                                        ? "lumora-cart-line--return"
                                        : ""
                                        } ${selected
                                            ? "lumora-cart-line--selected"
                                            : ""
                                        }`}
                                >
                                    <img
                                        className="lumora-cart-line__image"
                                        src={line.product.imageUrl}
                                        alt=""
                                    />

                                    <div className="lumora-cart-line__main">
                                        <strong
                                            title={
                                                line.kind === "sale" &&
                                                    posCapabilities.allowDescriptionOverride
                                                    ? "לחיצה כפולה לשינוי תיאור בעסקה זו"
                                                    : undefined
                                            }
                                            onDoubleClick={(event) => {
                                                event.stopPropagation();

                                                openDescriptionEditor(
                                                    line,
                                                );
                                            }}
                                            style={{
                                                cursor:
                                                    line.kind === "sale" &&
                                                        posCapabilities.allowDescriptionOverride
                                                        ? "text"
                                                        : "default",
                                            }}
                                        >
                                            {line.descriptionOverride ??
                                                line.product.name}
                                        </strong>

                                        {line.seller && (
                                            <button
                                                type="button"
                                                className="lumora-cart-line__seller"
                                                title="שינוי מוכרן לשורה"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    onSelectLine(line.id);
                                                    openSellerEditor(line);
                                                }}
                                            >
                                                מוכרן:{" "}
                                                {
                                                    line.seller
                                                        .employeeName
                                                }
                                            </button>
                                        )}

                                        {line.variant && (
                                            <span
                                                style={{
                                                    display:
                                                        "block",
                                                    marginTop:
                                                        "3px",
                                                    fontSize:
                                                        "11px",
                                                    fontWeight:
                                                        700,
                                                }}
                                            >
                                                {
                                                    line.variant
                                                        .color
                                                        .name
                                                }
                                                {" / "}
                                                {
                                                    line.variant
                                                        .size
                                                        .name
                                                }
                                                {" · "}
                                                <span
                                                    dir="ltr"
                                                >
                                                    {
                                                        line.product
                                                            .sku
                                                    }
                                                </span>
                                            </span>
                                        )}

                                        {line.descriptionOverride && (
                                            <span
                                                style={{
                                                    color: "#8a8f97",
                                                    fontSize: "8px",
                                                    marginTop: "2px",
                                                }}
                                            >
                                                מוצר מקור:{" "}
                                                {line.product.name}
                                            </span>
                                        )}

                                        <span className="lumora-cart-line__unit-price">
                                            {line.kind === "return"
                                                ? "החזרה · "
                                                : ""}

                                            {line.quantity} ×{" "}
                                            <bdi className="lumora-money-value">
                                                {formatMoney(line.unitPrice)}
                                            </bdi>
                                        </span>

                                        {priceOverridden && (
                                            <span
                                                style={{
                                                    color: "#777c84",
                                                    fontSize: "8px",
                                                    marginTop: "2px",
                                                }}
                                            >
                                                מחיר מקור:{" "}
                                                <bdi className="lumora-money-value">
                                                    {formatMoney(
                                                        line.originalUnitPrice ??
                                                            line.unitPrice,
                                                    )}
                                                </bdi>
                                            </span>
                                        )}

                                        {line.origin && (
                                            <span className="lumora-cart-line__origin">
                                                מקור:{" "}
                                                {line.origin.saleNumber}
                                            </span>
                                        )}

                                        {line.appliedPromotions.map(
                                            (promotion) => (
                                                <div
                                                    key={promotion.id}
                                                    className="lumora-cart-line__discount"
                                                >
                                                    <span>
                                                        מבצע:{" "}
                                                        {promotion.name}
                                                    </span>

                                                    {promotion.discountAmount >
                                                        0 && (
                                                            <strong className="lumora-money-value">
                                                                {formatMoney(
                                                                    -promotion.discountAmount,
                                                                )}
                                                            </strong>
                                                        )}
                                                </div>
                                            ),
                                        )}

                                        {totalLineDiscount > 0 &&
                                            line.appliedPromotions.length ===
                                            0 && (
                                                <div className="lumora-cart-line__discount">
                                                    <span>
                                                        הנחה
                                                    </span>

                                                    <strong className="lumora-money-value">
                                                        {formatMoney(
                                                            -totalLineDiscount,
                                                        )}
                                                    </strong>
                                                </div>
                                            )}

                                        {transactionDiscount > 0 && (
                                            <div className="lumora-cart-line__discount">
                                                <span>
                                                    הנחת עסקה
                                                </span>

                                                <strong className="lumora-money-value">
                                                    {formatMoney(
                                                        -transactionDiscount,
                                                    )}
                                                </strong>
                                            </div>
                                        )}
                                    </div>

                                    <div className="lumora-cart-line__controls">
                                        <div className="lumora-cart-line__quantity">
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();

                                                    onDecrease(
                                                        line.id,
                                                    );
                                                }}
                                            >
                                                −
                                            </button>

                                            <input
                                                className="lumora-cart-line__quantity-input"
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                value={
                                                    quantityDrafts[line.id] ??
                                                    String(line.quantity)
                                                }
                                                aria-label="כמות"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    event.currentTarget.select();
                                                }}
                                                onDoubleClick={(event) =>
                                                    event.stopPropagation()
                                                }
                                                onChange={(event) => {
                                                    const raw =
                                                        event.target.value
                                                            .replaceAll(",", "")
                                                            .trim();

                                                    if (
                                                        raw !== "" &&
                                                        isBarcodeLikeQuantityText(
                                                            raw,
                                                        )
                                                    ) {
                                                        rejectBarcodeQuantity(
                                                            line,
                                                        );
                                                        quantityScannerGuard.reset();
                                                        return;
                                                    }

                                                    if (
                                                        raw !== "" &&
                                                        !/^\d+$/.test(raw)
                                                    ) {
                                                        return;
                                                    }

                                                    setPendingQuantityApproval(
                                                        null,
                                                    );
                                                    setQuantitySafetyNotice(
                                                        null,
                                                    );
                                                    setQuantityDrafts(
                                                        (current) => ({
                                                            ...current,
                                                            [line.id]:
                                                                raw,
                                                        }),
                                                    );
                                                }}
                                                onBlur={() =>
                                                    commitQuantity(
                                                        line,
                                                    )
                                                }
                                                onKeyDown={(event) => {
                                                    event.stopPropagation();

                                                    const blocked =
                                                        quantityScannerGuard.handleKeyDown({
                                                            fieldKey:
                                                                line.id,
                                                            key:
                                                                event.key,
                                                            onDetected:
                                                                () =>
                                                                    rejectBarcodeQuantity(
                                                                        line,
                                                                    ),
                                                        });

                                                    if (blocked) {
                                                        event.preventDefault();
                                                        return;
                                                    }

                                                    if (
                                                        event.key ===
                                                        "Enter"
                                                    ) {
                                                        event.currentTarget.blur();
                                                    }

                                                    if (
                                                        event.key ===
                                                        "Escape"
                                                    ) {
                                                        clearQuantityDraft(
                                                            line.id,
                                                        );
                                                        setPendingQuantityApproval(
                                                            null,
                                                        );
                                                        setQuantitySafetyNotice(
                                                            null,
                                                        );
                                                        event.currentTarget.blur();
                                                    }
                                                }}
                                            />

                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();

                                                    onIncrease(
                                                        line.id,
                                                    );
                                                }}
                                            >
                                                +
                                            </button>
                                        </div>

                                        <strong
                                            className={`lumora-cart-line__total lumora-money-value ${line.calculatedNetAmount < 0
                                                ? "lumora-cart-line__total--return"
                                                : ""
                                                }`}
                                        >
                                            {formatMoney(
                                                line.calculatedNetAmount,
                                            )}
                                        </strong>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}

                {quantitySafetyNotice && (
                    <div
                        className="lumora-cart__quantity-notice"
                        role="status"
                        aria-live="polite"
                    >
                        <span>
                            {quantitySafetyNotice}
                        </span>

                        {pendingQuantityApproval && (
                            <div className="lumora-cart__quantity-notice-actions">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onSetQuantity(
                                            pendingQuantityApproval.lineId,
                                            pendingQuantityApproval.quantity,
                                        );
                                        clearQuantityDraft(
                                            pendingQuantityApproval.lineId,
                                        );
                                        setPendingQuantityApproval(
                                            null,
                                        );
                                        setQuantitySafetyNotice(
                                            null,
                                        );
                                    }}
                                >
                                    אישור
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        clearQuantityDraft(
                                            pendingQuantityApproval.lineId,
                                        );
                                        setPendingQuantityApproval(
                                            null,
                                        );
                                        setQuantitySafetyNotice(
                                            null,
                                        );
                                    }}
                                >
                                    ביטול
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {appliedCoupon && (
                    <div className="lumora-cart__coupon-compact">
                        <div className="lumora-cart__coupon-active">
                            <span>
                                קופון{" "}
                                <strong>
                                    {appliedCoupon.code}
                                </strong>
                            </span>

                            {couponDiscountAmount > 0 && (
                                <strong className="lumora-money-value">
                                    {formatMoney(
                                        -couponDiscountAmount,
                                    )}
                                </strong>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    onRemoveCoupon();
                                    setCouponCode("");
                                    setCouponError("");
                                }}
                            >
                                הסר
                            </button>
                        </div>
                    </div>
                )}

                {couponDialogOpen && (
                    <div
                        className="lumora-cart__coupon-overlay"
                        role="presentation"
                        onMouseDown={() =>
                            setCouponDialogOpen(
                                false,
                            )
                        }
                    >
                        <section
                            className="lumora-cart__coupon-dialog"
                            role="dialog"
                            aria-modal="true"
                            aria-label="הפעלת קופון"
                            onMouseDown={(
                                event,
                            ) =>
                                event.stopPropagation()
                            }
                        >
                            <div className="lumora-cart__coupon-dialog-header">
                                <div>
                                    <strong>
                                        הפעלת קופון
                                    </strong>

                                    <span>
                                        סרוק או הקלד קוד
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setCouponDialogOpen(
                                            false,
                                        )
                                    }
                                >
                                    ×
                                </button>
                            </div>

                            <input
                                autoFocus
                                type="text"
                                value={couponCode}
                                placeholder="סרוק או הקלד קוד קופון"
                                onChange={(
                                    event,
                                ) => {
                                    setCouponCode(
                                        event.target.value,
                                    );

                                    setCouponError(
                                        "",
                                    );
                                }}
                                onKeyDown={(
                                    event,
                                ) => {
                                    if (
                                        event.key !==
                                        "Enter"
                                    ) {
                                        return;
                                    }

                                    const result =
                                        onApplyCoupon(
                                            couponCode,
                                        );

                                    if (
                                        !result.success
                                    ) {
                                        setCouponError(
                                            result.reason ??
                                                "קופון לא תקף",
                                        );

                                        return;
                                    }

                                    setCouponError(
                                        "",
                                    );

                                    setCouponDialogOpen(
                                        false,
                                    );
                                }}
                            />

                            {couponError && (
                                <div className="lumora-cart__coupon-error">
                                    {couponError}
                                </div>
                            )}

                            <div className="lumora-cart__coupon-dialog-actions">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCouponDialogOpen(
                                            false,
                                        )
                                    }
                                >
                                    ביטול
                                </button>

                                <button
                                    type="button"
                                    disabled={
                                        !couponCode.trim()
                                    }
                                    onClick={() => {
                                        const result =
                                            onApplyCoupon(
                                                couponCode,
                                            );

                                        if (
                                            !result.success
                                        ) {
                                            setCouponError(
                                                result.reason ??
                                                    "קופון לא תקף",
                                            );

                                            return;
                                        }

                                        setCouponError(
                                            "",
                                        );

                                        setCouponDialogOpen(
                                            false,
                                        );
                                    }}
                                >
                                    הפעל
                                </button>
                            </div>
                        </section>
                    </div>
                )}



{lines.length > 0 && (
                    <div className="lumora-cart__summary">
                        <div>
                            <span>סה״כ לפני הנחות</span>

                            <strong className="lumora-money-value">
                                {formatMoney(totalBeforeDiscounts)}
                            </strong>
                        </div>

                        <div className="lumora-cart__summary-discount">
                            <span>הנחה</span>

                            <strong className="lumora-money-value">
                                {formatMoney(
                                    -Math.abs(totalDiscountAmount),
                                )}
                            </strong>
                        </div>

                        <div className="lumora-cart__total">
                            <span>סה״כ לתשלום</span>

                            <strong className="lumora-money-value">
                                {formatMoney(totalAfterCoupon)}
                            </strong>
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    className="lumora-cart__checkout"
                    disabled={lines.length === 0}
                    onClick={() =>
                        onCheckout(
                            totalAfterCoupon,
                        )
                    }
                >
                    <span className="lumora-cart__checkout-label">
                        <svg
                            viewBox="0 0 24 24"
                            width="17"
                            height="17"
                            aria-hidden="true"
                            focusable="false"
                        >
                            <rect
                                x="3"
                                y="5"
                                width="18"
                                height="14"
                                rx="2.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                            />
                            <path
                                d="M3 9h18M7 15h4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                            />
                        </svg>

                        <span>
                            {totalAfterCoupon < 0
                                ? "להחזר"
                                : totalAfterCoupon === 0
                                    ? "סיום עסקה"
                                    : "לתשלום"}
                        </span>
                    </span>

                    {lines.length > 0 && (
                        <strong className="lumora-cart__checkout-amount lumora-money-value">
                            {formatMoney(totalAfterCoupon)}
                        </strong>
                    )}
</button>
            </aside>

            {sellerEditorLine && (
                <div
                    className="lumora-cart__seller-overlay"
                    role="presentation"
                    onMouseDown={closeSellerEditor}
                >
                    <section
                        className="lumora-cart__seller-dialog"
                        role="dialog"
                        aria-modal="true"
                        aria-label="שינוי מוכרן"
                        onMouseDown={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <div className="lumora-cart__seller-dialog-header">
                            <div>
                                <strong>
                                    שינוי מוכרן
                                </strong>

                                <span>
                                    {sellerEditorLine.descriptionOverride ??
                                        sellerEditorLine.product.name}
                                </span>

                                <small>
                                    מוכרן נוכחי:{" "}
                                    {sellerEditorLine.seller?.employeeName ??
                                        "לא הוגדר"}
                                </small>
                            </div>

                            <button
                                type="button"
                                aria-label="סגור"
                                onClick={closeSellerEditor}
                            >
                                ×
                            </button>
                        </div>

                        <label className="lumora-cart__seller-field">
                            <span>
                                מוכרן חדש
                            </span>

                            <select
                                autoFocus
                                value={sellerEmployeeId}
                                onChange={(event) =>
                                    setSellerEmployeeId(
                                        event.target.value,
                                    )
                                }
                            >
                                {activeSellers
                                    .filter(
                                        (employee) =>
                                            employee.id !==
                                            sellerEditorLine.seller
                                                ?.employeeId,
                                    )
                                    .map(
                                        (employee) => (
                                            <option
                                                key={employee.id}
                                                value={employee.id}
                                            >
                                                {employee.name}
                                            </option>
                                        ),
                                    )}
                            </select>
                        </label>

                        {!sellerEmployeeId && (
                            <div className="lumora-cart__seller-empty">
                                אין מוכרן חלופי בנוכחות
                            </div>
                        )}

                        <div className="lumora-cart__seller-question">
                            לאילו פריטים להחיל את השינוי?
                        </div>

                        <div className="lumora-cart__seller-actions">
                            <button
                                type="button"
                                disabled={!sellerEmployeeId}
                                onClick={() =>
                                    applySellerChange("line")
                                }
                            >
                                רק שורה זו
                            </button>

                            <button
                                type="button"
                                disabled={!sellerEmployeeId}
                                onClick={() =>
                                    applySellerChange(
                                        "from-line",
                                    )
                                }
                            >
                                מכאן ועד הסוף
                            </button>
                        </div>
                    </section>
                </div>
            )}
            {editingLine && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 1000,
                        display: "grid",
                        placeItems: "center",
                        background:
                            "rgb(0 0 0 / 28%)",
                        direction: "rtl",
                    }}
                    onMouseDown={
                        closeDescriptionEditor
                    }
                >
                    <div
                        style={{
                            width:
                                "min(420px, calc(100vw - 40px))",
                            padding: "18px",
                            border:
                                "1px solid #d8dadd",
                            borderRadius: "14px",
                            background: "#fff",
                            boxShadow:
                                "0 18px 50px rgb(0 0 0 / 16%)",
                        }}
                        onMouseDown={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <span>
                            מוצר מקור
                        </span>

                        <strong
                            style={{
                                display: "block",
                                marginTop: "4px",
                            }}
                        >
                            {editingLine.product.name}
                        </strong>

                        <input
                            type="text"
                            value={descriptionValue}
                            autoFocus
                            onChange={(event) =>
                                setDescriptionValue(
                                    event.target.value,
                                )
                            }
                            onKeyDown={(event) => {
                                if (
                                    event.key === "Enter"
                                ) {
                                    saveDescription();
                                }

                                if (
                                    event.key === "Escape"
                                ) {
                                    closeDescriptionEditor();
                                }
                            }}
                            style={{
                                width: "100%",
                                minHeight: "42px",
                                marginTop: "14px",
                                padding: "0 11px",
                                border:
                                    "1px solid #d8dadd",
                                borderRadius: "9px",
                                boxSizing: "border-box",
                            }}
                        />

                        <div
                            style={{
                                display: "flex",
                                justifyContent:
                                    "flex-end",
                                gap: "8px",
                                marginTop: "16px",
                            }}
                        >
                            <button
                                type="button"
                                onClick={
                                    closeDescriptionEditor
                                }
                            >
                                ביטול
                            </button>

                            <button
                                type="button"
                                onClick={
                                    saveDescription
                                }
                            >
                                שמור
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default CartPanel;
