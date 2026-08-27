import type { ReactNode } from "react";

import "./payment-method-icon.css";

type PaymentMethodIconProps = {
    code: string;
};

type SvgIconProps = {
    children: ReactNode;
};

function SvgIcon({
    children,
}: SvgIconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
        >
            {children}
        </svg>
    );
}

function PaymentMethodIcon({
    code,
}: PaymentMethodIconProps) {
    switch (code) {
        case "cash":
            return (
                <span className="payment-method-icon">
                    <SvgIcon>
                        <rect
                            x="3"
                            y="6"
                            width="18"
                            height="12"
                            rx="2"
                        />
                        <path d="M7 9.5h.01" />
                        <path d="M17 14.5h.01" />
                        <circle
                            cx="12"
                            cy="12"
                            r="2.25"
                        />
                    </SvgIcon>
                </span>
            );

        case "card_terminal":
        case "external_credit":
            return (
                <span className="payment-method-icon">
                    <SvgIcon>
                        <rect
                            x="3"
                            y="5"
                            width="18"
                            height="14"
                            rx="2"
                        />
                        <path d="M3 9h18" />
                        <path d="M7 15h4" />
                    </SvgIcon>
                </span>
            );

        case "echo":
            return (
                <span className="payment-method-icon">
                    <SvgIcon>
                        <circle
                            cx="12"
                            cy="12"
                            r="2"
                        />
                        <path d="M8.5 8.5a5 5 0 0 0 0 7" />
                        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                        <path d="M6 6a8.5 8.5 0 0 0 0 12" />
                        <path d="M18 6a8.5 8.5 0 0 1 0 12" />
                    </SvgIcon>
                </span>
            );

        case "credit_voucher":
            return (
                <span className="payment-method-icon">
                    <SvgIcon>
                        <path d="M5 5h14v4a2 2 0 0 0 0 6v4H5v-4a2 2 0 0 0 0-6V5Z" />
                        <path d="M12 8v8" />
                    </SvgIcon>
                </span>
            );

        case "gift_card":
            return (
                <span className="payment-method-icon">
                    <SvgIcon>
                        <rect
                            x="3"
                            y="8"
                            width="18"
                            height="12"
                            rx="2"
                        />
                        <path d="M12 8v12" />
                        <path d="M3 12h18" />
                        <path d="M12 8H8.5A2.5 2.5 0 1 1 11 5.5L12 8Z" />
                        <path d="M12 8h3.5A2.5 2.5 0 1 0 13 5.5L12 8Z" />
                    </SvgIcon>
                </span>
            );

        case "store_credit":
            return (
                <span className="payment-method-icon">
                    <SvgIcon>
                        <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v2" />
                        <path d="M4 7.5V17a2 2 0 0 0 2 2h14V9H6.5A2.5 2.5 0 0 1 4 6.5" />
                        <path d="M16 13h2" />
                    </SvgIcon>
                </span>
            );

        case "bit":
        case "paybox":
            return (
                <span className="payment-method-icon">
                    <SvgIcon>
                        <rect
                            x="7"
                            y="3"
                            width="10"
                            height="18"
                            rx="2"
                        />
                        <path d="M10 6h4" />
                        <path d="M11 18h2" />
                    </SvgIcon>
                </span>
            );

        case "bank_transfer":
            return (
                <span className="payment-method-icon">
                    <SvgIcon>
                        <path d="M4 8h16" />
                        <path d="m7 5-3 3 3 3" />
                        <path d="M20 16H4" />
                        <path d="m17 13 3 3-3 3" />
                    </SvgIcon>
                </span>
            );

        case "cheque":
            return (
                <span className="payment-method-icon">
                    <SvgIcon>
                        <rect
                            x="3"
                            y="5"
                            width="18"
                            height="14"
                            rx="2"
                        />
                        <path d="M7 10h6" />
                        <path d="M7 14h4" />
                        <path d="m15 14 1.5 1.5L19 13" />
                    </SvgIcon>
                </span>
            );

        default:
            return (
                <span className="payment-method-icon">
                    <SvgIcon>
                        <circle
                            cx="12"
                            cy="12"
                            r="9"
                        />
                        <path d="M12 8v8" />
                        <path d="M8 12h8" />
                    </SvgIcon>
                </span>
            );
    }
}

export default PaymentMethodIcon;
