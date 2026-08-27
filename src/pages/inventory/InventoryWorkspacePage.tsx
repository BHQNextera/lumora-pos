import {
    useState,
} from "react";

import ProductManagementPage from "../products/ProductManagementPage";
import InventoryAdjustmentsPage from "./InventoryAdjustmentsPage";
import InventoryHierarchyPage from "./InventoryHierarchyPage";
import ItemHistoryPage from "./ItemHistoryPage";
import SupplierInvoicePage from "./SupplierInvoicePage";
import SuppliersPage from "./SuppliersPage";
import SupplierReturnPage from "./SupplierReturnPage";

import "./inventory-page.css";

type InventorySection =
    | "products"
    | "adjustments"
    | "hierarchy"
    | "item-history"
    | "suppliers"
    | "supplier-invoice"
    | "supplier-return";

type InventoryDocumentOpenRequest = {
    section:
        | "adjustments"
        | "supplier-invoice"
        | "supplier-return";
    documentNumber: string;
    requestId: number;
};

function InventoryWorkspacePage() {
    const [
        activeSection,
        setActiveSection,
    ] = useState<InventorySection>(
        "products",
    );

    const [
        documentOpenRequest,
        setDocumentOpenRequest,
    ] =
        useState<InventoryDocumentOpenRequest | null>(
            null,
        );

    const openInventoryDocument = (
        type:
            | "supplier_invoice"
            | "supplier_return"
            | "adjustment",
        documentNumber: string,
    ) => {
        const section:
            InventoryDocumentOpenRequest["section"] =
            type === "supplier_invoice"
                ? "supplier-invoice"
                : type === "supplier_return"
                  ? "supplier-return"
                  : "adjustments";

        setDocumentOpenRequest({
            section,
            documentNumber,
            requestId:
                Date.now(),
        });
        setActiveSection(
            section,
        );
    };

    return (
        <section
            className="inventory-workspace"
            dir="rtl"
        >
            <nav
                className="inventory-workspace__tabs"
                aria-label="אזורי מלאי"
            >
                <button
                    type="button"
                    className={
                        activeSection ===
                            "products"
                            ? "inventory-workspace__tab inventory-workspace__tab--active"
                            : "inventory-workspace__tab"
                    }
                    onClick={() =>
                        setActiveSection(
                            "products",
                        )
                    }
                >
                    פריטים
                </button>

                <button
                    type="button"
                    className={
                        activeSection ===
                            "adjustments"
                            ? "inventory-workspace__tab inventory-workspace__tab--active"
                            : "inventory-workspace__tab"
                    }
                    onClick={() =>
                        setActiveSection(
                            "adjustments",
                        )
                    }
                >
                    התאמות מלאי
                </button>

                <button
                    type="button"
                    className={
                        activeSection ===
                            "hierarchy"
                            ? "inventory-workspace__tab inventory-workspace__tab--active"
                            : "inventory-workspace__tab"
                    }
                    onClick={() =>
                        setActiveSection(
                            "hierarchy",
                        )
                    }
                >
                    היררכיות
                </button>

                <button
                    type="button"
                    className={
                        activeSection ===
                            "item-history"
                            ? "inventory-workspace__tab inventory-workspace__tab--active"
                            : "inventory-workspace__tab"
                    }
                    onClick={() =>
                        setActiveSection(
                            "item-history",
                        )
                    }
                >
                    היסטוריית פריט
                </button>

                <button
                    type="button"
                    className={
                        activeSection ===
                            "suppliers"
                            ? "inventory-workspace__tab inventory-workspace__tab--active"
                            : "inventory-workspace__tab"
                    }
                    onClick={() =>
                        setActiveSection(
                            "suppliers",
                        )
                    }
                >
                    ספקים
                </button>

                <button
                    type="button"
                    className={
                        activeSection ===
                            "supplier-invoice"
                            ? "inventory-workspace__tab inventory-workspace__tab--active"
                            : "inventory-workspace__tab"
                    }
                    onClick={() =>
                        setActiveSection(
                            "supplier-invoice",
                        )
                    }
                >
                    חשבונית ספק
                </button>

                <button
                    type="button"
                    className={
                        activeSection ===
                            "supplier-return"
                            ? "inventory-workspace__tab inventory-workspace__tab--active"
                            : "inventory-workspace__tab"
                    }
                    onClick={() =>
                        setActiveSection(
                            "supplier-return",
                        )
                    }
                >
                    החזרה לספק
                </button>
            </nav>

            {activeSection ===
                "products" && (
                <ProductManagementPage />
            )}

            {activeSection ===
                "adjustments" && (
                <InventoryAdjustmentsPage
                    openDocumentNumber={
                        documentOpenRequest?.section ===
                            "adjustments"
                            ? documentOpenRequest.documentNumber
                            : undefined
                    }
                    openRequestId={
                        documentOpenRequest?.section ===
                            "adjustments"
                            ? documentOpenRequest.requestId
                            : undefined
                    }
                />
            )}

            {activeSection ===
                "hierarchy" && (
                <InventoryHierarchyPage />
            )}

            {activeSection ===
                "item-history" && (
                <ItemHistoryPage
                    onOpenInventoryDocument={
                        openInventoryDocument
                    }
                />
            )}

            {activeSection ===
                "suppliers" && (
                <SuppliersPage />
            )}

            {activeSection ===
                "supplier-invoice" && (
                <SupplierInvoicePage
                    openDocumentNumber={
                        documentOpenRequest?.section ===
                            "supplier-invoice"
                            ? documentOpenRequest.documentNumber
                            : undefined
                    }
                    openRequestId={
                        documentOpenRequest?.section ===
                            "supplier-invoice"
                            ? documentOpenRequest.requestId
                            : undefined
                    }
                />
            )}

            {activeSection ===
                "supplier-return" && (
                <SupplierReturnPage
                    openDocumentNumber={
                        documentOpenRequest?.section ===
                            "supplier-return"
                            ? documentOpenRequest.documentNumber
                            : undefined
                    }
                    openRequestId={
                        documentOpenRequest?.section ===
                            "supplier-return"
                            ? documentOpenRequest.requestId
                            : undefined
                    }
                />
            )}
        </section>
    );
}

export default InventoryWorkspacePage;
