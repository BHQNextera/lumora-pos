import { useEffect, useMemo, useState } from "react";

import { useCatalog } from "../../context/useCatalog";
import { getActiveBusinessConfiguration } from "../../config/ActiveBusinessConfiguration";
import { categorySeed } from "../../models/catalog/Category";
import { getEmployees } from "../../models/employee/EmployeeRepository";
import {
    createInventoryAdjustment,
    getInventoryAdjustmentDocuments,
    getInventoryAdjustments,
    postInventoryAdjustmentDocument,
    saveInventoryAdjustmentDraftDocument,
} from "../../models/inventory/InventoryAdjustmentRepository";
import { getActiveRegisterShift } from "../../models/shift/RegisterShiftRepository";
import type {
    InventoryAdjustmentDocument,
    InventoryAdjustmentDocumentLine,
    InventoryAdjustmentReason,
} from "../../models/inventory/InventoryAdjustment";
import type { Product } from "../../types/product";
import {
    assessQuantityText,
    isBarcodeLikeQuantityText,
} from "../../utils/quantitySafety";
import {
    useQuantityScannerGuard,
} from "../../utils/useQuantityScannerGuard";

/* LUMORA QUANTITY SAFETY V1.2 */

const reasonOptions: Array<{
    value: InventoryAdjustmentReason;
    label: string;
}> = [
    { value: "stock_count", label: "ספירת מלאי" },
    { value: "damage", label: "שבר או נזק" },
    { value: "loss", label: "אובדן או גניבה" },
    { value: "receiving_error", label: "טעות בקליטה" },
    { value: "manual_correction", label: "תיקון ידני" },
    { value: "other", label: "אחר" },
];

type ProductVariant = NonNullable<Product["variants"]>[number];

type InventoryRow = {
    key: string;
    product: Product;
    variant?: ProductVariant;
    name: string;
    variantName: string;
    sku: string;
    barcode: string;
    supplier: string;
    department: string;
    category: string;
    subcategory: string;
    currentQuantity: number;
};

type InventoryAdjustmentDraft = {
    version: 2;
    tenantId: string;
    storeCode: string;
    savedAt: string;
    filters: {
        name: string;
        sku: string;
        barcode: string;
        supplier: string;
        department: string;
        category: string;
        subcategory: string;
    };
    reason: InventoryAdjustmentReason;
    employeeId?: string;
    note: string;
    changes: Record<string, string>;
};

const DRAFT_STORAGE_PREFIX = "lumora.inventory-adjustments.draft.v1";

function draftStorageKey() {
    const configuration = getActiveBusinessConfiguration();

    return `${DRAFT_STORAGE_PREFIX}:${configuration.tenantId}:${configuration.storeCode}`;
}

function loadDraft(): InventoryAdjustmentDraft | null {
    try {
        const configuration = getActiveBusinessConfiguration();
        const raw = localStorage.getItem(draftStorageKey());

        if (!raw) {
            return null;
        }

        const value = JSON.parse(raw) as Partial<InventoryAdjustmentDraft>;

        if (
            value.version !== 2 ||
            value.tenantId !== configuration.tenantId ||
            value.storeCode !== configuration.storeCode ||
            !value.filters ||
            !value.changes ||
            typeof value.savedAt !== "string" ||
            !reasonOptions.some((option) => option.value === value.reason)
        ) {
            return null;
        }

        return value as InventoryAdjustmentDraft;
    } catch {
        return null;
    }
}

function removeDraft() {
    try {
        localStorage.removeItem(draftStorageKey());
    } catch {
        // A completed adjustment must not fail because draft cleanup failed.
    }
}

function displayName(product: Product) {
    return product.names?.he || product.name;
}

function formatQuantity(value: number) {
    return new Intl.NumberFormat("he-IL", {
        minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
        maximumFractionDigits: 3,
    }).format(value);
}

function formatChangeInput(value: string) {
    if (value === "") {
        return value;
    }

    const numericValue = Number(value);

    return Number.isInteger(numericValue)
        ? new Intl.NumberFormat("en-US", {
              maximumFractionDigits: 0,
          }).format(numericValue)
        : value;
}

function formatDateTime(value: string) {
    return new Date(value).toLocaleString("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function uniqueValues(values: string[]) {
    return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "he"),
    );
}

function categoryName(product: Product) {
    return (
        product.hierarchy?.category ||
        categorySeed.find((category) => category.id === product.category)
            ?.name ||
        product.category
    );
}

function departmentName(product: Product) {
    if (product.hierarchy?.department) {
        return product.hierarchy.department;
    }

    const category = categorySeed.find(
        (item) => item.id === product.category,
    );

    return category?.parentId
        ? categorySeed.find((item) => item.id === category.parentId)?.name ?? ""
        : "";
}


function buildDocumentLines(
    rows: InventoryRow[],
    changes: Record<string, string>,
): InventoryAdjustmentDocumentLine[] {
    return rows
        .filter((row) => changes[row.key]?.trim())
        .map((row) => {
            const enteredQuantity = changes[row.key]?.trim() ?? "";
            const parsedQuantity = Number(enteredQuantity);
            const validQuantity =
                enteredQuantity !== "" &&
                Number.isInteger(parsedQuantity) &&
                parsedQuantity >= 0;

            return {
                key: row.key,
                product: {
                    id: row.product.id,
                    name: row.name,
                    sku: row.sku,
                    variantId: row.variant?.variantId,
                    variantLabel: row.variantName || undefined,
                },
                previousQuantity: row.currentQuantity,
                resultingQuantity: validQuantity
                    ? parsedQuantity
                    : null,
                enteredQuantity,
                difference: validQuantity
                    ? parsedQuantity - row.currentQuantity
                    : null,
            };
        });
}

function normalizeDraftChanges(
    changes: Record<string, string>,
): Record<string, string> {
    return Object.fromEntries(
        Object.entries(changes).filter(
            ([, value]) =>
                value.trim() !== "",
        ),
    );
}

function documentDraftSignature(
    document: InventoryAdjustmentDocument,
) {
    return JSON.stringify({
        filters: document.filters,
        reason: document.reason,
        employeeId: document.performedBy?.employeeId ?? "",
        note: document.note,
        changes: Object.fromEntries(
            document.lines.map((line) => [
                line.key,
                line.enteredQuantity,
            ]),
        ),
    });
}

type InventoryAdjustmentsPageProps = {
    openDocumentNumber?: string;
    openRequestId?: number;
};

function InventoryAdjustmentsPage({
    openDocumentNumber,
    openRequestId,
}: InventoryAdjustmentsPageProps) {
    const { products, updateProduct } = useCatalog();
    const [initialDraft] = useState(loadDraft);
    const [employees] = useState(() =>
        getEmployees().filter((employee) => employee.isActive),
    );
    const [initialShift] = useState(getActiveRegisterShift);
    const [nameQuery, setNameQuery] = useState(
        initialDraft?.filters.name ?? "",
    );
    const [skuQuery, setSkuQuery] = useState(
        initialDraft?.filters.sku ?? "",
    );
    const [barcodeQuery, setBarcodeQuery] = useState(
        initialDraft?.filters.barcode ?? "",
    );
    const [supplierFilter, setSupplierFilter] = useState(
        initialDraft?.filters.supplier ?? "",
    );
    const [departmentFilter, setDepartmentFilter] = useState(
        initialDraft?.filters.department ?? "",
    );
    const [categoryFilter, setCategoryFilter] = useState(
        initialDraft?.filters.category ?? "",
    );
    const [subcategoryFilter, setSubcategoryFilter] = useState(
        initialDraft?.filters.subcategory ?? "",
    );
    const [reason, setReason] = useState<InventoryAdjustmentReason>(
        initialDraft?.reason ?? "stock_count",
    );
    const [employeeId, setEmployeeId] = useState(() => {
        if (initialDraft?.employeeId) {
            return initialDraft.employeeId;
        }

        const shiftEmployeeId = initialShift?.openedBy.employeeId;

        if (
            shiftEmployeeId &&
            employees.some((employee) => employee.id === shiftEmployeeId)
        ) {
            return shiftEmployeeId;
        }

        return employees.length === 1 ? employees[0].id : "";
    });
    const [note, setNote] = useState(initialDraft?.note ?? "");
    const [changes, setChanges] = useState<Record<string, string>>(
        initialDraft?.changes ?? {},
    );
    const [draftSavedAt, setDraftSavedAt] = useState<string | null>(
        initialDraft?.savedAt ?? null,
    );
    const currentDraftSignature = JSON.stringify({
        filters: {
            name: nameQuery,
            sku: skuQuery,
            barcode: barcodeQuery,
            supplier: supplierFilter,
            department: departmentFilter,
            category: categoryFilter,
            subcategory: subcategoryFilter,
        },
        reason,
        employeeId,
        note,
        changes:
            normalizeDraftChanges(
                changes,
            ),
    });
    const [savedDraftSignature, setSavedDraftSignature] = useState<
        string | null
    >(() =>
        initialDraft
            ? JSON.stringify({
                  filters: initialDraft.filters,
                  reason: initialDraft.reason,
                  employeeId: initialDraft.employeeId ?? "",
                  note: initialDraft.note,
                  changes:
                      normalizeDraftChanges(
                          initialDraft.changes,
                      ),
              })
            : null,
    );
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [
        quantityApprovalKey,
        setQuantityApprovalKey,
    ] = useState<string | null>(null);

    const quantityScannerGuard =
        useQuantityScannerGuard();
    const [historyRevision, setHistoryRevision] = useState(0);
    const [workspaceView, setWorkspaceView] = useState<
        "edit" | "documents"
    >("edit");
    const [currentDocumentId, setCurrentDocumentId] = useState<
        string | null
    >(null);
    const [selectedDocumentId, setSelectedDocumentId] = useState<
        string | null
    >(null);
    const [legacyDraftMigrated, setLegacyDraftMigrated] = useState(false);

    void historyRevision;

    const rows = useMemo<InventoryRow[]>(
        () =>
            products
                .filter((product) => product.isActive)
                .flatMap((product) => {
                    const base = {
                        product,
                        name: displayName(product),
                        supplier: product.supplier?.name || "ללא ספק",
                        department: departmentName(product),
                        category: categoryName(product),
                        subcategory: product.hierarchy?.subcategory || "",
                    };

                    if (product.variants?.length) {
                        return product.variants.map((variant) => ({
                            ...base,
                            key: `${product.id}::${variant.variantId}`,
                            variant,
                            variantName: `${variant.color.name} · ${
                                variant.size.name
                            }${variant.isActive ? "" : " · לא פעיל"}`,
                            sku: variant.sku,
                            barcode: variant.barcode,
                            currentQuantity: variant.stockOnHand ?? 0,
                        }));
                    }

                    return [
                        {
                            ...base,
                            key: product.id,
                            variantName: "",
                            sku: product.sku,
                            barcode: product.barcode,
                            currentQuantity: product.stockOnHand ?? 0,
                        },
                    ];
                })
                .sort(
                    (a, b) =>
                        a.name.localeCompare(b.name, "he") ||
                        a.variantName.localeCompare(b.variantName, "he"),
                ),
        [products],
    );

    useEffect(() => {
        if (
            !initialDraft ||
            legacyDraftMigrated
        ) {
            return;
        }

        const selectedEmployee =
            employees.find(
                (employee) =>
                    employee.id ===
                    initialDraft.employeeId,
            );

        const migratedDocument =
            saveInventoryAdjustmentDraftDocument({
                filters: {
                    ...initialDraft.filters,
                },
                reason: initialDraft.reason,
                note: initialDraft.note,
                performedBy: selectedEmployee
                    ? {
                          employeeId: selectedEmployee.id,
                          employeeName: selectedEmployee.name,
                      }
                    : undefined,
                lines: buildDocumentLines(
                    rows,
                    initialDraft.changes,
                ),
            });

        setCurrentDocumentId(
            migratedDocument.id,
        );
        setDraftSavedAt(
            migratedDocument.updatedAt,
        );
        setSavedDraftSignature(
            documentDraftSignature(
                migratedDocument,
            ),
        );
        setLegacyDraftMigrated(true);
        setHistoryRevision(
            (current) => current + 1,
        );
        removeDraft();
    }, [
        initialDraft,
        legacyDraftMigrated,
        employees,
        rows,
    ]);

    const suppliers = useMemo(
        () => uniqueValues(rows.map((row) => row.supplier)),
        [rows],
    );
    const departments = useMemo(
        () => uniqueValues(rows.map((row) => row.department)),
        [rows],
    );
    const categories = useMemo(
        () =>
            uniqueValues(
                rows
                    .filter(
                        (row) =>
                            !departmentFilter ||
                            row.department === departmentFilter,
                    )
                    .map((row) => row.category),
            ),
        [rows, departmentFilter],
    );
    const subcategories = useMemo(
        () =>
            uniqueValues(
                rows
                    .filter(
                        (row) =>
                            (!departmentFilter ||
                                row.department === departmentFilter) &&
                            (!categoryFilter || row.category === categoryFilter),
                    )
                    .map((row) => row.subcategory),
            ),
        [rows, departmentFilter, categoryFilter],
    );

    const filteredRows = useMemo(() => {
        const normalizedName = nameQuery.trim().toLowerCase();
        const normalizedSku = skuQuery.trim().toLowerCase();
        const normalizedBarcode = barcodeQuery.trim();

        return rows.filter(
            (row) =>
                (!supplierFilter || row.supplier === supplierFilter) &&
                (!departmentFilter || row.department === departmentFilter) &&
                (!categoryFilter || row.category === categoryFilter) &&
                (!subcategoryFilter ||
                    row.subcategory === subcategoryFilter) &&
                (!normalizedName ||
                    row.name.toLowerCase().includes(normalizedName) ||
                    row.variantName.toLowerCase().includes(normalizedName)) &&
                (!normalizedSku ||
                    row.sku.toLowerCase().includes(normalizedSku)) &&
                (!normalizedBarcode ||
                    row.barcode.includes(normalizedBarcode)),
        );
    }, [
        rows,
        nameQuery,
        skuQuery,
        barcodeQuery,
        supplierFilter,
        departmentFilter,
        categoryFilter,
        subcategoryFilter,
    ]);

    const enteredRows = rows.filter((row) => changes[row.key]?.trim());
    const validEnteredRows = enteredRows.filter((row) => {
        const assessment =
            assessQuantityText({
                raw: changes[row.key] ?? "",
                context: "inventory_adjustment",
                min: 0,
                current: row.currentQuantity,
            });
        return assessment.ok;
    });
    const pendingRows = validEnteredRows.filter((row) => {
        const resultingQuantity = Number(changes[row.key]);
        return resultingQuantity !== row.currentQuantity;
    });
    const adjustments = getInventoryAdjustments();
    const documents = getInventoryAdjustmentDocuments();

    useEffect(() => {
        if (!openDocumentNumber) {
            return;
        }

        const document =
            getInventoryAdjustmentDocuments().find(
                (candidate) =>
                    candidate.documentNumber ===
                    openDocumentNumber,
            );

        setWorkspaceView(
            "documents",
        );

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
    ]);

    const selectedDocument =
        selectedDocumentId
            ? documents.find(
                  (document) =>
                      document.id === selectedDocumentId,
              )
            : undefined;

    const currentFilters = {
        name: nameQuery,
        sku: skuQuery,
        barcode: barcodeQuery,
        supplier: supplierFilter,
        department: departmentFilter,
        category: categoryFilter,
        subcategory: subcategoryFilter,
    };

    const clearFilters = () => {
        setNameQuery("");
        setSkuQuery("");
        setBarcodeQuery("");
        setSupplierFilter("");
        setDepartmentFilter("");
        setCategoryFilter("");
        setSubcategoryFilter("");
    };

    const rejectAdjustmentBarcode = (
        key: string,
    ) => {
        setChanges((current) => ({
            ...current,
            [key]: "",
        }));
        setQuantityApprovalKey(null);
        setError(
            "זוהתה סריקת ברקוד בשדה הכמות. הכמות לא שונתה.",
        );
        setSuccess(null);
    };

    const updateChange = (
        key: string,
        value: string,
    ) => {
        const normalizedValue =
            value.replaceAll(",", "").trim();

        if (
            normalizedValue !== "" &&
            isBarcodeLikeQuantityText(
                normalizedValue,
            )
        ) {
            rejectAdjustmentBarcode(
                key,
            );
            quantityScannerGuard.reset();
            return;
        }

        if (
            normalizedValue !== "" &&
            !/^\d+$/.test(normalizedValue)
        ) {
            return;
        }

        setChanges((current) => ({
            ...current,
            [key]: normalizedValue,
        }));
        setQuantityApprovalKey(null);
        setError(null);
        setSuccess(null);
    };

    const saveDraft = () => {
        const selectedEmployee =
            employees.find(
                (employee) =>
                    employee.id === employeeId,
            );

        setError(null);

        const unsafeDraftRow =
            enteredRows.find((row) =>
                !assessQuantityText({
                    raw: changes[row.key] ?? "",
                    context: "inventory_adjustment",
                    min: 0,
                    current: row.currentQuantity,
                }).ok
            );

        if (unsafeDraftRow) {
            const assessment =
                assessQuantityText({
                    raw: changes[unsafeDraftRow.key] ?? "",
                    context: "inventory_adjustment",
                    min: 0,
                    current: unsafeDraftRow.currentQuantity,
                });
            setError(
                (assessment.message ?? "") + " פריט: " + unsafeDraftRow.name + ".",
            );
            return;
        }

        const unusualDraftRow =
            enteredRows.find((row) => {
                const assessment =
                    assessQuantityText({
                        raw:
                            changes[row.key] ??
                            "",
                        context:
                            "inventory_adjustment",
                        min: 0,
                        current:
                            row.currentQuantity,
                    });

                return (
                    assessment.ok &&
                    assessment.requiresConfirmation
                );
            });

        if (unusualDraftRow) {
            const assessment =
                assessQuantityText({
                    raw:
                        changes[
                            unusualDraftRow.key
                        ] ?? "",
                    context:
                        "inventory_adjustment",
                    min: 0,
                    current:
                        unusualDraftRow.currentQuantity,
                });

            const approvalKey =
                "draft:" +
                unusualDraftRow.key +
                ":" +
                String(
                    changes[
                        unusualDraftRow.key
                    ] ?? "",
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
                        " לחצו שוב על שמירת טיוטה כדי לאשר.",
                );
                return;
            }

            setQuantityApprovalKey(null);
        }

        const draftDocument =
            saveInventoryAdjustmentDraftDocument({
                documentId:
                    currentDocumentId ??
                    undefined,
                filters:
                    currentFilters,
                reason,
                note,
                performedBy:
                    selectedEmployee
                        ? {
                              employeeId:
                                  selectedEmployee.id,
                              employeeName:
                                  selectedEmployee.name,
                          }
                        : undefined,
                lines:
                    buildDocumentLines(
                        rows,
                        changes,
                    ),
            });

        setCurrentDocumentId(
            draftDocument.id,
        );
        setDraftSavedAt(
            draftDocument.updatedAt,
        );
        setSavedDraftSignature(
            documentDraftSignature(
                draftDocument,
            ),
        );
        setHistoryRevision(
            (current) =>
                current + 1,
        );
        removeDraft();
        setSuccess(
            "הטיוטה נשמרה כמסמך התאמה ללא שינוי במלאי.",
        );
    };

    const submit = () => {
        setError(null);
        setSuccess(null);

        if (enteredRows.length === 0) {
            setError("יש להזין מלאי חדש לפחות בפריט אחד.");
            return;
        }

        if (enteredRows.length !== validEnteredRows.length) {
            const unsafeRow =
                enteredRows.find((row) =>
                    !assessQuantityText({
                        raw: changes[row.key] ?? "",
                        context: "inventory_adjustment",
                        min: 0,
                        current: row.currentQuantity,
                    }).ok
                );

            const assessment = unsafeRow
                ? assessQuantityText({
                      raw: changes[unsafeRow.key] ?? "",
                      context: "inventory_adjustment",
                      min: 0,
                      current: unsafeRow.currentQuantity,
                  })
                : null;

            setError(
                assessment?.message ??
                    "המלאי החדש חייב להיות מספר שלם ואינו יכול להיות שלילי.",
            );
            return;
        }

        if (pendingRows.length === 0) {
            setError("המלאי החדש זהה למלאי הנוכחי; אין שינוי לשמירה.");
            return;
        }

        if (reason === "other" && !note.trim()) {
            setError("יש להזין הסבר לסיבת ההתאמה.");
            return;
        }

        const selectedEmployee = employees.find(
            (employee) => employee.id === employeeId,
        );

        if (!selectedEmployee) {
            setError("יש לבחור עובד מבצע לצורך התיעוד.");
            return;
        }

        const unusualRow =
            pendingRows.find((row) => {
                const assessment =
                    assessQuantityText({
                        raw:
                            changes[row.key] ??
                            "",
                        context:
                            "inventory_adjustment",
                        min: 0,
                        current:
                            row.currentQuantity,
                    });

                return (
                    assessment.ok &&
                    assessment.requiresConfirmation
                );
            });

        if (unusualRow) {
            const assessment =
                assessQuantityText({
                    raw:
                        changes[
                            unusualRow.key
                        ] ?? "",
                    context:
                        "inventory_adjustment",
                    min: 0,
                    current:
                        unusualRow.currentQuantity,
                });

            const approvalKey =
                "post:" +
                unusualRow.key +
                ":" +
                String(
                    changes[
                        unusualRow.key
                    ] ?? "",
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
                        " לחצו שוב על שמירה מלאה כדי לאשר.",
                );
                return;
            }

            setQuantityApprovalKey(null);
        }

                const rowsByProduct = new Map<string, InventoryRow[]>();

        for (const row of pendingRows) {
            rowsByProduct.set(row.product.id, [
                ...(rowsByProduct.get(row.product.id) ?? []),
                row,
            ]);
        }

        for (const [productId, productRows] of rowsByProduct) {
            const product = products.find((item) => item.id === productId);

            if (!product) {
                continue;
            }

            if (product.variants?.length) {
                const changesByVariant = new Map<string, number>(
                    productRows
                        .filter((row) => row.variant)
                        .map((row) => [
                            row.variant!.variantId,
                            Number(changes[row.key]),
                        ] as const),
                );
                const variants = product.variants.map((variant) => ({
                    ...variant,
                    stockOnHand:
                        changesByVariant.get(variant.variantId) ??
                        variant.stockOnHand,
                }));

                updateProduct({
                    ...product,
                    variants,
                    stockOnHand: variants.reduce(
                        (total, variant) =>
                            total + (variant.stockOnHand ?? 0),
                        0,
                    ),
                });
            } else {
                const row = productRows[0];
                updateProduct({
                    ...product,
                    stockOnHand: Number(changes[row.key]),
                });
            }
        }

        const postedLines: InventoryAdjustmentDocumentLine[] =
            pendingRows.map((row) => {
                const resultingQuantity =
                    Number(changes[row.key]);

                return {
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
                    previousQuantity:
                        row.currentQuantity,
                    resultingQuantity,
                    enteredQuantity:
                        String(resultingQuantity),
                    difference:
                        resultingQuantity -
                        row.currentQuantity,
                };
            });

        const postedDocument =
            postInventoryAdjustmentDocument({
                documentId:
                    currentDocumentId ??
                    undefined,
                filters:
                    currentFilters,
                reason,
                note,
                performedBy: {
                    employeeId:
                        selectedEmployee.id,
                    employeeName:
                        selectedEmployee.name,
                },
                lines:
                    postedLines,
            });

        for (const row of pendingRows) {
            const resultingQuantity = Number(changes[row.key]);

            createInventoryAdjustment({
                documentId:
                    postedDocument.id,
                documentNumber:
                    postedDocument.documentNumber,
                product: {
                    id: row.product.id,
                    name: row.name,
                    sku: row.sku,
                    variantId: row.variant?.variantId,
                    variantLabel: row.variantName || undefined,
                },
                previousQuantity: row.currentQuantity,
                resultingQuantity,
                reason,
                note,
                performedBy: {
                    employeeId: selectedEmployee.id,
                    employeeName: selectedEmployee.name,
                },
            });
        }

        setChanges({});
        setNote("");
        removeDraft();
        setCurrentDocumentId(null);
        setDraftSavedAt(null);
        setSavedDraftSignature(null);
        setSelectedDocumentId(
            postedDocument.id,
        );
        setWorkspaceView(
            "documents",
        );
        setHistoryRevision((current) => current + 1);
        setSuccess(
            `מסמך ${postedDocument.documentNumber ?? ""} נשמר ו-${pendingRows.length} התאמות מלאי יושמו.`,
        );
    };

    const startNewAdjustment = () => {
        const shiftEmployeeId =
            initialShift?.openedBy.employeeId;
        const defaultEmployeeId =
            shiftEmployeeId &&
            employees.some(
                (employee) =>
                    employee.id ===
                    shiftEmployeeId,
            )
                ? shiftEmployeeId
                : employees.length === 1
                  ? employees[0].id
                  : "";

        clearFilters();
        setReason(
            "stock_count",
        );
        setEmployeeId(
            defaultEmployeeId,
        );
        setNote("");
        setChanges({});
        setCurrentDocumentId(null);
        setSelectedDocumentId(null);
        setDraftSavedAt(null);
        setSavedDraftSignature(null);
        setError(null);
        setSuccess(null);
        removeDraft();
        setWorkspaceView(
            "edit",
        );
    };

    const openDraftDocument = (
        document:
            InventoryAdjustmentDocument,
    ) => {
        setNameQuery(
            document.filters.name,
        );
        setSkuQuery(
            document.filters.sku,
        );
        setBarcodeQuery(
            document.filters.barcode,
        );
        setSupplierFilter(
            document.filters.supplier,
        );
        setDepartmentFilter(
            document.filters.department,
        );
        setCategoryFilter(
            document.filters.category,
        );
        setSubcategoryFilter(
            document.filters.subcategory,
        );
        setReason(
            document.reason,
        );
        setEmployeeId(
            document.performedBy
                ?.employeeId ??
                "",
        );
        setNote(
            document.note,
        );
        setChanges(
            Object.fromEntries(
                document.lines.map(
                    (line) => [
                        line.key,
                        line.enteredQuantity,
                    ],
                ),
            ),
        );
        setCurrentDocumentId(
            document.id,
        );
        setDraftSavedAt(
            document.updatedAt,
        );
        setSavedDraftSignature(
            documentDraftSignature(
                document,
            ),
        );
        setSelectedDocumentId(null);
        setError(null);
        setSuccess(
            "טיוטת ההתאמה נטענה להמשך עבודה.",
        );
        setWorkspaceView(
            "edit",
        );
    };


    return (
        <section className="inventory-adjustments">
            <header className="inventory-adjustments__header">
                <div>
                    <p className="inventory-adjustments__eyebrow">
                        LUMORA INVENTORY
                    </p>
                    <h1>התאמות מלאי</h1>
                    <p>
                        סינון הרשימה, הזנת המלאי שנספר וחישוב ההפרש אוטומטית.
                    </p>
                </div>
                <div
                    className={`inventory-adjustments__header-actions ${
                        workspaceView === "documents"
                            ? "inventory-adjustments__header-actions--documents"
                            : ""
                    }`}
                >
                    {workspaceView === "edit" ? (
                        <>
                            <div className="inventory-adjustments__pending-count">
                                <span>שינויים</span>
                                <strong>{pendingRows.length}</strong>
                            </div>
                            <button
                                type="button"
                                className="inventory-adjustments__save-draft"
                                onClick={saveDraft}
                            >
                                שמירת טיוטה
                            </button>
                            <button
                                type="button"
                                className="inventory-adjustments__submit"
                                onClick={submit}
                            >
                                שמירה מלאה · {pendingRows.length}
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="inventory-adjustments__pending-count">
                                <span>מסמכים</span>
                                <strong>{documents.length}</strong>
                            </div>
                            <button
                                type="button"
                                className="inventory-adjustments__submit"
                                onClick={startNewAdjustment}
                            >
                                + התאמה חדשה
                            </button>
                        </>
                    )}
                </div>
            </header>

            <nav
                className="inventory-adjustments__view-tabs"
                aria-label="ניווט התאמות מלאי"
            >
                <button
                    type="button"
                    className={
                        workspaceView === "edit"
                            ? "inventory-adjustments__view-tab inventory-adjustments__view-tab--active"
                            : "inventory-adjustments__view-tab"
                    }
                    onClick={() => setWorkspaceView("edit")}
                >
                    התאמה חדשה
                </button>
                <button
                    type="button"
                    className={
                        workspaceView === "documents"
                            ? "inventory-adjustments__view-tab inventory-adjustments__view-tab--active"
                            : "inventory-adjustments__view-tab"
                    }
                    onClick={() => setWorkspaceView("documents")}
                >
                    מסמכי התאמה
                    <span>{documents.length}</span>
                </button>
            </nav>

            {((workspaceView === "edit" && draftSavedAt) || error || success) && (
                <div className="inventory-adjustments__header-feedback">
                    {workspaceView === "edit" &&
                        draftSavedAt &&
                        !error &&
                        !success && (
                        <span className="inventory-adjustments__draft-state">
                            {savedDraftSignature === currentDraftSignature
                                ? "טיוטה שמורה"
                                : "יש שינויים שטרם נשמרו בטיוטה"}
                            {" · "}
                            {formatDateTime(draftSavedAt)}
                        </span>
                    )}
                    {error && (
                        <span className="inventory-adjustments__message inventory-adjustments__message--error">
                            {error}
                        </span>
                    )}
                    {success && (
                        <span className="inventory-adjustments__message inventory-adjustments__message--success">
                            {success}
                        </span>
                    )}
                </div>
            )}

            {workspaceView === "edit" ? (
                <>
            <section className="inventory-adjustments__filters">
                <div className="inventory-adjustments__filters-head">
                    <div>
                        <span>סינון פריטים</span>
                        <strong>ברירת המחדל מציגה את כל הפריטים</strong>
                    </div>
                    <button type="button" onClick={clearFilters}>
                        ניקוי פילטרים
                    </button>
                </div>

                <div className="inventory-adjustments__filter-grid">
                    <label>
                        <span>שם פריט</span>
                        <input
                            type="search"
                            value={nameQuery}
                            placeholder="שם פריט או וריאנט"
                            onChange={(event) =>
                                setNameQuery(event.target.value)
                            }
                        />
                    </label>
                    <label>
                        <span>SKU</span>
                        <input
                            type="search"
                            dir="ltr"
                            value={skuQuery}
                            placeholder="חיפוש לפי SKU"
                            onChange={(event) =>
                                setSkuQuery(event.target.value)
                            }
                        />
                    </label>
                    <label>
                        <span>ברקוד</span>
                        <input
                            type="search"
                            dir="ltr"
                            value={barcodeQuery}
                            placeholder="הקלדה או סריקה"
                            onChange={(event) =>
                                setBarcodeQuery(event.target.value)
                            }
                        />
                    </label>
                    <label>
                        <span>ספק</span>
                        <select
                            value={supplierFilter}
                            onChange={(event) =>
                                setSupplierFilter(event.target.value)
                            }
                        >
                            <option value="">כל הספקים</option>
                            {suppliers.map((supplier) => (
                                <option key={supplier} value={supplier}>
                                    {supplier}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span>מחלקה</span>
                        <select
                            value={departmentFilter}
                            onChange={(event) => {
                                setDepartmentFilter(event.target.value);
                                setCategoryFilter("");
                                setSubcategoryFilter("");
                            }}
                        >
                            <option value="">כל המחלקות</option>
                            {departments.map((department) => (
                                <option key={department} value={department}>
                                    {department}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span>קטגוריה</span>
                        <select
                            value={categoryFilter}
                            onChange={(event) => {
                                setCategoryFilter(event.target.value);
                                setSubcategoryFilter("");
                            }}
                        >
                            <option value="">כל הקטגוריות</option>
                            {categories.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span>תת־קטגוריה</span>
                        <select
                            value={subcategoryFilter}
                            onChange={(event) =>
                                setSubcategoryFilter(event.target.value)
                            }
                        >
                            <option value="">כל תתי־הקטגוריות</option>
                            {subcategories.map((subcategory) => (
                                <option key={subcategory} value={subcategory}>
                                    {subcategory}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            </section>

            <section className="inventory-adjustments__list-card">
                <div className="inventory-adjustments__list-head">
                    <div>
                        <span>תוצאות</span>
                        <strong>{filteredRows.length} פריטים ווריאנטים</strong>
                    </div>
                    <div className="inventory-adjustments__batch-policy">
                        <label>
                            <span>עובד מבצע</span>
                            <select
                                value={employeeId}
                                onChange={(event) =>
                                    setEmployeeId(event.target.value)
                                }
                            >
                                <option value="">בחירת עובד</option>
                                {employees.map((employee) => (
                                    <option key={employee.id} value={employee.id}>
                                        {employee.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            <span>סיבה</span>
                            <select
                                value={reason}
                                onChange={(event) =>
                                    setReason(
                                        event.target
                                            .value as InventoryAdjustmentReason,
                                    )
                                }
                            >
                                {reasonOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            <span>הערה</span>
                            <input
                                value={note}
                                placeholder={
                                    reason === "other"
                                        ? "חובה להזין הסבר"
                                        : "הערה לכל השינויים"
                                }
                                onChange={(event) => setNote(event.target.value)}
                            />
                        </label>
                    </div>
                </div>

                <div className="inventory-adjustments__table-wrap">
                    <table className="inventory-adjustments__table">
                        <colgroup>
                            <col className="inventory-adjustments__col-product" />
                            <col className="inventory-adjustments__col-sku" />
                            <col className="inventory-adjustments__col-barcode" />
                            <col className="inventory-adjustments__col-supplier" />
                            <col className="inventory-adjustments__col-hierarchy" />
                            <col className="inventory-adjustments__col-current" />
                            <col className="inventory-adjustments__col-change" />
                            <col className="inventory-adjustments__col-result" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>פריט</th>
                                <th>SKU</th>
                                <th>ברקוד</th>
                                <th>ספק</th>
                                <th>היררכיה</th>
                                <th>מלאי נוכחי</th>
                                <th>מלאי חדש</th>
                                <th>הפרש</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="inventory-adjustments__no-results"
                                    >
                                        לא נמצאו פריטים התואמים לסינון.
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((row) => {
                                    const raw = changes[row.key] ?? "";
                                    const resultingQuantity = Number(raw);
                                    const validResult =
                                        raw.trim() !== "" &&
                                        Number.isInteger(resultingQuantity) &&
                                        resultingQuantity >= 0;
                                    const difference = validResult
                                        ? resultingQuantity - row.currentQuantity
                                        : 0;

                                    return (
                                        <tr
                                            key={row.key}
                                            className={
                                                validResult &&
                                                difference !== 0
                                                    ? "inventory-adjustments__row--changed"
                                                    : undefined
                                            }
                                        >
                                            <td>
                                                <strong>{row.name}</strong>
                                                {row.variantName && (
                                                    <span>{row.variantName}</span>
                                                )}
                                            </td>
                                            <td dir="ltr">
                                                <strong>{row.sku}</strong>
                                            </td>
                                            <td dir="ltr">
                                                <strong>{row.barcode}</strong>
                                            </td>
                                            <td>{row.supplier}</td>
                                            <td>
                                                <strong>
                                                    {row.department || "—"}
                                                </strong>
                                                <span>
                                                    {[row.category, row.subcategory]
                                                        .filter(Boolean)
                                                        .join(" · ") || "—"}
                                                </span>
                                            </td>
                                            <td className="inventory-adjustments__number">
                                                {formatQuantity(row.currentQuantity)}
                                            </td>
                                            <td>
                                                <input
                                                    className="inventory-adjustments__change-input"
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    dir="ltr"
                                                    value={formatChangeInput(raw)}
                                                    placeholder={formatQuantity(
                                                        row.currentQuantity,
                                                    )}
                                                    aria-label={`מלאי חדש עבור ${row.name}`}
                                                    onChange={(event) =>
                                                        updateChange(
                                                            row.key,
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
                                                                        rejectAdjustmentBarcode(
                                                                            row.key,
                                                                        ),
                                                            });

                                                        if (blocked) {
                                                            event.preventDefault();
                                                        }
                                                    }}
                                                />
                                            </td>
                                            <td
                                                className={`inventory-adjustments__number ${
                                                    raw.trim() !== "" && !validResult
                                                        ? "inventory-adjustments__number--invalid"
                                                        : validResult && difference > 0
                                                          ? "inventory-adjustments__number--positive"
                                                          : validResult && difference < 0
                                                            ? "inventory-adjustments__number--negative"
                                                            : ""
                                                }`}
                                                dir="ltr"
                                            >
                                                {validResult
                                                    ? `${difference > 0 ? "+" : ""}${formatQuantity(
                                                          difference,
                                                      )}`
                                                    : "—"}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

            </section>

            <section className="inventory-adjustments__history-card">
                <div className="inventory-adjustments__history-head">
                    <div>
                        <span>תיעוד</span>
                        <strong>התאמות אחרונות</strong>
                    </div>
                    <b>{adjustments.length}</b>
                </div>

                {adjustments.length === 0 ? (
                    <div className="inventory-adjustments__empty">
                        עדיין אין התאמות מלאי.
                    </div>
                ) : (
                    <div className="inventory-adjustments__history-wrap">
                        <table className="inventory-adjustments__history">
                            <thead>
                                <tr>
                                    <th>מועד</th>
                                    <th>פריט</th>
                                    <th>לפני</th>
                                    <th>אחרי</th>
                                    <th>הפרש</th>
                                    <th>סיבה</th>
                                    <th>מבצע</th>
                                </tr>
                            </thead>
                            <tbody>
                                {adjustments.slice(0, 50).map((adjustment) => (
                                    <tr key={adjustment.id}>
                                        <td>
                                            {formatDateTime(
                                                adjustment.createdAt,
                                            )}
                                        </td>
                                        <td>
                                            <strong>
                                                {adjustment.product.name}
                                            </strong>
                                            <span>
                                                {adjustment.product
                                                    .variantLabel ||
                                                    adjustment.product.sku}
                                            </span>
                                        </td>
                                        <td>
                                            {formatQuantity(
                                                adjustment.previousQuantity,
                                            )}
                                        </td>
                                        <td>
                                            {formatQuantity(
                                                adjustment.resultingQuantity,
                                            )}
                                        </td>
                                        <td
                                            className={
                                                adjustment.difference < 0
                                                    ? "inventory-adjustments__number--negative"
                                                    : "inventory-adjustments__number--positive"
                                            }
                                            dir="ltr"
                                        >
                                            {adjustment.difference > 0 ? "+" : ""}
                                            {formatQuantity(
                                                adjustment.difference,
                                            )}
                                        </td>
                                        <td>
                                            {reasonOptions.find(
                                                (option) =>
                                                    option.value ===
                                                    adjustment.reason,
                                            )?.label ?? adjustment.reason}
                                            {adjustment.note && (
                                                <span>{adjustment.note}</span>
                                            )}
                                        </td>
                                        <td>
                                            {adjustment.performedBy
                                                ?.employeeName ?? "מערכת"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
                </>
            ) : (
                <section className="inventory-adjustments__documents-card">
                    <div className="inventory-adjustments__documents-head">
                        <div>
                            <span>מסמכים</span>
                            <strong>מסמכי התאמת מלאי</strong>
                            <p>
                                טיוטות נשמרות ללא שינוי מלאי. מסמך מאושר
                                מציג את כל השורות שנכללו בהתאמה.
                            </p>
                        </div>
                        <b>{documents.length}</b>
                    </div>

                    {documents.length === 0 ? (
                        <div className="inventory-adjustments__empty">
                            עדיין אין מסמכי התאמת מלאי.
                        </div>
                    ) : (
                        <div className="inventory-adjustments__documents-layout">
                            <div className="inventory-adjustments__documents-wrap">
                                <table className="inventory-adjustments__documents-table">
                                    <thead>
                                        <tr>
                                            <th>מסמך</th>
                                            <th>סטטוס</th>
                                            <th>מועד</th>
                                            <th>סיבה</th>
                                            <th>מבצע</th>
                                            <th>שורות</th>
                                            <th>הערה</th>
                                            <th>פעולה</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {documents.map((document) => (
                                            <tr
                                                key={document.id}
                                                className={
                                                    selectedDocumentId ===
                                                    document.id
                                                        ? "inventory-adjustments__document-row--selected"
                                                        : undefined
                                                }
                                            >
                                                <td>
                                                    <strong
                                                        className="inventory-adjustments__document-number"
                                                        dir="ltr"
                                                    >
                                                        {document.documentNumber ??
                                                            "טיוטה"}
                                                    </strong>
                                                </td>
                                                <td>
                                                    <span
                                                        className={`inventory-adjustments__document-status inventory-adjustments__document-status--${document.status}`}
                                                    >
                                                        {document.status === "draft"
                                                            ? "טיוטה"
                                                            : "מאושר"}
                                                    </span>
                                                </td>
                                                <td>
                                                    {formatDateTime(
                                                        document.postedAt ??
                                                            document.updatedAt,
                                                    )}
                                                </td>
                                                <td>
                                                    {reasonOptions.find(
                                                        (option) =>
                                                            option.value ===
                                                            document.reason,
                                                    )?.label ?? document.reason}
                                                </td>
                                                <td>
                                                    {document.performedBy
                                                        ?.employeeName ??
                                                        "מערכת"}
                                                </td>
                                                <td>
                                                    {document.lines.length}
                                                </td>
                                                <td>
                                                    {document.note || "—"}
                                                </td>
                                                <td>
                                                    {document.status === "draft" ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openDraftDocument(
                                                                    document,
                                                                )
                                                            }
                                                        >
                                                            המשך טיוטה
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setSelectedDocumentId(
                                                                    document.id,
                                                                )
                                                            }
                                                        >
                                                            פתח
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {selectedDocument &&
                                selectedDocument.status === "posted" && (
                                    <section className="inventory-adjustments__document-detail">
                                        <header>
                                            <div>
                                                <span>מסמך התאמה</span>
                                                <strong dir="ltr">
                                                    {selectedDocument.documentNumber}
                                                </strong>
                                                <p>
                                                    {formatDateTime(
                                                        selectedDocument.postedAt ??
                                                            selectedDocument.updatedAt,
                                                    )}
                                                    {" · "}
                                                    {selectedDocument.performedBy
                                                        ?.employeeName ??
                                                        "מערכת"}
                                                </p>
                                            </div>
                                            <div className="inventory-adjustments__document-detail-meta">
                                                <span>
                                                    {reasonOptions.find(
                                                        (option) =>
                                                            option.value ===
                                                            selectedDocument.reason,
                                                    )?.label ??
                                                        selectedDocument.reason}
                                                </span>
                                                <b>
                                                    {selectedDocument.lines.length} שורות
                                                </b>
                                            </div>
                                        </header>

                                        {selectedDocument.note && (
                                            <div className="inventory-adjustments__document-note">
                                                <span>הערה</span>
                                                <strong>
                                                    {selectedDocument.note}
                                                </strong>
                                            </div>
                                        )}

                                        <div className="inventory-adjustments__document-lines-wrap">
                                            <table className="inventory-adjustments__document-lines">
                                                <thead>
                                                    <tr>
                                                        <th>פריט</th>
                                                        <th>SKU</th>
                                                        <th>לפני</th>
                                                        <th>אחרי</th>
                                                        <th>הפרש</th>
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
                                                                    {line.product
                                                                        .variantLabel && (
                                                                        <span>
                                                                            {
                                                                                line
                                                                                    .product
                                                                                    .variantLabel
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td dir="ltr">
                                                                    {line.product.sku}
                                                                </td>
                                                                <td>
                                                                    {formatQuantity(
                                                                        line.previousQuantity,
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    {line.resultingQuantity ===
                                                                    null
                                                                        ? "—"
                                                                        : formatQuantity(
                                                                              line.resultingQuantity,
                                                                          )}
                                                                </td>
                                                                <td
                                                                    className={
                                                                        (line.difference ??
                                                                            0) <
                                                                        0
                                                                            ? "inventory-adjustments__number--negative"
                                                                            : "inventory-adjustments__number--positive"
                                                                    }
                                                                    dir="ltr"
                                                                >
                                                                    {line.difference ===
                                                                    null
                                                                        ? "—"
                                                                        : `${line.difference > 0 ? "+" : ""}${formatQuantity(
                                                                              line.difference,
                                                                          )}`}
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>
                                )}
                        </div>
                    )}
                </section>
            )}

        </section>
    );
}

export default InventoryAdjustmentsPage;
