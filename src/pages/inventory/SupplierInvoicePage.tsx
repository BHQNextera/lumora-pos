import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    useCatalog,
} from "../../context/useCatalog";

import {
    getEmployees,
} from "../../models/employee/EmployeeRepository";

import {
    getActiveRegisterShift,
} from "../../models/shift/RegisterShiftRepository";

import {
    cancelSupplierInvoiceDraft,
    getSupplierInvoice,
    getSupplierInvoices,
    hydrateSupplierInvoices,
    postSupplierInvoice,
    saveSupplierInvoiceDraft,
    supplierInvoiceReferenceExists,
} from "../../models/inventory/SupplierInvoiceRepository";

import type {
    SupplierInvoiceDocument,
    SupplierInvoiceDocumentLine,
} from "../../models/inventory/SupplierInvoice";

import {
    createSupplier,
    ensureSuppliersFromProducts,
    getSuppliers,
    hydrateSuppliers,
    supplierIdentityExists,
} from "../../models/inventory/SupplierRepository";

import {
    deleteSupplierAttachmentPayload,
    getSupplierAttachmentPayload,
    saveSupplierAttachmentPayload,
} from "../../models/inventory/SupplierDocumentAttachmentRepository";

import type {
    SupplierDocumentAttachment,
} from "../../models/inventory/SupplierDocumentAttachment";

import {
    resolveProductTaxRate,
} from "../../models/tax/TaxPolicy";

import type {
    Product,
} from "../../types/product";

import {
    assessQuantityText,
    isBarcodeLikeQuantityText,
} from "../../utils/quantitySafety";
import {
    useQuantityScannerGuard,
} from "../../utils/useQuantityScannerGuard";
import {
    notifyNumericInputBlocked,
    rejectBarcodeLikeNumericInput,
} from "../../utils/numericInputSafety";

import "./supplier-invoice-page.css";

/* LUMORA QUANTITY SAFETY V1.2 */

type ProductVariant =
    NonNullable<Product["variants"]>[number];

type InvoiceRow = {
    key: string;
    product: Product;
    variant?: ProductVariant;
    name: string;
    variantName: string;
    sku: string;
    barcode: string;
    currentQuantity: number;
};

type LineDraft = {
    quantity: string;
    unitCost: string;
};

type AttachmentDraft =
    SupplierDocumentAttachment & {
        dataUrl?: string;
    };

type AttachmentPreview = {
    attachment:
        SupplierDocumentAttachment;
    dataUrl: string;
};

const MAX_ATTACHMENT_BYTES =
    12 * 1024 * 1024;

const ALLOWED_ATTACHMENT_TYPES =
    new Set([
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
    ]);

function readFileAsDataUrl(
    file: File,
): Promise<string> {
    return new Promise(
        (resolve, reject) => {
            const reader =
                new FileReader();

            reader.onload = () => {
                if (
                    typeof reader.result ===
                    "string"
                ) {
                    resolve(reader.result);
                    return;
                }

                reject(
                    new Error(
                        "Unable to read attachment.",
                    ),
                );
            };

            reader.onerror = () =>
                reject(
                    reader.error ??
                        new Error(
                            "Unable to read attachment.",
                        ),
                );

            reader.readAsDataURL(file);
        },
    );
}

function formatFileSize(
    size: number,
): string {
    if (size < 1024) {
        return `${size} B`;
    }

    if (size < 1024 * 1024) {
        return `${Math.round(size / 1024)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function todayValue() {
    const now = new Date();
    const local = new Date(
        now.getTime() -
            now.getTimezoneOffset() *
                60000,
    );

    return local
        .toISOString()
        .slice(0, 10);
}

function normalize(
    value: string,
) {
    return value
        .trim()
        .toLocaleLowerCase();
}

function parseDecimal(
    value: string,
) {
    return Number(
        value
            .trim()
            .replace(",", "."),
    );
}

function displayName(
    product: Product,
) {
    return (
        product.names?.he ??
        product.name
    );
}

function formatQuantity(
    value: number,
) {
    return new Intl.NumberFormat(
        "he-IL",
        {
            maximumFractionDigits: 3,
        },
    ).format(value);
}

function formatMoney(
    value: number,
) {
    return new Intl.NumberFormat(
        "he-IL",
        {
            style: "currency",
            currency: "ILS",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
    ).format(value);
}

function formatDate(
    value: string,
) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(`${value}T00:00:00`);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return value;
    }

    return date.toLocaleDateString(
        "he-IL",
    );
}

function formatDateTime(
    value: string,
) {
    return new Date(value)
        .toLocaleString(
            "he-IL",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            },
        );
}

function roundMoney(
    value: number,
) {
    return Math.round(
        (value + Number.EPSILON) *
            100,
    ) / 100;
}

type SupplierInvoicePageProps = {
    openDocumentNumber?: string;
    openRequestId?: number;
};

function SupplierInvoicePage({
    openDocumentNumber,
    openRequestId,
}: SupplierInvoicePageProps) {
    const {
        products,
        updateProduct,
    } = useCatalog();

    const [employees] =
        useState(() =>
            getEmployees().filter(
                (employee) =>
                    employee.isActive,
            ),
        );

    const [initialShift] =
        useState(
            getActiveRegisterShift,
        );

    const [workspaceView, setWorkspaceView] =
        useState<"edit" | "documents">(
            "edit",
        );

    const [supplierName, setSupplierName] =
        useState("");

    const [supplierInvoiceNumber, setSupplierInvoiceNumber] =
        useState("");

    const [invoiceDate, setInvoiceDate] =
        useState(
            todayValue,
        );

    const [employeeId, setEmployeeId] =
        useState(() => {
            const shiftEmployeeId =
                initialShift?.openedBy
                    .employeeId;

            if (
                shiftEmployeeId &&
                employees.some(
                    (employee) =>
                        employee.id ===
                        shiftEmployeeId,
                )
            ) {
                return shiftEmployeeId;
            }

            return employees.length === 1
                ? employees[0].id
                : "";
        });

    const [note, setNote] =
        useState("");

    const [search, setSearch] =
        useState("");

    const [lineDrafts, setLineDrafts] =
        useState<Record<string, LineDraft>>(
            {},
        );

    const [currentDocumentId, setCurrentDocumentId] =
        useState<string | null>(
            null,
        );

    const [selectedDocumentId, setSelectedDocumentId] =
        useState<string | null>(
            null,
        );

    const [repositoryRevision, setRepositoryRevision] =
        useState(0);

    const [hydrating, setHydrating] =
        useState(true);

    const [repositoryReady, setRepositoryReady] =
        useState(false);

    const [error, setError] =
        useState<string | null>(
            null,
        );

    const [success, setSuccess] =
        useState<string | null>(
            null,
        );

    const [
        quantityApprovalKey,
        setQuantityApprovalKey,
    ] = useState<string | null>(null);

    const quantityScannerGuard =
        useQuantityScannerGuard();


    const [supplierRevision, setSupplierRevision] =
        useState(0);

    const [attachments, setAttachments] =
        useState<AttachmentDraft[]>([]);

    const [removedAttachmentIds, setRemovedAttachmentIds] =
        useState<string[]>([]);
    const [attachmentPreview, setAttachmentPreview] =
        useState<AttachmentPreview | null>(null);

    const [quickSupplierOpen, setQuickSupplierOpen] =
        useState(false);
    const [quickSupplierName, setQuickSupplierName] =
        useState("");
    const [quickSupplierBusinessNumber, setQuickSupplierBusinessNumber] =
        useState("");
    const [quickSupplierContactName, setQuickSupplierContactName] =
        useState("");
    const [quickSupplierPhone, setQuickSupplierPhone] =
        useState("");

    const [cancelDraftConfirmOpen, setCancelDraftConfirmOpen] =
        useState(false);

    const [documentSupplierFilter, setDocumentSupplierFilter] =
        useState("");
    const [documentNumberFilter, setDocumentNumberFilter] =
        useState("");
    const [documentFromDate, setDocumentFromDate] =
        useState("");
    const [documentToDate, setDocumentToDate] =
        useState("");
    const [documentStatusFilter, setDocumentStatusFilter] =
        useState<"all" | "draft" | "posted" | "cancelled">("all");
    const [documentReceiverFilter, setDocumentReceiverFilter] =
        useState("");

    useEffect(() => {
        let active = true;

        Promise.all([
            hydrateSupplierInvoices(),
            hydrateSuppliers(),
        ])
            .then(() => {
                if (!active) {
                    return;
                }

                ensureSuppliersFromProducts(
                    products,
                );
                setSupplierRevision(
                    (value) =>
                        value + 1,
                );
                setRepositoryRevision(
                    (value) =>
                        value + 1,
                );
                setRepositoryReady(true);
                setHydrating(false);
            })
            .catch(() => {
                if (!active) {
                    return;
                }

                setRepositoryReady(false);
                setHydrating(false);
                setError(
                    "לא ניתן לטעון את חשבוניות הספק השמורות.",
                );
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (
            !repositoryReady ||
            !openDocumentNumber
        ) {
            return;
        }

        const document =
            getSupplierInvoices().find(
                (candidate) =>
                    candidate.documentNumber ===
                    openDocumentNumber,
            );

        setWorkspaceView(
            "documents",
        );
        setDocumentNumberFilter(
            openDocumentNumber,
        );
        setDocumentSupplierFilter("");
        setDocumentFromDate("");
        setDocumentToDate("");
        setDocumentStatusFilter("all");
        setDocumentReceiverFilter("");

        if (!document) {
            setSelectedDocumentId(null);
            setError(
                `מסמך ${openDocumentNumber} לא נמצא.`,
            );
            return;
        }

        setSelectedDocumentId(
            document.id,
        );
        setError(null);
        setSuccess(null);
    }, [
        openDocumentNumber,
        openRequestId,
        repositoryReady,
    ]);

    void repositoryRevision;

    void supplierRevision;

    const suppliers =
        getSuppliers()
            .filter(
                (supplier) =>
                    supplier.isActive,
            );

    const selectedSupplier =
        useMemo(
            () =>
                suppliers.find(
                    (supplier) =>
                        normalize(
                            supplier.name,
                        ) ===
                        normalize(
                            supplierName,
                        ),
                ),
            [
                suppliers,
                supplierName,
            ],
        );

    const rows =
        useMemo<InvoiceRow[]>(
            () =>
                products
                    .filter(
                        (product) =>
                            product.isActive,
                    )
                    .flatMap(
                        (product) => {
                            const base = {
                                product,
                                name:
                                    displayName(
                                        product,
                                    ),
                            };

                            if (
                                product.variants
                                    ?.length
                            ) {
                                return product.variants
                                    .filter(
                                        (variant) =>
                                            variant.isActive,
                                    )
                                    .map(
                                        (variant) => ({
                                            ...base,
                                            key:
                                                `${product.id}::${variant.variantId}`,
                                            variant,
                                            variantName:
                                                `${variant.color.name} · ${variant.size.name}`,
                                            sku:
                                                variant.sku,
                                            barcode:
                                                variant.barcode,
                                            currentQuantity:
                                                variant.stockOnHand ??
                                                0,
                                        }),
                                    );
                            }

                            return [
                                {
                                    ...base,
                                    key:
                                        product.id,
                                    variantName:
                                        "",
                                    sku:
                                        product.sku,
                                    barcode:
                                        product.barcode,
                                    currentQuantity:
                                        product.stockOnHand ??
                                        0,
                                },
                            ];
                        },
                    )
                    .sort(
                        (left, right) =>
                            left.name.localeCompare(
                                right.name,
                                "he",
                            ) ||
                            left.variantName.localeCompare(
                                right.variantName,
                                "he",
                            ),
                    ),
            [products],
        );

    const visibleRows =
        useMemo(() => {
            const normalizedSupplier =
                normalize(
                    supplierName,
                );

            const normalizedSearch =
                normalize(
                    search,
                );

            return rows.filter(
                (row) => {
                    if (
                        normalizedSupplier &&
                        normalize(
                            row.product.supplier
                                ?.name ?? "",
                        ) !==
                            normalizedSupplier
                    ) {
                        return false;
                    }

                    if (
                        !normalizedSearch
                    ) {
                        return true;
                    }

                    return [
                        row.name,
                        row.variantName,
                        row.sku,
                        row.barcode,
                    ].some(
                        (value) =>
                            normalize(
                                value,
                            ).includes(
                                normalizedSearch,
                            ),
                    );
                },
            );
        }, [
            rows,
            search,
            supplierName,
        ]);

    const documents =
        getSupplierInvoices();

    const filteredDocuments =
        documents.filter(
            (document) => {
                const supplierFilter =
                    normalize(
                        documentSupplierFilter,
                    );
                const numberFilter =
                    normalize(
                        documentNumberFilter,
                    );
                const receiverFilter =
                    normalize(
                        documentReceiverFilter,
                    );

                if (
                    supplierFilter &&
                    !normalize(
                        document.supplier.name,
                    ).includes(
                        supplierFilter,
                    )
                ) {
                    return false;
                }

                if (
                    numberFilter &&
                    ![
                        document.documentNumber ?? "",
                        document.supplierInvoiceNumber,
                    ].some(
                        (value) =>
                            normalize(value)
                                .includes(
                                    numberFilter,
                                ),
                    )
                ) {
                    return false;
                }

                if (
                    documentStatusFilter !==
                        "all" &&
                    document.status !==
                        documentStatusFilter
                ) {
                    return false;
                }

                if (
                    documentFromDate &&
                    document.invoiceDate <
                        documentFromDate
                ) {
                    return false;
                }

                if (
                    documentToDate &&
                    document.invoiceDate >
                        documentToDate
                ) {
                    return false;
                }

                if (
                    receiverFilter &&
                    !normalize(
                        document.receivedBy
                            ?.employeeName ?? "",
                    ).includes(
                        receiverFilter,
                    )
                ) {
                    return false;
                }

                return true;
            },
        );

    const selectedDocument =
        selectedDocumentId
            ? getSupplierInvoice(
                  selectedDocumentId,
              )
            : undefined;

    function getLineDraft(
        row: InvoiceRow,
    ): LineDraft {
        return (
            lineDrafts[row.key] ?? {
                quantity: "",
                unitCost:
                    row.product.costPrice ===
                    undefined
                        ? ""
                        : String(
                              row.product.costPrice,
                          ),
            }
        );
    }

    function rejectLineQuantity(
        row: InvoiceRow,
    ) {
        setLineDrafts(
            (current) => {
                const existing =
                    current[row.key] ?? {
                        quantity: "",
                        unitCost:
                            row.product.costPrice ===
                            undefined
                                ? ""
                                : String(
                                      row.product.costPrice,
                                  ),
                    };

                return {
                    ...current,
                    [row.key]: {
                        ...existing,
                        quantity: "",
                    },
                };
            },
        );

        setQuantityApprovalKey(null);
        setError(
            "זוהתה סריקת ברקוד בשדה הכמות. הכמות לא שונתה.",
        );
        /* LUMORA SUPPLIER INVOICE QUANTITY NOTICE V1 */
        notifyNumericInputBlocked(
            "זוהתה סריקת ברקוד בשדה הכמות. הכמות לא שונתה.",
        );
        setSuccess(null);
    }

    function setLineField(
        row: InvoiceRow,
        field:
            keyof LineDraft,
        value: string,
    ) {
        /* LUMORA SUPPLIER INVOICE COST BARCODE GUARD V1 */
        if (
            field === "unitCost" &&
            rejectBarcodeLikeNumericInput(
                value,
                "זוהתה סריקת ברקוד בשדה העלות. העלות לא שונתה.",
            )
        ) {
            setError(
                "זוהתה סריקת ברקוד בשדה העלות. העלות לא שונתה.",
            );
            setSuccess(null);
            return;
        }


        if (field === "quantity") {
            const raw =
                value.replaceAll(",", "").trim();

            if (
                raw !== "" &&
                isBarcodeLikeQuantityText(raw)
            ) {
                rejectLineQuantity(row);
                quantityScannerGuard.reset();
                return;
            }

            if (
                raw !== "" &&
                !/^\d+$/.test(raw)
            ) {
                return;
            }

            value = raw;
            setQuantityApprovalKey(null);
        }

        setLineDrafts(
            (current) => {
                const existing =
                    current[row.key] ?? {
                        quantity: "",
                        unitCost:
                            row.product.costPrice ===
                            undefined
                                ? ""
                                : String(
                                      row.product.costPrice,
                                  ),
                    };

                return {
                    ...current,
                    [row.key]: {
                        ...existing,
                        [field]:
                            value,
                    },
                };
            },
        );

        setError(null);
        setSuccess(null);
    }

    function buildLines(
        requireValid: boolean,
    ):
    SupplierInvoiceDocumentLine[] | null {
        const result:
            SupplierInvoiceDocumentLine[] = [];

        for (
            const row
            of rows
        ) {
            const draft =
                getLineDraft(row);

            const quantityText =
                draft.quantity.trim();

            if (!quantityText) {
                continue;
            }

            const quantityAssessment =
                assessQuantityText({
                    raw: quantityText,
                    context: "supplier_invoice",
                    min: 1,
                });

            if (!quantityAssessment.ok) {
                setError(
                    (quantityAssessment.message ?? "") + " פריט: " + row.name + ".",
                );
                return null;
            }

            const quantity =
                quantityAssessment.quantity ??
                Number.NaN;

            const unitCostText =
                draft.unitCost.trim();

            const unitCost =
                unitCostText === ""
                    ? Number.NaN
                    : parseDecimal(
                          unitCostText,
                      );

            const validQuantity =
                Number.isInteger(
                    quantity,
                ) &&
                quantity > 0;

            const validCost =
                Number.isFinite(
                    unitCost,
                ) &&
                unitCost >= 0;

            if (
                requireValid &&
                !validQuantity
            ) {
                setError(
                    `הכמות עבור ${row.name} חייבת להיות מספר שלם גדול מאפס.`,
                );
                return null;
            }

            if (
                requireValid &&
                !validCost
            ) {
                setError(
                    `יש להזין עלות תקינה לפני מע״מ עבור ${row.name}.`,
                );
                return null;
            }

            const vatRate =
                resolveProductTaxRate(
                    row.product.taxClass ??
                        "standard",
                );

            const numericQuantity =
                validQuantity
                    ? quantity
                    : null;

            const numericUnitCost =
                validCost
                    ? unitCost
                    : null;

            const lineNet =
                numericQuantity !== null &&
                numericUnitCost !== null
                    ? roundMoney(
                          numericQuantity *
                              numericUnitCost,
                      )
                    : 0;

            const lineVat =
                roundMoney(
                    lineNet * vatRate,
                );

            result.push({
                key:
                    row.key,
                product: {
                    id:
                        row.product.id,
                    name:
                        row.name,
                    sku:
                        row.sku,
                    variantId:
                        row.variant
                            ?.variantId,
                    variantLabel:
                        row.variantName ||
                        undefined,
                },
                previousQuantity:
                    row.currentQuantity,
                receivedQuantity:
                    numericQuantity,
                resultingQuantity:
                    numericQuantity !==
                    null
                        ? row.currentQuantity +
                          numericQuantity
                        : null,
                unitCostBeforeVat:
                    numericUnitCost,
                enteredQuantity:
                    quantityText,
                enteredUnitCost:
                    unitCostText,
                previousUnitCostBeforeVat:
                    row.product.costPrice,
                vatRate,
                lineNet,
                lineVat,
                lineGross:
                    roundMoney(
                        lineNet +
                            lineVat,
                    ),
            });
        }

        return result;
    }

    function calculateTotals(
        lines:
            SupplierInvoiceDocumentLine[],
    ) {
        const net =
            roundMoney(
                lines.reduce(
                    (total, line) =>
                        total +
                        line.lineNet,
                    0,
                ),
            );

        const vat =
            roundMoney(
                lines.reduce(
                    (total, line) =>
                        total +
                        line.lineVat,
                    0,
                ),
            );

        return {
            net,
            vat,
            gross:
                roundMoney(
                    net + vat,
                ),
        };
    }

    const previewLines =
        buildPreviewLines();

    function buildPreviewLines() {
        const result:
            SupplierInvoiceDocumentLine[] = [];

        for (
            const row
            of rows
        ) {
            const draft =
                getLineDraft(row);

            const quantity =
                Number(
                    draft.quantity,
                );

            const unitCost =
                parseDecimal(
                    draft.unitCost,
                );

            if (
                !draft.quantity.trim() ||
                !Number.isInteger(
                    quantity,
                ) ||
                quantity <= 0 ||
                !draft.unitCost.trim() ||
                !Number.isFinite(
                    unitCost,
                ) ||
                unitCost < 0
            ) {
                continue;
            }

            const vatRate =
                resolveProductTaxRate(
                    row.product.taxClass ??
                        "standard",
                );

            const lineNet =
                roundMoney(
                    quantity *
                        unitCost,
                );

            const lineVat =
                roundMoney(
                    lineNet *
                        vatRate,
                );

            result.push({
                key: row.key,
                product: {
                    id: row.product.id,
                    name: row.name,
                    sku: row.sku,
                    variantId:
                        row.variant
                            ?.variantId,
                    variantLabel:
                        row.variantName ||
                        undefined,
                },
                previousQuantity:
                    row.currentQuantity,
                receivedQuantity:
                    quantity,
                resultingQuantity:
                    row.currentQuantity +
                    quantity,
                unitCostBeforeVat:
                    unitCost,
                enteredQuantity:
                    draft.quantity,
                enteredUnitCost:
                    draft.unitCost,
                previousUnitCostBeforeVat:
                    row.product.costPrice,
                vatRate,
                lineNet,
                lineVat,
                lineGross:
                    roundMoney(
                        lineNet +
                            lineVat,
                    ),
            });
        }

        return result;
    }

    const previewTotals =
        calculateTotals(
            previewLines,
        );

    function clearEditor() {
        setSupplierName("");
        setSupplierInvoiceNumber("");
        setInvoiceDate(
            todayValue(),
        );
        setNote("");
        setSearch("");
        setLineDrafts({});
        setAttachments([]);
        setRemovedAttachmentIds([]);
        setCurrentDocumentId(null);
        setSelectedDocumentId(null);
        setError(null);
        setSuccess(null);
    }

    function startNew() {
        clearEditor();
        setWorkspaceView(
            "edit",
        );
    }

    function openDraft(
        document:
            SupplierInvoiceDocument,
    ) {
        if (
            document.status !==
            "draft"
        ) {
            setSelectedDocumentId(
                document.id,
            );
            return;
        }

        setSupplierName(
            document.supplier.name,
        );
        setSupplierInvoiceNumber(
            document.supplierInvoiceNumber,
        );
        setInvoiceDate(
            document.invoiceDate ||
                todayValue(),
        );
        setEmployeeId(
            document.receivedBy
                ?.employeeId ??
                "",
        );
        setNote(
            document.note,
        );
        setSearch("");
        setAttachments(
            (document.attachments ?? []).map(
                (attachment) => ({
                    ...attachment,
                }),
            ),
        );
        setRemovedAttachmentIds([]);
        setLineDrafts(
            Object.fromEntries(
                document.lines.map(
                    (line) => [
                        line.key,
                        {
                            quantity:
                                line.enteredQuantity,
                            unitCost:
                                line.enteredUnitCost,
                        },
                    ],
                ),
            ),
        );
        setCurrentDocumentId(
            document.id,
        );
        setSelectedDocumentId(null);
        setError(null);
        setSuccess(null);
        setWorkspaceView(
            "edit",
        );
    }

    async function addAttachmentFiles(
        files: FileList | null,
    ) {
        if (!files?.length) {
            return;
        }

        setError(null);
        setSuccess(null);

        const added:
            AttachmentDraft[] = [];

        for (const file of Array.from(files)) {
            if (
                !ALLOWED_ATTACHMENT_TYPES.has(
                    file.type,
                )
            ) {
                setError(
                    "אפשר לצרף JPG, PNG, WEBP או PDF בלבד.",
                );
                continue;
            }

            if (
                file.size >
                MAX_ATTACHMENT_BYTES
            ) {
                setError(
                    `הקובץ ${file.name} גדול מ-12MB.`,
                );
                continue;
            }

            try {
                added.push({
                    id: crypto.randomUUID(),
                    fileName: file.name,
                    mimeType: file.type,
                    size: file.size,
                    createdAt:
                        new Date()
                            .toISOString(),
                    dataUrl:
                        await readFileAsDataUrl(
                            file,
                        ),
                });
            }
            catch {
                setError(
                    `לא ניתן לקרוא את הקובץ ${file.name}.`,
                );
            }
        }

        if (added.length) {
            setAttachments(
                (current) => [
                    ...current,
                    ...added,
                ],
            );
        }
    }

    function removeAttachment(
        attachment: AttachmentDraft,
    ) {
        setAttachments(
            (current) =>
                current.filter(
                    (item) =>
                        item.id !==
                        attachment.id,
                ),
        );

        if (!attachment.dataUrl) {
            setRemovedAttachmentIds(
                (current) => [
                    ...current,
                    attachment.id,
                ],
            );
        }
    }

    async function persistAttachmentChanges() {
        for (const attachment of attachments) {
            if (attachment.dataUrl) {
                await saveSupplierAttachmentPayload(
                    attachment.id,
                    attachment.dataUrl,
                );
            }
        }

        for (const attachmentId of removedAttachmentIds) {
            await deleteSupplierAttachmentPayload(
                attachmentId,
            );
        }
    }

    function attachmentMetadata():
    SupplierDocumentAttachment[] {
        return attachments.map(
            ({ dataUrl: _dataUrl, ...attachment }) =>
                attachment,
        );
    }

    async function openAttachment(
        attachment: SupplierDocumentAttachment,
    ) {
        try {
            const localPayload =
                attachments.find(
                    (item) =>
                        item.id ===
                        attachment.id,
                )?.dataUrl;

            const payload =
                localPayload ??
                await getSupplierAttachmentPayload(
                    attachment.id,
                );

            if (!payload) {
                setError(
                    "קובץ המקור לא נמצא באחסון המקומי.",
                );
                return;
            }

            setAttachmentPreview({
                attachment,
                dataUrl: payload,
            });
        }
        catch {
            setError(
                "לא ניתן לפתוח את הקובץ המצורף.",
            );
        }
    }

    function openQuickSupplier() {
        setQuickSupplierName("");
        setQuickSupplierBusinessNumber("");
        setQuickSupplierContactName("");
        setQuickSupplierPhone("");
        setError(null);
        setQuickSupplierOpen(true);
    }

    function createQuickSupplier() {
        const name =
            quickSupplierName.trim();

        if (!name) {
            setError(
                "יש להזין שם ספק.",
            );
            return;
        }

        if (!quickSupplierBusinessNumber.trim()) {
            setError(
                "יש להזין ח.פ./ע.מ של הספק.",
            );
            return;
        }

        if (
            supplierIdentityExists(
                name,
                quickSupplierBusinessNumber,
            )
        ) {
            setError(
                "כבר קיים ספק עם שם או מספר עסק זהה.",
            );
            return;
        }

        const supplier =
            createSupplier({
                name,
                businessNumber:
                    quickSupplierBusinessNumber,
                contactName:
                    quickSupplierContactName,
                phone:
                    quickSupplierPhone,
            });

        setSupplierRevision(
            (value) =>
                value + 1,
        );
        setSupplierName(
            supplier.name,
        );
        setQuickSupplierOpen(false);
        setError(null);
        setSuccess(
            `הספק ${supplier.name} נוסף לטבלת הספקים.`,
        );
    }

    function resetDocumentFilters() {
        setDocumentSupplierFilter("");
        setDocumentNumberFilter("");
        setDocumentFromDate("");
        setDocumentToDate("");
        setDocumentStatusFilter("all");
        setDocumentReceiverFilter("");
    }

    function confirmCancelDraft() {
        if (!currentDocumentId) {
            setCancelDraftConfirmOpen(false);
            return;
        }

        const cancelled =
            cancelSupplierInvoiceDraft(
                currentDocumentId,
            );

        setRepositoryRevision(
            (value) =>
                value + 1,
        );
        clearEditor();
        setCancelDraftConfirmOpen(false);
        setWorkspaceView("edit");
        setSuccess(
            `הטיוטה ${cancelled.supplierInvoiceNumber || "ללא מספר"} בוטלה. לא בוצע שינוי במלאי.`,
        );
    }

    async function saveDraft() {
        setError(null);
        setSuccess(null);

        if (!repositoryReady) {
            setError(
                "המסמכים עדיין נטענים. יש להמתין רגע ולנסות שוב.",
            );
            return;
        }

        const lines =
            buildLines(false);

        if (!lines) {
            return;
        }

        if (
            supplierName.trim() &&
            supplierInvoiceNumber.trim() &&
            supplierInvoiceReferenceExists(
                supplierName,
                supplierInvoiceNumber,
                currentDocumentId ??
                    undefined,
            )
        ) {
            setError(
                "כבר קיימת חשבונית עם מספר זה עבור הספק שנבחר.",
            );
            return;
        }

        const selectedEmployee =
            employees.find(
                (employee) =>
                    employee.id ===
                    employeeId,
            );

        try {
            await persistAttachmentChanges();
        }
        catch {
            setError(
                "לא ניתן לשמור את הקבצים המצורפים.",
            );
            return;
        }

        const saved =
            saveSupplierInvoiceDraft({
                documentId:
                    currentDocumentId ??
                    undefined,
                supplier: {
                    id:
                        selectedSupplier
                            ?.id,
                    name:
                        supplierName,
                },
                supplierInvoiceNumber,
                invoiceDate,
                note,
                attachments:
                    attachmentMetadata(),
                receivedBy:
                    selectedEmployee
                        ? {
                              employeeId:
                                  selectedEmployee.id,
                              employeeName:
                                  selectedEmployee.name,
                          }
                        : undefined,
                lines,
                totals:
                    calculateTotals(
                        lines,
                    ),
            });

        setCurrentDocumentId(
            saved.id,
        );
        setAttachments(
            saved.attachments.map(
                (attachment) => ({
                    ...attachment,
                }),
            ),
        );
        setRemovedAttachmentIds([]);
        setRepositoryRevision(
            (value) =>
                value + 1,
        );
        setSuccess(
            "הטיוטה נשמרה. המלאי והעלות לא השתנו.",
        );
    }

    async function postInvoice() {
        setError(null);
        setSuccess(null);

        if (!repositoryReady) {
            setError(
                "המסמכים עדיין נטענים. יש להמתין רגע ולנסות שוב.",
            );
            return;
        }

        if (!supplierName.trim()) {
            setError(
                "יש לבחור ספק.",
            );
            return;
        }

        if (!supplierInvoiceNumber.trim()) {
            setError(
                "יש להזין מספר חשבונית ספק.",
            );
            return;
        }

        if (!invoiceDate) {
            setError(
                "יש לבחור תאריך חשבונית.",
            );
            return;
        }

        const selectedEmployee =
            employees.find(
                (employee) =>
                    employee.id ===
                    employeeId,
            );

        if (!selectedEmployee) {
            setError(
                "יש לבחור עובד שקיבל את הסחורה.",
            );
            return;
        }

        if (
            supplierInvoiceReferenceExists(
                supplierName,
                supplierInvoiceNumber,
                currentDocumentId ??
                    undefined,
            )
        ) {
            setError(
                "כבר קיימת חשבונית עם מספר זה עבור הספק שנבחר.",
            );
            return;
        }

        const lines =
            buildLines(true);

        if (!lines) {
            return;
        }

        if (
            lines.length === 0
        ) {
            setError(
                "יש להזין לפחות שורת קליטה אחת.",
            );
            return;
        }

        const unusualLine =
            lines.find((line) => {
                const assessment =
                    assessQuantityText({
                        raw: String(
                            line.receivedQuantity ?? "",
                        ),
                        context: "supplier_invoice",
                        min: 1,
                    });

                return (
                    assessment.ok &&
                    assessment.requiresConfirmation
                );
            });

        if (unusualLine) {
            const assessment =
                assessQuantityText({
                    raw: String(
                        unusualLine.receivedQuantity ?? "",
                    ),
                    context: "supplier_invoice",
                    min: 1,
                });

            const approvalKey =
                unusualLine.key +
                ":" +
                String(
                    unusualLine.receivedQuantity ??
                        "",
                );

            if (
                quantityApprovalKey !==
                approvalKey
            ) {
                setQuantityApprovalKey(
                    approvalKey,
                );
                setError(
                    (assessment.message ??
                        "זוהתה כמות חריגה.") +
                        " לחצו שוב על קליטה מלאה כדי לאשר.",
                );
                setSuccess(null);
                return;
            }

            setQuantityApprovalKey(
                null,
            );
        }

                try {
            await persistAttachmentChanges();
        }
        catch {
            setError(
                "לא ניתן לשמור את הקבצים המצורפים.",
            );
            return;
        }

        const rowsByKey =
            new Map(
                rows.map(
                    (row) => [
                        row.key,
                        row,
                    ] as const,
                ),
            );

        const linesByProduct =
            new Map<
                string,
                SupplierInvoiceDocumentLine[]
            >();

        for (
            const line
            of lines
        ) {
            const current =
                linesByProduct.get(
                    line.product.id,
                ) ?? [];

            linesByProduct.set(
                line.product.id,
                [
                    ...current,
                    line,
                ],
            );
        }

        for (
            const [
                productId,
                productLines,
            ]
            of linesByProduct
        ) {
            const product =
                products.find(
                    (item) =>
                        item.id ===
                        productId,
                );

            if (!product) {
                continue;
            }

            const receivedQuantity =
                productLines.reduce(
                    (total, line) =>
                        total +
                        (line.receivedQuantity ??
                            0),
                    0,
                );

            const weightedCost =
                receivedQuantity > 0
                    ? productLines.reduce(
                          (total, line) =>
                              total +
                              (line.receivedQuantity ??
                                  0) *
                                  (line.unitCostBeforeVat ??
                                      0),
                          0,
                      ) /
                      receivedQuantity
                    : product.costPrice;

            if (
                product.variants
                    ?.length
            ) {
                const receivedByVariant =
                    new Map<string, number>();

                for (
                    const line
                    of productLines
                ) {
                    if (
                        !line.product
                            .variantId
                    ) {
                        continue;
                    }

                    receivedByVariant.set(
                        line.product
                            .variantId,
                        line.receivedQuantity ??
                            0,
                    );
                }

                const variants =
                    product.variants.map(
                        (variant) => ({
                            ...variant,
                            stockOnHand:
                                (variant.stockOnHand ??
                                    0) +
                                (receivedByVariant.get(
                                    variant.variantId,
                                ) ?? 0),
                        }),
                    );

                updateProduct({
                    ...product,
                    variants,
                    stockOnHand:
                        variants.reduce(
                            (total, variant) =>
                                total +
                                (variant.stockOnHand ??
                                    0),
                            0,
                        ),
                    costPrice:
                        weightedCost,
                });
            }
            else {
                const line =
                    productLines[0];

                const row =
                    line
                        ? rowsByKey.get(
                              line.key,
                          )
                        : undefined;

                updateProduct({
                    ...product,
                    stockOnHand:
                        (row?.currentQuantity ??
                            product.stockOnHand ??
                            0) +
                        receivedQuantity,
                    costPrice:
                        weightedCost,
                });
            }
        }

        const posted =
            postSupplierInvoice({
                documentId:
                    currentDocumentId ??
                    undefined,
                supplier: {
                    id:
                        selectedSupplier
                            ?.id,
                    name:
                        supplierName,
                },
                supplierInvoiceNumber,
                invoiceDate,
                note,
                attachments:
                    attachmentMetadata(),
                receivedBy: {
                    employeeId:
                        selectedEmployee.id,
                    employeeName:
                        selectedEmployee.name,
                },
                lines,
                totals:
                    calculateTotals(
                        lines,
                    ),
            });

        setRepositoryRevision(
            (value) =>
                value + 1,
        );
        clearEditor();
        setWorkspaceView(
            "edit",
        );
        setSuccess(
            `חשבונית ${posted.documentNumber} נקלטה והמלאי והעלות עודכנו. ניתן להתחיל חשבונית חדשה.`,
        );
    }

    return (
        <section
            className="supplier-invoice"
            dir="rtl"
        >
            <header className="supplier-invoice__header">
                <div>
                    <p className="supplier-invoice__eyebrow">
                        LUMORA INVENTORY
                    </p>
                    <h1>
                        חשבונית ספק
                    </h1>
                    <p>
                        קליטת סחורה ועלות קנייה לפי מסמך ספק. טיוטה אינה משנה מלאי.
                    </p>
                </div>

                <button
                    type="button"
                    className="supplier-invoice__primary"
                    onClick={
                        startNew
                    }
                >
                    + חשבונית חדשה
                </button>
            </header>

            <nav
                className="supplier-invoice__view-tabs"
                aria-label="תצוגות חשבונית ספק"
            >
                <button
                    type="button"
                    className={
                        workspaceView ===
                        "edit"
                            ? "supplier-invoice__view-tab supplier-invoice__view-tab--active"
                            : "supplier-invoice__view-tab"
                    }
                    onClick={() =>
                        setWorkspaceView(
                            "edit",
                        )
                    }
                >
                    חשבונית חדשה
                </button>

                <button
                    type="button"
                    className={
                        workspaceView ===
                        "documents"
                            ? "supplier-invoice__view-tab supplier-invoice__view-tab--active"
                            : "supplier-invoice__view-tab"
                    }
                    onClick={() =>
                        setWorkspaceView(
                            "documents",
                        )
                    }
                >
                    חשבוניות ספק
                    <span>
                        {documents.length}
                    </span>
                </button>
            </nav>

            {error && (
                <div className="supplier-invoice__message supplier-invoice__message--error">
                    {error}
                </div>
            )}

            {success && (
                <div className="supplier-invoice__message supplier-invoice__message--success">
                    {success}
                </div>
            )}

            {workspaceView ===
            "edit" ? (
                <>
                    <section className="supplier-invoice__meta-card">
                        <div className="supplier-invoice__meta-grid">
                            <div className="supplier-invoice__supplier-field">
                                <label>
                                    <span>
                                        ספק *
                                    </span>
                                    <select
                                        value={
                                            selectedSupplier?.id ??
                                            ""
                                        }
                                        onChange={(event) => {
                                            const supplier =
                                                suppliers.find(
                                                    (item) =>
                                                        item.id ===
                                                        event.target.value,
                                                );
                                            setSupplierName(
                                                supplier?.name ??
                                                "",
                                            );
                                            setError(null);
                                            setSuccess(null);
                                        }}
                                    >
                                        <option value="">
                                            בחר ספק
                                        </option>
                                        {suppliers.map(
                                            (supplier) => (
                                                <option
                                                    key={supplier.id}
                                                    value={supplier.id}
                                                >
                                                    {supplier.name}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </label>
                                <button
                                    type="button"
                                    className="supplier-invoice__inline-action"
                                    onClick={openQuickSupplier}
                                >
                                    + ספק חדש
                                </button>
                            </div>

                            <label>
                                <span>
                                    מס׳ חשבונית ספק *
                                </span>
                                <input
                                    value={
                                        supplierInvoiceNumber
                                    }
                                    onChange={(event) => {
                                        setSupplierInvoiceNumber(
                                            event.target
                                                .value,
                                        );
                                        setError(null);
                                        setSuccess(null);
                                    }}
                                    placeholder="לדוגמה 45872"
                                />
                            </label>

                            <label>
                                <span>
                                    תאריך חשבונית *
                                </span>
                                <input
                                    type="date"
                                    value={
                                        invoiceDate
                                    }
                                    onChange={(event) =>
                                        setInvoiceDate(
                                            event.target
                                                .value,
                                        )
                                    }
                                />
                            </label>

                            <label>
                                <span>
                                    מקבל הסחורה *
                                </span>
                                <select
                                    value={
                                        employeeId
                                    }
                                    onChange={(event) =>
                                        setEmployeeId(
                                            event.target
                                                .value,
                                        )
                                    }
                                >
                                    <option value="">
                                        בחר עובד
                                    </option>
                                    {employees.map(
                                        (employee) => (
                                            <option
                                                key={
                                                    employee.id
                                                }
                                                value={
                                                    employee.id
                                                }
                                            >
                                                {employee.name}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>

                            <label className="supplier-invoice__note-field">
                                <span>
                                    הערה
                                </span>
                                <input
                                    value={
                                        note
                                    }
                                    onChange={(event) =>
                                        setNote(
                                            event.target
                                                .value,
                                        )
                                    }
                                    placeholder="הערה למסמך (אופציונלי)"
                                />
                            </label>
                        </div>
                    </section>

                    <section className="supplier-invoice__attachments-card">
                        <header>
                            <div>
                                <strong>
                                    צילום / קובץ חשבונית
                                </strong>
                                <span>
                                    ״צלם חשבונית״ מיועד למצלמה בטלפון/טאבלט; ״בחר קובץ״ בוחר צילום או PDF שכבר קיים.
                                </span>
                            </div>
                            <div className="supplier-invoice__attachment-actions">
                                <label>
                                    צלם חשבונית
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={(event) => {
                                            void addAttachmentFiles(
                                                event.target.files,
                                            );
                                            event.target.value = "";
                                        }}
                                    />
                                </label>
                                <label>
                                    בחר קובץ
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,application/pdf,.pdf"
                                        multiple
                                        onChange={(event) => {
                                            void addAttachmentFiles(
                                                event.target.files,
                                            );
                                            event.target.value = "";
                                        }}
                                    />
                                </label>
                            </div>
                        </header>

                        {attachments.length > 0 ? (
                            <div className="supplier-invoice__attachment-list">
                                {attachments.map(
                                    (attachment) => (
                                        <div
                                            key={attachment.id}
                                            className="supplier-invoice__attachment-item"
                                        >
                                            <div>
                                                <strong>
                                                    {attachment.fileName}
                                                </strong>
                                                <span>
                                                    {formatFileSize(
                                                        attachment.size,
                                                    )}
                                                </span>
                                            </div>
                                            <div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        void openAttachment(
                                                            attachment,
                                                        )
                                                    }
                                                >
                                                    פתח
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeAttachment(
                                                            attachment,
                                                        )
                                                    }
                                                >
                                                    הסר
                                                </button>
                                            </div>
                                        </div>
                                    ),
                                )}
                            </div>
                        ) : (
                            <div className="supplier-invoice__attachment-empty">
                                אין קובץ מצורף.
                            </div>
                        )}
                    </section>

                    <section className="supplier-invoice__lines-card">
                        <div className="supplier-invoice__lines-toolbar">
                            <div>
                                <strong>
                                    פריטי החשבונית
                                </strong>
                                <span>
                                    עלות ליחידה לפני מע״מ
                                </span>
                            </div>

                            <input
                                type="search"
                                value={
                                    search
                                }
                                onChange={(event) =>
                                    setSearch(
                                        event.target
                                            .value,
                                    )
                                }
                                placeholder="חיפוש לפי פריט, SKU או ברקוד"
                            />
                        </div>

                        {!supplierName.trim() && (
                            <div className="supplier-invoice__hint">
                                בחר ספק כדי לסנן את הפריטים המשויכים אליו.
                            </div>
                        )}

                        <div className="supplier-invoice__table-wrap">
                            <table className="supplier-invoice__table">
                                <thead>
                                    <tr>
                                        <th>
                                            פריט
                                        </th>
                                        <th>
                                            SKU
                                        </th>
                                        <th>
                                            מלאי נוכחי
                                        </th>
                                        <th>
                                            כמות שהתקבלה
                                        </th>
                                        <th>
                                            עלות יח׳ לפני מע״מ
                                        </th>
                                        <th>
                                            נטו שורה
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleRows.map(
                                        (row) => {
                                            const draft =
                                                getLineDraft(
                                                    row,
                                                );
                                            const quantity =
                                                Number(
                                                    draft.quantity,
                                                );
                                            const unitCost =
                                                parseDecimal(
                                                    draft.unitCost,
                                                );
                                            const lineNet =
                                                draft.quantity.trim() &&
                                                draft.unitCost.trim() &&
                                                Number.isFinite(
                                                    quantity,
                                                ) &&
                                                Number.isFinite(
                                                    unitCost,
                                                )
                                                    ? quantity *
                                                      unitCost
                                                    : 0;

                                            return (
                                                <tr
                                                    key={
                                                        row.key
                                                    }
                                                >
                                                    <td>
                                                        <strong>
                                                            {row.name}
                                                        </strong>
                                                        {row.variantName && (
                                                            <small>
                                                                {row.variantName}
                                                            </small>
                                                        )}
                                                    </td>
                                                    <td className="supplier-invoice__mono">
                                                        {row.sku}
                                                    </td>
                                                    <td>
                                                        {formatQuantity(
                                                            row.currentQuantity,
                                                        )}
                                                    </td>
                                                    <td>
                                                        <input
                                                            className="supplier-invoice__line-input"
                                                            inputMode="numeric"
                                                            value={
                                                                draft.quantity
                                                            }
                                                            onChange={(event) =>
                                                                setLineField(
                                                                    row,
                                                                    "quantity",
                                                                    event.target.value,
                                                                )
                                                            }
                                                            onKeyDown={(event) => {
                                                                const blocked =
                                                                    quantityScannerGuard.handleKeyDown({
                                                                        fieldKey:
                                                                            row.key,
                                                                        key:
                                                                            event.key,
                                                                        onDetected:
                                                                            () =>
                                                                                rejectLineQuantity(
                                                                                    row,
                                                                                ),
                                                                    });

                                                                if (blocked) {
                                                                    event.preventDefault();
                                                                }
                                                            }}
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            data-lumora-numeric-safe="supplier-unit-cost"
                                                            className="supplier-invoice__line-input"
                                                            inputMode="decimal"
                                                            value={
                                                                draft.unitCost
                                                            }
                                                            onChange={(event) =>
                                                                setLineField(
                                                                    row,
                                                                    "unitCost",
                                                                    event.target.value,
                                                                )
                                                            }
                                                            placeholder="0.00"
                                                        />
                                                    </td>
                                                    <td className="supplier-invoice__money">
                                                        {lineNet > 0
                                                            ? formatMoney(
                                                                  lineNet,
                                                              )
                                                            : "—"}
                                                    </td>
                                                </tr>
                                            );
                                        },
                                    )}

                                    {visibleRows.length ===
                                        0 && (
                                        <tr>
                                            <td
                                                colSpan={
                                                    6
                                                }
                                                className="supplier-invoice__empty"
                                            >
                                                אין פריטים להצגה עבור הספק / החיפוש הנוכחי.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <footer className="supplier-invoice__footer">
                        <div className="supplier-invoice__totals">
                            <span>
                                נטו
                                <strong>
                                    {formatMoney(
                                        previewTotals.net,
                                    )}
                                </strong>
                            </span>
                            <span>
                                מע״מ
                                <strong>
                                    {formatMoney(
                                        previewTotals.vat,
                                    )}
                                </strong>
                            </span>
                            <span className="supplier-invoice__total-main">
                                סה״כ כולל מע״מ
                                <strong>
                                    {formatMoney(
                                        previewTotals.gross,
                                    )}
                                </strong>
                            </span>
                        </div>

                        <div className="supplier-invoice__actions">
                            {currentDocumentId && (
                                <button
                                    type="button"
                                    className="supplier-invoice__danger"
                                    onClick={() =>
                                        setCancelDraftConfirmOpen(
                                            true,
                                        )
                                    }
                                >
                                    ביטול טיוטה
                                </button>
                            )}
                            <button
                                type="button"
                                className="supplier-invoice__secondary"
                                onClick={() => {
                                    void saveDraft();
                                }}
                            >
                                שמירת טיוטה
                            </button>
                            <button
                                type="button"
                                className="supplier-invoice__primary"
                                onClick={() => {
                                    void postInvoice();
                                }}
                            >
                                קליטה מלאה
                            </button>
                        </div>
                    </footer>
                </>
            ) : (
                <section className="supplier-invoice__documents-card">
                    <header>
                        <div>
                            <p>
                                מסמכים
                            </p>
                            <h2>
                                חשבוניות ספק
                            </h2>
                            <span>
                                טיוטה אינה משנה מלאי. מסמך מאושר מציג את כל שורות הקליטה והעלות.
                            </span>
                        </div>
                        <strong className="supplier-invoice__documents-count">
                            {filteredDocuments.length}
                        </strong>
                    </header>

                    <div className="supplier-invoice__document-filters">
                        <label>
                            ספק
                            <input
                                value={documentSupplierFilter}
                                onChange={(event) =>
                                    setDocumentSupplierFilter(
                                        event.target.value,
                                    )
                                }
                                placeholder="שם ספק"
                            />
                        </label>
                        <label>
                            מספר מסמך / חשבונית
                            <input
                                value={documentNumberFilter}
                                onChange={(event) =>
                                    setDocumentNumberFilter(
                                        event.target.value,
                                    )
                                }
                                placeholder="SI-... או מספר ספק"
                            />
                        </label>
                        <label>
                            מתאריך
                            <input
                                type="date"
                                value={documentFromDate}
                                onChange={(event) =>
                                    setDocumentFromDate(
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            עד תאריך
                            <input
                                type="date"
                                value={documentToDate}
                                onChange={(event) =>
                                    setDocumentToDate(
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            סטטוס
                            <select
                                value={documentStatusFilter}
                                onChange={(event) =>
                                    setDocumentStatusFilter(
                                        event.target.value as
                                            | "all"
                                            | "draft"
                                            | "posted"
                                            | "cancelled",
                                    )
                                }
                            >
                                <option value="all">הכול</option>
                                <option value="draft">טיוטה</option>
                                <option value="posted">מאושר</option>
                                <option value="cancelled">מבוטל</option>
                            </select>
                        </label>
                        <label>
                            מקבל
                            <input
                                value={documentReceiverFilter}
                                onChange={(event) =>
                                    setDocumentReceiverFilter(
                                        event.target.value,
                                    )
                                }
                                placeholder="שם עובד"
                            />
                        </label>
                        <button
                            type="button"
                            onClick={resetDocumentFilters}
                        >
                            איפוס סינון
                        </button>
                    </div>

                    {hydrating ? (
                        <div className="supplier-invoice__empty">
                            טוען חשבוניות ספק...
                        </div>
                    ) : (
                        <div className="supplier-invoice__documents-table-wrap">
                            <table className="supplier-invoice__documents-table">
                                <thead>
                                    <tr>
                                        <th>
                                            מסמך
                                        </th>
                                        <th>
                                            סטטוס
                                        </th>
                                        <th>
                                            ספק
                                        </th>
                                        <th>
                                            מס׳ אצל ספק
                                        </th>
                                        <th>
                                            תאריך
                                        </th>
                                        <th>
                                            מקבל
                                        </th>
                                        <th>
                                            שורות
                                        </th>
                                        <th>
                                            סה״כ
                                        </th>
                                        <th>
                                            פעולה
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDocuments.map(
                                        (document) => (
                                            <tr
                                                key={
                                                    document.id
                                                }
                                            >
                                                <td>
                                                    <strong>
                                                        {document.documentNumber ??
                                                            "טיוטה"}
                                                    </strong>
                                                </td>
                                                <td>
                                                    <span
                                                        className={
                                                            document.status ===
                                                            "posted"
                                                                ? "supplier-invoice__status supplier-invoice__status--posted"
                                                                : document.status ===
                                                                  "cancelled"
                                                                    ? "supplier-invoice__status supplier-invoice__status--cancelled"
                                                                    : "supplier-invoice__status supplier-invoice__status--draft"
                                                        }
                                                    >
                                                        {document.status ===
                                                        "posted"
                                                            ? "מאושר"
                                                            : document.status ===
                                                              "cancelled"
                                                                ? "מבוטל"
                                                                : "טיוטה"}
                                                    </span>
                                                </td>
                                                <td>
                                                    {document.supplier.name ||
                                                        "—"}
                                                </td>
                                                <td>
                                                    {document.supplierInvoiceNumber ||
                                                        "—"}
                                                </td>
                                                <td>
                                                    {formatDate(
                                                        document.invoiceDate,
                                                    )}
                                                </td>
                                                <td>
                                                    {document.receivedBy
                                                        ?.employeeName ??
                                                        "—"}
                                                </td>
                                                <td>
                                                    {document.lines.length}
                                                </td>
                                                <td className="supplier-invoice__money">
                                                    {formatMoney(
                                                        document.totals.gross,
                                                    )}
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="supplier-invoice__open"
                                                        onClick={() =>
                                                            openDraft(
                                                                document,
                                                            )
                                                        }
                                                    >
                                                        {document.status ===
                                                        "draft"
                                                            ? "המשך"
                                                            : "פתח"}
                                                    </button>
                                                </td>
                                            </tr>
                                        ),
                                    )}

                                    {filteredDocuments.length ===
                                        0 && (
                                        <tr>
                                            <td
                                                colSpan={
                                                    9
                                                }
                                                className="supplier-invoice__empty"
                                            >
                                                עדיין אין חשבוניות ספק.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {selectedDocument &&
                        selectedDocument.status !==
                            "draft" && (
                        <article className="supplier-invoice__document-detail">
                            <header>
                                <div>
                                    <p>
                                        מסמך ספק
                                    </p>
                                    <h3>
                                        {selectedDocument.documentNumber ??
                                            "טיוטה מבוטלת"}
                                    </h3>
                                    <span>
                                        {selectedDocument.supplier.name} · חשבונית ספק {selectedDocument.supplierInvoiceNumber} · {formatDate(
                                            selectedDocument.invoiceDate,
                                        )}
                                    </span>
                                </div>
                                <div className="supplier-invoice__detail-badges">
                                    <span>
                                        {selectedDocument.lines.length} שורות
                                    </span>
                                    <span>
                                        {selectedDocument.status ===
                                        "posted"
                                            ? `נקלט ${formatDateTime(
                                                  selectedDocument.postedAt ??
                                                      selectedDocument.updatedAt,
                                              )}`
                                            : `בוטל ${formatDateTime(
                                                  selectedDocument.updatedAt,
                                              )}`}
                                    </span>
                                </div>
                            </header>

                            <div className="supplier-invoice__detail-table-wrap">
                                <table className="supplier-invoice__detail-table">
                                    <thead>
                                        <tr>
                                            <th>
                                                פריט
                                            </th>
                                            <th>
                                                SKU
                                            </th>
                                            <th>
                                                לפני
                                            </th>
                                            <th>
                                                התקבל
                                            </th>
                                            <th>
                                                אחרי
                                            </th>
                                            <th>
                                                עלות לפני מע״מ
                                            </th>
                                            <th>
                                                נטו
                                            </th>
                                            <th>
                                                מע״מ
                                            </th>
                                            <th>
                                                כולל
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedDocument.lines.map(
                                            (line) => (
                                                <tr
                                                    key={
                                                        line.key
                                                    }
                                                >
                                                    <td>
                                                        <strong>
                                                            {line.product.name}
                                                        </strong>
                                                        {line.product.variantLabel && (
                                                            <small>
                                                                {line.product.variantLabel}
                                                            </small>
                                                        )}
                                                    </td>
                                                    <td className="supplier-invoice__mono">
                                                        {line.product.sku}
                                                    </td>
                                                    <td>
                                                        {formatQuantity(
                                                            line.previousQuantity,
                                                        )}
                                                    </td>
                                                    <td className="supplier-invoice__positive">
                                                        +{formatQuantity(
                                                            line.receivedQuantity ??
                                                                0,
                                                        )}
                                                    </td>
                                                    <td>
                                                        {formatQuantity(
                                                            line.resultingQuantity ??
                                                                line.previousQuantity,
                                                        )}
                                                    </td>
                                                    <td>
                                                        {line.unitCostBeforeVat !==
                                                        null
                                                            ? formatMoney(
                                                                  line.unitCostBeforeVat,
                                                              )
                                                            : "—"}
                                                    </td>
                                                    <td>
                                                        {formatMoney(
                                                            line.lineNet,
                                                        )}
                                                    </td>
                                                    <td>
                                                        {formatMoney(
                                                            line.lineVat,
                                                        )}
                                                    </td>
                                                    <td className="supplier-invoice__money">
                                                        {formatMoney(
                                                            line.lineGross,
                                                        )}
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {selectedDocument.attachments.length > 0 && (
                                <section className="supplier-invoice__detail-attachments">
                                    <strong>
                                        קבצים מצורפים
                                    </strong>
                                    <div>
                                        {selectedDocument.attachments.map(
                                            (attachment) => (
                                                <button
                                                    type="button"
                                                    key={attachment.id}
                                                    onClick={() =>
                                                        void openAttachment(
                                                            attachment,
                                                        )
                                                    }
                                                >
                                                    {attachment.fileName} · {formatFileSize(
                                                        attachment.size,
                                                    )}
                                                </button>
                                            ),
                                        )}
                                    </div>
                                </section>
                            )}

                            <footer className="supplier-invoice__detail-totals">
                                <span>
                                    נטו: <strong>{formatMoney(
                                        selectedDocument.totals.net,
                                    )}</strong>
                                </span>
                                <span>
                                    מע״מ: <strong>{formatMoney(
                                        selectedDocument.totals.vat,
                                    )}</strong>
                                </span>
                                <span>
                                    סה״כ: <strong>{formatMoney(
                                        selectedDocument.totals.gross,
                                    )}</strong>
                                </span>
                            </footer>
                        </article>
                    )}
                </section>
            )}

            {attachmentPreview && (
                <div
                    className="supplier-invoice__overlay"
                    role="presentation"
                    onMouseDown={() =>
                        setAttachmentPreview(null)
                    }
                >
                    <section
                        className="supplier-invoice__attachment-preview"
                        role="dialog"
                        aria-modal="true"
                        aria-label="תצוגת קובץ מצורף"
                        onMouseDown={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <header>
                            <div>
                                <p>קובץ מצורף</p>
                                <h2>
                                    {attachmentPreview.attachment.fileName}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    setAttachmentPreview(null)
                                }
                                aria-label="סגור"
                            >
                                ×
                            </button>
                        </header>
                        <div className="supplier-invoice__attachment-preview-body">
                            {attachmentPreview.attachment.mimeType.startsWith(
                                "image/",
                            ) ? (
                                <img
                                    src={attachmentPreview.dataUrl}
                                    alt={attachmentPreview.attachment.fileName}
                                />
                            ) : (
                                <iframe
                                    src={attachmentPreview.dataUrl}
                                    title={attachmentPreview.attachment.fileName}
                                />
                            )}
                        </div>
                    </section>
                </div>
            )}

            {quickSupplierOpen && (
                <div
                    className="supplier-invoice__overlay"
                    role="presentation"
                    onMouseDown={() =>
                        setQuickSupplierOpen(false)
                    }
                >
                    <section
                        className="supplier-invoice__dialog"
                        role="dialog"
                        aria-modal="true"
                        onMouseDown={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <header>
                            <div>
                                <p>ספק</p>
                                <h2>ספק חדש</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    setQuickSupplierOpen(false)
                                }
                            >
                                ×
                            </button>
                        </header>
                        <div className="supplier-invoice__quick-supplier-form">
                            <label>
                                שם ספק *
                                <input
                                    value={quickSupplierName}
                                    onChange={(event) =>
                                        setQuickSupplierName(
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                            <label>
                                ח.פ./ע.מ *
                                <input
                                    required
                                    value={quickSupplierBusinessNumber}
                                    onChange={(event) =>
                                        setQuickSupplierBusinessNumber(
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                            <label>
                                איש קשר
                                <input
                                    value={quickSupplierContactName}
                                    onChange={(event) =>
                                        setQuickSupplierContactName(
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                            <label>
                                טלפון
                                <input
                                    value={quickSupplierPhone}
                                    onChange={(event) =>
                                        setQuickSupplierPhone(
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>
                        </div>
                        <footer>
                            <button
                                type="button"
                                className="supplier-invoice__secondary"
                                onClick={() =>
                                    setQuickSupplierOpen(false)
                                }
                            >
                                ביטול
                            </button>
                            <button
                                type="button"
                                className="supplier-invoice__primary"
                                onClick={createQuickSupplier}
                            >
                                שמירת ספק
                            </button>
                        </footer>
                    </section>
                </div>
            )}

            {cancelDraftConfirmOpen && (
                <div
                    className="supplier-invoice__overlay"
                    role="presentation"
                    onMouseDown={() =>
                        setCancelDraftConfirmOpen(false)
                    }
                >
                    <section
                        className="supplier-invoice__dialog supplier-invoice__dialog--confirm"
                        role="alertdialog"
                        aria-modal="true"
                        onMouseDown={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <header>
                            <div>
                                <p>טיוטה</p>
                                <h2>ביטול טיוטת חשבונית</h2>
                            </div>
                        </header>
                        <div className="supplier-invoice__confirm-copy">
                            הטיוטה תסומן כמבוטלת ותישמר בהיסטוריה. לא יתבצע שינוי במלאי.
                        </div>
                        <footer>
                            <button
                                type="button"
                                className="supplier-invoice__secondary"
                                onClick={() =>
                                    setCancelDraftConfirmOpen(false)
                                }
                            >
                                חזרה
                            </button>
                            <button
                                type="button"
                                className="supplier-invoice__danger"
                                onClick={confirmCancelDraft}
                            >
                                ביטול הטיוטה
                            </button>
                        </footer>
                    </section>
                </div>
            )}
        </section>
    );
}

export default SupplierInvoicePage;
