import type {
    PaymentMethodCode,
} from "../../models/PaymentMethod";
import type {
    StoreCreditManagerApproval,
} from "../../models/store-credit/StoreCreditService";
import CardMethod from "./methods/CardMethod";
import CashMethod from "./methods/CashMethod";
import CreditVoucherMethod from "./methods/CreditVoucherMethod";
import EchoMethod from "./methods/EchoMethod";
import ExternalCreditMethod from "./methods/ExternalCreditMethod";
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

    pendingStoreCreditAmount: number;

    onAddCashPayment: (
        payment: CashPaymentInput,
    ) => void;

    onApproveReferencedPayment: (
        method:
            | "echo"
            | "external_credit",
        amount: number,
        reference: string,
    ) => void;

    onAddStoreCreditPayment: (
        amount: number,
        customerId: string,
        managerApproval?:
            StoreCreditManagerApproval,
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
    pendingStoreCreditAmount,
    onAddCashPayment,
    onApproveReferencedPayment,
    onAddStoreCreditPayment,
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
            <CardMethod />
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
                    onApproveReferencedPayment(
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
                pendingStoreCreditAmount={
                    pendingStoreCreditAmount
                }
                onAddPayment={
                    onAddStoreCreditPayment
                }
            />
        );
    }

    if (
        selectedMethod ===
        "external_credit"
    ) {
        return (
            <ExternalCreditMethod
                remainingAmount={
                    remainingAmount
                }
                onApprove={(
                    amount: number,
                    externalReference: string,
                ) =>
                    onApproveReferencedPayment(
                        "external_credit",
                        amount,
                        externalReference,
                    )
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
            | "external_credit"
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
