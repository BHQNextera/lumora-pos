import { useState } from "react";

import Sidebar from "../components/layout/Sidebar";
import StatusBar from "../components/layout/StatusBar";
import type { CartLine } from "../models/sale/CartLine";
import SalePage from "../pages/sale/SalePage";
import TransactionsPage from "../pages/transactions/TransactionsPage";
import ProductManagementPage from "../pages/products/ProductManagementPage";
import StoredValueManagementPage from "../pages/stored-value/StoredValueManagementPage";
import CustomerManagementPage from "../pages/customers/CustomerManagementPage";
import PromotionManagementPage from "../pages/promotions/PromotionManagementPage";

export type AppView =
  | "sale"
  | "transactions"
    | "products"
    | "customers"
    | "promotions"
    | "stored-value";

function AppShell() {
  const [
    activeView,
    setActiveView,
  ] =
    useState<AppView>("sale");

  const [
    pendingReturnLines,
    setPendingReturnLines,
  ] = useState<CartLine[]>([]);

  const handleReturnToSale = (
    lines: CartLine[],
  ) => {
    setPendingReturnLines(
      lines,
    );

    setActiveView("sale");
  };

  return (
    <div className="pos-app-shell">
      <Sidebar
        activeView={activeView}
        onNavigate={
          setActiveView
        }
      />

      <div
        className="pos-app-shell__main"
        dir="rtl"
      >
        <main className="pos-app-shell__workspace">
                      {activeView === "customers" && (
        <CustomerManagementPage />
      )}

      {activeView === "promotions" && (
        <PromotionManagementPage />
      )}
      {activeView === "stored-value" && (
        <StoredValueManagementPage />
      )}
{activeView === "products" && (
        <ProductManagementPage />
      )}
{activeView === "sale" && (
            <SalePage
              incomingReturnLines={
                pendingReturnLines
              }
              onReturnLinesConsumed={() =>
                setPendingReturnLines(
                  [],
                )
              }
            />
          )}

          {activeView ===
            "transactions" && (
              <TransactionsPage
                onReturnToSale={
                  handleReturnToSale
                }
              />
            )}
        </main>

        <StatusBar />
      </div>
    </div>
  );
}

export default AppShell;