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
    getSupplierInvoices,
    hydrateSupplierInvoices,
} from "../../models/inventory/SupplierInvoiceRepository";

import type {
    SupplierInvoiceDocument,
    SupplierInvoiceDocumentLine,
} from "../../models/inventory/SupplierInvoice";

import {
    cancelSupplierReturnDraft,
    getReturnedQuantityForSourceLine,
    getSupplierReturn,
    getSupplierReturns,
    hydrateSupplierReturns,
    postSupplierReturn,
    saveSupplierReturnDraft,
} from "../../models/inventory/SupplierReturnRepository";

import type {
    SupplierReturnDocument,
    SupplierReturnDocumentLine,
} from "../../models/inventory/SupplierReturn";

import {
    ensureSuppliersFromProducts,
    getSuppliers,
    hydrateSuppliers,
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
    rejectBarcodeLikeNumericInput,
} from "../../utils/numericInputSafety";

import "./supplier-return-page.css";

/* LUMORA QUANTITY SAFETY V1.2 */

type ProductVariant =
    NonNullable<Product["variants"]>[number];

type ReturnRow = {
    key: string;
    product: Product;
    variant?: ProductVariant;
    name: string;
    variantName: string;
    sku: string;
    currentQuantity: number;
    maxReturnQuantity: number;
    defaultUnitCost: number;
    sourceLine?:
        SupplierInvoiceDocumentLine;
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

function normalize(value: string) {
    return value
        .trim()
        .toLocaleLowerCase();
}

function parseDecimal(value: string) {
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

function formatQuantity(value: number) {
    return new Intl.NumberFormat(
        "he-IL",
        {
            maximumFractionDigits: 3,
        },
    ).format(value);
}

function formatMoney(value: number) {
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

function formatDate(value: string) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString(
        "he-IL",
    );
}

function formatDateTime(value: string) {
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

function formatFileSize(size: number) {
    if (size < 1024) {
        return `${size} B`;
    }

    if (size < 1024 * 1024) {
        return `${Math.round(size / 1024)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function roundMoney(value: number) {
    return Math.round(
        (value + Number.EPSILON) *
            100,
    ) / 100;
}

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

type SupplierReturnPageProps = {
    openDocumentNumber?: string;
    openRequestId?: number;
};

/* LUMORA SUPPLIER RETURN ACTION FEEDBACK V1 */
function SupplierReturnPage({
    openDocumentNumber,
    openRequestId,
}: SupplierReturnPageProps) {
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
    const [sourceInvoiceId, setSourceInvoiceId] =
        useState("");
    const [returnDate, setReturnDate] =
        useState(todayValue);
    const [supplierReferenceNumber, setSupplierReferenceNumber] =
        useState("");
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
    const [attachments, setAttachments] =
        useState<AttachmentDraft[]>([]);
    const [removedAttachmentIds, setRemovedAttachmentIds] =
        useState<string[]>([]);
    const [attachmentPreview, setAttachmentPreview] =
        useState<AttachmentPreview | null>(null);
    const [currentDocumentId, setCurrentDocumentId] =
        useState<string | null>(null);
    const [selectedDocumentId, setSelectedDocumentId] =
        useState<string | null>(null);
    const [revision, setRevision] =
        useState(0);
    const [ready, setReady] =
        useState(false);
    const [hydrating, setHydrating] =
        useState(true);
    const [error, setError] =
        useState<string | null>(null);
    const [success, setSuccess] =
        useState<string | null>(null);

    const [
        quantityApprovalKey,
        setQuantityApprovalKey,
    ] = useState<string | null>(null);

    const quantityScannerGuard =
        useQuantityScannerGuard();
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

    useEffect(() => {
        let active = true;

        Promise.all([
            hydrateSupplierReturns(),
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
                setRevision(
                    (value) =>
                        value + 1,
                );
                setReady(true);
                setHydrating(false);
            })
            .catch(() => {
                if (!active) {
                    return;
                }

                setReady(false);
                setHydrating(false);
                setError(
                    "לא ניתן לטעון את מסמכי ההחזרה לספק.",
                );
            });

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (
            !ready ||
            !openDocumentNumber
        ) {
            return;
        }

        const document =
            getSupplierReturns().find(
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
        ready,
    ]);

    void revision;

    const suppliers =
        getSuppliers().filter(
            (supplier) =>
                supplier.isActive,
        );

    const selectedSupplier =
        suppliers.find(
            (supplier) =>
                normalize(
                    supplier.name,
                ) ===
                normalize(
                    supplierName,
                ),
        );

    const postedInvoices =
        getSupplierInvoices().filter(
            (document) =>
                document.status ===
                    "posted" &&
                (
                    !supplierName ||
                    normalize(
                        document.supplier.name,
                    ) ===
                        normalize(
                            supplierName,
                        )
                ),
        );

    const selectedSourceInvoice:
        SupplierInvoiceDocument | undefined =
        sourceInvoiceId
            ? postedInvoices.find(
                  (document) =>
                      document.id ===
                      sourceInvoiceId,
              )
            : undefined;

    const rows =
        useMemo<ReturnRow[]>(
            () => {
                if (selectedSourceInvoice) {
                    return selectedSourceInvoice.lines
                        .map(
                            (sourceLine):
                            ReturnRow | null => {
                                const product =
                                    products.find(
                                        (item) =>
                                            item.id ===
                                            sourceLine.product.id,
                                    );

                                if (!product) {
                                    return null;
                                }

                                const variant =
                                    sourceLine.product.variantId
                                        ? product.variants?.find(
                                              (item) =>
                                                  item.variantId ===
                                                  sourceLine.product.variantId,
                                          )
                                        : undefined;

                                const currentQuantity =
                                    variant
                                        ? variant.stockOnHand ?? 0
                                        : product.stockOnHand ?? 0;

                                const alreadyReturned =
                                    getReturnedQuantityForSourceLine(
                                        selectedSourceInvoice.id,
                                        sourceLine.key,
                                        currentDocumentId ??
                                            undefined,
                                    );

                                const sourceAvailable =
                                    Math.max(
                                        0,
                                        (sourceLine.receivedQuantity ?? 0) -
                                            alreadyReturned,
                                    );

                                return {
                                    key:
                                        `source:${selectedSourceInvoice.id}:${sourceLine.key}`,
                                    product,
                                    variant,
                                    name:
                                        sourceLine.product.name,
                                    variantName:
                                        sourceLine.product.variantLabel ?? "",
                                    sku:
                                        sourceLine.product.sku,
                                    currentQuantity,
                                    maxReturnQuantity:
                                        Math.min(
                                            currentQuantity,
                                            sourceAvailable,
                                        ),
                                    defaultUnitCost:
                                        sourceLine.unitCostBeforeVat ??
                                        product.costPrice ??
                                        0,
                                    sourceLine,
                                };
                            },
                        )
                        .filter(
                            (row): row is ReturnRow =>
                                Boolean(row),
                        );
                }

                return products
                    .filter(
                        (product) =>
                            product.isActive &&
                            (
                                !supplierName ||
                                normalize(
                                    product.supplier?.name ?? "",
                                ) ===
                                    normalize(
                                        supplierName,
                                    )
                            ),
                    )
                    .flatMap(
                        (product): ReturnRow[] => {
                            if (product.variants?.length) {
                                return product.variants
                                    .filter(
                                        (variant) =>
                                            variant.isActive,
                                    )
                                    .map(
                                        (variant) => ({
                                        key:
                                            `product:${product.id}:${variant.variantId}`,
                                        product,
                                        variant,
                                        name:
                                            displayName(product),
                                        variantName:
                                            `${variant.color.name} · ${variant.size.name}`,
                                        sku:
                                            variant.sku,
                                        currentQuantity:
                                            variant.stockOnHand ?? 0,
                                        maxReturnQuantity:
                                            variant.stockOnHand ?? 0,
                                        defaultUnitCost:
                                            product.costPrice ?? 0,
                                    }),
                                );
                            }

                            return [{
                                key:
                                    `product:${product.id}:base`,
                                product,
                                name:
                                    displayName(product),
                                variantName: "",
                                sku:
                                    product.sku,
                                currentQuantity:
                                    product.stockOnHand ?? 0,
                                maxReturnQuantity:
                                    product.stockOnHand ?? 0,
                                defaultUnitCost:
                                    product.costPrice ?? 0,
                            }];
                        },
                    );
            },
            [
                products,
                supplierName,
                selectedSourceInvoice,
                currentDocumentId,
                revision,
            ],
        );

    const visibleRows =
        useMemo(() => {
            const value =
                normalize(search);

            return rows.filter(
                (row) =>
                    !value ||
                    [
                        row.name,
                        row.variantName,
                        row.sku,
                        row.product.barcode,
                    ].some(
                        (field) =>
                            normalize(field)
                                .includes(value),
                    ),
            );
        }, [rows, search]);

    const documents =
        getSupplierReturns();

    const selectedDocument =
        selectedDocumentId
            ? getSupplierReturn(
                  selectedDocumentId,
              )
            : undefined;

    const currentDocument =
        currentDocumentId
            ? getSupplierReturn(
                  currentDocumentId,
              )
            : undefined;

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
                        document.supplierReferenceNumber,
                        document.sourceSupplierInvoice
                            ?.documentNumber ?? "",
                        document.sourceSupplierInvoice
                            ?.supplierInvoiceNumber ?? "",
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
                    documentStatusFilter !== "all" &&
                    document.status !==
                        documentStatusFilter
                ) {
                    return false;
                }

                if (
                    documentFromDate &&
                    document.returnDate <
                        documentFromDate
                ) {
                    return false;
                }

                if (
                    documentToDate &&
                    document.returnDate >
                        documentToDate
                ) {
                    return false;
                }

                return true;
            },
        );

    function getLineDraft(
        row: ReturnRow,
    ): LineDraft {
        return (
            lineDrafts[row.key] ?? {
                quantity: "",
                unitCost:
                    String(
                        row.defaultUnitCost,
                    ),
            }
        );
    }

    function rejectLineQuantity(
        row: ReturnRow,
    ) {
        setLineDrafts(
            (current) => {
                const existing =
                    current[row.key] ?? {
                        quantity: "",
                        unitCost:
                            String(
                                row.defaultUnitCost,
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
        setSuccess(null);
    }

    function setLineField(
        row: ReturnRow,
        field: keyof LineDraft,
        value: string,
    ) {
        /* LUMORA SUPPLIER RETURN COST BARCODE GUARD V1 */
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
                            String(
                                row.defaultUnitCost,
                            ),
                    };

                return {
                    ...current,
                    [row.key]: {
                        ...existing,
                        [field]: value,
                    },
                };
            },
        );
        setError(null);
        setSuccess(null);
    }

    function buildLines(
        requireComplete: boolean,
    ):
    SupplierReturnDocumentLine[] | null {
        const result:
            SupplierReturnDocumentLine[] = [];

        for (const row of rows) {
            const draft =
                getLineDraft(row);

            const quantityText =
                draft.quantity.trim();
            const unitCostText =
                draft.unitCost.trim();

            if (!quantityText) {
                continue;
            }

            const quantityAssessment =
                assessQuantityText({
                    raw: quantityText,
                    context: "supplier_return",
                    min: 1,
                    max: Math.floor(
                        row.maxReturnQuantity,
                    ),
                });

            if (!quantityAssessment.ok) {
                if (requireComplete) {
                    setError(
                        (quantityAssessment.message ?? "") + " פריט: " + row.name + ".",
                    );
                    return null;
                }

                continue;
            }

            const quantity =
                quantityAssessment.quantity ??
                Number.NaN;
            const unitCost =
                unitCostText
                    ? parseDecimal(
                          unitCostText,
                      )
                    : NaN;

            if (
                !Number.isInteger(quantity) ||
                quantity <= 0
            ) {
                setError(
                    `כמות ההחזרה עבור ${row.name} חייבת להיות מספר שלם גדול מאפס.`,
                );
                return null;
            }

            if (
                quantity >
                row.maxReturnQuantity
            ) {
                setError(
                    `אי אפשר להחזיר ${formatQuantity(quantity)} יחידות של ${row.name}. המקסימום כרגע הוא ${formatQuantity(row.maxReturnQuantity)}.`,
                );
                return null;
            }

            if (
                !Number.isFinite(unitCost) ||
                unitCost < 0
            ) {
                if (requireComplete) {
                    setError(
                        `עלות ההחזרה אינה תקינה עבור ${row.name}.`,
                    );
                    return null;
                }
            }

            const numericUnitCost =
                Number.isFinite(unitCost) &&
                unitCost >= 0
                    ? unitCost
                    : 0;

            const vatRate =
                resolveProductTaxRate(
                    row.product.taxClass ??
                        "standard",
                );
            const lineNet =
                roundMoney(
                    quantity *
                        numericUnitCost,
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
                        row.variant?.variantId,
                    variantLabel:
                        row.variantName ||
                        undefined,
                },
                sourceInvoiceLineKey:
                    row.sourceLine?.key,
                previousQuantity:
                    row.currentQuantity,
                returnedQuantity:
                    quantity,
                resultingQuantity:
                    row.currentQuantity -
                    quantity,
                unitCostBeforeVat:
                    numericUnitCost,
                enteredQuantity:
                    draft.quantity,
                enteredUnitCost:
                    draft.unitCost,
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
            SupplierReturnDocumentLine[],
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

    function buildPreviewLines():
    SupplierReturnDocumentLine[] {
        const result:
            SupplierReturnDocumentLine[] = [];

        for (const row of rows) {
            const draft =
                getLineDraft(row);
            const quantity =
                parseDecimal(
                    draft.quantity,
                );
            const unitCost =
                parseDecimal(
                    draft.unitCost,
                );

            if (
                !Number.isFinite(quantity) ||
                quantity <= 0 ||
                !Number.isFinite(unitCost) ||
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
                    quantity * unitCost,
                );
            const lineVat =
                roundMoney(
                    lineNet * vatRate,
                );

            result.push({
                key: row.key,
                product: {
                    id: row.product.id,
                    name: row.name,
                    sku: row.sku,
                    variantId:
                        row.variant?.variantId,
                    variantLabel:
                        row.variantName ||
                        undefined,
                },
                sourceInvoiceLineKey:
                    row.sourceLine?.key,
                previousQuantity:
                    row.currentQuantity,
                returnedQuantity:
                    quantity,
                resultingQuantity:
                    row.currentQuantity -
                    quantity,
                unitCostBeforeVat:
                    unitCost,
                enteredQuantity:
                    draft.quantity,
                enteredUnitCost:
                    draft.unitCost,
                vatRate,
                lineNet,
                lineVat,
                lineGross:
                    roundMoney(
                        lineNet + lineVat,
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
        setSourceInvoiceId("");
        setReturnDate(todayValue());
        setSupplierReferenceNumber("");
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
        setWorkspaceView("edit");
    }

    function openDraft(
        document:
            SupplierReturnDocument,
    ) {
        if (document.status !== "draft") {
            setSelectedDocumentId(
                document.id,
            );
            return;
        }

        setSupplierName(
            document.supplier.name,
        );
        setSourceInvoiceId(
            document.sourceSupplierInvoice
                ?.id ?? "",
        );
        setReturnDate(
            document.returnDate ||
            todayValue(),
        );
        setSupplierReferenceNumber(
            document.supplierReferenceNumber,
        );
        setEmployeeId(
            document.returnedBy
                ?.employeeId ?? "",
        );
        setNote(document.note);
        setSearch("");
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
        setAttachments(
            document.attachments.map(
                (attachment) => ({
                    ...attachment,
                }),
            ),
        );
        setRemovedAttachmentIds([]);
        setCurrentDocumentId(
            document.id,
        );
        setSelectedDocumentId(null);
        setError(null);
        setSuccess(null);
        setWorkspaceView("edit");
    }

    async function addAttachmentFiles(
        files: FileList | null,
    ) {
        if (!files?.length) {
            return;
        }

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
        attachment:
            SupplierDocumentAttachment,
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

    function sourceInvoiceSnapshot() {
        return selectedSourceInvoice
            ? {
                  id:
                      selectedSourceInvoice.id,
                  documentNumber:
                      selectedSourceInvoice.documentNumber,
                  supplierInvoiceNumber:
                      selectedSourceInvoice.supplierInvoiceNumber,
              }
            : undefined;
    }

    async function saveDraft() {
        setError(null);
        setSuccess(null);

        if (!ready) {
            setError(
                "המסמכים עדיין נטענים.",
            );
            return;
        }

        const lines =
            buildLines(false);

        if (!lines) {
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
            saveSupplierReturnDraft({
                documentId:
                    currentDocumentId ??
                    undefined,
                supplier: {
                    id:
                        selectedSupplier?.id,
                    name:
                        supplierName,
                },
                returnDate,
                supplierReferenceNumber,
                note,
                sourceSupplierInvoice:
                    sourceInvoiceSnapshot(),
                returnedBy:
                    selectedEmployee
                        ? {
                              employeeId:
                                  selectedEmployee.id,
                              employeeName:
                                  selectedEmployee.name,
                          }
                        : undefined,
                attachments:
                    attachmentMetadata(),
                lines,
                totals:
                    calculateTotals(lines),
            });

        setCurrentDocumentId(saved.id);
        setAttachments(
            saved.attachments.map(
                (attachment) => ({
                    ...attachment,
                }),
            ),
        );
        setRemovedAttachmentIds([]);
        setRevision(
            (value) =>
                value + 1,
        );
        setSuccess(
            "הטיוטה נשמרה. המלאי לא השתנה.",
        );
    }

    async function postReturn() {
        setError(null);
        setSuccess(null);

        if (!ready) {
            setError(
                "המסמכים עדיין נטענים.",
            );
            return;
        }

        if (!supplierName.trim()) {
            setError("יש לבחור ספק.");
            return;
        }

        if (!returnDate) {
            setError(
                "יש לבחור תאריך החזרה.",
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
                "יש לבחור עובד שמבצע את ההחזרה.",
            );
            return;
        }

        const lines =
            buildLines(true);

        if (!lines) {
            return;
        }

        if (lines.length === 0) {
            setError(
                "יש להזין לפחות שורת החזרה אחת.",
            );
            return;
        }

        const unusualLine =
            lines.find((line) => {
                const assessment =
                    assessQuantityText({
                        raw: String(
                            line.returnedQuantity,
                        ),
                        context: "supplier_return",
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
                        unusualLine.returnedQuantity,
                    ),
                    context: "supplier_return",
                    min: 1,
                });

            const approvalKey =
                unusualLine.key +
                ":" +
                String(
                    unusualLine.returnedQuantity,
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
                        " לחצו שוב על אישור ההחזרה כדי לאשר.",
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

        const linesByProduct =
            new Map<
                string,
                SupplierReturnDocumentLine[]
            >();

        for (const line of lines) {
            const current =
                linesByProduct.get(
                    line.product.id,
                ) ?? [];
            linesByProduct.set(
                line.product.id,
                [...current, line],
            );
        }

        for (
            const [
                productId,
                productLines,
            ] of linesByProduct
        ) {
            const product =
                products.find(
                    (item) =>
                        item.id === productId,
                );

            if (!product) {
                continue;
            }

            if (product.variants?.length) {
                const returnedByVariant =
                    new Map<string, number>();

                for (const line of productLines) {
                    if (!line.product.variantId) {
                        continue;
                    }

                    returnedByVariant.set(
                        line.product.variantId,
                        line.returnedQuantity ?? 0,
                    );
                }

                const variants =
                    product.variants.map(
                        (variant) => ({
                            ...variant,
                            stockOnHand:
                                Math.max(
                                    0,
                                    (variant.stockOnHand ?? 0) -
                                        (returnedByVariant.get(
                                            variant.variantId,
                                        ) ?? 0),
                                ),
                        }),
                    );

                updateProduct({
                    ...product,
                    variants,
                    stockOnHand:
                        variants.reduce(
                            (total, variant) =>
                                total +
                                (variant.stockOnHand ?? 0),
                            0,
                        ),
                });
            }
            else {
                const returnedQuantity =
                    productLines.reduce(
                        (total, line) =>
                            total +
                            (line.returnedQuantity ?? 0),
                        0,
                    );

                updateProduct({
                    ...product,
                    stockOnHand:
                        Math.max(
                            0,
                            (product.stockOnHand ?? 0) -
                                returnedQuantity,
                        ),
                });
            }
        }

        const posted =
            postSupplierReturn({
                documentId:
                    currentDocumentId ??
                    undefined,
                supplier: {
                    id:
                        selectedSupplier?.id,
                    name:
                        supplierName,
                },
                returnDate,
                supplierReferenceNumber,
                note,
                sourceSupplierInvoice:
                    sourceInvoiceSnapshot(),
                returnedBy: {
                    employeeId:
                        selectedEmployee.id,
                    employeeName:
                        selectedEmployee.name,
                },
                attachments:
                    attachmentMetadata(),
                lines,
                totals:
                    calculateTotals(lines),
            });

        setRevision(
            (value) =>
                value + 1,
        );
        clearEditor();
        setWorkspaceView("edit");
        setSuccess(
            `החזרה ${posted.documentNumber} נקלטה והמלאי הופחת. ניתן להתחיל החזרה חדשה.`,
        );
    }

    function confirmCancelDraft() {
        if (!currentDocumentId) {
            setCancelDraftConfirmOpen(false);
            return;
        }

        cancelSupplierReturnDraft(
            currentDocumentId,
        );
        setRevision(
            (value) =>
                value + 1,
        );
        clearEditor();
        setCancelDraftConfirmOpen(false);
        setWorkspaceView("edit");
        setSuccess(
            "טיוטת ההחזרה בוטלה. המלאי לא השתנה.",
        );
    }

    function resetDocumentFilters() {
        setDocumentSupplierFilter("");
        setDocumentNumberFilter("");
        setDocumentFromDate("");
        setDocumentToDate("");
        setDocumentStatusFilter("all");
    }

    return (
        <section
            className="supplier-return"
            dir="rtl"
        >
            <header className="supplier-return__header">
                <div>
                    <p className="supplier-return__eyebrow">
                        LUMORA INVENTORY
                    </p>
                    <h1>
                        החזרה לספק
                    </h1>
                    <p>
                        החזרת סחורה לספק. טיוטה אינה משנה מלאי; אישור מלא מפחית מלאי.
                    </p>
                </div>

                <button
                    type="button"
                    className="supplier-return__primary"
                    onClick={startNew}
                >
                    + החזרה חדשה
                </button>
            </header>

            <div className="supplier-return__view-tabs">
                <button
                    type="button"
                    className={
                        workspaceView === "edit"
                            ? "supplier-return__view-tab supplier-return__view-tab--active"
                            : "supplier-return__view-tab"
                    }
                    onClick={() =>
                        setWorkspaceView("edit")
                    }
                >
                    החזרה חדשה
                </button>
                <button
                    type="button"
                    className={
                        workspaceView === "documents"
                            ? "supplier-return__view-tab supplier-return__view-tab--active"
                            : "supplier-return__view-tab"
                    }
                    onClick={() =>
                        setWorkspaceView("documents")
                    }
                >
                    מסמכי החזרה
                    <span>
                        {documents.length}
                    </span>
                </button>
            </div>

            {workspaceView === "edit" ? (
                <>
                    <section className="supplier-return__meta-card">
                        <div className="supplier-return__internal-number">
                            <span>מספר החזרה פנימי · Lumora</span>
                            <strong>
                                {currentDocument?.documentNumber ??
                                    "יוקצה בעת אישור ההחזרה"}
                            </strong>
                            <small>
                                טיוטה אינה צורכת מספר מהנומרטור.
                            </small>
                        </div>
                        <div className="supplier-return__meta-grid">
                            <label>
                                ספק *
                                <select
                                    value={
                                        selectedSupplier?.id ?? ""
                                    }
                                    onChange={(event) => {
                                        const supplier =
                                            suppliers.find(
                                                (item) =>
                                                    item.id ===
                                                    event.target.value,
                                            );
                                        setSupplierName(
                                            supplier?.name ?? "",
                                        );
                                        setSourceInvoiceId("");
                                        setLineDrafts({});
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

                            <label>
                                חשבונית מקור
                                <select
                                    value={sourceInvoiceId}
                                    disabled={!supplierName}
                                    onChange={(event) => {
                                        setSourceInvoiceId(
                                            event.target.value,
                                        );
                                        setLineDrafts({});
                                    }}
                                >
                                    <option value="">
                                        החזרה עצמאית / ללא מסמך מקור
                                    </option>
                                    {postedInvoices.map(
                                        (invoice) => (
                                            <option
                                                key={invoice.id}
                                                value={invoice.id}
                                            >
                                                {invoice.documentNumber} · {invoice.supplierInvoiceNumber} · {formatDate(invoice.invoiceDate)}
                                            </option>
                                        ),
                                    )}
                                </select>
                            </label>

                            <label>
                                תאריך החזרה *
                                <input
                                    type="date"
                                    value={returnDate}
                                    onChange={(event) =>
                                        setReturnDate(
                                            event.target.value,
                                        )
                                    }
                                />
                            </label>

                            <label>
                                מס׳ החזרה / זיכוי אצל הספק
                                <input
                                    value={supplierReferenceNumber}
                                    onChange={(event) =>
                                        setSupplierReferenceNumber(
                                            event.target.value,
                                        )
                                    }
                                    placeholder="אופציונלי"
                                />
                            </label>

                            <label>
                                מבצע ההחזרה *
                                <select
                                    value={employeeId}
                                    onChange={(event) =>
                                        setEmployeeId(
                                            event.target.value,
                                        )
                                    }
                                >
                                    <option value="">
                                        בחר עובד
                                    </option>
                                    {employees.map(
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

                            <label className="supplier-return__note-field">
                                הערה
                                <input
                                    value={note}
                                    onChange={(event) =>
                                        setNote(
                                            event.target.value,
                                        )
                                    }
                                    placeholder="סיבת ההחזרה / הערה"
                                />
                            </label>
                        </div>
                    </section>

                    <section className="supplier-return__attachments-card">
                        <header>
                            <div>
                                <strong>
                                    צילום / קובץ מסמך החזרה
                                </strong>
                                <span>
                                    ״צלם מסמך״ מיועד למצלמה בטלפון/טאבלט; ״בחר קובץ״ בוחר צילום או PDF קיים.
                                </span>
                            </div>
                            <div className="supplier-return__attachment-actions">
                                <label>
                                    צלם מסמך
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

                        {attachments.length ? (
                            <div className="supplier-return__attachment-list">
                                {attachments.map(
                                    (attachment) => (
                                        <div
                                            key={attachment.id}
                                            className="supplier-return__attachment-item"
                                        >
                                            <div>
                                                <strong>
                                                    {attachment.fileName}
                                                </strong>
                                                <span>
                                                    {formatFileSize(attachment.size)}
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
                            <div className="supplier-return__attachment-empty">
                                אין קובץ מצורף.
                            </div>
                        )}
                    </section>

                    <section className="supplier-return__lines-card">
                        <div className="supplier-return__lines-toolbar">
                            <div>
                                <strong>
                                    פריטים להחזרה
                                </strong>
                                <span>
                                    {selectedSourceInvoice
                                        ? `מקור: ${selectedSourceInvoice.documentNumber}`
                                        : "ללא מסמך מקור — לפי מלאי נוכחי"}
                                </span>
                            </div>
                            <input
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event.target.value,
                                    )
                                }
                                placeholder="חיפוש פריט / SKU / ברקוד"
                            />
                        </div>

                        {!supplierName && (
                            <div className="supplier-return__hint">
                                יש לבחור ספק כדי להציג את הפריטים שלו.
                            </div>
                        )}

                        <div className="supplier-return__table-wrap">
                            <table className="supplier-return__table">
                                <thead>
                                    <tr>
                                        <th>פריט</th>
                                        <th>SKU</th>
                                        <th>מלאי נוכחי</th>
                                        <th>מקס׳ להחזרה</th>
                                        <th>כמות החזרה</th>
                                        <th>עלות ליחידה</th>
                                        <th>אחרי</th>
                                        <th>סה״כ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {supplierName &&
                                        visibleRows.map(
                                            (row) => {
                                                const draft =
                                                    getLineDraft(row);
                                                const quantity =
                                                    parseDecimal(
                                                        draft.quantity,
                                                    );
                                                const unitCost =
                                                    parseDecimal(
                                                        draft.unitCost,
                                                    );
                                                const validQuantity =
                                                    Number.isFinite(quantity) &&
                                                    quantity > 0;
                                                const lineNet =
                                                    validQuantity &&
                                                    Number.isFinite(unitCost)
                                                        ? roundMoney(
                                                              quantity * unitCost,
                                                          )
                                                        : 0;

                                                return (
                                                    <tr key={row.key}>
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
                                                        <td className="supplier-return__mono">
                                                            {row.sku}
                                                        </td>
                                                        <td>
                                                            {formatQuantity(row.currentQuantity)}
                                                        </td>
                                                        <td>
                                                            {formatQuantity(row.maxReturnQuantity)}
                                                        </td>
                                                        <td>
                                                            <input
                                                                className="supplier-return__line-input"
                                                                value={draft.quantity}
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
                                                                inputMode="numeric"
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                data-lumora-numeric-safe="supplier-return-unit-cost"
                                                                className="supplier-return__line-input"
                                                                value={draft.unitCost}
                                                                onChange={(event) =>
                                                                    setLineField(
                                                                        row,
                                                                        "unitCost",
                                                                        event.target.value,
                                                                    )
                                                                }
                                                                inputMode="decimal"
                                                            />
                                                        </td>
                                                        <td>
                                                            {validQuantity
                                                                ? formatQuantity(
                                                                      row.currentQuantity - quantity,
                                                                  )
                                                                : "—"}
                                                        </td>
                                                        <td className="supplier-return__money">
                                                            {formatMoney(lineNet)}
                                                        </td>
                                                    </tr>
                                                );
                                            },
                                        )}

                                    {supplierName &&
                                        visibleRows.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={8}
                                                className="supplier-return__empty"
                                            >
                                                אין פריטים זמינים להחזרה עבור הספק והסינון שנבחרו.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <footer className="supplier-return__footer">
                        <div className="supplier-return__totals">
                            <span>
                                נטו: <strong>{formatMoney(previewTotals.net)}</strong>
                            </span>
                            <span>
                                מע״מ: <strong>{formatMoney(previewTotals.vat)}</strong>
                            </span>
                            <span className="supplier-return__total-main">
                                סה״כ: <strong>{formatMoney(previewTotals.gross)}</strong>
                            </span>
                        </div>

                        <div className="supplier-return__footer-feedback" aria-live="polite">
                            {error && (
                                <div className="supplier-return__message supplier-return__message--error">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="supplier-return__message supplier-return__message--success">
                                    {success}
                                </div>
                            )}
                        </div>

                        <div className="supplier-return__actions">
                            {currentDocumentId && (
                                <button
                                    type="button"
                                    className="supplier-return__danger"
                                    onClick={() =>
                                        setCancelDraftConfirmOpen(true)
                                    }
                                >
                                    ביטול טיוטה
                                </button>
                            )}
                            <button
                                type="button"
                                className="supplier-return__secondary"
                                onClick={() => {
                                    void saveDraft();
                                }}
                            >
                                שמירת טיוטה
                            </button>
                            <button
                                type="button"
                                className="supplier-return__primary"
                                onClick={() => {
                                    void postReturn();
                                }}
                            >
                                אישור החזרה
                            </button>
                        </div>
                    </footer>
                </>
            ) : (
                <section className="supplier-return__documents-card">
                    <header>
                        <div>
                            <p>מסמכים</p>
                            <h2>החזרות לספק</h2>
                            <span>
                                מסמכי החזרה, טיוטות וקישור לחשבונית המקור.
                            </span>
                        </div>
                        <strong className="supplier-return__documents-count">
                            {filteredDocuments.length}
                        </strong>
                    </header>

                    <div className="supplier-return__document-filters">
                        <label>
                            ספק
                            <input
                                value={documentSupplierFilter}
                                onChange={(event) =>
                                    setDocumentSupplierFilter(
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            מספר מסמך / מקור
                            <input
                                value={documentNumberFilter}
                                onChange={(event) =>
                                    setDocumentNumberFilter(
                                        event.target.value,
                                    )
                                }
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
                        <button
                            type="button"
                            onClick={resetDocumentFilters}
                        >
                            איפוס סינון
                        </button>
                    </div>

                    {hydrating ? (
                        <div className="supplier-return__empty">
                            טוען מסמכי החזרה...
                        </div>
                    ) : (
                        <div className="supplier-return__documents-table-wrap">
                            <table className="supplier-return__documents-table">
                                <thead>
                                    <tr>
                                        <th>מסמך</th>
                                        <th>סטטוס</th>
                                        <th>ספק</th>
                                        <th>מסמך מקור</th>
                                        <th>תאריך</th>
                                        <th>מבצע</th>
                                        <th>שורות</th>
                                        <th>סה״כ</th>
                                        <th>פעולה</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDocuments.map(
                                        (document) => (
                                            <tr key={document.id}>
                                                <td>
                                                    <strong>
                                                        {document.documentNumber ?? "טיוטה"}
                                                    </strong>
                                                    {document.supplierReferenceNumber && (
                                                        <small>
                                                            {document.supplierReferenceNumber}
                                                        </small>
                                                    )}
                                                </td>
                                                <td>
                                                    <span
                                                        className={
                                                            document.status === "posted"
                                                                ? "supplier-return__status supplier-return__status--posted"
                                                                : document.status === "cancelled"
                                                                    ? "supplier-return__status supplier-return__status--cancelled"
                                                                    : "supplier-return__status supplier-return__status--draft"
                                                        }
                                                    >
                                                        {document.status === "posted"
                                                            ? "מאושר"
                                                            : document.status === "cancelled"
                                                                ? "מבוטל"
                                                                : "טיוטה"}
                                                    </span>
                                                </td>
                                                <td>
                                                    {document.supplier.name || "—"}
                                                </td>
                                                <td>
                                                    {document.sourceSupplierInvoice
                                                        ? `${document.sourceSupplierInvoice.documentNumber ?? "—"} · ${document.sourceSupplierInvoice.supplierInvoiceNumber}`
                                                        : "עצמאית"}
                                                </td>
                                                <td>
                                                    {formatDate(document.returnDate)}
                                                </td>
                                                <td>
                                                    {document.returnedBy?.employeeName ?? "—"}
                                                </td>
                                                <td>
                                                    {document.lines.length}
                                                </td>
                                                <td className="supplier-return__money">
                                                    {formatMoney(document.totals.gross)}
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="supplier-return__open"
                                                        onClick={() =>
                                                            openDraft(document)
                                                        }
                                                    >
                                                        {document.status === "draft"
                                                            ? "המשך"
                                                            : "פתח"}
                                                    </button>
                                                </td>
                                            </tr>
                                        ),
                                    )}

                                    {filteredDocuments.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={9}
                                                className="supplier-return__empty"
                                            >
                                                לא נמצאו מסמכי החזרה.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {selectedDocument &&
                        selectedDocument.status !== "draft" && (
                        <article className="supplier-return__document-detail">
                            <header>
                                <div>
                                    <p>מסמך החזרה</p>
                                    <h3>
                                        {selectedDocument.documentNumber ?? "טיוטה מבוטלת"}
                                    </h3>
                                    <span>
                                        {selectedDocument.supplier.name} · {formatDate(selectedDocument.returnDate)}
                                    </span>
                                </div>
                                <div className="supplier-return__detail-badges">
                                    <span>
                                        {selectedDocument.lines.length} שורות
                                    </span>
                                    <span>
                                        {selectedDocument.status === "posted"
                                            ? `נקלט ${formatDateTime(selectedDocument.postedAt ?? selectedDocument.updatedAt)}`
                                            : `בוטל ${formatDateTime(selectedDocument.updatedAt)}`}
                                    </span>
                                </div>
                            </header>

                            {selectedDocument.sourceSupplierInvoice && (
                                <div className="supplier-return__source-banner">
                                    חשבונית מקור: {selectedDocument.sourceSupplierInvoice.documentNumber ?? "—"} · מספר ספק {selectedDocument.sourceSupplierInvoice.supplierInvoiceNumber}
                                </div>
                            )}

                            <div className="supplier-return__detail-table-wrap">
                                <table className="supplier-return__detail-table">
                                    <thead>
                                        <tr>
                                            <th>פריט</th>
                                            <th>SKU</th>
                                            <th>לפני</th>
                                            <th>הוחזר</th>
                                            <th>אחרי</th>
                                            <th>עלות</th>
                                            <th>סה״כ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedDocument.lines.map(
                                            (line) => (
                                                <tr key={line.key}>
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
                                                    <td className="supplier-return__mono">
                                                        {line.product.sku}
                                                    </td>
                                                    <td>
                                                        {formatQuantity(line.previousQuantity)}
                                                    </td>
                                                    <td className="supplier-return__negative">
                                                        -{formatQuantity(line.returnedQuantity ?? 0)}
                                                    </td>
                                                    <td>
                                                        {formatQuantity(line.resultingQuantity ?? line.previousQuantity)}
                                                    </td>
                                                    <td>
                                                        {line.unitCostBeforeVat !== null
                                                            ? formatMoney(line.unitCostBeforeVat)
                                                            : "—"}
                                                    </td>
                                                    <td className="supplier-return__money">
                                                        {formatMoney(line.lineGross)}
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {selectedDocument.attachments.length > 0 && (
                                <section className="supplier-return__detail-attachments">
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
                                                    {attachment.fileName} · {formatFileSize(attachment.size)}
                                                </button>
                                            ),
                                        )}
                                    </div>
                                </section>
                            )}

                            <footer className="supplier-return__detail-totals">
                                <span>
                                    נטו: <strong>{formatMoney(selectedDocument.totals.net)}</strong>
                                </span>
                                <span>
                                    מע״מ: <strong>{formatMoney(selectedDocument.totals.vat)}</strong>
                                </span>
                                <span>
                                    סה״כ: <strong>{formatMoney(selectedDocument.totals.gross)}</strong>
                                </span>
                            </footer>
                        </article>
                    )}
                </section>
            )}

            {attachmentPreview && (
                <div
                    className="supplier-return__overlay"
                    role="presentation"
                    onMouseDown={() =>
                        setAttachmentPreview(null)
                    }
                >
                    <section
                        className="supplier-return__attachment-preview"
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
                        <div className="supplier-return__attachment-preview-body">
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

            {cancelDraftConfirmOpen && (
                <div
                    className="supplier-return__overlay"
                    role="presentation"
                    onMouseDown={() =>
                        setCancelDraftConfirmOpen(false)
                    }
                >
                    <section
                        className="supplier-return__dialog"
                        role="alertdialog"
                        aria-modal="true"
                        onMouseDown={(event) =>
                            event.stopPropagation()
                        }
                    >
                        <header>
                            <div>
                                <p>טיוטה</p>
                                <h2>
                                    ביטול טיוטת החזרה
                                </h2>
                            </div>
                        </header>
                        <div className="supplier-return__confirm-copy">
                            הטיוטה תסומן כמבוטלת ותישמר בהיסטוריה. לא יתבצע שינוי במלאי.
                        </div>
                        <footer>
                            <button
                                type="button"
                                className="supplier-return__secondary"
                                onClick={() =>
                                    setCancelDraftConfirmOpen(false)
                                }
                            >
                                חזרה
                            </button>
                            <button
                                type="button"
                                className="supplier-return__danger"
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

export default SupplierReturnPage;
