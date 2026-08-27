export type ReportEmailDeliveryInput = {
    to: string;
    subject: string;
    message?: string;
    filename: string;
    pdfBase64: string;
    tenantId?: string;
    storeCode?: string;
    registerCode?: string;
};

export type ReportEmailDeliveryResult = {
    messageId?: string;
};

export interface ReportEmailDeliveryAdapter {
    isConfigured(): boolean;
    send(
        input: ReportEmailDeliveryInput,
    ): Promise<ReportEmailDeliveryResult>;
}

const STORAGE_KEY =
    "lumora.report-email-delivery.v1";

export type ReportEmailDeliveryConfiguration = {
    endpoint: string;
};

function readConfiguration():
    ReportEmailDeliveryConfiguration | null {
    if (
        typeof localStorage ===
        "undefined"
    ) {
        return null;
    }

    try {
        const raw =
            localStorage.getItem(
                STORAGE_KEY,
            );

        if (!raw) {
            return null;
        }

        const parsed =
            JSON.parse(raw) as
                Partial<ReportEmailDeliveryConfiguration>;

        const endpoint =
            parsed.endpoint?.trim();

        if (!endpoint) {
            return null;
        }

        return {
            endpoint,
        };
    }
    catch {
        return null;
    }
}

export function configureReportEmailDelivery(
    configuration:
        ReportEmailDeliveryConfiguration,
) {
    const endpoint =
        configuration.endpoint.trim();

    if (!endpoint) {
        throw new Error(
            "EMAIL_ENDPOINT_REQUIRED",
        );
    }

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
            endpoint,
        }),
    );
}

export function clearReportEmailDeliveryConfiguration() {
    localStorage.removeItem(
        STORAGE_KEY,
    );
}

class HttpReportEmailDeliveryAdapter
    implements ReportEmailDeliveryAdapter {
    private readonly configuration:
        ReportEmailDeliveryConfiguration | null;

    constructor() {
        this.configuration =
            readConfiguration();
    }

    isConfigured() {
        return Boolean(
            this.configuration?.endpoint,
        );
    }

    async send(
        input: ReportEmailDeliveryInput,
    ): Promise<ReportEmailDeliveryResult> {
        const endpoint =
            this.configuration?.endpoint;

        if (!endpoint) {
            throw new Error(
                "EMAIL_DELIVERY_NOT_CONFIGURED",
            );
        }

        const response =
            await fetch(
                endpoint,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    credentials:
                        "include",
                    body:
                        JSON.stringify({
                            to:
                                input.to,
                            subject:
                                input.subject,
                            message:
                                input.message ??
                                "",
                            attachment: {
                                filename:
                                    input.filename,
                                contentType:
                                    "application/pdf",
                                base64:
                                    input.pdfBase64,
                            },
                            context: {
                                tenantId:
                                    input.tenantId,
                                storeCode:
                                    input.storeCode,
                                registerCode:
                                    input.registerCode,
                            },
                        }),
                },
            );

        if (!response.ok) {
            throw new Error(
                `EMAIL_DELIVERY_HTTP_${response.status}`,
            );
        }

        try {
            const payload =
                await response.json() as {
                    messageId?: string;
                };

            return {
                messageId:
                    payload.messageId,
            };
        }
        catch {
            return {};
        }
    }
}

export function getReportEmailDeliveryAdapter():
    ReportEmailDeliveryAdapter {
    return new HttpReportEmailDeliveryAdapter();
}
