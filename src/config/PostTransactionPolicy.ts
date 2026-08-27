import {
    getActiveBusinessOperatingProfile,
} from "./ActiveBusinessConfiguration";

import {
    getDocumentSettings,
} from "./DocumentSettings";

export type ResolvedPostTransactionPolicy = {
    autoPrintAccountingDocument: boolean;
    timeoutSeconds: number;

    exchangeSlipEnabled: boolean;
    exchangeSlipDefaultCopies: number;
    exchangeSlipMaxCopies: number;

    sendDocumentEnabled: boolean;
};

function normalizeInteger(
    value: number | undefined,
    fallback: number,
    min: number,
    max: number,
) {
    if (
        value === undefined ||
        !Number.isFinite(
            value,
        )
    ) {
        return fallback;
    }

    return Math.min(
        max,
        Math.max(
            min,
            Math.round(
                value,
            ),
        ),
    );
}

export function resolvePostTransactionPolicy():
ResolvedPostTransactionPolicy {
    const configured =
        getActiveBusinessOperatingProfile()
            .postTransactionPolicy;

    const local =
        getDocumentSettings();

    const exchangeSlipMaxCopies =
        normalizeInteger(
            configured
                ?.exchangeSlipMaxCopies,
            3,
            1,
            10,
        );

    return {
        autoPrintAccountingDocument:
            local
                .autoPrintAccountingDocument,

        timeoutSeconds:
            normalizeInteger(
                local
                    .postTransactionTimeoutSeconds,
                20,
                5,
                300,
            ),

        exchangeSlipEnabled:
            local
                .exchangeSlipEnabled,

        exchangeSlipDefaultCopies:
            normalizeInteger(
                local
                    .exchangeSlipDefaultCopies,
                1,
                1,
                exchangeSlipMaxCopies,
            ),

        exchangeSlipMaxCopies,

        sendDocumentEnabled:
            local
                .sendDocumentEnabled,
    };
}
