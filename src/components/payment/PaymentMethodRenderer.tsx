import type {
    PaymentMethodCode,
} from "../../models/PaymentMethod";
import CardMethod from "./methods/CardMethod";
import CashMethod from "./methods/CashMethod";
import CreditVoucherMethod from "./methods/CreditVoucherMethod";
import EchoMethod from "./methods/EchoMethod";
import GiftCardMethod from "./methods/GiftCardMethod";
import StoreCreditMethod from "./methods/StoreCreditMethod";

type CashPaymentInput = {
    amount: number;
    tenderedAmount: number;
    changeAmount: number;
};

type PaymentMethodRendererProps = {
    selectedMethod:
    | PaymentMethodCode
    | null;

    remainingAmount: number;

    onAddCashPayment: (
        payment: CashPaymentInput,
    ) => void;

    onApproveElectronicPayment: (
        method:
            | "card_terminal"
            | "echo",
        amount: number,
        providerReference: string,
    ) => void;

    onRedeemStoredValue: (
        method:
            | "credit_voucher"
            | "gift_card",
        number: string,
        amount: number,
    ) => void;
};

function PaymentMethodRenderer({
    selectedMethod,
    remainingAmount,
    onAddCashPayment,
    onApproveElectronicPayment,
    onRedeemStoredValue,
}: PaymentMethodRendererProps) {
    if (selectedMethod === null) {
        return (
            <div className="payment-page__empty">
                בחר אמצעי תשלום
            </div>
        );
    }

    if (selectedMethod === "cash") {
        return (
            <CashMethod
                remainingAmount={remainingAmount}
                onAddPayment={onAddCashPayment}
            />
        );
    }

    if (
        selectedMethod ===
        "card_terminal"
    ) {
        return (
            <CardMethod
                remainingAmount={
                    remainingAmount
                }
                onApprove={(
                    amount: number,
                    providerReference: string,
                ) =>
                    onApproveElectronicPayment(
                        "card_terminal",
                        amount,
                        providerReference,
                    )
                }
            />
        );
    }

    if (selectedMethod === "echo") {
        return (
            <EchoMethod
                remainingAmount={
                    remainingAmount
                }
                onApprove={(
                    amount: number,
                    providerReference: string,
                ) =>
                    onApproveElectronicPayment(
                        "echo",
                        amount,
                        providerReference,
                    )
                }
            />
        );
    }

    if (
        selectedMethod ===
        "credit_voucher"
    ) {
        return (
            <CreditVoucherMethod
                remainingAmount={
                    remainingAmount
                }
                onRedeem={(
                    number: string,
                    amount: number,
                ) =>
                    onRedeemStoredValue(
                        "credit_voucher",
                        number,
                        amount,
                    )
                }
            />
        );
    }

    if (
        selectedMethod ===
        "gift_card"
    ) {
        return (
            <GiftCardMethod
                remainingAmount={
                    remainingAmount
                }
                onRedeem={(
                    number: string,
                    amount: number,
                ) =>
                    onRedeemStoredValue(
                        "gift_card",
                        number,
                        amount,
                    )
                }
            />
        );
    }

    if (
        selectedMethod ===
        "store_credit"
    ) {
        return (
            <StoreCreditMethod
                remainingAmount={
                    remainingAmount
                }
            />
        );
    }

    const fallback = {
        bit: {
            icon: "B",
            title: "Bit",
        },

        paybox: {
            icon: "P",
            title: "PayBox",
        },

        bank_transfer: {
            icon: "↔",
            title: "העברה בנקאית",
        },

        cheque: {
            icon: "▱",
            title: "המחאה",
        },

        external_credit: {
            icon: "▤",
            title: "אשראי חיצוני",
        },

        custom: {
            icon: "+",
            title: "אמצעי תשלום נוסף",
        },
    } satisfies Record<
        Exclude<
            PaymentMethodCode,
            | "cash"
            | "card_terminal"
            | "echo"
            | "credit_voucher"
            | "gift_card"
            | "store_credit"
        >,
        {
            icon: string;
            title: string;
        }
    >;

    const state =
        fallback[selectedMethod];

    return (
        <div className="payment-page__method-state">
            <span className="payment-page__method-state-icon">
                {state.icon}
            </span>

            <strong>
                {state.title}
            </strong>

            <p>
                אמצעי התשלום יופעל לפי הגדרות בית העסק.
            </p>

            <button
                type="button"
                disabled
            >
                המשך
            </button>
        </div>
    );
}

export default PaymentMethodRenderer;