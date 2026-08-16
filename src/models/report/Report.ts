export type ReportId =
    | "sales-summary"
    | "payments-summary"
    | "product-sales"
    | "returns-summary"
    | "seller-sales";

export type ReportColumn = {
    id: string;
    label: string;
    align?:
        | "start"
        | "end"
        | "center";
};

export type ReportRow = {
    id: string;
    values:
        Record<
            string,
            string | number
        >;
};

export type ReportResult = {
    id: ReportId;

    title: string;
    subtitle?: string;

    generatedAt: string;

    columns:
        ReportColumn[];

    rows:
        ReportRow[];

    totals?: {
        label: string;
        value: string;
    }[];
};

export type ReportDefinition = {
    id: ReportId;

    title: string;
    description: string;
};